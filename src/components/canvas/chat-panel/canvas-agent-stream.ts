// Modified for standalone community distribution; see NOTICE.
export type CanvasMediaStreamPayload = {
  messageId?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  prompt?: string;
  sourceImageUrls?: string[];
  agentPresetId?: string;
  agentPresetName?: string;
  agentCategoryId?: string;
  agentCategoryName?: string;
  agentExecutionSnapshotId?: string;
};

export type ImageGenerationStatusStreamPayload = {
  phase?: "queued" | "processing" | "finalizing" | "failed" | "completed";
  providerType?: string;
  modelName?: string;
  imageCount?: number;
  queuePosition?: number;
  sameModelRunningCount?: number;
  concurrencyLimit?: number;
  estimatedWaitMs?: number;
};

export type AgentTargetLockRefPreview = {
  url: string;
  title?: string;
  nodeId?: string;
  assetId?: string;
  source:
    | "current_message"
    | "canvas_selection"
    | "canvas_context"
    | "history_user_upload"
    | "history_assistant_result"
    | "working_memory";
  role: "upload" | "selected" | "reference" | "history_result" | "working_memory";
  isSelected?: boolean;
  positionLabel?: string;
};

export type AgentTargetLockStreamPayload = {
  stage?: "locked" | "clarify" | "unresolved";
  resolutionMode?:
    | "explicit_selection"
    | "current_upload"
    | "text_reference"
    | "working_memory"
    | "latest_result"
    | "clarification"
    | "none";
  confidence?: number;
  reason?: string;
  needsClarification?: boolean;
  clarificationMessage?: string;
  targetCount?: number;
  candidateCount?: number;
  targets?: AgentTargetLockRefPreview[];
  candidates?: AgentTargetLockRefPreview[];
};

export type AgentProgressStreamPayload = {
  stage?: "planning" | "clarify" | "executing" | "completed" | "failed";
  currentStep?: "lock_target" | "analyze" | "select_tool" | "execute" | "finalize";
  title?: string;
  message?: string;
  toolName?: string;
  capability?: string;
};

export const AGENT_PROGRESS_STEPS: Array<{
  key: NonNullable<AgentProgressStreamPayload["currentStep"]>;
  label: string;
}> = [
  { key: "lock_target", label: "整理素材" },
  { key: "analyze", label: "理解需求" },
  { key: "select_tool", label: "优化提示" },
  { key: "execute", label: "提交生成" },
  { key: "finalize", label: "整理结果" },
];

export function getAgentTargetLockTitle(payload?: AgentTargetLockStreamPayload | null) {
  if (payload?.stage === "clarify") return "需要确认目标";
  if (payload?.stage === "locked") return "当前锁定目标";
  return "待锁定目标";
}

export function getAgentTargetResolutionLabel(
  mode?: AgentTargetLockStreamPayload["resolutionMode"]
) {
  switch (mode) {
    case "explicit_selection":
      return "画布选中";
    case "current_upload":
      return "当前上传";
    case "text_reference":
      return "文本定位";
    case "working_memory":
      return "工作记忆";
    case "latest_result":
      return "最新结果";
    case "clarification":
      return "待确认";
    case "none":
      return "未解析";
    default:
      return "自动解析";
  }
}

export function getAgentProgressFallbackTitle(payload?: AgentProgressStreamPayload | null) {
  switch (payload?.stage) {
    case "clarify":
      return "需要补充信息";
    case "executing":
      return "正在生成结果";
    case "completed":
      return "创作完成";
    case "failed":
      return "创作失败";
    default:
      return "正在理解需求";
  }
}
