// Modified for standalone community distribution; see NOTICE.
import type { AgentWorkflowShowcaseConfig } from "@/types/agent";

export const AGENT_WORKFLOW_SHOWCASE_CONFIG_KEY = "agent_workflow_showcase_config";
const LEGACY_AGENT_WORKFLOW_SHOWCASE_SUBTITLE = "第一步：风格选择第二步：生图模式";
const DEFAULT_AGENT_WORKFLOW_SHOWCASE_SUBTITLE =
  "选择生图模式、查询商品图、完成风格配置并实时查看结果";

export const defaultAgentWorkflowShowcaseConfig: AgentWorkflowShowcaseConfig = {
  enabled: true,
  title: "三倍速出片，电影级质感",
  subtitle: DEFAULT_AGENT_WORKFLOW_SHOWCASE_SUBTITLE,
  actionText: "我要创作",
  videoUrl: "",
  posterUrl: "",
  overlayText: "让每一步选择，都能直达高质感成片",
  footerText: "用户作品",
};

function sanitizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeShowcaseSubtitle(value: string) {
  const normalized = String(value || "").trim();
  if (!normalized) {
    return defaultAgentWorkflowShowcaseConfig.subtitle;
  }
  const compact = normalized.replace(/\s+/g, "");
  if (compact === LEGACY_AGENT_WORKFLOW_SHOWCASE_SUBTITLE) {
    return DEFAULT_AGENT_WORKFLOW_SHOWCASE_SUBTITLE;
  }
  return normalized;
}

export function normalizeAgentWorkflowShowcaseConfig(
  value: unknown
): AgentWorkflowShowcaseConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return defaultAgentWorkflowShowcaseConfig;
  }

  const raw = value as Record<string, unknown>;

  return {
    enabled:
      typeof raw.enabled === "boolean"
        ? raw.enabled
        : defaultAgentWorkflowShowcaseConfig.enabled,
    title:
      sanitizeText(raw.title, 200) || defaultAgentWorkflowShowcaseConfig.title,
    subtitle: normalizeShowcaseSubtitle(sanitizeText(raw.subtitle, 300)),
    actionText:
      sanitizeText(raw.actionText, 48) || defaultAgentWorkflowShowcaseConfig.actionText,
    videoUrl: sanitizeText(raw.videoUrl, 2000),
    posterUrl: sanitizeText(raw.posterUrl, 2000) || null,
    overlayText:
      sanitizeText(raw.overlayText, 200) || defaultAgentWorkflowShowcaseConfig.overlayText,
    footerText:
      sanitizeText(raw.footerText, 64) || defaultAgentWorkflowShowcaseConfig.footerText,
  };
}
