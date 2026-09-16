// Modified for standalone community distribution; see NOTICE.
import type { CanvasNode, NodeType, Position } from "@/types/canvas/index";

const DEFAULT_VIDEO_WORKFLOW_TEXT_COLOR = "#111827";

export type VideoWorkflowSectionId =
  | "input"
  | "analysis"
  | "storyboard"
  | "generation"
  | "character"
  | "tool"
  | "output";

export type VideoWorkflowTemplateType =
  | "camera-movement"
  | "canvas-node"
  | "character-description"
  | "create-character"
  | "create-scene"
  | "custom-agent"
  | "doodle-canvas"
  | "extract-characters-scenes"
  | "gen-image"
  | "gen-music"
  | "gen-video"
  | "generate-character-image"
  | "generate-character-video"
  | "generate-scene-image"
  | "generate-scene-video"
  | "image-compare"
  | "inpaint-crop"
  | "inpaint-stitch"
  | "input-image"
  | "jimeng-super-resolution"
  | "local-save"
  | "motion-control"
  | "novel-input"
  | "preview"
  | "professional-camera"
  | "rh-app"
  | "rh-comfy"
  | "scene-description"
  | "storyboard-chart-node"
  | "storyboard-node"
  | "table-editor-node"
  | "text-node"
  | "video-analyze"
  | "video-input";

export interface VideoWorkflowQuickConnectOption {
  type: VideoWorkflowTemplateType;
  label: string;
}

export interface VideoWorkflowNodeDefinition {
  type: VideoWorkflowTemplateType;
  label: string;
  description: string;
  group: VideoWorkflowSectionId;
  size: {
    width: number;
    height: number;
  };
  canvasNodeType: NodeType;
  accentColor: string;
  quickConnectOutputs: VideoWorkflowQuickConnectOption[];
}

export interface VideoWorkflowSectionDefinition {
  id: VideoWorkflowSectionId;
  label: string;
  description: string;
}

export interface VideoWorkflowStarterTemplate {
  id: string;
  title: string;
  description: string;
  nodes: VideoWorkflowTemplateType[];
}

const QUICK_CONNECT_CONFIG: Partial<
  Record<VideoWorkflowTemplateType, VideoWorkflowQuickConnectOption[]>
> = {
  "text-node": [
    { type: "gen-image", label: "绘画" },
    { type: "gen-video", label: "视频" },
    { type: "custom-agent", label: "Agent" },
  ],
  "input-image": [
    { type: "gen-image", label: "绘画" },
    { type: "gen-video", label: "视频" },
    { type: "storyboard-node", label: "分镜视表" },
    { type: "inpaint-crop", label: "裁剪局部重绘" },
  ],
  "novel-input": [
    { type: "custom-agent", label: "Agent" },
    { type: "text-node", label: "文本" },
    { type: "rh-app", label: "RH 应用" },
  ],
  "video-input": [
    { type: "preview", label: "预览" },
    { type: "rh-app", label: "RH 应用" },
  ],
  "video-analyze": [
    { type: "storyboard-node", label: "分镜视表" },
    { type: "gen-image", label: "绘画" },
  ],
  "table-editor-node": [{ type: "storyboard-node", label: "分镜视表" }],
  "storyboard-node": [
    { type: "gen-image", label: "绘画" },
    { type: "gen-video", label: "视频" },
  ],
  "storyboard-chart-node": [{ type: "preview", label: "预览" }],
  "inpaint-stitch": [
    { type: "preview", label: "预览" },
    { type: "local-save", label: "保存" },
  ],
};

const SECTION_DEFINITIONS: VideoWorkflowSectionDefinition[] = [
  { id: "input", label: "输入", description: "脚本、图片、视频和小说素材入口" },
  { id: "analysis", label: "分析", description: "拆解素材、抽取镜头和角色语义" },
  { id: "storyboard", label: "分镜", description: "组织镜头表、图表和镜头语言" },
  { id: "generation", label: "生成", description: "图片、视频、音乐和增强节点" },
  { id: "character", label: "角色场景", description: "角色与场景资产沉淀和派生" },
  { id: "tool", label: "工具", description: "代理、画板、局部编辑和外部应用" },
  { id: "output", label: "输出", description: "预览、对比和保存结果" },
];

const COMPACT_NODE_SIZE_OVERRIDES: Partial<
  Record<VideoWorkflowTemplateType, { width: number; height: number }>
