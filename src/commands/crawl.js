const puppeteer = require('puppeteer');
const { join } = require('path');
const { ensureDir } = require('fs-extra');
const { infoMessage } = require('../utils');

async function crawl(pagesRaw, dimensionsRaw, folder) {

  const browser = await puppeteer.launch({
    headless: false
  });
  const pages = pagesRaw.split(',');
  const dimensions = dimensionsRaw.split(',');

  await Promise.all(
    pages.map(async p => {

      const page = await browser.newPage();

      const url = new URL(p);

      for (const dimension of dimensions) {

        const [width, height] = dimension.split('x');

        await page.setViewport({ width: parseInt(width, 10), height: parseInt(height, 10) });

        const processedPages = new Set();
        const pagesToProcess = [url.pathname];

        const path = join(process.cwd(), folder, url.hostname);

        await ensureDir(path);

        while (pagesToProcess.length) {
          const pathname = pagesToProcess.pop();

          processedPages.add(pathname);

          infoMessage(`[${url.hostname}] Processing Page: ${pathname}`);

          await page.goto(
            url.origin + pathname,
            { waitUntil: 'networkidle0', timeout: 300000 }
          );

          (
            await page.evaluate(() =>
              Array.from(document.querySelectorAll('a')).map(it => it.href)
            )
          )
            .forEach(link => {
              const l = link
                .replace(url.origin, '');

              if (
                l &&
                l.startsWith('/') &&
                !l.includes('.') &&
                !l.includes('#') &&
                !processedPages.has(l) &&
                !pagesToProcess.includes(l)
              ) {
                pagesToProcess.push(l);
              }
            });

          let name = pathname
            /**
             * Replace spaces with "-"
             */
            .replace(/(%20)|( )/g, '-')

            /**
             * Replace "/" with "----" to flatten the file structure
             */
            .replace(/(?!^)\//g, '----');

          if (name === '/' || !name) {
            name = 'home';
          }

          await page.screenshot({
            path: join(path, name + '$$' + dimension) + '.png',
            fullPage: true
          });
        }
      }
    })
  )

  await browser.close();
}

module.exports = {
  crawl
}