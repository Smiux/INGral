# GitHub 项目上传指南

## 1. 安装 Git

首先，您需要在您的计算机上安装 Git：

### Windows 安装步骤：
1. 访问 [Git 官网下载页面](https://git-scm.com/download/win)
2. 下载适合您系统的安装程序
3. 运行安装程序，按照默认设置完成安装
4. 安装完成后，打开命令提示符（cmd）或 PowerShell，输入 `git --version` 验证安装成功

## 2. 配置 Git

安装完成后，需要配置您的 Git 用户名和邮箱：

```bash
git config --global user.name "您的GitHub用户名"
git config --global user.email "您的邮箱地址"
```

## 3. 初始化 Git 仓库

在项目目录下初始化 Git 仓库：

```bash
cd e:\project
git init
```

## 4. 添加项目文件到暂存区

```bash
git add .
```

## 5. 提交初始代码

```bash
git commit -m "初始化项目"
```

## 6. 在 GitHub 创建仓库

1. 登录您的 GitHub 账户
2. 点击右上角的 "+" 图标，选择 "New repository"
3. 输入仓库名称（建议与项目名称相同）
4. 选择仓库可见性（公开或私有）
5. 不要勾选 "Initialize this repository with a README"（因为我们已经有了项目文件）
6. 点击 "Create repository"

## 7. 关联本地仓库与 GitHub 仓库

创建仓库后，GitHub 会提供一系列命令。选择 "push an existing repository from the command line" 部分的命令：

```bash
git remote add origin https://github.com/您的用户名/您的仓库名.git
git branch -M main
git push -u origin main
```

## 8. 推送代码到 GitHub

执行上述命令后，您的代码将会被推送到 GitHub 仓库。

## 注意事项

1. `.gitignore` 文件已经配置完成，会自动忽略不必要的文件
2. 如果您在推送时遇到权限问题，可能需要设置 SSH 密钥或使用 GitHub Token
3. 如需使用 GitHub Token，在推送命令中使用：
   ```bash
git remote set-url origin https://您的用户名:您的GitHubToken@github.com/您的用户名/您的仓库名.git
git push -u origin main
   ```

## 后续操作建议

1. 创建 README.md 文件，介绍项目功能和使用方法
2. 添加项目描述和标签到 GitHub 仓库页面
3. 考虑设置 CI/CD 流程

祝您使用愉快！