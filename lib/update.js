const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");
const download = require("download-git-repo");
const os = require("os");

// 深度合并配置对象
function mergeConfigs(sourceConfig, targetConfig) {
  function deepMerge(source, target) {
    const result = { ...source };
    
    for (const key in target) {
      if (target.hasOwnProperty(key)) {
        // 特殊处理 commonData：直接用旧配置替换新配置
        if (key === 'commonData') {
          result[key] = target[key];
        } else if (typeof target[key] === 'object' && target[key] !== null && !Array.isArray(target[key]) && typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
          // 递归合并对象
          result[key] = deepMerge(source[key] || {}, target[key]);
        } else {
          // 直接覆盖其他类型的值
          result[key] = target[key];
        }
      }
    }
    
    return result;
  }
  
  return deepMerge(sourceConfig, targetConfig);
}

// 提取源文件中的注释
function extractComments(lines) {
  const comments = {};
  let isInConfig = false;
  let lastComment = '';
  let braceCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    if (trimmed.includes('export const config =')) {
      isInConfig = true;
      continue;
    }
    
    if (!isInConfig) continue;
    
    // 计算大括号以跟踪层级
    braceCount += (trimmed.match(/\{/g) || []).length;
    braceCount -= (trimmed.match(/\}/g) || []).length;
    
    // 如果遇到 };  表示配置结束
    if (trimmed === '};' && braceCount <= 0) {
      break;
    }
    
    // 如果是注释行，保存它
    if (trimmed.startsWith('//')) {
      lastComment = trimmed;
    }
    // 如果是属性行，将之前的注释与这个属性关联
    else if (trimmed.includes(':') && lastComment) {
      // 提取属性名
      const match = trimmed.match(/^(\w+)\s*:/);
      if (match) {
        const key = match[1];
        comments[key] = lastComment;
        lastComment = '';
      }
    }
    // 如果既不是注释也不是属性，清空lastComment（除非是空行）
    else if (trimmed && !trimmed.startsWith('//') && !trimmed.includes('{') && !trimmed.includes('}')) {
      lastComment = '';
    }
  }
  
  return comments;
}

// 查找已弃用的键
function findDeprecatedKeys(sourceConfig, targetConfig, currentPath = '', deprecatedKeys = new Set()) {
  for (const key in targetConfig) {
    if (targetConfig.hasOwnProperty(key)) {
      const keyPath = currentPath ? `${currentPath}.${key}` : key;
      
      // 跳过 commonData 的弃用检查
      if (key === 'commonData' && currentPath === '') {
        continue;
      }
      
      if (!(key in sourceConfig)) {
        // 这个键在新配置中不存在，标记为已弃用
        deprecatedKeys.add(keyPath);
      } else if (typeof targetConfig[key] === 'object' && targetConfig[key] !== null && !Array.isArray(targetConfig[key]) &&
                 typeof sourceConfig[key] === 'object' && sourceConfig[key] !== null && !Array.isArray(sourceConfig[key])) {
        // 递归检查嵌套对象
        findDeprecatedKeys(sourceConfig[key], targetConfig[key], keyPath, deprecatedKeys);
      }
    }
  }
  
  return deprecatedKeys;
}

