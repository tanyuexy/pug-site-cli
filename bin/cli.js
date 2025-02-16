#!/usr/bin/env node

const program = require('commander');
const create = require('../lib/create');

program
  .version('1.0.0')
  .command('create <project-name>')
  .description('创建一个新项目')
  .action((projectName) => {
    create(projectName);
  });

program.parse(process.argv); 