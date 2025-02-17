# Pug Site CLI

一个快速创建和开发 Pug 模板项目的命令行工具。

## 功能特点

- 快速搭建 Pug 模板项目
- 自动安装必要依赖
- 开发服务器支持热重载
- 内置数据生成工具

## 安装

```bash
npm install -g pug-site-cli
```

## 快速开始

### 创建新项目

使用以下命令创建一个新的 Pug 项目：

```bash
npx pug-site-cli create <project-name>
```

或者如果您已全局安装：

```bash
pug-site-cli create <project-name>
```

### 项目设置

创建完成后，按照以下步骤进行项目设置：

1. 进入项目目录：
   ```bash
   cd <project-name>
   ```

2. 安装依赖：
   ```bash
   npm install
   ```

3. 生成数据：
   ```bash
   npm run getData
   ```

4. 启动开发服务器：
   ```bash
   npm run dev
   ```
## 许可证

MIT
