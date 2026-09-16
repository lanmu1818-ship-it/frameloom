# 静态部署

1. 使用 `.env.local` 设置公开的 `VITE_API_BASE_URL`（或保留空值让使用者首次连接）。
2. `pnpm install --frozen-lockfile && pnpm build`。
3. 将 `dist/` 部署到域名根路径，启用 HTTPS。静态资源按原路径提供，其余工作台页面路由回退到 `index.html`。
4. 若只部署画布入口，以 `canvas.html` 作为默认入口及路由回退目标；该入口需要已有登录会话。
5. 配置兼容后端、会话 Cookie、CORS，或使用同源 `/api/` 反向代理。

`pnpm preview` 只用于本地检查。此项目未配置 GitHub Pages 子路径；不要直接将 `dist` 放在 `/仓库名/` 下而不修改路由和静态资源路径。

## GitHub 发布

仅上传当前独立目录。不要上传原项目 `.git`、环境文件、构建输出或 `node_modules`。本目录使用新的 Git 历史，避免把历史中的私有信息一同带入。

发布前运行 README 中的检查命令。仓库创建后可启用 GitHub 的依赖更新、安全报告和秘密扫描功能；本项目提供只读 CI 权限、Dependabot、Issue/PR 模板。本次发布仓库为 https://github.com/lanmu1818-ship-it/frameloom。