> = {
  "text-node": { width: 300, height: 170 },
  "novel-input": { width: 340, height: 240 },
  "input-image": { width: 220, height: 220 },
  "video-input": { width: 240, height: 220 },
  "video-analyze": { width: 300, height: 210 },
  "extract-characters-scenes": { width: 300, height: 210 },
  "storyboard-node": { width: 380, height: 240 },
  "storyboard-chart-node": { width: 360, height: 220 },
  "table-editor-node": { width: 340, height: 220 },
  "gen-image": { width: 280, height: 190 },
  "gen-video": { width: 280, height: 190 },
  "gen-music": { width: 300, height: 200 },
  "jimeng-super-resolution": { width: 260, height: 160 },
  "motion-control": { width: 300, height: 220 },
  "inpaint-crop": { width: 280, height: 180 },
  "inpaint-stitch": { width: 280, height: 180 },
  "professional-camera": { width: 280, height: 180 },
  "camera-movement": { width: 280, height: 180 },
  "image-compare": { width: 320, height: 220 },
  preview: { width: 320, height: 220 },
  "local-save": { width: 260, height: 180 },
  "character-description": { width: 300, height: 180 },
  "scene-description": { width: 300, height: 180 },
  "create-character": { width: 280, height: 160 },
  "create-scene": { width: 280, height: 160 },
  "generate-character-image": { width: 300, height: 200 },
  "generate-character-video": { width: 300, height: 200 },
  "generate-scene-image": { width: 300, height: 200 },
  "generate-scene-video": { width: 300, height: 200 },
  "custom-agent": { width: 340, height: 220 },
  "rh-app": { width: 280, height: 180 },
  "rh-comfy": { width: 280, height: 180 },
  "canvas-node": { width: 360, height: 240 },
  "doodle-canvas": { width: 300, height: 180 },
};

function resolveCompactNodeSize(
  type: VideoWorkflowTemplateType,
  canvasNodeType: NodeType,
  size: { width: number; height: number }
) {
  const override = COMPACT_NODE_SIZE_OVERRIDES[type];
  if (override) {
    return override;
  }

  if (canvasNodeType === "workflow") {
    return {
      width: Math.min(size.width, 300),
      height: Math.min(size.height, 180),
    };
  }

  if (canvasNodeType === "text") {
    return {
      width: Math.min(size.width, 320),
      height: Math.min(size.height, 180),
    };
  }

  if (canvasNodeType === "image") {
    return {
      width: Math.min(size.width, 220),
      height: Math.min(size.height, 220),
    };
  }

  if (canvasNodeType === "video") {
    return {
      width: Math.min(size.width, 240),
      height: Math.min(size.height, 220),
    };
  }

  return size;
}

const createDefinition = (
  type: VideoWorkflowTemplateType,
  label: string,
  description: string,
  group: VideoWorkflowSectionId,
  size: { width: number; height: number },
  canvasNodeType: NodeType,
  accentColor: string
): VideoWorkflowNodeDefinition => ({
  type,
  label,
  description,
  group,
  size: resolveCompactNodeSize(type, canvasNodeType, size),
  canvasNodeType,
  accentColor,
  quickConnectOutputs: QUICK_CONNECT_CONFIG[type] || [],
});

export const VIDEO_WORKFLOW_NODE_DEFINITIONS: Record<
  VideoWorkflowTemplateType,
  VideoWorkflowNodeDefinition
