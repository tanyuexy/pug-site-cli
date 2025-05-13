const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const download = require("download-git-repo");
const os = require("os");

async function update() {
  const cwd = process.cwd();
  const tempDir = path.join(os.tmpdir(), `pug-site-template-${Date.now()}`);
  
  // 动态导入 ora
  const ora = (await import("ora")).default;

  // 从 GitHub 下载最新模板到临时目录
  const downloadSpinner = ora("正在下载最新模板...").start();

  const templateRepo = "tanyuexy/pug-site-template";

  download(templateRepo, tempDir, { clone: true }, async (err) => {
    if (err) {
      downloadSpinner.fail("下载失败：" + err.message);
      // 清理临时目录
      fs.removeSync(tempDir);
      process.exit(1);
    }

    downloadSpinner.succeed("最新模板下载完成");

    // 更新文件
    const updateSpinner = ora("正在更新文件...").start();
    
    try {
      // 要更新的文件列表
      const filesToUpdate = ['index.js', 'README.md'];
      let updatedCount = 0;
      
      // 处理普通文件更新
      for (const file of filesToUpdate) {
        const sourceFile = path.join(tempDir, file);
        const targetFile = path.join(cwd, file);
        
        // 检查源文件是否存在
        if (fs.existsSync(sourceFile)) {
          // 直接复制新文件
          fs.copySync(sourceFile, targetFile);
          updatedCount++;
        } else {
          console.log(chalk.yellow(`警告：模板中不存在 ${file} 文件`));
        }
      }
      
      // 特殊处理 package.json 文件
      const sourcePackageFile = path.join(tempDir, 'package.json');
      const targetPackageFile = path.join(cwd, 'package.json');
      
      if (fs.existsSync(sourcePackageFile) && fs.existsSync(targetPackageFile)) {
        // 读取源文件和目标文件
        const sourcePackage = JSON.parse(fs.readFileSync(sourcePackageFile, 'utf8'));
        const targetPackage = JSON.parse(fs.readFileSync(targetPackageFile, 'utf8'));
        
        // 检查是否有 scripts 部分
        if (sourcePackage.scripts) {
          let hasConflict = false;
          let updatedScripts = false;
          
          // 如果目标文件没有 scripts 部分，直接添加
          if (!targetPackage.scripts) {
            targetPackage.scripts = {};
          }
          
          // 遍历源文件的 scripts
          for (const [key, value] of Object.entries(sourcePackage.scripts)) {
            // 检查是否存在冲突（目标文件中有相同的键但值不同）
            if (targetPackage.scripts[key] && targetPackage.scripts[key] !== value) {
              console.log(chalk.red(`冲突：scripts.${key} 在目标文件中已存在且值不同`));
              console.log(chalk.blue(`  模板值: ${value}`));
              console.log(chalk.blue(`  当前值: ${targetPackage.scripts[key]}`));
              console.log(chalk.yellow(`  保留当前值`));
              hasConflict = true;
            } else {
              // 不存在冲突，更新或添加
              targetPackage.scripts[key] = value;
              updatedScripts = true;
            }
          }
          
          // 写回文件
          fs.writeFileSync(targetPackageFile, JSON.stringify(targetPackage, null, 2), 'utf8');
          
          if (updatedScripts) {
            console.log(chalk.green(`package.json 中的 scripts 部分已更新`));
            updatedCount++;
          }
          
          if (hasConflict) {
            console.log(chalk.yellow(`注意：部分 scripts 因冲突未更新，详情请查看上方输出`));
          }
        } else {
          console.log(chalk.yellow(`警告：模板的 package.json 中不存在 scripts 部分`));
        }
      } else if (!fs.existsSync(sourcePackageFile)) {
        console.log(chalk.yellow(`警告：模板中不存在 package.json 文件`));
      } else {
        console.log(chalk.yellow(`警告：当前目录中不存在 package.json 文件`));
      }
      
      // 清理临时目录
      fs.removeSync(tempDir);
      
      if (updatedCount > 0) {
        updateSpinner.succeed(`成功更新了 ${updatedCount} 个文件`);
        console.log();
        // console.log(chalk.yellow('提示：如果 package.json 中的依赖有更新，您可能需要运行 npm install 更新依赖'));
      } else {
        updateSpinner.info("没有文件需要更新");
      }
    } catch (error) {
      updateSpinner.fail("更新文件失败：" + error.message);
      // 清理临时目录
      fs.removeSync(tempDir);
      process.exit(1);
    }
  });
}

module.exports = update; 