const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const download = require('download-git-repo');

async function create(projectName) {
  const cwd = process.cwd();
  const targetDir = path.join(cwd, projectName);

  // 检查目录是否已存在
  if (fs.existsSync(targetDir)) {
    console.error(chalk.red(`错误：项目 ${projectName} 已经存在`));
    process.exit(1);
  }

  // 创建项目目录
  console.log(chalk.blue(`创建项目目录: ${projectName}`));
  await fs.mkdir(targetDir);

  // 从 GitHub 下载模板
  console.log(chalk.blue('正在下载模板...'));
  
  // 修改仓库地址格式：'username/repo'，不要使用完整的 URL
  const templateRepo = 'tanyuexy/pug-site-template';
  
  download(templateRepo, targetDir, { clone: true }, (err) => {
    if (err) {
      console.error(chalk.red('下载失败：' + err.message));
      // 清理目录
      fs.removeSync(targetDir);
      process.exit(1);
    }
    console.log(chalk.green('✨ 项目创建成功！'));
    console.log();
    console.log(chalk.blue('  cd ' + projectName));
    console.log(chalk.blue('  npm install'));
    console.log(chalk.blue('  npm run getData'));
    console.log(chalk.blue('  npm run dev'));
    console.log();
  });
}

module.exports = create; 