// 生成配置文件内容，保留新模板中的注释
function generateConfigFileContent(mergedConfig, sourceConfig, targetConfig, sourceConfigContent) {
  // 获取在目标配置中存在但在源配置中不存在的键（需要标记为已弃用）
  const deprecatedKeys = findDeprecatedKeys(sourceConfig, targetConfig);
  
  // 解析源文件中的注释和结构
  const sourceLines = sourceConfigContent.split('\n');
  const comments = extractComments(sourceLines);
  
  // 生成配置对象的字符串表示，保留注释
  function configToString(obj, indent = 2, currentPath = '') {
    const spaces = ' '.repeat(indent);
    let result = '{\n';
    
    for (const [key, value] of Object.entries(obj)) {
      const keyPath = currentPath ? `${currentPath}.${key}` : key;
      
      // 添加来自源文件的注释
      const comment = comments[key]; // 只使用顶级key，不使用keyPath
      if (comment) {
        result += `${spaces}${comment}\n`;
      }
      
      // 检查是否需要添加已弃用注释
      if (deprecatedKeys.has(keyPath)) {
        result += `${spaces}// 已弃用\n`;
      }
      
      result += `${spaces}${key}: `;
      
      if (typeof value === 'function') {
        // 保持函数的原始格式
        const funcStr = value.toString();
        result += funcStr;
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // 递归处理对象
        result += configToString(value, indent + 2, keyPath);
      } else if (Array.isArray(value)) {
        // 处理数组，保持格式化
        if (value.length > 3) {
          result += '[\n';
          for (let i = 0; i < value.length; i++) {
            result += `${spaces}  ${JSON.stringify(value[i])}`;
            if (i < value.length - 1) result += ',';
            result += '\n';
          }
          result += `${spaces}]`;
        } else {
          result += JSON.stringify(value);
        }
      } else if (typeof value === 'string') {
        result += `"${value}"`;
      } else {
        result += JSON.stringify(value);
      }
      
      result += ',\n';
    }
    
    result += `${' '.repeat(indent - 2)}}`;
    return result;
  }
  
  const configString = configToString(mergedConfig);
  return `export const config = ${configString};\n`;
}

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
      
      // 特殊处理 config.js 文件
      const sourceConfigFile = path.join(tempDir, 'config.js');
      const targetConfigFile = path.join(cwd, 'config.js');
      
      if (fs.existsSync(sourceConfigFile) && fs.existsSync(targetConfigFile)) {
        try {
          // 读取新模板的 config.js 内容
          let sourceConfigContent = fs.readFileSync(sourceConfigFile, 'utf8');
          // 读取当前项目的 config.js 内容
          let targetConfigContent = fs.readFileSync(targetConfigFile, 'utf8');
          
          // 动态导入配置文件进行比较
          const tempSourcePath = path.join(os.tmpdir(), `temp-source-config-${Date.now()}.js`);
          const tempTargetPath = path.join(os.tmpdir(), `temp-target-config-${Date.now()}.js`);
          
          // 转换为CommonJS格式
          const sourceConfigCJS = sourceConfigContent.replace('export const config =', 'module.exports.config =');
          const targetConfigCJS = targetConfigContent.replace('export const config =', 'module.exports.config =');
          
          fs.writeFileSync(tempSourcePath, sourceConfigCJS);
          fs.writeFileSync(tempTargetPath, targetConfigCJS);
          
          // 清除 require 缓存
          delete require.cache[require.resolve(tempSourcePath)];
          delete require.cache[require.resolve(tempTargetPath)];
          
          const sourceConfig = require(tempSourcePath).config;
          const targetConfig = require(tempTargetPath).config;
          
          // 合并配置：以新模板为基础，覆盖旧配置中存在的值
          const mergedConfig = mergeConfigs(sourceConfig, targetConfig);
          
          // 生成新的配置文件内容
          const newConfigContent = generateConfigFileContent(mergedConfig, sourceConfig, targetConfig, sourceConfigContent);
          
          // 写入新的配置文件
          fs.writeFileSync(targetConfigFile, newConfigContent, 'utf8');
          
          // 清理临时文件
          fs.removeSync(tempSourcePath);
          fs.removeSync(tempTargetPath);
          
          console.log(chalk.green(`\nconfig.js 已成功更新并合并配置`));
          
          updatedCount++;
          
        } catch (error) {
          console.log(chalk.red(`更新 config.js 失败: ${error.message}`));
        }
      } else if (fs.existsSync(sourceConfigFile) && !fs.existsSync(targetConfigFile)) {
        // 如果目标文件不存在，直接复制
        fs.copySync(sourceConfigFile, targetConfigFile);
        console.log(chalk.green(`config.js 文件已创建`));
        updatedCount++;
      } else if (!fs.existsSync(sourceConfigFile)) {
        console.log(chalk.yellow(`警告：模板中不存在 config.js 文件`));
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