> = {
  "camera-movement": createDefinition(
    "camera-movement",
    "镜头运动",
    "规划推拉摇移、运镜节奏和镜头情绪。",
    "storyboard",
    { width: 340, height: 480 },
    "workflow",
    "#fde68a"
  ),
  "canvas-node": createDefinition(
    "canvas-node",
    "画板节点",
    "把多个素材汇总到一个创意画板里继续编排。",
    "tool",
    { width: 600, height: 500 },
    "workflow",
    "#e2e8f0"
  ),
  "character-description": createDefinition(
    "character-description",
    "角色描述",
    "沉淀角色外观、气质和动作特征。",
    "character",
    { width: 400, height: 400 },
    "workflow",
    "#dbeafe"
  ),
  "create-character": createDefinition(
    "create-character",
    "创建角色",
    "将角色设定固化成可复用的角色资产。",
    "character",
    { width: 350, height: 300 },
    "workflow",
    "#dbeafe"
  ),
  "create-scene": createDefinition(
    "create-scene",
    "创建场景",
    "将场景描述固化成可复用的世界观素材。",
    "character",
    { width: 350, height: 300 },
    "workflow",
    "#dbeafe"
  ),
  "custom-agent": createDefinition(
    "custom-agent",
    "自定义代理",
    "接入一段更复杂的代理链路处理创作任务。",
    "tool",
    { width: 500, height: 800 },
    "workflow",
    "#e2e8f0"
  ),
  "doodle-canvas": createDefinition(
    "doodle-canvas",
    "涂鸦画板",
    "用草图、路径或遮罩表达额外视觉意图。",
    "tool",
    { width: 500, height: 300 },
    "workflow",
    "#e2e8f0"
  ),
  "extract-characters-scenes": createDefinition(
    "extract-characters-scenes",
    "提取角色场景",
    "从长文本里拆出角色、地点和关系线索。",
    "analysis",
    { width: 400, height: 500 },
    "workflow",
    "#bbf7d0"
  ),
  "gen-image": createDefinition(
    "gen-image",
    "生成图片",
    "根据上游脚本、分镜或素材生成关键帧。",
    "generation",
    { width: 360, height: 340 },
    "workflow",
    "#fecaca"
  ),
  "gen-music": createDefinition(
    "gen-music",
    "生成音乐",
    "为视频节奏匹配音乐、氛围和情绪。",
    "generation",
    { width: 350, height: 700 },
    "workflow",
    "#fecaca"
  ),
  "gen-video": createDefinition(
    "gen-video",
    "生成视频",
    "根据文本、图像或分镜节点生成视频镜头。",
    "generation",
    { width: 360, height: 340 },
    "workflow",
    "#fecaca"
  ),
  "generate-character-image": createDefinition(
    "generate-character-image",
    "生成角色图片",
    "围绕角色设定输出稳定的角色图像。",
    "character",
    { width: 400, height: 450 },
    "workflow",
    "#dbeafe"
  ),
  "generate-character-video": createDefinition(
    "generate-character-video",
    "生成角色视频",
    "围绕角色设定输出角色镜头或动作片段。",
    "character",
    { width: 400, height: 450 },
    "workflow",
    "#dbeafe"
  ),
  "generate-scene-image": createDefinition(
    "generate-scene-image",
    "生成场景图片",
    "围绕场景设定生成环境和氛围关键帧。",
    "character",
    { width: 400, height: 450 },
    "workflow",
    "#dbeafe"
  ),
  "generate-scene-video": createDefinition(
    "generate-scene-video",
    "生成场景视频",
    "围绕场景设定生成世界观或转场镜头。",
    "character",
    { width: 400, height: 450 },
    "workflow",
    "#dbeafe"
  ),
  "image-compare": createDefinition(
    "image-compare",
    "图片对比",
    "并排比较不同版本画面与细节变化。",
    "output",
    { width: 400, height: 300 },
    "workflow",
    "#bae6fd"
  ),
  "inpaint-crop": createDefinition(
    "inpaint-crop",
    "裁剪局部重绘",
    "选定区域后做局部改图、补图或定点修改。",
    "tool",
    { width: 340, height: 380 },
    "workflow",
    "#e2e8f0"
  ),
  "inpaint-stitch": createDefinition(
    "inpaint-stitch",
    "无缝拼回",
    "把局部重绘结果回贴到原始画面里。",
    "tool",
    { width: 340, height: 380 },
    "workflow",
    "#e2e8f0"
  ),
  "input-image": createDefinition(
    "input-image",
    "图片输入",
    "上传参考图、角色图、首帧或关键帧素材。",
    "input",
    { width: 260, height: 260 },
    "image",
    "#bfdbfe"
  ),
  "jimeng-super-resolution": createDefinition(
    "jimeng-super-resolution",
    "智能超清",
    "对结果做分辨率增强和画质修复。",
    "generation",
    { width: 320, height: 280 },
    "workflow",
    "#fecaca"
  ),
  "local-save": createDefinition(
    "local-save",
    "本地保存",
    "将流程输出整理并保存到本地项目目录。",
    "output",
    { width: 320, height: 380 },
    "workflow",
    "#bae6fd"
  ),
  "motion-control": createDefinition(
    "motion-control",
    "动作迁移",
    "把动作参考迁移到主体或镜头中。",
    "generation",
    { width: 320, height: 580 },
    "workflow",
    "#fecaca"
  ),
  "novel-input": createDefinition(
    "novel-input",
    "小说输入",
    "粘贴长篇设定、故事梗概或分章节剧情。",
    "input",
    { width: 400, height: 500 },
    "text",
    "#bfdbfe"
  ),
  "preview": createDefinition(
    "preview",
    "预览节点",
    "检查上游视频、图片或分镜输出效果。",
    "output",
    { width: 440, height: 310 },
    "workflow",
    "#bae6fd"
  ),
  "professional-camera": createDefinition(
    "professional-camera",
    "专业镜头",
    "补充焦段、景别和镜头语言规则。",
    "storyboard",
    { width: 320, height: 420 },
    "workflow",
    "#fde68a"
  ),
  "rh-app": createDefinition(
    "rh-app",
    "RH 应用",
    "跳转外部 RH 应用执行专门流程。",
    "tool",
    { width: 340, height: 420 },
    "workflow",
    "#e2e8f0"
  ),
  "rh-comfy": createDefinition(
    "rh-comfy",
    "RH Comfy",
    "挂接 Comfy 风格的外部工作流节点。",
    "tool",
    { width: 340, height: 420 },
    "workflow",
    "#e2e8f0"
  ),
  "scene-description": createDefinition(
    "scene-description",
    "场景描述",
    "沉淀空间氛围、材质和布光信息。",
    "character",
    { width: 400, height: 400 },
    "workflow",
    "#dbeafe"
  ),
  "storyboard-chart-node": createDefinition(
    "storyboard-chart-node",
    "分镜图表",
    "把分镜节点转成更适合检查的图表视图。",
    "storyboard",
    { width: 540, height: 480 },
    "workflow",
    "#fde68a"
  ),
  "storyboard-node": createDefinition(
    "storyboard-node",
    "分镜节点",
    "组织镜头表、时长、画面意图和镜头顺序。",
    "storyboard",
    { width: 600, height: 500 },
    "workflow",
    "#fde68a"
  ),
  "table-editor-node": createDefinition(
    "table-editor-node",
    "表格编辑器",
    "先用结构化表格整理分镜字段再输出。",
    "storyboard",
    { width: 520, height: 420 },
    "workflow",
    "#fde68a"
  ),
  "text-node": createDefinition(
    "text-node",
    "文本节点",
    "输入脚本、镜头、旁白和视频需求。",
    "input",
    { width: 360, height: 280 },
    "text",
    "#bfdbfe"
  ),
  "video-analyze": createDefinition(
    "video-analyze",
    "视频分析",
    "解析视频节奏、镜头结构和可复用画面信息。",
    "analysis",
    { width: 400, height: 500 },
    "workflow",
    "#bbf7d0"
  ),
  "video-input": createDefinition(
    "video-input",
    "视频输入",
    "导入素材视频、参考视频或上游成片。",
    "input",
    { width: 360, height: 420 },
    "video",
    "#bfdbfe"
  ),
};

