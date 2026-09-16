import { useState, type ReactNode } from "react";
import { getPublicApiRuntimeConfig, normalizePublicApiBaseUrl, savePublicApiRuntimeConfig } from "@/src/runtime/public-api-config";

export function OpenSourceBootstrap({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(() => Boolean(getPublicApiRuntimeConfig().apiBaseUrl));
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  if (ready) return children;
  return <main className="flex min-h-screen items-center justify-center bg-background p-6 text-foreground">
    <form className="w-full max-w-lg space-y-5 rounded-2xl border p-8" onSubmit={(event) => {
      event.preventDefault();
      const apiBaseUrl = normalizePublicApiBaseUrl(url);
      if (!apiBaseUrl) { setError("请输入有效的 HTTP 或 HTTPS 后端地址。"); return; }
      const parsed = new URL(apiBaseUrl);
      if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname)) {
        setError("远程后端请使用 HTTPS；HTTP 仅用于本机开发。"); return;
      }
      savePublicApiRuntimeConfig({ apiBaseUrl, apiClientName: "frameloom" });
      setReady(true);
    }}>
      <h1 className="text-2xl font-semibold">FrameLoom · 帧织</h1>
      <p className="text-sm text-muted-foreground">前端已就绪。请连接你自己的兼容后端，启用登录、画布保存和 AI 生成。</p>
      <label className="block text-sm" htmlFor="backend-url">后端地址</label>
      <input id="backend-url" className="w-full rounded-lg border bg-transparent p-3" type="url" placeholder="http://localhost:3000" value={url} onChange={e => setUrl(e.target.value)} required />
      <p className="text-xs text-muted-foreground">登录凭证和上传内容会发送到此地址，请使用你信任的服务。地址保存在当前浏览器中。</p>
      {error && <p role="alert" className="text-sm text-red-500">{error}</p>}
      <button className="rounded-lg bg-primary px-5 py-3 text-primary-foreground" type="submit">连接后端</button>
      <p className="text-xs text-muted-foreground">部署时也可使用 VITE_API_BASE_URL。详情见仓库 README。</p>
    </form>
  </main>;
}
