# 后端接入

## 请求约定

核心请求封装为 `src/client/api.ts`，运行配置为 `src/runtime/public-api-config.ts`。`/api/...` 路径会拼到 `apiBaseUrl` 后面。请求默认携带 Cookie；`apiClientName` 对应 `X-Yedir-Client`。客户端标识是公开值，不能用来替代用户身份校验。

部分界面还有同源资源请求；首次接入建议由同一站点反向代理 `/api/`。跨域部署需要后端显式允许前端 Origin 和凭证请求、正确处理 OPTIONS，允许 Content-Type、Authorization、X-Yedir-Client 等实际使用的请求头。上传直传地址也需要存储端 CORS。

## 最小接入流程

1. `GET /api/auth-settings`：返回启用的认证方式；不启用第三方认证时不要返回可用标记。
2. `GET /api/auth/validate-session`：返回 `{ "valid": false }` 或 `{ "valid": true, "user": { "id": "...", "email": "...", "name": "..." } }`。团队字段和类型见 `types/session.ts`。
3. 登录、注册和验证码接口：以 `src/desktop/desktop-app.tsx` 的请求体及响应处理为准，后端负责密码策略、限流、验证码和 Cookie。
4. 画布列表与创建：入口使用 `/api/canvas`，列表成功响应为 `{ "success": true, "data": [] }`，创建后返回含 `id` 的项目对象。
5. 项目读写、上传和生成任务：按 `src/services/canvas/`、`src/client/` 与画布组件中的调用实现。错误须使用相应调用方预期的 JSON 结构。

完整路径见 [API 路径索引](api-paths.md)。该索引从源码字面量提取，动态路径和请求方法仍需结合调用处阅读，不是完整 OpenAPI 规范，也不是后端实现。

## 认证与桌面能力

- 本仓库没有数据库、服务端认证中间件或模型密钥管理实现。
- 第三方登录由兼容后端返回公开 Clerk 配置；不要把 Clerk secret key 放入前端。
- `window.__YEDIR_*` 等桥接对象是可选的客户端契约。浏览器中本地归档、安装更新等功能不可用，需要另行实现可信桌面壳。
- 画布入口没有完整登录表单，先建立兼容会话再打开。
- 外部 API 门户属于可选集成：示例域名为 example.com，需在 `src/client/api-system-launch.ts` 和对应站点配置中明确改为自己的门户及允许路径。
- 服务端必须独立实施权限、团队隔离、配额和上传校验；不能信任界面中的角色或计费计算。
