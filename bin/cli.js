#!/usr/bin/env node

const program = require("commander");
const create = require("../lib/create");
const { version } = require("../package.json");

program
  .version(version)
  .command("create <project-name>")
  .description("创建一个新项目")
  .action((projectName) => {
    create(projectName);
  });

program.parse(process.argv);
