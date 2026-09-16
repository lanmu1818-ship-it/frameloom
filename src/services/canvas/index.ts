// Modified for standalone community distribution; see NOTICE.
// 画布服务层
import type {
  CanvasProject,
  CanvasProjectListItem,
  CanvasState,
  CanvasNode,
  CanvasWorkspaceType,
} from '@/types/canvas/index';
import type { VideoGenerationMode, VideoRatio, VideoResolution } from '@/types/ai';
import { apiFetch } from '@/src/client/api';
import {
  createUploadErrorFromResponse,
  fetchUploadWithRetry,
  getUploadErrorMessage,
} from '@/src/client/upload-with-retry';
import { readPreloadedCanvasProject } from "@/src/client/canvas-project-preload";
import { dispatchProviderApiKeyPromptFromError } from "@/src/client/provider-api-key-prompt";
import { createClientLogger } from '@/src/lib/observability/client-logger';

const log = createClientLogger("Canvas");

function logCatch(
  err: unknown,
  context: string,
  extra?: Record<string, unknown>
): void {
  const error = err instanceof Error ? err : new Error(String(err));
  log.error(`${context} failed`, error, extra);
}

// API 响应类型
interface ApiResponse<T = any> {
  httpStatus?: number;
  success: boolean;
  data?: T;
  error?: string;
  providerApiKeyPrompted?: boolean;
  pagination?: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface NormalizedCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasTextDetectItem {
  id: string;
  text: string;
  confidence?: number;
}

export interface CanvasTextEditPayloadItem {
  id: string;
  originalText: string;
  editedText?: string;
  textColor?: string;
  action?: 'replace' | 'delete';
}

export interface CanvasTextSuggestionItem {
  text: string;
  reason?: string;
}

export type WorkflowAnalysisMode =
  | "video-analysis"
  | "character-scene-extraction"
  | "story-script"
  | "agent-plan";

export interface CanvasImageArchiveIdentity {
  assetId?: string;
  mediaAssetId?: string;
  generatedImageId?: string;
  thumbnailUrl?: string;
}

export type CanvasImageToolResult = CanvasImageArchiveIdentity & {
  url: string;
};

function normalizeImageArchiveId(value: unknown) {
  const id = String(value || "").trim();
  if (!id || id.length > 128) {
    return undefined;
  }
  return id;
}

function extractImageArchiveIdentity(data: any): CanvasImageArchiveIdentity {
  const mediaAssetId = normalizeImageArchiveId(
    data?.mediaAssetId || data?.media_asset_id || data?.assetId || data?.asset_id
  );
  const generatedImageId = normalizeImageArchiveId(
    data?.generatedImageId || data?.generated_image_id
  );
  const thumbnailUrl =
    typeof data?.thumbnailUrl === "string" && data.thumbnailUrl.trim()
      ? data.thumbnailUrl.trim()
      : typeof data?.thumbnail_url === "string" && data.thumbnail_url.trim()
        ? data.thumbnail_url.trim()
        : undefined;

  return {
    ...(mediaAssetId ? { assetId: mediaAssetId, mediaAssetId } : {}),
    ...(generatedImageId ? { generatedImageId } : {}),
    ...(thumbnailUrl ? { thumbnailUrl } : {}),
  };
}

function buildCanvasImageToolResult(data: any): CanvasImageToolResult | null {
  const url =
    typeof data?.original_url === "string" && data.original_url.trim()
      ? data.original_url.trim()
      : typeof data?.originalUrl === "string" && data.originalUrl.trim()
        ? data.originalUrl.trim()
        : typeof data?.url === "string" && data.url.trim()
          ? data.url.trim()
          : "";

  if (!url) {
    return null;
  }

  return {
    url,
    ...extractImageArchiveIdentity(data),
  };
}

// 画布服务
export const canvasService = {
  // 获取画布列表
  async getProjects(
    workspaceType: CanvasWorkspaceType = 'canvas',
    options: { page?: number; limit?: number } = {}
  ): Promise<ApiResponse<CanvasProjectListItem[]>> {
    try {
      const params = new URLSearchParams();
      if (workspaceType && workspaceType !== 'canvas') {
        params.set('workspaceType', workspaceType);
      }
      params.set('page', String(Math.max(1, Math.round(options.page || 1))));
      params.set('limit', String(Math.max(1, Math.round(options.limit || 24))));
      const response = await apiFetch(`/api/canvas?${params.toString()}`);
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: '获取画布列表失败' };
    }
  },

