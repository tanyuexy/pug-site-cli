#!/usr/bin/env node

const program = require("commander");
const create = require("../lib/create");
const update = require("../lib/update");
const { version } = require("../package.json");

program
  .version(version)
  .command("create <project-name>")
  .description("创建一个新项目")
  .action((projectName) => {
    create(projectName);
  });

program
  .version(version)
  .command("update")
  .description("更新当前项目的核心文件，智能合并 package.json 中的 scripts 和 config.js 配置，旧配置中的自定义值会保留，已弃用的配置项会被标注")
  .action(() => {
    update();
  });

program.parse(process.argv);