export const VIDEO_WORKFLOW_LIBRARY_SECTIONS = SECTION_DEFINITIONS;

export const VIDEO_WORKFLOW_STARTER_TEMPLATES: VideoWorkflowStarterTemplate[] = [
  {
    id: "script-to-video",
    title: "脚本成片",
    description: "从脚本文案进入，经过分镜和视频生成，最后预览并保存。",
    nodes: ["text-node", "storyboard-node", "gen-video", "preview", "local-save"],
  },
  {
    id: "image-to-video",
    title: "图片转视频",
    description: "从参考图启动视频生成，适合首帧、角色图和海报成片。",
    nodes: ["input-image", "gen-video", "preview", "local-save"],
  },
  {
    id: "video-analysis-remix",
    title: "视频拆解再创作",
    description: "先解析已有视频，再回到分镜和生图/生视频链路。",
    nodes: ["video-input", "video-analyze", "storyboard-node", "gen-video", "preview"],
  },
  {
    id: "novel-character-pipeline",
    title: "小说角色拆解",
    description: "从长文本提取角色与场景，再衍生角色视频。",
    nodes: [
      "novel-input",
      "extract-characters-scenes",
      "create-character",
      "generate-character-video",
      "preview",
    ],
  },
  {
    id: "inpaint-repair",
    title: "局部重绘回贴",
    description: "对参考图局部修改后拼回，再预览和保存。",
    nodes: ["input-image", "inpaint-crop", "inpaint-stitch", "preview", "local-save"],
  },
];

export function getVideoWorkflowNodeDefinition(
  type: VideoWorkflowTemplateType | string | null | undefined
) {
  if (!type) return null;
  return VIDEO_WORKFLOW_NODE_DEFINITIONS[type as VideoWorkflowTemplateType] || null;
}

export function getVideoWorkflowSectionNodes(sectionId: VideoWorkflowSectionId) {
  return Object.values(VIDEO_WORKFLOW_NODE_DEFINITIONS).filter(
    (definition) => definition.group === sectionId
  );
}

