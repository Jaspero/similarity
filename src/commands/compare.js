const { readdir, writeFile, readFileSync, ensureDir } = require('fs-extra');
const { join } = require('path');
const compareImages = require('resemblejs/compareImages');
const { crawl } = require('./crawl');

async function compareFolders(folders, output) {

  const base = folders.shift();
  const baseName = base.split('/').pop();

  const { pages, images } = (await readdir(base))
    .reduce((acc, cur) => {
      const [page, dimensions] = cur.split('$$');

      if (page && dimensions) {
        acc.pages[page] = {
          [dimensions.replace('.png', '')]: {
            [baseName]: 'base',
            ...folders.reduce((a, c) => ({ ...a, [c.split('/').pop()]: 'missing' }), {})
          }
        };
        acc.images.push({ name: cur, image: readFileSync(join(base, cur)) });
      }

      return acc;
    }, { pages: {}, images: [] });

  for (const folder of folders) {
    const files = await readdir(folder);
    const folderName = folder.split('/').pop()

    await Promise.all(
      files.map(async file => {
        const img = readFileSync(join(folder, file));
        const [page, dimension] = file.split('$$');
        const dimensionName = dimension.replace('.png', '');

        if (!pages[page]) {
          pages[page] = {
            [dimensionName]: {
              [baseName]: 'missing-in-base',
              [folderName]: 'added'
            }
          };

          return;
        }

        if (!pages[page][dimensionName]) {
          pages[page][dimensionName] = {
            [baseName]: 'missing-in-base',
            [folderName]: 'added'
          }

          return;
        }

        const baseImage = images.find(it => file === it.name).image;
        const options = {
          output: {
            errorColor: {
              red: 255,
              green: 0,
              blue: 255
            },
            errorType: 'movement',
            transparency: 0.3,
            largeImageThreshold: 1200,
            useCrossOrigin: false,
            outputDiff: true
          },
          scaleToSameSize: true,
          ignore: 'antialiasing'
        };

        const comp = await compareImages(baseImage, img, options);

        pages[page][dimensionName][folderName] = comp;

        await writeFile(join(output, `[${baseName}]-[${folderName}]-${file}`), comp.getBuffer());
      })
    );
  }

  return pages;
}

async function folders(foldersRaw, output) {

  const folders = foldersRaw.split(',');
  const folderNames = folders.map(it => it.split('/').pop());

  await ensureDir(join(process.cwd(), output));

  const results = await compareFolders(folders, output);

  await writeFile(join(output, 'comparison-results.json'), JSON.stringify(results, null, 2));

  console.table(
    Object.entries(results).reduce((acc, [page, dim]) => {
      acc.push(
        ...Object.entries(dim).map(([dimension, values]) => ({
          page,
          dimension,
          ...folderNames.reduce((b, f) => ({
            ...b, [f]:
            typeof values[f] !== 'string' ?
              values[f].rawMisMatchPercentage :
              values[f]
          }), {})
        }))
      )

      return acc;
    }, []),
    ['page', 'dimension', ...folderNames]
  )
}

async function pages(pagesRaw, dimensionsRaw, output) {
  const folder = 'crawls';

  await crawl(pagesRaw, dimensionsRaw, folder);
  await compareFolders(
    pagesRaw.split(',').map(page => {
      const url = new URL(page);
      return join(folder, url.host);
    }),
    output
  )
}

module.exports = {
  folders,
  pages
}