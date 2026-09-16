# FrameLoom · 帧织

[![Frontend checks](https://github.com/lanmu1818-ship-it/frameloom/actions/workflows/ci.yml/badge.svg)](https://github.com/lanmu1818-ship-it/frameloom/actions/workflows/ci.yml)

**FrameLoom（帧织）** 是面向图片、视频和节点工作流的 AI 设计工作台。项目名结合 Frame（画面）与 Loom（织造），表达将素材和创作流程编排为作品。

从现有 App 中提取的独立前端源码，基于 React、TypeScript、Vite 和 Tailwind CSS。包含登录界面、设计工作台、图片/视频画布、节点编辑、生成任务面板、团队界面，以及可选的桌面桥接客户端。

**本仓库是前端，不包含可独立提供 AI 服务的后端。** 登录、上传、生成、团队权限、计费和项目保存需要自行实现或接入兼容 API。未配置后端时，启动后显示连接设置页，不会默认连接原项目的商业服务。

## 快速开始

需要 Node.js 20.19+（或 Node.js 22.12+）和 pnpm 9.12.3。

```bash
git clone https://github.com/lanmu1818-ship-it/frameloom.git
cd frameloom
corepack enable
corepack prepare pnpm@9.12.3 --activate
pnpm install --frozen-lockfile
pnpm dev
```

打开终端显示的本地地址（默认 `http://localhost:5173`），填写自己的后端地址；或在首次启动前配置：

```bash
cp .env.example .env.local
# 编辑 .env.local：VITE_API_BASE_URL=http://localhost:3000
pnpm dev
```

地址填后端根地址，不要附加 `/api`。远程部署使用 HTTPS。设置页保存的地址优先于构建配置；切换后端前可在浏览器开发者工具中清除本站点的 `yedir.apiBaseUrl` 等 `yedir.*` 配置项并刷新。

`VITE_*` 配置会进入浏览器产物，是公开信息。不要填写数据库密码、模型供应商密钥、存储密钥或服务端签名密钥。

## 构建与检查

```bash
pnpm check:public
pnpm test
pnpm typecheck
pnpm build
pnpm preview
```

产物位于 `dist/`。`index.html` 为完整工作台入口，`canvas.html` 为画布入口；后者需要兼容后端的已有会话。静态托管部署在域名根路径，工作台路由应回退至 `index.html`。若单独部署画布入口，将其作为该站点默认入口并让路由回退至它。请参阅 [部署说明](docs/deployment.md)。

## 源码结构

```text
src/desktop/       浏览器入口、轻量路由适配、桌面桥接客户端
src/components/    工作台、画布、节点、生成面板
src/app-routes/    App 实际使用的页面组件
src/client/        API 请求、上传、下载、会话辅助
src/runtime/       公开运行配置、本地归档配置
src/lib/           前端共享逻辑、模型能力和界面配置
src/providers/     会话、主题、上传等 React Provider
src/services/      画布服务客户端
src/store/         客户端状态
src/styles/        全局样式
types/             公开数据类型
public/            自绘占位图、中性图标和本地帮助页
```

原项目中的 `next/link`、`next/navigation` 和 `next/dynamic` 使用本地适配组件；此版本不运行 Next.js 服务端，也不需要原仓库或它的 `node_modules`。

## 能力边界

| 功能 | 本仓库提供 | 需要接入 |
| --- | --- | --- |
| 工作台、画布、节点和参数面板 | React 界面与状态逻辑 | 项目数据接口 |
| 登录、注册、第三方登录 | 前端流程 | 会话、邮件、Clerk 配置及回调服务 |
| 图片/视频生成、编辑 | 请求与任务展示 | 模型网关、队列、鉴权和配额 |
| 上传、下载和持久化 | 客户端 | 存储及签名 URL 服务 |
| 团队管理 | 用户可见界面 | 服务端角色权限校验 |
| 本地归档、自动更新 | 桥接调用接口 | Electron/Tauri 壳实现 |

前端构建不代表上述后端业务已经实现。演示照片、第三方视频/音频样例和原品牌图案未随源码发布；已用自绘 SVG 占位图替换。音视频演示 URL 留空，需要自行配置具有使用权的素材。

## 文档

- [后端接入](docs/backend-integration.md) 与 [API 路径索引](docs/api-paths.md)
- [开源清理记录](docs/open-source-cleanup.md)
- [贡献指南](CONTRIBUTING.md)、[安全报告](SECURITY.md)
- [第三方说明](THIRD_PARTY_NOTICES.md)

## 许可

沿用原项目的 Apache-2.0，完整文本见 [LICENSE](LICENSE)，保留的上游版权声明见 [NOTICE](NOTICE)。依赖各自适用其原有许可。项目和供应商名称的出现不表示合作或背书。