export function getVideoWorkflowQuickConnectOutputs(type: VideoWorkflowTemplateType) {
  return VIDEO_WORKFLOW_NODE_DEFINITIONS[type]?.quickConnectOutputs || [];
}

export function inferVideoWorkflowTemplateType(
  node: CanvasNode | null | undefined
): VideoWorkflowTemplateType | null {
  if (!node) return null;

  const rawTemplateType =
    typeof (node.data as { templateType?: string; metadata?: Record<string, unknown> })?.templateType ===
    "string"
      ? String((node.data as { templateType?: string }).templateType).trim()
      : typeof (node.data as { metadata?: Record<string, unknown> })?.metadata?.templateType ===
          "string"
        ? String((node.data as { metadata?: Record<string, unknown> }).metadata?.templateType).trim()
        : "";

  if (rawTemplateType && rawTemplateType in VIDEO_WORKFLOW_NODE_DEFINITIONS) {
    return rawTemplateType as VideoWorkflowTemplateType;
  }

  if (node.type === "text") {
    return "text-node";
  }
  if (node.type === "image") {
    return "input-image";
  }
  if (node.type === "video") {
    return "video-input";
  }

  return null;
}

export function buildVideoWorkflowCanvasNode(
  type: VideoWorkflowTemplateType,
  position: Position
): Omit<CanvasNode, "id" | "createdAt" | "updatedAt"> {
  const definition = getVideoWorkflowNodeDefinition(type);
  if (!definition) {
    throw new Error(`Unknown video workflow node type: ${type}`);
  }
  const metadata = {
    templateType: definition.type,
    label: definition.label,
    description: definition.description,
  };

  if (definition.canvasNodeType === "text") {
    const isNovelInput = type === "novel-input";
    return {
      type: "text",
      position,
      size: definition.size,
      data: {
        content: isNovelInput
          ? "在这里粘贴长篇剧情、人物关系、世界观设定或章节梗概"
          : "输入脚本、镜头、画面意图或视频需求",
        fontSize: isNovelInput ? 16 : 15,
        color: DEFAULT_VIDEO_WORKFLOW_TEXT_COLOR,
        lineHeight: 1.5,
        borderWidth: 1,
        borderColor: "#d4d4d8",
        borderRadius: 20,
        padding: 18,
        backgroundColor: "#ffffff",
        metadata,
      },
      connections: [],
    };
  }

  if (definition.canvasNodeType === "image") {
    return {
      type: "image",
      position,
      size: definition.size,
      data: {
        src: "",
        status: "pending",
        title: definition.label,
        prompt: definition.description,
        note: "上传参考图、角色图、海报或关键帧",
        metadata,
      },
      connections: [],
    };
  }

  if (definition.canvasNodeType === "video") {
    return {
      type: "video",
      position,
      size: definition.size,
      data: {
        src: "",
        status: "pending",
        prompt: "上传视频素材、参考视频，或作为上游输出接收节点",
        metadata,
      },
      connections: [],
    };
  }

  return {
    type: "workflow",
    position,
    size: definition.size,
    data: {
      templateType: definition.type,
      title: definition.label,
      description: definition.description,
      summary:
        definition.quickConnectOutputs.length > 0
          ? `可接：${definition.quickConnectOutputs
              .map((item) => item.label)
              .join(" / ")}`
          : "当前节点用于处理中间结果或输出检查。",
      status: "pending",
      group: definition.group,
      accentColor: definition.accentColor,
      metadata,
    },
    connections: [],
  };
}

export function buildVideoWorkflowStarterTemplateGraph(
  templateId: string,
  origin: Position
) {
  const template =
    VIDEO_WORKFLOW_STARTER_TEMPLATES.find((item) => item.id === templateId) ||
    VIDEO_WORKFLOW_STARTER_TEMPLATES[0];
  const laneHeight = 320;
  let cursorX = origin.x;

  const nodes = template.nodes.map((type) => {
    const definition = getVideoWorkflowNodeDefinition(type);
    if (!definition) {
      throw new Error(`Unknown video workflow starter node type: ${type}`);
    }
    const position = {
      x: cursorX,
      y: origin.y + Math.max(0, (laneHeight - definition.size.height) / 2),
    };
    cursorX += definition.size.width + 96;
    return {
      type,
      node: buildVideoWorkflowCanvasNode(type, position),
    };
  });

  const edges = nodes.slice(1).map((node, index) => ({
    sourceIndex: index,
    targetIndex: index + 1,
    type: "default" as const,
  }));

  return {
    template,
    nodes,
    edges,
  };
}
