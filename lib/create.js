const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const download = require("download-git-repo");
const { exec } = require("child_process");

async function create(projectName) {
  const cwd = process.cwd();
  const targetDir = path.join(cwd, projectName);

  // 动态导入 ora
  const ora = (await import("ora")).default;

  // 检查目录是否已存在
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`错误：项目 ${projectName} 已经存在`));
    process.exit(1);
  }

  // 创建项目目录
  console.log(chalk.blue(`创建项目目录: ${projectName}`));
  await fs.mkdir(targetDir);

  // 从 GitHub 下载模板
  const downloadSpinner = ora("正在下载模板...").start();

  const templateRepo = "tanyuexy/pug-site-template";

  download(templateRepo, targetDir, { clone: true }, async (err) => {
    if (err) {
      downloadSpinner.fail("下载失败：" + err.message);
      // 清理目录
      fs.removeSync(targetDir);
      process.exit(1);
    }

    downloadSpinner.succeed("模板下载完成");

    // 安装核心依赖
    const installSpinner = ora("正在安装核心依赖...").start();

    try {
      await new Promise((resolve, reject) => {
        exec(
          "npm install pug-site-core",
          {
            cwd: targetDir
          },
          (error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          }
        );
      });

      installSpinner.succeed("核心依赖安装完成");

      // 显示成功信息和后续步骤
      console.log();
      console.log(chalk.green("✨ 项目创建成功！"));
      console.log();
      console.log(chalk.blue("请执行以下命令开始开发："));
      console.log();
      console.log(chalk.cyan("  cd " + projectName));
      console.log(chalk.cyan("  npm run getData"));
      console.log(chalk.cyan("  npm run dev"));
      console.log();
    } catch (error) {
      installSpinner.fail("核心依赖安装失败：" + error.message);
      console.log(chalk.yellow("请手动执行 npm install pug-site-core"));
    }
  });
}

module.exports = create;
