# API 路径索引

从客户端字符串提取；包含查询串和动态模板。方法、请求体、响应形状以调用处为准。

| 路径 | 调用文件 |
| --- | --- |
| `/api/agent-execution-snapshots/${snapshotId}` | `src/components/agents/AgentExecutionSnapshotDialog.tsx` |
| `/api/agent-projects` | `src/services/agent-projects/index.ts` |
| `/api/agent-projects/${agentProjectId}` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx` |
| `/api/agent-projects/${id}` | `src/services/agent-projects/index.ts` |
| `/api/agent-workflow/detail-image-normalize` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx` |
| `/api/agent-workflow/detail-stitch` | `src/components/agents/AgentDetailReferenceStitchDialog.tsx` |
| `/api/agent-workflow/material-appearance` | `src/components/agents/AgentWorkflowMaterialSelectionPanel.tsx` |
| `/api/agent-workflow/material-search?${searchParams.toString()}` | `src/components/agents/AgentWorkflowMaterialSelectionPanel.tsx` |
| `/api/agent-workflow/material-upload` | `src/components/agents/AgentWorkflowMaterialSelectionPanel.tsx` |
| `/api/agent-workflow/reference-search?${searchParams.toString()}` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx` |
| `/api/agents/${effectiveSelectedAgentPresetId}` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx` |
| `/api/agents/${selectedAgentPresetId}` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/angle-edit` | `src/services/canvas/index.ts` |
| `/api/auth-settings` | `src/desktop/desktop-app.tsx` |
| `/api/auth/clerk/register` | `src/desktop/desktop-clerk-oauth.ts` |
| `/api/auth/clerk/session` | `src/desktop/desktop-clerk-oauth.ts` |
| `/api/auth/lanbi-canvas` | `src/app-routes/app/canvas/canvas-redirect-client.tsx` |
| `/api/auth/login?mode=json` | `src/desktop/desktop-app.tsx` |
| `/api/auth/logout` | `src/client/auth.ts` |
| `/api/auth/password/reset/confirm` | `src/desktop/desktop-app.tsx` |
| `/api/auth/password/reset/send-code` | `src/desktop/desktop-app.tsx` |
| `/api/auth/validate-session` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx`, `src/components/home/design-home.tsx`, `src/desktop/desktop-app.tsx`, `src/providers/auth-session-provider.tsx` |
| `/api/canvas` | `src/components/home/design-home.tsx`, `src/components/image-annotator.tsx`, `src/desktop/desktop-app.tsx`, `src/services/canvas/index.ts` |
| `/api/canvas-skill-tags` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/${canvasId}/detail-archives` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/${canvasId}/detail-archives?archiveId=${encodeURIComponent(archiveId)}` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/${encodeURIComponent(normalizedId)}` | `src/client/canvas-project-preload.ts` |
| `/api/canvas/${id}` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx`, `src/services/canvas/index.ts` |
| `/api/canvas/${projectId}` | `src/components/home/design-home.tsx` |
| `/api/canvas/${rawId}` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/auto-title` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/box-cutout` | `src/services/canvas/index.ts` |
| `/api/canvas/detail-plan` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/detail-review` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/detail-subject-analyze` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/canvas/download-image` | `src/components/canvas/nodes/ImageNode.tsx` |
| `/api/canvas/download-zip` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx` |
| `/api/canvas/download-zip-task` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasWorkspace.tsx` |
| `/api/canvas/download-zip-task?taskId=${encodeURIComponent(taskId)}` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasWorkspace.tsx` |
| `/api/canvas/generate/image` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx`, `src/services/canvas/index.ts` |
| `/api/canvas/generate/image?taskId=${encodeURIComponent(taskId)}` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx`, `src/services/canvas/index.ts` |
| `/api/canvas/generate/video` | `src/services/canvas/index.ts` |
| `/api/canvas/image-tool` | `src/services/canvas/index.ts` |
| `/api/canvas/local-edit` | `src/services/canvas/index.ts` |
| `/api/canvas/text-copy-suggestions` | `src/services/canvas/index.ts` |
| `/api/canvas/text-detect` | `src/services/canvas/index.ts` |
| `/api/canvas/text-edit` | `src/services/canvas/index.ts` |
| `/api/canvas/ui-screen/review` | `src/components/canvas/nodes/UiScreenNode.tsx` |
| `/api/canvas/workflow/analyze` | `src/services/canvas/index.ts` |
| `/api/canvas?${params.toString()}` | `src/services/canvas/index.ts` |
| `/api/canvas?limit=1` | `src/app-routes/app/canvas/canvas-redirect-client.tsx` |
| `/api/canvas?workspaceType=all` | `src/components/home/design-home.tsx` |
| `/api/canvas?workspaceType=all&limit=12` | `src/desktop/desktop-app.tsx` |
| `/api/canvas?workspaceType=video&limit=1` | `src/app-routes/app/(chat)/video-canvas/video-canvas-redirect-client.tsx` |
| `/api/chat` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/desktop-auth/api-system-launch` | `src/client/api-system-launch.ts` |
| `/api/desktop-auth/login-token` | `src/desktop/desktop-clerk-oauth.ts` |
| `/api/desktop-auth/register` | `src/desktop/desktop-app.tsx` |
| `/api/desktop-auth/register/send-code` | `src/desktop/desktop-app.tsx` |
| `/api/detect-object` | `src/components/image-preview.tsx` |
| `/api/enhance` | `src/components/image-annotator.tsx` |
| `/api/extend` | `src/components/image-annotator.tsx`, `src/services/canvas/index.ts` |
| `/api/featured?page=${pageIndex` | `src/components/home/design-home.tsx` |
| `/api/files/direct-upload` | `src/client/upload-with-retry.ts` |
| `/api/files/upload` | `src/client/upload-with-retry.ts` |
| `/api/home-animation` | `src/components/home/design-home.tsx` |
| `/api/image-proxy` | `src/lib/image-delivery.ts`, `src/lib/image-url.ts` |
| `/api/inspiration/search?query=${encodeURIComponent(query)}&perPage=12` | `src/components/home/design/home-hero-composer.tsx` |
| `/api/layer-split` | `src/services/canvas/index.ts` |
| `/api/local-media-archive/manifest` | `src/client/local-media-archive.ts` |
| `/api/local-media-archive/manifest?${searchParams.toString()}` | `src/client/local-media-archive.ts` |
| `/api/messages?chatId=${finishedRawChatId}` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/messages?chatId=${finishedRawChatId}&_t=${Date.now()}` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/messages?chatId=${rawChatId}` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/models` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/models?includeUnavailable=1` | `src/components/canvas/CanvasChatPanel.tsx`, `src/components/home/design-home.tsx` |
| `/api/payment/dulupay/create` | `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/pick-object` | `src/components/canvas/LiblibVideoCanvasReplica.tsx`, `src/components/canvas/nodes/ImageNode.tsx` |
| `/api/provider-credentials/upload-guard` | `src/components/home/design-home.tsx` |
| `/api/resize` | `src/components/image-annotator.tsx`, `src/services/canvas/index.ts` |
| `/api/rmbg` | `src/components/image-annotator.tsx`, `src/services/canvas/index.ts` |
| `/api/site-settings?scope=agent-brand-model&brand=${encodeURIComponent(` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx`, `src/components/agents/AgentWorkflowBrandModelPicker.tsx` |
| `/api/site-settings?scope=agent-canvas` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx` |
| `/api/site-settings?scope=branding` | `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/site-settings?scope=branding&t=${Date.now()}` | `src/components/image-annotator.tsx` |
| `/api/site-settings?scope=canvas` | `src/app-routes/app/canvas/[id]/CanvasEditorLegacyPageClient.tsx` |
| `/api/site-settings?scope=canvas-chat` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/site-settings?scope=home` | `src/components/canvas/LiblibVideoCanvasReplica.tsx`, `src/components/home/design-home.tsx` |
| `/api/sso/oidc/desktop-launch` | `src/client/api-system-launch.ts` |
| `/api/team-admin/billing?${params.toString()}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/invite-codes` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/invite-codes/${accessKeyId}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/members/${memberId}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/models/${modelId}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/overview` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/provider-credentials` | `src/components/team-admin/team-admin-overview-page.tsx`, `src/providers/provider-api-key-prompt-provider.tsx` |
| `/api/team-admin/provider-credentials?${params.toString()}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/provider-usage` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/quick-phrases` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/quick-phrases/${phraseId}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/team-admin/records?${params.toString()}` | `src/components/team-admin/team-admin-overview-page.tsx` |
| `/api/user/access-keys` | `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/user/access-keys/${accessKeyId}` | `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/user/account-center` | `src/components/canvas/LiblibVideoCanvasReplica.tsx`, `src/components/home/design-home.tsx` |
| `/api/user/image-stats` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/user/membership-summary` | `src/components/canvas/CanvasChatPanel.tsx`, `src/components/canvas/LiblibVideoCanvasReplica.tsx`, `src/components/canvas/nodes/ImageNode.tsx`, `src/components/home/design-home.tsx` |
| `/api/user/provider-credentials` | `src/components/home/design-home.tsx`, `src/providers/provider-api-key-prompt-provider.tsx` |
| `/api/user/provider-credentials?${params.toString()}` | `src/components/home/design-home.tsx` |
| `/api/user/team/leave` | `src/components/home/design-home.tsx` |
| `/api/v1/auth/oauth/oidc/start` | `src/client/api-system-launch.ts` |
| `/api/video-canvas/config` | `src/components/canvas/LiblibVideoCanvasReplica.tsx` |
| `/api/video/upload` | `src/components/canvas/nodes/VideoNode.tsx` |
| `/api/vote` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/vote?chatId=${rawChatId}` | `src/components/canvas/CanvasChatPanel.tsx` |
| `/api/watermark-remove` | `src/components/agents/AgentGenerationWorkspaceDarkV2.tsx`, `src/components/image-annotator.tsx`, `src/services/canvas/index.ts` |