  // 获取单个画布
  async getProject(id: string): Promise<ApiResponse<CanvasProject>> {
    try {
      const preloadedProject = readPreloadedCanvasProject(id);
      if (preloadedProject) {
        return await preloadedProject;
      }

      const response = await apiFetch(`/api/canvas/${id}`);
      const data = await response.json();
      return { ...data, httpStatus: response.status };
    } catch (error) {
      return { success: false, error: '获取画布失败' };
    }
  },

  // 创建画布
  async createProject(
    project: Partial<CanvasProject>,
    workspaceType: CanvasWorkspaceType = 'canvas'
  ): Promise<ApiResponse<CanvasProject>> {
    try {
      const response = await apiFetch('/api/canvas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...project, workspaceType }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: '创建画布失败' };
    }
  },

  // 更新画布
  async updateProject(
    id: string,
    updates: Partial<CanvasProject>,
    workspaceType?: CanvasWorkspaceType
  ): Promise<ApiResponse<CanvasProject>> {
    try {
      const response = await apiFetch(`/api/canvas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          workspaceType ? { ...updates, workspaceType } : updates
        ),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: '更新画布失败' };
    }
  },

  // 删除画布
  async deleteProject(id: string): Promise<ApiResponse> {
    try {
      const response = await apiFetch(`/api/canvas/${id}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: '删除画布失败' };
    }
  },

  // 保存画布状态
  async saveCanvasState(
    id: string,
    canvasData: CanvasState,
    workspaceType?: CanvasWorkspaceType
  ): Promise<ApiResponse> {
    try {
      const requestBody = JSON.stringify(
        workspaceType ? { canvasData, workspaceType } : { canvasData }
      );
      const doSave = async () =>
        apiFetch(`/api/canvas/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: requestBody,
        });

      let response = await doSave();
      if (response.status === 429) {
        const retryPayload = await response.json().catch(() => ({}));
        const retryAfter = Number(retryPayload?.retryAfter || 0);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : 800;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
        response = await doSave();
      }

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        return { success: false, error: String(data?.error || data?.message || '保存画布状态失败') };
      }
      return data as ApiResponse;
    } catch (error) {
      return { success: false, error: '保存画布状态失败' };
    }
  },

  // 自动保存（防抖）
  createAutoSave(projectId: string, delay = 2000) {
    let timeoutId: NodeJS.Timeout | null = null;

    return (canvasData: CanvasState) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(async () => {
        await this.saveCanvasState(projectId, canvasData);
      }, delay);
    };
  },
};

// 图片生成服务
export const imageGenerationService = {
  // 上传图片到存储桶
  async uploadImage(file: File): Promise<ApiResponse<{ url: string; pathname: string; assetId?: string }>> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'canvas-upload');

      const response = await fetchUploadWithRetry(formData);

      if (!response.ok) {
        const error = await createUploadErrorFromResponse(response, '上传失败');
        const message = getUploadErrorMessage(error, '上传失败');
        return {
          success: false,
          ...(message
            ? { error: message }
            : { providerApiKeyPrompted: true }),
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: {
          url: data.url,
          pathname: data.pathname,
          assetId: typeof data.assetId === "string" ? data.assetId : undefined,
        }
      };
    } catch (error) {
      logCatch(error, "image_upload");
      const message = getUploadErrorMessage(error, '图片上传失败');
      return {
        success: false,
        ...(message
          ? { error: message }
          : { providerApiKeyPrompted: true }),
      };
    }
  },

  // AI 生成图片
  async generateImage(params: {
    prompt: string;
    negativePrompt?: string;
    model?: string;
    aspectRatio?: string;
    imageSize?: string;
    imageCount?: number;
    promptExtend?: boolean;
    referenceImage?: string;
    referenceImages?: string[];
    billingFeature?: 'multi-view' | 'repaint';
    async?: boolean;
  }): Promise<
    ApiResponse<{
      images: Array<
        CanvasImageArchiveIdentity & {
          thumbnailUrl: string;
          originalUrl: string;
        }
      >;
      model?: string;
      prompt?: string;
      queueStatus?: unknown;
      status?: string;
      taskId?: string;
    }>
  > {
    try {
      const response = await apiFetch('/api/canvas/generate/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      dispatchProviderApiKeyPromptFromError(data);
      if (data?.success && data?.taskId) {
        return {
          success: true,
          data: {
            images: [],
            queueStatus: data.queueStatus,
            status: data.status,
            taskId: data.taskId,
          },
        };
      }
      return data;
    } catch (error) {
      if (dispatchProviderApiKeyPromptFromError(error)) {
        return { success: false, error: "请先配置 API Key 后再生成" };
      }
      return { success: false, error: '生成图片失败' };
    }
  },

  async localEdit(params: {
    sourceImageUrl: string;
    sourceNodeId?: string;
    regions: Array<{
      id: string;
      index?: number;
      color: string;
      prompt: string;
      rect: NormalizedCropRect;
      referenceImages?: Array<{
        id?: string;
        url: string;
        name?: string;
        source?: "upload" | "canvas";
      }>;
    }>;
    model?: string;
    imageSize?: string;
    aspectRatio?: string;
    operation?: "scale-adjust";
    scalePercent?: -30 | -20 | -10 | 10 | 20 | 30;
  }): Promise<
    ApiResponse<{
      annotatedReferenceUrl: string;
      aspectRatio?: string;
      displayPrompt?: string;
      prompt: string;
      queueStatus?: unknown;
      sourceHeight?: number;
      sourceWidth?: number;
      status?: string;
      taskId: string;
    }>
  > {
    try {
      const response = await apiFetch('/api/canvas/local-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      if (data.success && data.taskId) {
        return {
          success: true,
          data: {
            annotatedReferenceUrl: data.annotatedReferenceUrl,
            aspectRatio: data.aspectRatio,
            displayPrompt: data.displayPrompt,
            prompt: data.prompt,
            queueStatus: data.queueStatus,
            sourceHeight: data.sourceHeight,
            sourceWidth: data.sourceWidth,
            status: data.status,
            taskId: data.taskId,
          },
        };
      }
      return { success: false, error: data.error || '局部编辑提交失败' };
    } catch (error) {
      logCatch(error, "local_edit_submit");
      return { success: false, error: '局部编辑提交失败' };
    }
  },

  async getImageTask(taskId: string): Promise<
    ApiResponse<{
      task: {
        id: string;
        status: string;
        error?: string | null;
        result?: {
          images?: Array<
            CanvasImageArchiveIdentity & {
              thumbnailUrl: string;
              originalUrl: string;
            }
          >;
          model?: string;
          modelRef?: string;
          prompt?: string;
        } | null;
        queueStatus?: unknown;
      };
    }>
  > {
    try {
      const response = await apiFetch(`/api/canvas/generate/image?taskId=${encodeURIComponent(taskId)}`);
      const data = await response.json();
      if (data.success && data.task) {
        return { success: true, data: { task: data.task } };
      }
      return { success: false, error: data.error || '查询生图任务失败' };
    } catch (error) {
      logCatch(error, "image_task_fetch", { taskId });
      return { success: false, error: '查询生图任务失败' };
    }
  },

  // 图片抠图 - 使用图片URL
  async removeBackground(imageUrl: string): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      const response = await apiFetch('/api/rmbg', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }), // 使用 imageUrl 参数
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || '抠图失败' };
    } catch (error) {
      logCatch(error, "remove_background");
      return { success: false, error: '抠图失败' };
    }
  },

  async boxCutout(params: {
    imageUrl: string;
    cropRect: NormalizedCropRect;
    paddingRatio?: number;
    sourceNodeId?: string;
  }): Promise<
    ApiResponse<{
      url: string;
      assetId?: string;
      mediaAssetId?: string;
      generatedImageId?: string;
      thumbnailUrl?: string;
      cropRectApplied?: NormalizedCropRect;
      paddedCropRectApplied?: NormalizedCropRect;
    }>
  > {
    try {
      const response = await apiFetch('/api/canvas/box-cutout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return {
          success: true,
          data: {
            ...imageResult,
            cropRectApplied: data.cropRectApplied,
            paddedCropRectApplied: data.paddedCropRectApplied,
          },
        };
      }
      return { success: false, error: data.error || '框选抠图失败' };
    } catch (error) {
      logCatch(error, "box_cutout");
      return { success: false, error: '框选抠图失败' };
    }
  },

  // 去水印 - 使用图片URL
  async removeWatermark(imageUrl: string): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      const response = await apiFetch('/api/watermark-remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: imageUrl }),
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || '去水印失败' };
    } catch (error) {
      logCatch(error, "remove_watermark");
      return { success: false, error: '去水印失败' };
    }
  },

  // 图片增强 - 使用图片URL
  async enhanceImage(
    imageUrl: string,
    options?: {
      scaleFactor?: number;
    }
  ): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      const response = await apiFetch('/api/canvas/image-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: 'enhance',
          imageUrl,
          scaleFactor: options?.scaleFactor,
        }),
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || '图片增强失败' };
    } catch (error) {
      logCatch(error, "enhance_image");
      return { success: false, error: '图片增强失败' };
    }
  },

  async generateBackground(
    imageUrl: string,
    prompt: string
  ): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      const response = await apiFetch('/api/canvas/image-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolId: 'background-generator',
          imageUrl,
          prompt,
        }),
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || '背景生成失败' };
    } catch (error) {
      logCatch(error, "generate_background");
      return { success: false, error: '背景生成失败' };
    }
  },

  // 图片扩展 - 使用图片URL
  async extendImage(
    imageUrl: string,
    options?:
      | string
      | {
          prompt?: string;
          xScale?: number;
          yScale?: number;
        }
  ): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      const normalizedOptions =
        typeof options === 'string'
          ? {
              prompt: options.trim() ? `图像拓展处理：${options.trim()}` : undefined,
            }
          : options || {};
      const response = await apiFetch('/api/extend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imageUrl,
          prompt: normalizedOptions.prompt || '图像拓展处理',
          includeBase64: false,
          ...(typeof normalizedOptions.xScale === 'number'
            ? { xScale: normalizedOptions.xScale }
            : {}),
          ...(typeof normalizedOptions.yScale === 'number'
            ? { yScale: normalizedOptions.yScale }
            : {}),
        }),
      });
      const data = await response.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || data.detail || '图片扩展失败' };
    } catch (error) {
      logCatch(error, "extend_image");
      return { success: false, error: '图片扩展失败' };
    }
  },

  async splitImageLayers(imageUrl: string): Promise<
    ApiResponse<{
      layers: Array<{
        originalUrl: string;
        thumbnailUrl: string;
        assetId?: string | null;
        mediaAssetId?: string | null;
        generatedImageId?: string | null;
        title: string;
        layerIndex: number;
        totalLayers: number;
        bounds?: {
          x: number;
          y: number;
          width: number;
          height: number;
          originalWidth: number;
          originalHeight: number;
          coverage: number;
        } | null;
      }>;
      model?: string;
      provider?: string;
    }>
  > {
    try {
      const response = await apiFetch('/api/layer-split', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await response.json();
      if (data.success && Array.isArray(data.layers)) {
        return {
          success: true,
          data: {
            layers: data.layers,
            model: data.model,
            provider: data.provider,
          },
        };
      }
      return { success: false, error: data.error || '图层拆分失败' };
    } catch (error) {
      logCatch(error, "split_image_layers");
      return { success: false, error: '图层拆分失败' };
    }
  },

  // 尺寸调整 - 通过 URL 下载图片，调整大小后上传到 S3
  async resizeImage(imageUrl: string, width: number, height: number): Promise<ApiResponse<CanvasImageToolResult>> {
    try {
      // 1. 下载原图
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('下载图片失败');
      }
      const blob = await response.blob();

      // 2. 使用 canvas 调整尺寸
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('无法创建 canvas context');
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('图片加载失败'));
        img.src = URL.createObjectURL(blob);
      });

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);

      // 3. 转换为 base64
      const base64 = canvas.toDataURL('image/png').split(',')[1];

      // 4. 上传到 S3
      const uploadResponse = await apiFetch('/api/resize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_base64: base64,
          canvasWidth: width,
          canvasHeight: height,
          prompt: '尺寸调整',
        }),
      });

      const data = await uploadResponse.json();
      const imageResult = buildCanvasImageToolResult(data);
      if (data.success && imageResult) {
        return { success: true, data: imageResult };
      }
      return { success: false, error: data.error || '尺寸调整失败' };
    } catch (error) {
      logCatch(error, "resize_image", { width, height });
      return { success: false, error: '尺寸调整失败' };
    }
  },

  // 角度编辑
  async editAngle(params: {
    imageUrl: string;
    horizontalAngle: number;
    verticalAngle: number;
    zoom: number;
  }): Promise<
    ApiResponse<{
      url: string;
      thumbnailUrl?: string;
      prompt?: string;
      angles?: {
        horizontal_angle?: number;
        vertical_angle?: number;
        zoom?: number;
      };
    }>
  > {
    try {
      const response = await apiFetch('/api/angle-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: params.imageUrl,
          horizontal_angle: params.horizontalAngle,
          vertical_angle: params.verticalAngle,
          zoom: params.zoom,
        }),
      });
      const data = await response.json();
      if (data.success && data.image_url) {
        return {
          success: true,
          data: {
            url: data.image_url,
            thumbnailUrl: data.thumbnail_url,
            prompt: data.prompt,
            angles: data.angles,
          },
        };
      }
      return { success: false, error: data.error || '角度编辑失败' };
    } catch (error) {
      return { success: false, error: '角度编辑失败' };
    }
  },

  // 识别图片中的文字（OCR）
  async detectCanvasText(imageUrl: string): Promise<ApiResponse<{ items: CanvasTextDetectItem[]; model?: string }>> {
    try {
      const response = await apiFetch('/api/canvas/text-detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      logCatch(error, "detect_canvas_text");
      return { success: false, error: '文字识别失败' };
    }
  },

  // 生成文字改写建议
  async generateCanvasTextSuggestions(params: {
    imageUrl: string;
    originalText: string;
    currentText?: string;
    title?: string;
    pageTexts?: string[];
    audience?: string;
    usageScenario?: string;
    coreNeed?: string;
    productName?: string;
    workflowSummary?: string;
    workflowPrompt?: string;
    userPrompt?: string;
    presetName?: string;
  }): Promise<ApiResponse<{ suggestions: CanvasTextSuggestionItem[]; model?: string }>> {
    try {
      const response = await apiFetch('/api/canvas/text-copy-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      logCatch(error, "text_suggestions");
      return { success: false, error: '文案建议生成失败' };
    }
  },

  // 应用文字替换并生成新图
  async editCanvasText(params: {
    imageUrl: string;
    items: CanvasTextEditPayloadItem[];
  }): Promise<ApiResponse<{ thumbnailUrl: string; originalUrl: string; model?: string }>> {
    try {
      const response = await apiFetch('/api/canvas/text-edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      logCatch(error, "edit_canvas_text", { itemCount: params.items.length });
      return { success: false, error: error instanceof Error ? error.message : '文字替换失败' };
    }
  },
};

// 视频生成服务
export const videoGenerationService = {
  // 生成视频
  async generateVideo(params: {
    prompt: string;
    mode?: VideoGenerationMode;
    images?: string[];
    resolution?: VideoResolution;
    ratio?: VideoRatio;
    duration?: number;
    watermark?: boolean;
    cameraFixed?: boolean;
    returnLastFrame?: boolean;
    preferredModelRef?: string;
  }): Promise<
    ApiResponse<{
      url: string;
      metadata?: Record<string, any> | null;
      modelDisplayName?: string;
      modelId?: string;
      modelRef?: string;
      mode?: VideoGenerationMode;
      images?: string[];
    }>
  > {
    try {
      const response = await apiFetch('/api/canvas/generate/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      dispatchProviderApiKeyPromptFromError(data);
      return data;
    } catch (error) {
      if (dispatchProviderApiKeyPromptFromError(error)) {
        return { success: false, error: "请先配置 API Key 后再生成" };
      }
      return { success: false, error: '生成视频失败' };
    }
  },
};

export const workflowAnalysisService = {
  async analyze(params: {
    mode: WorkflowAnalysisMode;
    prompt?: string;
    imageUrls?: string[];
    videoUrls?: string[];
    nodeTitle?: string;
    preferredModelRef?: string;
  }): Promise<
    ApiResponse<{
      assetCandidates?: { style?: string; characters?: string[]; scenes?: string[]; props?: string[] } | null;
      analysisRows?: Array<{
        shot?: string;
        duration?: string | number;
        scene?: string;
        narrative?: string;
        shotSize?: string;
        lighting?: string;
        dialogue?: string;
        cameraAngle?: string;
        cameraMovement?: string;
        focusDepth?: string;
        sceneDescription?: string;
        backgroundMusic?: string;
        voiceAndSfx?: string;
        imagePrompt?: string;
        motionPrompt?: string;
        keyframeUrl?: string;
      }>;
      framePreviews?: string[];
      summary?: string;
      highlights?: string[];
      shotIdeas?: Array<{ title: string; description: string }>;
      visualMotifs?: string[];
      recommendedNextSteps?: string[];
      characters?: Array<Record<string, any>>;
      scenes?: Array<Record<string, any>>;
      relationships?: string[];
      agentPlan?: string[];
      deliverables?: string[];
      recommendedNodes?: string[];
      model?: string | null;
      raw?: string;
    }>
  > {
    try {
      const response = await apiFetch('/api/canvas/workflow/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: '工作流分析失败' };
    }
  },
};

export default {
  canvas: canvasService,
  image: imageGenerationService,
  video: videoGenerationService,
};
