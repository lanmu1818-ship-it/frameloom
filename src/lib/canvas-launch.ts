// Modified for standalone community distribution; see NOTICE.
export interface CanvasLaunchAttachment {
  url: string;
  name: string;
  contentType: string;
  assetId?: string;
}

export interface CanvasLaunchImageParams {
  aspectRatio?: string;
  imageSize?: string;
  imageCount?: number;
  size?: string;
  negativePrompt?: string;
  promptExtend?: boolean;
  enableWebSearch?: boolean;
  watermark?: boolean;
  seed?: number;
}

export type CanvasLaunchComposerMode = "agent" | "image" | "video" | "detail";

export interface CanvasLaunchPayload {
  prompt: string;
  attachments: CanvasLaunchAttachment[];
  autoSend?: boolean;
  createdAt?: number;
  selectedModelId?: string;
  composerMode?: CanvasLaunchComposerMode;
  imageParams?: CanvasLaunchImageParams;
}

export function getCanvasLaunchStorageKey(canvasId: string): string {
  return `canvas-home-launch:${canvasId}`;
}
