#!/usr/bin/env node

const { Command, Argument } = require('commander');
const jsonPackage = require('./package.json');

const { checkForUpdates, errorMessage, infoMessage } = require('./src/utils');
const crawl = require('./src/commands/crawl.js');
const compare = require('./src/commands/compare.js');

const program = new Command();

async function init() {

  await checkForUpdates();

  const commands = {};

  commands.crawl = program.command('crawl')
    .alias('cr')
    .description('Crawl a url and download all pages.')
    .addArgument(new Argument('<pages>', 'A comma seperated list of pages to visit.'))
    .addArgument(new Argument('[dimensions]', 'A comma seperated list of dimensions in the format of wxh, for example 1920x1080.').default('1920x1080'))
    .addArgument(new Argument('[folder]', 'Root folder.').default('crawls'))
    .action(crawl.crawl);

  commands.compare = program.command('compare')
    .alias('co');

  commands.compare.addCommand(
    new Command('folders')
      .alias('f')
      .description('Compare folders.')
      .addArgument(new Argument('<folders>', 'A comma seperated list of folders to compare.'))
      .addArgument(new Argument('[output]', 'Output folder.').default('comparison'))
      .action(compare.folders)
  );

  commands.compare.addCommand(
    new Command('pages')
      .alias('p')
      .description('Compare pages.')
      .addArgument(new Argument('<pages>', 'A comma seperated list of pages to compare.'))
      .addArgument(new Argument('[dimensions]', 'A comma seperated list of dimensions in the format of wxh, for example 1920x1080.').default('1920x1080'))
      .addArgument(new Argument('[output]', 'Output folder.').default('comparison'))
      .action(compare.pages)
  );

  program.name('jp-similarity');
  program.helpOption(false);
  program.version(jsonPackage.version);
  program.parse(process.argv);
}

init()
  .catch(message =>
    errorMessage(`Something went wrong!\n\n${message}`)
  );