// Modified for standalone community distribution; see NOTICE.
import type { AgentWorkflowPersistedState } from "@/types/agent";
import type { UiScreenDocument } from "@/src/lib/ui-screen/schema";

export type CanvasWorkspaceType = 'canvas' | 'agent' | 'video';

// 画布节点类型定义

export type NodeType =
  | 'message'
  | 'image'
  | 'image-folder'
  | 'video'
  | 'text'
  | 'ui-screen'
  | 'workflow';
export type NodeStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type ToolType = 'select' | 'pan' | 'draw' | 'text';

// 画布节点位置
export interface Position {
  x: number;
  y: number;
}

// 画布节点尺寸
export interface Size {
  width: number;
  height: number;
}

// 视口状态
export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// 消息节点数据
export interface MessageNodeData {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
}

// 图片文字编辑项
export interface ImageTextEditItem {
  id: string;
  originalText: string;
  editedText: string;
  textColor?: string;
  confidence?: number;
}

// 图片节点数据
export interface ImageNodeData {
  src: string;
  assetId?: string;
  title?: string;
  note?: string;
  prompt?: string;
  model?: string;
  status: NodeStatus;
  metadata?: Record<string, any>;
  // 图片编辑相关
  originalSrc?: string;
  editHistory?: ImageEditAction[];
  hasAnnotations?: boolean; // 🆕 标记图片是否有用户标注
  textEditItems?: ImageTextEditItem[]; // OCR 识别到的可编辑文字
  textEditSource?: string; // OCR 结果对应的图片 URL
  textEditUpdatedAt?: string; // OCR 更新时间
}

export interface ImageFolderNodeData {
  title?: string;
  status: NodeStatus;
  imageNodeIds: string[];
  layout?: {
    columns?: number;
    gap?: number;
    padding?: number;
    headerHeight?: number;
  };
  metadata?: Record<string, any>;
}

// 视频节点数据
export interface VideoNodeData {
  src: string;
  assetId?: string;
  thumbnail?: string;
  prompt?: string;
  model?: string;
  status: NodeStatus;
  duration?: number;
  progress?: number; // 生成进度百分比
  coverImage?: string; // 用于生成视频的封面图
  metadata?: Record<string, any>;
}

// 文本节点数据
export interface TextNodeData {
  content: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  fontWeight?: string;
  lineHeight?: number;
  letterSpacing?: number;
  textAlign?: "left" | "center" | "right";
  transparent?: boolean;
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  padding?: number;
  boxShadow?: string;
  backdropBlur?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  metadata?: Record<string, any>;
}

export interface UiScreenNodeData {
  status: NodeStatus;
  document: UiScreenDocument;
  renderArtifacts?: {
    htmlUrl?: string;
    screenshotUrl?: string;
    thumbnailUrl?: string;
    layerMap?: Array<{
      layerId: string;
      x: number;
      y: number;
      width: number;
      height: number;
    }>;
  };
  source?: {
    prompt?: string;
    model?: string;
    generationId?: string;
  };
  evaluation?: {
    score?: number;
    issues?: string[];
    reviewedAt?: string;
  };
  metadata?: Record<string, any>;
}

// 工作流节点数据
export interface WorkflowNodeData {
  templateType: string;
  title: string;
  description?: string;
  summary?: string;
  status: NodeStatus;
  group?: string;
  accentColor?: string;
  metadata?: Record<string, any>;
}

// 画布节点
export interface CanvasNode {
  id: string;
  type: NodeType;
  position: Position;
  size: Size;
  data:
    | MessageNodeData
    | ImageNodeData
    | ImageFolderNodeData
    | VideoNodeData
    | TextNodeData
    | UiScreenNodeData
    | WorkflowNodeData;
  connections: string[]; // 连接的节点 ID
  parentId?: string; // 父节点 ID（用于对话上下文）
  createdAt: Date;
  updatedAt: Date;
}

// 画布连接线
export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'conversation' | 'reference';
}

// 画布状态
export interface CanvasState {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  selectedNodeIds: string[];
  viewport: Viewport;
  tool: ToolType;
  suppressedMediaKeys?: string[];
  workflowState?: AgentWorkflowPersistedState;
}

// 画布项目
export interface CanvasProject {
  id: string;
  userId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  workspaceType?: CanvasWorkspaceType;
  canvasData: CanvasState;
  createdAt: Date;
  updatedAt: Date;
}

export type CanvasInitialProject = Omit<CanvasProject, "canvasData" | "createdAt" | "description" | "thumbnail" | "updatedAt"> & {
  canvasData: CanvasState;
  createdAt: string;
  description?: string | null;
  thumbnail?: string | null;
  updatedAt: string;
};

export type CanvasProjectListItem = Omit<CanvasProject, "canvasData">;

// 附件类型
export interface Attachment {
  type: 'image' | 'file';
  url: string;
  name?: string;
  mimeType?: string;
}

// 图片编辑操作
export interface ImageEditAction {
  type:
    | 'rmbg'
    | 'enhance'
    | 'extend'
    | 'crop'
    | 'adjust'
    | 'flip-rotate'
    | 'resize'
    | 'angle-edit'
    | 'annotate'
    | 'text-edit'
    | 'box-cutout'
    | 'layer-split';
  timestamp: Date;
  params?: Record<string, any>;
  resultUrl?: string;
}

// 图片操作菜单项
export interface ImageAction {
  label: string;
  action: string;
  icon?: React.ComponentType<{ className?: string }>;
  api?: string;
  component?: React.ComponentType<any>;
  tool?: string;
}

// AI 生成参数
export interface GenerationParams {
  prompt: string;
  model: string;
  negativePrompt?: string;
  size?: string;
  style?: string;
  referenceImage?: string;
  // 图片生成特有
  aspectRatio?: string;
  // 视频生成特有
  duration?: number;
  fps?: number;
}

// API 响应类型
export interface CanvasApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}
