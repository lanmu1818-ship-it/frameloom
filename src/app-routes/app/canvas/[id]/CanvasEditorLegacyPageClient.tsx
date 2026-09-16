// Modified for standalone community distribution; see NOTICE.
"use client";

import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Box,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  CheckCircle2,
  Download,
  Eye,
  FileImage,
  FileText,
  Film,
  FolderOpen,
  Flag,
  GitBranch,
  Grid3X3,
  Heart,
  HelpCircle,
  ImagePlus,
  Images,
  Layers,
  LetterText,
  Lightbulb,
  Loader2,
  type LucideIcon,
  MessageCircle,
  MousePointer2,
  Move,
  Music2,
  Palette,
  Pencil,
  PenTool,
  Pin,
  Plus,
  Redo2,
  Save,
  Scan,
  Scissors,
  Settings,
  Sparkles,
  Star,
  Table2,
  Tag,
  Trash2,
  Undo2,
  Upload,
  UserRound,
  Video,
  Wand2,
  Zap,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import dynamic from "@/src/desktop/next-dynamic-shim";
import { useTheme } from "next-themes";
import { useParams, useRouter, useSearchParams } from "@/src/desktop/next-navigation-shim";
import {
  type ChangeEvent,
  type ComponentType,
  type PointerEvent as ReactPointerEvent,
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import useSWR from "swr";
// 深色主题组件 V2 (新版布局)
import type { AgentGenerationWorkspaceDarkV2Props } from "@/src/components/agents/AgentGenerationWorkspaceDarkV2";
import {
  AgentWorkflowBrandStorePanel,
  AgentWorkflowPanelDarkV2,
} from "@/src/components/agents/AgentWorkflowPanelDarkV2";
import { type AgentWorkflowInputs } from "@/src/components/agents/AgentWorkflowPanelNew";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/src/components/ui/card";
import { ClientErrorBoundary } from "@/src/components/ui/client-error-boundary";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import { Slider } from "@/src/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  createEmptyAgentGenerationProjectPersistedState,
  createEmptyAgentGenerationProjectWorkspaceState,
  createEmptyAgentWorkflowPersistedState,
  normalizeAgentGenerationProjectPersistedState,
} from "@/src/lib/agents/generation-project-state";
import {
  createEmptyAgentModeWorkspaceState,
  normalizeAgentModeWorkspaceState,
} from "@/src/lib/agents/mode-workspace-state";
import { normalizeAgentPresetModeConfig } from "@/src/lib/agents/preset-mode-config";
import { normalizeAgentWorkflowBrandModelConfig } from "@/src/lib/agents/workflow-brand-model-config";
import {
  compactVideoCanvasMarkers,
  VIDEO_CANVAS_MARKER_COLORS,
  VIDEO_CANVAS_MARKER_METADATA_KEY,
  VIDEO_CANVAS_PRIORITY_MARKERS,
  VIDEO_CANVAS_SYMBOL_MARKERS,
  VIDEO_CANVAS_TASK_MARKERS,
  normalizeVideoCanvasMarkers,
  type VideoCanvasMarkerKey,
  type VideoCanvasMarkerState,
  type VideoCanvasMarkerValue,
  type VideoCanvasSymbolMarkerId,
} from "@/src/lib/canvas/video-canvas-markers";
import {
  LOCAL_UPLOAD_PENDING_METADATA_KEY,
  LOCAL_UPLOAD_PREVIEW_METADATA_KEY,
} from "@/src/lib/canvas/local-upload-state";
import {
  getCanvasToolbarItem,
  getDefaultCanvasToolbarItem,
  isCanvasToolbarItemEnabled,
  normalizeCanvasToolbarConfig,
  type CanvasToolbarConfig,
  type CanvasToolbarItemConfig,
  type CanvasToolbarItemKey,
} from "@/src/lib/canvas-toolbar-config";
import {
  resolveDefaultSiteLogo,
  shouldInvertDefaultLogoForTheme,
} from "@/src/lib/branding/defaults";
import {
  buildAgentWorkflowComposerContext,
} from "@/src/lib/agents/workflow-composer";
import {
  createEmptyAgentWorkflowMaterialSelections,
  normalizeAgentWorkflowMaterialSelections,
} from "@/src/lib/agents/workflow-material-config";
import {
  defaultAgentWorkflowUiConfig,
  flattenVisibleAgentWorkflowSteps,
  getEnabledAgentWorkflowStepTree,
  getAgentWorkflowBusinessModeSettings,
  getAgentWorkflowPageFeatureSettings,
  sanitizeAgentWorkflowSelections,
} from "@/src/lib/agents/workflow-ui-config";
import {
  apiFetch,
  apiKeepaliveFetch,
  downloadApiFile,
} from "@/src/client/api";
import { cn, fetcher } from "@/src/lib/utils";
import {
  buildVideoWorkflowCanvasNode,
  getVideoWorkflowNodeDefinition,
  getVideoWorkflowQuickConnectOutputs,
  getVideoWorkflowSectionNodes,
  inferVideoWorkflowTemplateType,
  VIDEO_WORKFLOW_LIBRARY_SECTIONS,
  type VideoWorkflowTemplateType,
} from "@/src/lib/video-workflow/catalog";
import {
  buildWorkflowPrompt,
  collectWorkflowMedia,
  collectWorkflowStoryboardShots,
  collectWorkflowStructuredData,
  createWorkflowGraphContext,
  getBestWorkflowPreviewMedia,
  getDirectDownstreamNodes,
  inferVideoGenerationModeFromMedia,
  summarizeWorkflowInputs,
  type WorkflowAssetRecord,
  type WorkflowCharacterRecord,
  type WorkflowMediaReference,
  type WorkflowSceneRecord,
} from "@/src/lib/video-workflow/runtime";
import { agentProjectService } from "@/src/services/agent-projects/index";
import {
  canvasService,
  imageGenerationService,
  videoGenerationService,
  workflowAnalysisService,
} from "@/src/services/canvas/index";
import { canvasSelectors, useCanvasStore } from "@/src/store/canvas/index";
import type {
  AgentGenerationProject,
  AgentGenerationProjectPersistedState,
  AgentGenerationProjectResultCollections,
  AgentGenerationProjectWorkspaceAttachment,
  AgentGenerationProjectWorkspaceState,
  AgentGenerationResultModeType,
  AgentModeWorkspaceState,
  AgentPreset,
  AgentWorkflowComposerContext,
  AgentWorkflowMaterialSelections,
  AgentWorkflowPersistedState,
  AgentWorkflowSelectedBrandModel,
  AgentWorkflowShowcaseConfig,
  AgentWorkflowStepKey,
  AgentWorkflowUiConfig,
} from "@/types/agent";
import type {
  CanvasEdge,
  CanvasNode,
  CanvasState,
  CanvasWorkspaceType,
  Position,
  ToolType,
  WorkflowNodeData,
} from "@/types/canvas/index";

const CANVAS_SITE_SETTINGS_REFRESH_INTERVAL_MS = 15000;
const CANVAS_SITE_SETTINGS_TIMEOUT_MS = 10000;
const CANVAS_SURFACE_BACKGROUND_LIGHT = "#f1f2f3";
const CANVAS_SURFACE_BACKGROUND_DARK = "#050607";

const fetchCanvasSiteSettings = async (url: string) => {
  const separator = url.includes("?") ? "&" : "?";
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, CANVAS_SITE_SETTINGS_TIMEOUT_MS);

  const response = await apiFetch(`${url}${separator}t=${Date.now()}`, {
    cache: "no-store",
    signal: controller.signal,
  }).finally(() => {
    clearTimeout(timeoutId);
  });

  if (!response.ok) {
    throw new Error("Failed to fetch canvas site settings");
  }

  return response.json();
};

function CanvasLazyPanelLoader({
  label,
  className,
}: {
  label: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center bg-[#f1f2f3] text-[#8a96a3] dark:bg-[#050607] dark:text-[#6f7782]",
        className
      )}
    >
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

const CanvasWorkspace = dynamic(
  () =>
    import("@/src/components/canvas/CanvasWorkspace").then(
      (module) => module.CanvasWorkspace
    ),
  {
    loading: () => <CanvasLazyPanelLoader label="正在加载画布..." />,
    ssr: false,
  }
);

const CanvasChatPanel = dynamic(
  () =>
    import("@/src/components/canvas/CanvasChatPanel").then(
      (module) => module.CanvasChatPanel
    ),
  {
    loading: () => <CanvasLazyPanelLoader label="正在加载对话面板..." />,
    ssr: false,
  }
);

const CanvasFileListPanel = dynamic(
  () =>
    import("@/src/components/canvas/CanvasFileListPanel").then(
      (module) => module.CanvasFileListPanel
    ),
  {
    loading: () => <CanvasLazyPanelLoader label="正在加载项目列表..." />,
    ssr: false,
  }
);

const AgentCanvasTopNavDark = dynamic(
  () =>
    import("@/src/components/agents/AgentCanvasTopNavDark").then(
      (module) => module.AgentCanvasTopNavDark
    ),
  {
    loading: () => <div className="h-20 bg-[#050607]" />,
    ssr: false,
  }
);

const AGENT_WORKSPACE_LOAD_TIMEOUT_MS = 15_000;

let cachedAgentGenerationWorkspace:
  | ComponentType<AgentGenerationWorkspaceDarkV2Props>
  | null = null;
let agentGenerationWorkspaceLoadPromise:
  | Promise<ComponentType<AgentGenerationWorkspaceDarkV2Props>>
  | null = null;

function loadAgentGenerationWorkspaceDarkV2() {
  if (cachedAgentGenerationWorkspace) {
    return Promise.resolve(cachedAgentGenerationWorkspace);
  }

  if (!agentGenerationWorkspaceLoadPromise) {
    agentGenerationWorkspaceLoadPromise = import(
      "@/src/components/agents/AgentGenerationWorkspaceDarkV2"
    )
      .then((module) => {
        cachedAgentGenerationWorkspace = module.AgentGenerationWorkspaceDarkV2;
        return cachedAgentGenerationWorkspace;
      })
      .catch((error) => {
        agentGenerationWorkspaceLoadPromise = null;
        throw error;
      });
  }

  return agentGenerationWorkspaceLoadPromise;
}

function resetAgentGenerationWorkspaceLoader() {
  cachedAgentGenerationWorkspace = null;
  agentGenerationWorkspaceLoadPromise = null;
}

function AgentGenerationWorkspaceDarkV2(
  props: AgentGenerationWorkspaceDarkV2Props
) {
  const [WorkspaceComponent, setWorkspaceComponent] = useState<
    ComponentType<AgentGenerationWorkspaceDarkV2Props> | null
  >(() => cachedAgentGenerationWorkspace);
  const [loadError, setLoadError] = useState<Error | null>(null);
  const [showRecovery, setShowRecovery] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    if (WorkspaceComponent) return;

    let cancelled = false;
    setLoadError(null);
    setShowRecovery(false);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) {
        setShowRecovery(true);
      }
    }, AGENT_WORKSPACE_LOAD_TIMEOUT_MS);

    loadAgentGenerationWorkspaceDarkV2()
      .then((component) => {
        if (cancelled) return;
        setWorkspaceComponent(() => component);
        setLoadError(null);
        setShowRecovery(false);
      })
      .catch((error) => {
        if (cancelled) return;
        const normalizedError =
          error instanceof Error ? error : new Error(String(error));
        setLoadError(normalizedError);
        setShowRecovery(true);
      })
      .finally(() => {
        window.clearTimeout(timeoutId);
      });

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [WorkspaceComponent, retryToken]);

  if (WorkspaceComponent) {
    return <WorkspaceComponent {...props} />;
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-[#050607] px-6 text-white/70">
      <CanvasLazyPanelLoader
        className="min-h-0 bg-transparent text-white/65"
        label={
          loadError
            ? "Agent 工作台加载失败"
            : showRecovery
              ? "Agent 工作台加载较慢"
              : "正在加载 Agent 工作台..."
        }
      />
      {showRecovery ? (
        <div className="w-full max-w-[520px] rounded-[28px] border border-white/10 bg-white/[0.04] p-5 text-center shadow-[0_20px_70px_rgba(0,0,0,0.32)]">
          <p className="text-sm text-white/70 leading-6">
            工作台资源还没有完成加载，可能是浏览器缓存了旧版本资源或当前网络较慢。可以先重试加载，仍不恢复时刷新页面即可继续当前项目。
          </p>
          {loadError?.message ? (
            <p className="mt-3 truncate rounded-2xl bg-black/30 px-3 py-2 text-white/35 text-xs">
              {loadError.message}
            </p>
          ) : null}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Button
              className="rounded-full bg-emerald-400 px-5 text-black hover:bg-emerald-300"
              onClick={() => {
                resetAgentGenerationWorkspaceLoader();
                setWorkspaceComponent(null);
                setLoadError(null);
                setShowRecovery(false);
                setRetryToken((value) => value + 1);
              }}
              type="button"
            >
              重新加载工作台
            </Button>
            <Button
              className="rounded-full border-white/15 bg-white/[0.06] px-5 text-white hover:bg-white/[0.10]"
              onClick={() => window.location.reload()}
              type="button"
              variant="outline"
            >
              刷新页面
            </Button>
            {props.onOpenCanvasEditor ? (
              <Button
                className="rounded-full border-white/15 bg-transparent px-5 text-white/70 hover:bg-white/[0.08]"
                onClick={props.onOpenCanvasEditor}
                type="button"
                variant="outline"
              >
                返回画布
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

const AgentProjectListSheet = dynamic(
  () =>
    import("@/src/components/agents/AgentProjectListSheet").then(
      (module) => module.AgentProjectListSheet
    ),
  {
    loading: () => null,
    ssr: false,
  }
);

const AgentWorkflowBrandModelPicker = dynamic(
  () =>
    import("@/src/components/agents/AgentWorkflowBrandModelPicker").then(
      (module) => module.AgentWorkflowBrandModelPicker
    ),
  {
    loading: () => <CanvasLazyPanelLoader label="正在加载品牌模特..." />,
    ssr: false,
  }
);

const AgentWorkflowMaterialSelectionPanel = dynamic(
  () =>
    import("@/src/components/agents/AgentWorkflowMaterialSelectionPanel").then(
      (module) => module.AgentWorkflowMaterialSelectionPanel
    ),
  {
    loading: () => <CanvasLazyPanelLoader label="正在加载素材选择..." />,
    ssr: false,
  }
);

interface PageProps {
  params: Promise<{ id: string }>;
}

// 图片尺寸预设
const SIZE_PRESETS = [
  { label: "1:1", value: "1:1", width: 1024, height: 1024 },
  { label: "3:2", value: "3:2", width: 1536, height: 1024 },
  { label: "2:3", value: "2:3", width: 1024, height: 1536 },
  { label: "4:3", value: "4:3", width: 1365, height: 1024 },
  { label: "3:4", value: "3:4", width: 1024, height: 1365 },
  { label: "16:9", value: "16:9", width: 1820, height: 1024 },
  { label: "9:16", value: "9:16", width: 1024, height: 1820 },
];

interface VideoCanvasProjectExportPayload {
  format: "video-canvas-project";
  version: 1;
  exportedAt: string;
  workspaceType: CanvasWorkspaceType;
  project: {
    id: string;
    title: string;
  };
  canvasData: CanvasState;
}

interface VideoCanvasInsertMenuState {
  screenPosition: Position;
  canvasPosition: Position;
  sourceNodeId?: string | null;
  openLeft?: boolean;
}

interface VideoCanvasInsertMenuChild {
  id: string;
  label: string;
  templateType: VideoWorkflowTemplateType;
}

interface VideoCanvasInsertMenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  templateType?: VideoWorkflowTemplateType;
  children?: VideoCanvasInsertMenuChild[];
  accent?: "highlight";
}

interface VideoCanvasSidebarGroup {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  nodeTypes: VideoWorkflowTemplateType[];
}

const IMPORTABLE_CANVAS_NODE_TYPES = new Set<CanvasNode["type"]>([
  "message",
  "image",
  "image-folder",
  "video",
  "text",
  "workflow",
]);

const IMPORTABLE_CANVAS_TOOL_TYPES = new Set<ToolType>([
  "select",
  "pan",
  "draw",
  "text",
]);

const DEFAULT_CANVAS_TEXT_COLOR = "#111827";

const VIDEO_CANVAS_INSERT_MENU_ITEMS: VideoCanvasInsertMenuItem[] = [
  { id: "image", label: "图片", icon: FileImage, templateType: "input-image" },
  { id: "text", label: "文字", icon: FileText, templateType: "text-node" },
  {
    id: "video-frame",
    label: "视频抽帧",
    icon: Film,
    templateType: "video-input",
  },
  {
    id: "video-analyze",
    label: "视频拆解",
    icon: Scissors,
    templateType: "video-analyze",
  },
  {
    id: "storyboard",
    label: "分镜表",
    icon: GitBranch,
    children: [
      {
        id: "storyboard-node",
        label: "分镜节点",
        templateType: "storyboard-node",
      },
      {
        id: "storyboard-chart-node",
        label: "分镜图表",
        templateType: "storyboard-chart-node",
      },
    ],
  },
  {
    id: "table",
    label: "表格编辑",
    icon: Table2,
    templateType: "table-editor-node",
  },
  {
    id: "doodle",
    label: "涂鸦画板",
    icon: PenTool,
    templateType: "doodle-canvas",
  },
  { id: "paint", label: "绘画", icon: Palette, templateType: "gen-image" },
  { id: "video", label: "视频", icon: Video, templateType: "gen-video" },
  { id: "music", label: "音乐", icon: Music2, templateType: "gen-music" },
  { id: "agent", label: "Agent", icon: Bot, templateType: "custom-agent" },
  {
    id: "comfy",
    label: "Comfy UI",
    icon: Box,
    children: [
      { id: "rh-comfy", label: "Comfy 工作流", templateType: "rh-comfy" },
      { id: "rh-app", label: "RH 应用", templateType: "rh-app" },
    ],
  },
  { id: "compare", label: "对比", icon: Layers, templateType: "image-compare" },
  {
    id: "inpaint",
    label: "局部重绘",
    icon: Scissors,
    children: [
      {
        id: "inpaint-crop",
        label: "裁剪局部重绘",
        templateType: "inpaint-crop",
      },
      {
        id: "inpaint-stitch",
        label: "无缝拼接",
        templateType: "inpaint-stitch",
      },
    ],
  },
  {
    id: "super-resolution",
    label: "智能超清",
    icon: Sparkles,
    templateType: "jimeng-super-resolution",
  },
  {
    id: "motion",
    label: "动作迁移",
    icon: Clapperboard,
    templateType: "motion-control",
  },
  { id: "preview", label: "预览", icon: Eye, templateType: "preview" },
  { id: "save", label: "保存", icon: Save, templateType: "local-save" },
  {
    id: "director",
    label: "导演模式",
    icon: Wand2,
    accent: "highlight",
    children: [
      {
        id: "professional-camera",
        label: "专业镜头",
        templateType: "professional-camera",
      },
      {
        id: "camera-movement",
        label: "镜头运动",
        templateType: "camera-movement",
      },
    ],
  },
];

const VIDEO_WORKFLOW_QUICK_CONNECT_ICON_MAP: Partial<
  Record<VideoWorkflowTemplateType, LucideIcon>
> = {
  "text-node": FileText,
  "input-image": FileImage,
  "video-input": Film,
  "novel-input": FileText,
  "video-analyze": Scissors,
  "storyboard-node": GitBranch,
  "storyboard-chart-node": GitBranch,
  "table-editor-node": Table2,
  "gen-image": Palette,
  "gen-video": Video,
  "gen-music": Music2,
  "motion-control": Clapperboard,
  "camera-movement": Clapperboard,
  "professional-camera": Wand2,
  "inpaint-crop": Scissors,
  "inpaint-stitch": Scissors,
  "local-save": Save,
  preview: Eye,
  "custom-agent": Bot,
  "rh-app": Box,
  "rh-comfy": Box,
  "jimeng-super-resolution": Sparkles,
  "doodle-canvas": PenTool,
  "canvas-node": Layers,
  "image-compare": Layers,
};

function getVideoWorkflowQuickConnectIcon(type: VideoWorkflowTemplateType) {
  return VIDEO_WORKFLOW_QUICK_CONNECT_ICON_MAP[type] || Plus;
}

function resolveCanvasToolbarItemWithFallback(
  config: CanvasToolbarConfig,
  key: CanvasToolbarItemKey,
  fallback?: Partial<CanvasToolbarItemConfig>
): CanvasToolbarItemConfig {
  const item = getCanvasToolbarItem(config, key);
  const defaultItem = getDefaultCanvasToolbarItem(key);

  return {
    label:
      item.label !== defaultItem.label
        ? item.label
        : fallback?.label || item.label,
    iconUrl: item.iconUrl || fallback?.iconUrl || "",
    enabled: item.enabled,
  };
}

const VIDEO_CANVAS_SIDEBAR_GROUPS: VideoCanvasSidebarGroup[] = [
  {
    id: "input",
    label: "输入层",
    description: "文本、图片、视频、小说",
    icon: FileImage,
    nodeTypes: ["text-node", "input-image", "video-input", "novel-input"],
  },
  {
    id: "analysis",
    label: "分析层",
    description: "视频拆解、角色场景抽取",
    icon: Scan,
    nodeTypes: [
      "video-analyze",
      "extract-characters-scenes",
      "character-description",
      "scene-description",
      "create-character",
      "create-scene",
    ],
  },
  {
    id: "storyboard",
    label: "分镜层",
    description: "分镜节点、分镜图表、表格",
    icon: GitBranch,
    nodeTypes: [
      "storyboard-node",
      "storyboard-chart-node",
      "table-editor-node",
      "camera-movement",
      "professional-camera",
    ],
  },
  {
    id: "generation",
    label: "生成层",
    description: "生图、生视频、音乐、超清",
    icon: Sparkles,
    nodeTypes: [
      "gen-image",
      "gen-video",
      "gen-music",
      "jimeng-super-resolution",
      "generate-character-image",
      "generate-character-video",
      "generate-scene-image",
      "generate-scene-video",
      "motion-control",
    ],
  },
  {
    id: "tool",
    label: "工具层",
    description: "局部重绘、Comfy、Agent",
    icon: Wand2,
    nodeTypes: [
      "inpaint-crop",
      "inpaint-stitch",
      "rh-comfy",
      "rh-app",
      "custom-agent",
      "doodle-canvas",
      "canvas-node",
      "image-compare",
    ],
  },
  {
    id: "output",
    label: "输出层",
    description: "预览、保存",
    icon: Save,
    nodeTypes: ["preview", "local-save"],
  },
];

const VIDEO_CANVAS_SIDEBAR_GROUP_STYLES: Record<
  VideoCanvasSidebarGroup["id"],
  {
    iconBg: string;
    iconBorder: string;
    iconText: string;
    rail: string;
  }
> = {
  input: {
    iconBg: "#eef3ff",
    iconBorder: "#dbe4ff",
    iconText: "#5b76fe",
    rail: "#dde5ff",
  },
  analysis: {
    iconBg: "#effaf4",
    iconBorder: "#d9efe3",
    iconText: "#46b078",
    rail: "#dcefe5",
  },
  storyboard: {
    iconBg: "#fff7e8",
    iconBorder: "#f7e7c8",
    iconText: "#ca8f2d",
    rail: "#f0dfbc",
  },
  generation: {
    iconBg: "#fff1f4",
    iconBorder: "#f6dbe2",
    iconText: "#dd5b7b",
    rail: "#f1d9e0",
  },
  tool: {
    iconBg: "#f3f4f8",
    iconBorder: "#e3e6ef",
    iconText: "#63708a",
    rail: "#e2e5ed",
  },
  output: {
    iconBg: "#eef7ff",
    iconBorder: "#dbe9fb",
    iconText: "#4d8ed8",
    rail: "#d8e6f8",
  },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function sanitizeCanvasStateForPersist(state: CanvasState): CanvasState {
  return {
    ...state,
    nodes: state.nodes.map((node) => {
      if (node.type !== "image") return node;

      const data = node.data as Record<string, any>;
      const metadata = isPlainObject(data.metadata)
        ? { ...(data.metadata as Record<string, unknown>) }
        : {};
      const localPreviewUrl = String(
        metadata[LOCAL_UPLOAD_PREVIEW_METADATA_KEY] || ""
      );
      const src = String(data.src || "");

      if (!src.startsWith("blob:") && !localPreviewUrl.startsWith("blob:")) {
        return node;
      }

      delete metadata[LOCAL_UPLOAD_PREVIEW_METADATA_KEY];
      delete metadata[LOCAL_UPLOAD_PENDING_METADATA_KEY];

      return {
        ...node,
        data: {
          ...data,
          src: "",
          status: data.status === "failed" ? "failed" : "generating",
          metadata,
        } as CanvasNode["data"],
      };
    }),
  };
}

function normalizeFiniteNumber(value: unknown, fallback: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeImportedDate(value: unknown) {
  const parsed = new Date(String(value || "").trim());
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function sanitizeExportFileName(value: string) {
  return (
    String(value || "")
      .trim()
      .replace(/[\\/:*?"<>|]+/g, "-")
      .replace(/\s+/g, "-")
      .slice(0, 60) || "video-canvas-project"
  );
}

function normalizeImportedCanvasNode(
  value: unknown,
  index: number
): CanvasNode | null {
  if (!isPlainObject(value)) {
    return null;
  }

  const rawType = String(value.type || "").trim() as CanvasNode["type"];
  if (!IMPORTABLE_CANVAS_NODE_TYPES.has(rawType)) {
    return null;
  }

  const position = isPlainObject(value.position) ? value.position : {};
  const size = isPlainObject(value.size) ? value.size : {};

  return {
    id: String(value.id || `imported-node-${index + 1}`),
    type: rawType,
    position: {
      x: normalizeFiniteNumber(position.x, 0),
      y: normalizeFiniteNumber(position.y, 0),
    },
    size: {
      width: Math.max(normalizeFiniteNumber(size.width, 320), 120),
      height: Math.max(normalizeFiniteNumber(size.height, 240), 120),
    },
    data: isPlainObject(value.data)
      ? (value.data as unknown as CanvasNode["data"])
      : ({} as CanvasNode["data"]),
    connections: Array.isArray(value.connections)
      ? value.connections
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      : [],
    parentId: String(value.parentId || "").trim() || undefined,
    createdAt: normalizeImportedDate(value.createdAt),
    updatedAt: normalizeImportedDate(value.updatedAt),
  };
}

function normalizeImportedCanvasState(payload: unknown): {
  title?: string;
  workspaceType?: CanvasWorkspaceType;
  canvasData: CanvasState;
} | null {
  if (!isPlainObject(payload)) {
    return null;
  }

  const rawCanvasData = isPlainObject(payload.canvasData)
    ? payload.canvasData
    : payload;
  if (!isPlainObject(rawCanvasData)) {
    return null;
  }

  const nodes = Array.isArray(rawCanvasData.nodes)
    ? rawCanvasData.nodes
        .map((item, index) => normalizeImportedCanvasNode(item, index))
        .filter((item): item is CanvasNode => Boolean(item))
    : [];
  const nodeIds = new Set(nodes.map((node) => node.id));

  const edges = Array.isArray(rawCanvasData.edges)
    ? rawCanvasData.edges
        .map((item, index) => {
          if (!isPlainObject(item)) return null;
          const source = String(item.source || "").trim();
          const target = String(item.target || "").trim();
          if (
            !source ||
            !target ||
            !nodeIds.has(source) ||
            !nodeIds.has(target)
          ) {
            return null;
          }
          return {
            id: String(item.id || `imported-edge-${index + 1}`),
            source,
            target,
            type:
              String(item.type || "").trim() === "conversation" ||
              String(item.type || "").trim() === "reference"
                ? (String(item.type || "").trim() as CanvasEdge["type"])
                : "default",
          } as CanvasEdge;
        })
        .filter((item): item is CanvasEdge => item !== null)
    : [];

  const viewport = isPlainObject(rawCanvasData.viewport)
    ? rawCanvasData.viewport
    : {};
  const selectedNodeIds = Array.isArray(rawCanvasData.selectedNodeIds)
    ? rawCanvasData.selectedNodeIds
        .map((item) => String(item || "").trim())
        .filter((item) => nodeIds.has(item))
    : [];
  const toolValue = String(rawCanvasData.tool || "").trim() as ToolType;
  const resolvedWorkspaceType = ["canvas", "agent", "video"].includes(
    String(
      payload.workspaceType ||
        (isPlainObject(payload.project) ? payload.project.workspaceType : "") ||
        ""
    )
  )
    ? (String(
        payload.workspaceType ||
          (isPlainObject(payload.project)
            ? payload.project.workspaceType
            : "") ||
          ""
      ) as CanvasWorkspaceType)
    : undefined;
  const projectTitle = String(
    (isPlainObject(payload.project) ? payload.project.title : "") ||
      payload.title ||
      ""
  ).trim();

  return {
    title: projectTitle || undefined,
    workspaceType: resolvedWorkspaceType,
    canvasData: {
      nodes,
      edges,
      selectedNodeIds,
      viewport: {
        x: normalizeFiniteNumber(viewport.x, 0),
        y: normalizeFiniteNumber(viewport.y, 0),
        zoom: Math.min(
          Math.max(normalizeFiniteNumber(viewport.zoom, 1), 0.1),
          4
        ),
      },
      tool: IMPORTABLE_CANVAS_TOOL_TYPES.has(toolValue) ? toolValue : "select",
      suppressedMediaKeys: Array.isArray(rawCanvasData.suppressedMediaKeys)
        ? rawCanvasData.suppressedMediaKeys
            .map((item) => String(item || "").trim())
            .filter(Boolean)
        : [],
      workflowState: isPlainObject(rawCanvasData.workflowState)
        ? (rawCanvasData.workflowState as unknown as CanvasState["workflowState"])
        : undefined,
    },
  };
}

const FLOATING_PANEL_WIDTH = 560;
const FLOATING_PANEL_MIN_WIDTH = 442;
const FLOATING_PANEL_MAX_WIDTH = 1440;
const FLOATING_PANEL_INSET = 8;
const DOCKED_PANEL_INSET = 0;
const FLOATING_UI_GAP = 8;
const FLOATING_BOTTOM_INSET = 12;
const JIMENG_CANVAS_TOP_BAR_HEIGHT = 49;
const WORKFLOW_AGENT_CONTEXT_START = "【视频画布同步上下文】";
const WORKFLOW_AGENT_CONTEXT_END = "【/视频画布同步上下文】";
const AGENT_RESULT_MODE_LABELS: Record<AgentGenerationResultModeType, string> =
  {
    scene_generation: "场景结果",
    detail_generation: "细节结果",
    detail_replacement: "细节替换",
    sku_replacement: "SKU 替换",
  };
const VIDEO_CANVAS_PANEL_CLASS =
  "pointer-events-auto overflow-hidden rounded-[24px] border border-[#dbe2ee] bg-white text-[#16181d] shadow-[0_0_0_1px_rgba(219,226,238,0.42),0_24px_52px_rgba(22,24,29,0.08)] dark:border-zinc-800 dark:bg-zinc-950";
const VIDEO_CANVAS_PANEL_BADGE_CLASS =
  "border-[#d7dff0] bg-[#f6f8ff] text-[#5b6678] dark:border-zinc-800 dark:bg-zinc-900";
const VIDEO_CANVAS_SUBSECTION_CLASS =
  "rounded-[18px] border border-[#e2e8f2] bg-[#f8faff] p-3.5 dark:border-zinc-800 dark:bg-zinc-900";
const VIDEO_CANVAS_TOOLBAR_CLASS =
  "flex items-center gap-1.5 rounded-[26px] border border-[#dbe2ee] bg-white px-2.5 py-1.5 shadow-[0_0_0_1px_rgba(219,226,238,0.42),0_20px_42px_rgba(22,24,29,0.08)] dark:border-zinc-800 dark:bg-zinc-950";
const VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS =
  "h-9 w-9 rounded-[14px] border border-transparent text-[#5b6678] hover:border-[#d9e1f2] hover:bg-[#f7f9ff] hover:text-[#16181d] dark:hover:border-zinc-800 dark:hover:bg-zinc-900";
const VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS =
  "border-brand-accent bg-brand-accent text-brand-accent-foreground shadow-none hover:bg-brand-accent-hover dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground dark:hover:bg-brand-accent-hover";
const VIDEO_CANVAS_COMPACT_CONTROLS_CLASS =
  "rounded-full border border-[#dbe2ee] bg-white px-2 py-1 shadow-[0_0_0_1px_rgba(219,226,238,0.36),0_12px_26px_rgba(22,24,29,0.06)] dark:border-zinc-800 dark:bg-zinc-950";
const JIMENG_CANVAS_TOOLBAR_CLASS =
  "flex items-center gap-1 rounded-[14px] border border-black/[0.055] bg-white/92 p-1 text-[#111820] shadow-[0_12px_30px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-[18px] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:text-white dark:shadow-[0_16px_42px_rgba(0,0,0,0.38)]";
const JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS =
  "h-9 w-9 rounded-[11px] border border-transparent text-[#1a2029] transition-colors hover:bg-[#f3f5f7] hover:text-[#05070a] dark:text-white/82 dark:hover:bg-white/[0.08] dark:hover:text-white [&_svg]:stroke-[1.85]";
const JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS =
  "border-brand-accent bg-brand-accent text-brand-accent-foreground shadow-none hover:border-brand-accent-hover hover:bg-brand-accent-hover hover:text-brand-accent-foreground dark:border-brand-accent dark:bg-brand-accent dark:text-brand-accent-foreground dark:hover:border-brand-accent-hover dark:hover:bg-brand-accent-hover dark:hover:text-brand-accent-foreground";
const JIMENG_CANVAS_PANEL_CLASS =
  "flex h-full w-full flex-col overflow-hidden border-l border-[#e6e8eb] bg-white text-[#0f1419] shadow-none dark:border-white/[0.08] dark:bg-[#050607] dark:text-white";
const VIDEO_CANVAS_MARKER_PANEL_ICON_MAP: Record<
  VideoCanvasSymbolMarkerId,
  LucideIcon
> = {
  idea: Lightbulb,
  question: HelpCircle,
  warning: AlertTriangle,
  pin: Pin,
  heart: Heart,
  bolt: Zap,
};

interface VideoCanvasMarkerPanelProps {
  hasSelection: boolean;
  markers: VideoCanvasMarkerState;
  onApply: (key: VideoCanvasMarkerKey, value: VideoCanvasMarkerValue) => void;
  onClear: () => void;
  onClose: () => void;
  selectedLabel: string;
}

function VideoCanvasMarkerPanel({
  hasSelection,
  markers,
  onApply,
  onClear,
  onClose,
  selectedLabel,
}: VideoCanvasMarkerPanelProps) {
  const isActive = (key: VideoCanvasMarkerKey, value: VideoCanvasMarkerValue) =>
    (markers as Record<string, unknown>)[key] === value;

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[28px] border border-[#dbe2ee] bg-white text-[#16181d] shadow-[0_0_0_1px_rgba(219,226,238,0.38),0_28px_80px_rgba(22,24,29,0.14)] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100">
      <div className="flex items-center justify-between border-b border-[#eef1f7] px-4 py-3 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="font-semibold text-sm">标记</div>
          <div className="mt-0.5 truncate text-[11px] text-[#8b94a6]">
            {hasSelection ? selectedLabel : "先选中一个模块"}
          </div>
        </div>
        <Button
          className="h-8 w-8 rounded-full text-[#7a8497] hover:bg-[#f5f7fb]"
          onClick={onClose}
          size="icon"
          type="button"
          variant="ghost"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-1 border-b border-[#eef1f7] p-2 dark:border-zinc-800">
        {["标记", "贴纸", "插画"].map((tab) => (
          <button
            className={cn(
              "h-8 rounded-[12px] text-[12px] font-medium transition-colors",
              tab === "标记"
                ? "bg-[#16181d] text-white shadow-sm dark:bg-zinc-100 dark:text-zinc-950"
                : "text-[#8b94a6] hover:bg-[#f7f9ff]"
            )}
            disabled={tab !== "标记"}
            key={tab}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>

      <ScrollArea className="min-h-0 flex-1">
        <div
          className={cn(
            "space-y-5 p-4",
            !hasSelection && "pointer-events-none opacity-45"
          )}
        >
          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              标签
            </div>
            <div className="grid grid-cols-7 gap-2">
              {VIDEO_CANVAS_MARKER_COLORS.map((entry) => (
                <button
                  aria-label={`标签 ${entry.label}`}
                  className={cn(
                    "h-8 w-8 rounded-full border border-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("tagColor", entry.id) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.id}
                  onClick={() => onApply("tagColor", entry.id)}
                  style={{ backgroundColor: entry.color }}
                  type="button"
                />
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              优先级
            </div>
            <div className="grid grid-cols-7 gap-2">
              {VIDEO_CANVAS_PRIORITY_MARKERS.map((entry) => (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-white font-semibold text-[13px] text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("priority", entry.value) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.value}
                  onClick={() => onApply("priority", entry.value)}
                  style={{ backgroundColor: entry.color }}
                  type="button"
                >
                  {entry.value}
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              任务
            </div>
            <div className="grid grid-cols-6 gap-2">
              {VIDEO_CANVAS_TASK_MARKERS.map((entry) => (
                <button
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border border-white p-[3px] shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("task", entry.id) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.id}
                  onClick={() => onApply("task", entry.id)}
                  style={{
                    background: `conic-gradient(#10b981 ${entry.progress * 3.6}deg, #dfe6f3 0deg)`,
                  }}
                  title={entry.label}
                  type="button"
                >
                  <span className="flex h-full w-full items-center justify-center rounded-full bg-white text-[#10b981]">
                    {entry.progress >= 100 ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              旗帜
            </div>
            <div className="grid grid-cols-7 gap-2">
              {VIDEO_CANVAS_MARKER_COLORS.map((entry) => (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-white text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("flagColor", entry.id) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.id}
                  onClick={() => onApply("flagColor", entry.id)}
                  style={{ backgroundColor: entry.color }}
                  title={entry.label}
                  type="button"
                >
                  <Flag className="h-4 w-4" fill="currentColor" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              星星
            </div>
            <div className="grid grid-cols-7 gap-2">
              {VIDEO_CANVAS_MARKER_COLORS.map((entry) => (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-white text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("starColor", entry.id) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.id}
                  onClick={() => onApply("starColor", entry.id)}
                  style={{ backgroundColor: entry.color }}
                  title={entry.label}
                  type="button"
                >
                  <Star className="h-4 w-4" fill="currentColor" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              人像
            </div>
            <div className="grid grid-cols-7 gap-2">
              {VIDEO_CANVAS_MARKER_COLORS.map((entry) => (
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border border-white text-white shadow-[0_8px_18px_rgba(15,23,42,0.12)] transition-transform hover:scale-105",
                    isActive("avatarColor", entry.id) &&
                      "ring-2 ring-brand-accent-deep dark:ring-brand-accent ring-offset-2"
                  )}
                  key={entry.id}
                  onClick={() => onApply("avatarColor", entry.id)}
                  style={{ backgroundColor: entry.color }}
                  title={entry.label}
                  type="button"
                >
                  <UserRound className="h-4 w-4" />
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-2 flex items-center gap-2 text-[12px] font-semibold text-[#5f687a]">
              <ChevronDown className="h-3.5 w-3.5" />
              符号
            </div>
            <div className="grid grid-cols-3 gap-2">
              {VIDEO_CANVAS_SYMBOL_MARKERS.map((entry) => {
                const Icon = VIDEO_CANVAS_MARKER_PANEL_ICON_MAP[entry.id];
                return (
                  <button
                    className={cn(
                      "flex items-center gap-2 rounded-[14px] border border-[#e5eaf4] bg-white px-3 py-2 text-left text-[12px] font-medium text-[#4a5365] shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition-all hover:border-[#cfdcff] hover:bg-[#f7f9ff]",
                      isActive("symbol", entry.id) &&
                        "border-brand-accent bg-brand-accent/15 text-brand-accent-deep ring-2 ring-brand-accent/20 dark:text-brand-accent"
                    )}
                    key={entry.id}
                    onClick={() => onApply("symbol", entry.id)}
                    type="button"
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full"
                      style={{
                        backgroundColor: entry.soft,
                        color: entry.color,
                      }}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </span>
                    {entry.label}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </ScrollArea>

      <div className="border-t border-[#eef1f7] p-3 dark:border-zinc-800">
        <Button
          className="h-10 w-full rounded-[16px] border border-[#e3e8f3] bg-white text-[#5f687a] shadow-none hover:bg-[#f7f9ff]"
          disabled={!hasSelection}
          onClick={onClear}
          type="button"
          variant="outline"
        >
          清空当前模块标记
        </Button>
      </div>
    </div>
  );
}

function buildScopedCanvasChatId(projectId: string, scope: "agent-mode") {
  const normalized = String(projectId || "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "");
  if (!/^[0-9a-f]{32}$/.test(normalized)) {
    return projectId;
  }

  const scopeSuffix = scope === "agent-mode" ? "a93e17a60001" : "a93e17a60000";
  const scoped = `${normalized.slice(0, 20)}${scopeSuffix}`;
  return [
    scoped.slice(0, 8),
    scoped.slice(8, 12),
    scoped.slice(12, 16),
    scoped.slice(16, 20),
    scoped.slice(20, 32),
  ].join("-");
}

function buildDefaultAgentProjectTitle() {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  const hour = `${now.getHours()}`.padStart(2, "0");
  const minute = `${now.getMinutes()}`.padStart(2, "0");
  return `生图项目 ${month}-${day} ${hour}:${minute}`;
}

function buildSaveAsAgentProjectTitle(currentTitle?: string | null) {
  const normalized = String(currentTitle || "").trim();
  if (!normalized) {
    return `${buildDefaultAgentProjectTitle()} 副本`;
  }
  if (normalized.endsWith("副本")) {
    return normalized;
  }
  return `${normalized} 副本`;
}

function areStringArraysEqual(left: string[], right: string[]) {
  if (left === right) return true;
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function normalizeResultCollectionUrls(urls: string[] | undefined | null) {
  return Array.from(
    new Set(
      (urls || [])
        .map((item) => String(item || "").trim())
        .filter((item) => /^https?:\/\//i.test(item))
    )
  );
}

const AGENT_PROJECT_DRAFT_STORAGE_KEY_PREFIX = "agent-project-draft:";

function getAgentProjectDraftStorageKey(projectId: string) {
  return `${AGENT_PROJECT_DRAFT_STORAGE_KEY_PREFIX}${String(projectId || "").trim()}`;
}

function scheduleCanvasIdleTask(callback: () => void, timeout = 1200) {
  if (typeof window === "undefined") {
    callback();
    return () => {};
  }

  const idleWindow = window as Window & {
    requestIdleCallback?: (
      callback: IdleRequestCallback,
      options?: IdleRequestOptions
    ) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

  if (typeof idleWindow.requestIdleCallback === "function") {
    const idleId = idleWindow.requestIdleCallback(callback, { timeout });
    return () => idleWindow.cancelIdleCallback?.(idleId);
  }

  const timer = window.setTimeout(callback, Math.min(timeout, 300));
  return () => window.clearTimeout(timer);
}

interface AgentProjectDraftSnapshot {
  savedAt: number;
  title?: string | null;
  thumbnail?: string | null;
  projectState?: AgentGenerationProjectPersistedState;
}

function readAgentProjectDraftSnapshot(
  projectId: string
): AgentProjectDraftSnapshot | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storageKey = getAgentProjectDraftStorageKey(projectId);
  if (!storageKey) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as AgentProjectDraftSnapshot | null;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return null;
    }

    return {
      savedAt: Number.isFinite(Number(parsed.savedAt))
        ? Number(parsed.savedAt)
        : 0,
      title: String(parsed.title || "").trim() || null,
      thumbnail: String(parsed.thumbnail || "").trim() || null,
      projectState:
        parsed.projectState && typeof parsed.projectState === "object"
          ? parsed.projectState
          : undefined,
    };
  } catch (error) {
    console.warn("[Agent Project] Failed to read local draft:", error);
    return null;
  }
}

function removeAgentProjectDraftSnapshot(projectId: string) {
  if (typeof window === "undefined") {
    return;
  }

  const storageKey = getAgentProjectDraftStorageKey(projectId);
  if (!storageKey) {
    return;
  }

  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    console.warn("[Agent Project] Failed to remove local draft:", error);
  }
}

function isUnauthorizedApiError(error?: string | null) {
  return /未登录|unauthorized/i.test(String(error || "").trim());
}

function clearAppearanceSummaryFromResultCollection(
  result:
    | AgentWorkflowMaterialSelections["primary"]["result"]
    | null
    | undefined
) {
  if (!result) {
    return result;
  }

  let changed = false;
  const nextImages = (result.images || []).map((image) => {
    if (!String(image.appearanceSummary || "").trim()) {
      return image;
    }
    changed = true;
    return {
      ...image,
      appearanceSummary: null,
    };
  });
  const nextGoodsInfo =
    result.goodsInfo && String(result.goodsInfo.appearanceSummary || "").trim()
      ? {
          ...result.goodsInfo,
          appearanceSummary: null,
        }
      : result.goodsInfo;

  if (nextGoodsInfo !== result.goodsInfo) {
    changed = true;
  }

  if (!changed) {
    return result;
  }

  return {
    ...result,
    images: nextImages,
    goodsInfo: nextGoodsInfo,
  };
}

function clearAppearanceSummaryFromMaterials(
  materials: AgentWorkflowMaterialSelections
): AgentWorkflowMaterialSelections {
  const nextPrimary = clearAppearanceSummaryFromResultCollection(
    materials.primary.result || null
  );
  const nextSecondary = clearAppearanceSummaryFromResultCollection(
    materials.secondary.result || null
  );

  if (
    nextPrimary === materials.primary.result &&
    nextSecondary === materials.secondary.result
  ) {
    return materials;
  }

  return {
    primary: {
      ...materials.primary,
      result: nextPrimary || null,
    },
    secondary: {
      ...materials.secondary,
      result: nextSecondary || null,
    },
  };
}

function areResultCollectionsEqual(
  left: AgentGenerationProjectResultCollections,
  right: AgentGenerationProjectResultCollections
) {
  return (
    areStringArraysEqual(
      normalizeResultCollectionUrls(left.scene_generation),
      normalizeResultCollectionUrls(right.scene_generation)
    ) &&
    areStringArraysEqual(
      normalizeResultCollectionUrls(left.detail_generation),
      normalizeResultCollectionUrls(right.detail_generation)
    ) &&
    areStringArraysEqual(
      normalizeResultCollectionUrls(left.detail_replacement),
      normalizeResultCollectionUrls(right.detail_replacement)
    ) &&
    areStringArraysEqual(
      normalizeResultCollectionUrls(left.sku_replacement),
      normalizeResultCollectionUrls(right.sku_replacement)
    )
  );
}

function getFirstResultUrlFromCollections(
  collections: AgentGenerationProjectResultCollections
) {
  return (
    normalizeResultCollectionUrls(collections.scene_generation)[0] ||
    normalizeResultCollectionUrls(collections.detail_generation)[0] ||
    normalizeResultCollectionUrls(collections.detail_replacement)[0] ||
    normalizeResultCollectionUrls(collections.sku_replacement)[0] ||
    null
  );
}

export default function CanvasEditorLegacyPage({ params }: PageProps) {
  // 使用 useParams 确保客户端导航时能正确获取更新的 id
  const routeParams = useParams();
  const searchParams = useSearchParams();
  const routeId = routeParams?.id;
  const id = Array.isArray(routeId)
    ? routeId[0] || ""
    : typeof routeId === "string"
      ? routeId
      : "";
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const mode = searchParams.get("mode");
  const requestedWorkspaceType = searchParams.get("workspaceType");
  const requestedAgentMode = mode === "agent";
  const isVideoMode =
    !requestedAgentMode &&
    (mode === "video" || requestedWorkspaceType === "video");
  const activeCanvasWorkspaceType: CanvasWorkspaceType = isVideoMode
    ? "video"
    : "canvas";
  const isDarkCanvasTheme = resolvedTheme !== "light";
  const canvasSurfaceBackground = isVideoMode
    ? isDarkCanvasTheme
      ? "#151515"
      : "#f1f2f3"
    : isDarkCanvasTheme
      ? CANVAS_SURFACE_BACKGROUND_DARK
      : CANVAS_SURFACE_BACKGROUND_LIGHT;
  const defaultCanvasTitle = isVideoMode ? "未命名视频画布" : "未命名画布";
  const workspaceLabel = isVideoMode ? "视频画布" : "画布";
  const createNewCanvasUrl = isVideoMode
    ? "/video-canvas?new=1"
    : "/canvas?new=1";
  const goHome = useCallback(() => {
    if (typeof window !== "undefined") {
      window.location.assign("/");
    }
  }, []);
  const buildWorkspaceProjectUrl = useCallback(
    (projectId: string) =>
      isVideoMode
        ? `/canvas/${projectId}?mode=video&workspaceType=video`
        : `/canvas/${projectId}`,
    [isVideoMode]
  );

  // Store state
  const projectTitle = useCanvasStore((state) => state.projectTitle);
  const viewport = useCanvasStore(canvasSelectors.viewport);
  const tool = useCanvasStore(canvasSelectors.tool);
  const canUndo = useCanvasStore(canvasSelectors.canUndo);
  const canRedo = useCanvasStore(canvasSelectors.canRedo);
  const selectedNodeIds = useCanvasStore(canvasSelectors.selectedNodeIds);
  const nodes = useCanvasStore(canvasSelectors.nodes);
  const edges = useCanvasStore(canvasSelectors.edges);

  // Store actions
  const setProject = useCanvasStore((state) => state.setProject);
  const setProjectTitle = useCanvasStore((state) => state.setProjectTitle);
  const setTool = useCanvasStore((state) => state.setTool);
  const zoomIn = useCanvasStore((state) => state.zoomIn);
  const zoomOut = useCanvasStore((state) => state.zoomOut);
  const setViewport = useCanvasStore((state) => state.setViewport);
  const undo = useCanvasStore((state) => state.undo);
  const redo = useCanvasStore((state) => state.redo);
  const loadCanvas = useCanvasStore((state) => state.loadCanvas);
  const clearCanvas = useCanvasStore((state) => state.clearCanvas);
  const getCanvasState = useCanvasStore((state) => state.getCanvasState);
  const addNode = useCanvasStore((state) => state.addNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);
  const addEdge = useCanvasStore((state) => state.addEdge);
  const selectNodes = useCanvasStore((state) => state.selectNodes);
  const updateNode = useCanvasStore((state) => state.updateNode);
  const pushHistory = useCanvasStore((state) => state.pushHistory);
  const setGenerating = useCanvasStore((state) => state.setGenerating);

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const safariGestureScaleRef = useRef(1);

  const isCanvasTextEntryTarget = useCallback((target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    if (target instanceof HTMLInputElement) {
      const inputType = String(target.type || "").toLowerCase();
      const isTextInput =
        inputType === "text" ||
        inputType === "search" ||
        inputType === "url" ||
        inputType === "email" ||
        inputType === "password" ||
        inputType === "number";
      if (isTextInput) {
        return true;
      }
    }

    return (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target.isContentEditable ||
      Boolean(target.closest('[contenteditable="true"]'))
    );
  }, []);

  const applyCanvasViewportZoom = useCallback(
    (
      zoomFactor: number,
      anchorPoint?: {
        clientX?: number;
        clientY?: number;
      }
    ) => {
      const { viewport: currentViewport } = useCanvasStore.getState();
      const nextZoom = Math.max(
        0.1,
        Math.min(4, currentViewport.zoom * zoomFactor)
      );

      if (nextZoom === currentViewport.zoom) {
        return;
      }

      const workspaceElement =
        typeof document !== "undefined"
          ? document.querySelector<HTMLElement>(
              '[data-canvas-workspace-root="true"]'
            )
          : null;

      let anchorX = window.innerWidth / 2;
      let anchorY = window.innerHeight / 2;

      if (workspaceElement) {
        const rect = workspaceElement.getBoundingClientRect();
        const hasClientPoint =
          typeof anchorPoint?.clientX === "number" &&
          typeof anchorPoint?.clientY === "number";
        const clientX = hasClientPoint ? anchorPoint.clientX : null;
        const clientY = hasClientPoint ? anchorPoint.clientY : null;

        anchorX = hasClientPoint
          ? Math.min(Math.max((clientX ?? 0) - rect.left, 0), rect.width)
          : rect.width / 2;
        anchorY = hasClientPoint
          ? Math.min(Math.max((clientY ?? 0) - rect.top, 0), rect.height)
          : rect.height / 2;
      }

      const scaleChange = nextZoom / currentViewport.zoom;
      const nextX = anchorX - (anchorX - currentViewport.x) * scaleChange;
      const nextY = anchorY - (anchorY - currentViewport.y) * scaleChange;

      setViewport({
        x: nextX,
        y: nextY,
        zoom: nextZoom,
      });
    },
    [setViewport]
  );
  const [activeWorkflowExecutionTaskKey, setActiveWorkflowExecutionTaskKey] =
    useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(() => !isVideoMode);
  const [canvasPanelWidth, setCanvasPanelWidth] =
    useState(FLOATING_PANEL_WIDTH);
  const [isVideoModuleSidebarCollapsed, setIsVideoModuleSidebarCollapsed] =
    useState(false);
  const [videoModuleSectionOpen, setVideoModuleSectionOpen] = useState<
    Record<string, boolean>
  >({
    input: true,
    analysis: true,
    storyboard: true,
    generation: true,
    tool: true,
    output: true,
  });
  const [videoCanvasInsertMenu, setVideoCanvasInsertMenu] =
    useState<VideoCanvasInsertMenuState | null>(null);
  const videoCanvasInsertMenuRef = useRef<HTMLDivElement | null>(null);
  const [isVideoCanvasFileListOpen, setIsVideoCanvasFileListOpen] =
    useState(false);
  const [isVideoCanvasMarkerPanelOpen, setIsVideoCanvasMarkerPanelOpen] =
    useState(false);
  // 面板模式: 'chat' 聊天面板, 'fileList' 文件列表
  const [panelMode, setPanelMode] = useState<"chat" | "fileList">("chat");
  const [viewportWidth, setViewportWidth] = useState(0);
  const [workflowInputs, setWorkflowInputs] = useState<AgentWorkflowInputs>({
    primarySku: "",
    secondarySku: "",
    brand: "",
    store: "",
    officialSecondCategory: "",
    officialThirdCategory: "",
    thirdCategory: "",
    fourthCategory: "",
    fifthCategory: "",
    priceBand: "",
  });
  const [workflowMaterials, setWorkflowMaterials] =
    useState<AgentWorkflowMaterialSelections>(() =>
      createEmptyAgentWorkflowMaterialSelections()
    );
  const [workflowSelections, setWorkflowSelections] = useState<
    Partial<Record<AgentWorkflowStepKey, string>>
  >({});

  useEffect(() => {
    if (!isVideoMode) {
      setVideoCanvasInsertMenu(null);
      setIsVideoCanvasFileListOpen(false);
      setIsVideoCanvasMarkerPanelOpen(false);
    }
  }, [isVideoMode]);

  useEffect(() => {
    if (!isVideoMode) {
      setIsVideoModuleSidebarCollapsed(false);
    }
  }, [isVideoMode]);
  const [appearanceRecognitionEnabled, setAppearanceRecognitionEnabled] =
    useState(false);
  const [selectedBrandModel, setSelectedBrandModel] =
    useState<AgentWorkflowSelectedBrandModel | null>(null);
  const workflowInputsRef = useRef(workflowInputs);
  const workflowMaterialsRef = useRef(workflowMaterials);
  const workflowSelectionsRef = useRef(workflowSelections);
  const appearanceRecognitionEnabledRef = useRef(appearanceRecognitionEnabled);
  const selectedBrandModelRef = useRef(selectedBrandModel);
  const [selectedAgentPresetId, setSelectedAgentPresetId] = useState<
    string | null
  >(null);
  const [currentAgentStage, setCurrentAgentStage] = useState<
    "workflow" | "mode"
  >("workflow");
  const [agentModeState, setAgentModeState] = useState<AgentModeWorkspaceState>(
    () => createEmptyAgentModeWorkspaceState()
  );
  const [agentWorkspaceState, setAgentWorkspaceState] =
    useState<AgentGenerationProjectWorkspaceState>(() =>
      createEmptyAgentGenerationProjectWorkspaceState()
    );
  const [agentProjectTitle, setAgentProjectTitle] = useState("未命名生图项目");
  const [agentProjectThumbnail, setAgentProjectThumbnail] = useState<
    string | null
  >(null);
  const [agentProjectResultCollections, setAgentProjectResultCollections] =
    useState<AgentGenerationProjectResultCollections>({});
  const [
    agentProjectDeletedResultCollections,
    setAgentProjectDeletedResultCollections,
  ] = useState<AgentGenerationProjectResultCollections>({});
  const [isAgentProjectLoading, setIsAgentProjectLoading] = useState(false);
  const [loadedAgentProjectId, setLoadedAgentProjectId] = useState<
    string | null
  >(null);
  const [isAgentProjectSaving, setIsAgentProjectSaving] = useState(false);
  const [isSyncingAgentResultsToCanvas, setIsSyncingAgentResultsToCanvas] =
    useState(false);
  const [isImportingVideoCanvas, setIsImportingVideoCanvas] = useState(false);
  const [isAgentProjectSheetOpen, setIsAgentProjectSheetOpen] = useState(false);
  const [isAgentProjectMenuOpen, setIsAgentProjectMenuOpen] = useState(false);
  const [isLoginDialogOpen, setIsLoginDialogOpen] = useState(false);
  const [loginDialogMessage, setLoginDialogMessage] = useState(
    "当前登录状态已失效，请重新登录后继续操作。"
  );
  const [authSessionChecked, setAuthSessionChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [workflowHydrationSource, setWorkflowHydrationSource] = useState<
    "pending" | "project" | "local" | "empty"
  >("pending");
  const requestedAgentProjectId = searchParams.get("agentProjectId");
  const agentProjectId = requestedAgentProjectId
    ? requestedAgentProjectId.trim()
    : "";
  const hasActiveAgentProject = Boolean(agentProjectId);
  const agentModeChatId = useMemo(
    () => buildScopedCanvasChatId(agentProjectId || id, "agent-mode"),
    [agentProjectId, id]
  );
  const canvasSiteSettingsKey = requestedAgentMode
    ? "/api/site-settings?scope=agent-canvas"
    : "/api/site-settings?scope=canvas";
  const [hasResolvedCanvasSiteSettings, setHasResolvedCanvasSiteSettings] =
    useState(false);

  const { data: siteSettingsData } = useSWR<{
    siteName?: string;
    siteLogo?: string | null;
    siteLogoDark?: string | null;
    agentEnabled?: boolean;
    canvasAgentModeEnabled?: boolean;
    videoCanvasSidebarEnabled?: boolean;
    layerSplitEnabled?: boolean;
    angleEditEnabled?: boolean;
    canvasToolbarConfig?: CanvasToolbarConfig;
    agentWorkflowShowcaseConfig?: AgentWorkflowShowcaseConfig;
    agentWorkflowUiConfig?: AgentWorkflowUiConfig;
  }>(canvasSiteSettingsKey, fetchCanvasSiteSettings, {
    onSuccess: () => {
      setHasResolvedCanvasSiteSettings(true);
    },
    onError: () => {
      setHasResolvedCanvasSiteSettings(true);
    },
    refreshInterval: requestedAgentMode
      ? 0
      : CANVAS_SITE_SETTINGS_REFRESH_INTERVAL_MS,
    errorRetryCount: 1,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });
  const { data: canvasAuthSession } = useSWR<{
    valid?: boolean;
    user?: {
      id?: string | null;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    } | null;
  }>("/api/auth/validate-session", fetcher, {
    dedupingInterval: 5000,
    revalidateOnFocus: false,
  });
  useEffect(() => {
    setHasResolvedCanvasSiteSettings(false);
  }, [canvasSiteSettingsKey]);
  const isLayerSplitEnabled =
    hasResolvedCanvasSiteSettings && siteSettingsData?.layerSplitEnabled === true;
  const isAngleEditEnabled =
    hasResolvedCanvasSiteSettings && siteSettingsData?.angleEditEnabled === true;

  // 生成配置
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState("auto");
  const [imageSize, setImageSize] = useState("2K");
  const [imageCount, setImageCount] = useState(1);
  const previousNodeIdsRef = useRef<Set<string>>(new Set());
  const previousBrandForModelRef = useRef("");
  const autoSelectedBrandModelBrandRef = useRef("");
  const autoTitleAttemptedRef = useRef<Set<string>>(new Set());
  const autoTitleInFlightRef = useRef<string | null>(null);
  const autoThumbnailSyncedRef = useRef<string | null>(null);
  const lastLoadedCanvasIdRef = useRef<string>("");
  const normalizedVideoNodeSizeIdsRef = useRef<Set<string>>(new Set());
  const importVideoCanvasInputRef = useRef<HTMLInputElement | null>(null);
  const isAgentWorkspaceEnabled = siteSettingsData?.agentEnabled !== false;
  const isCanvasAgentModeEnabled =
    siteSettingsData?.canvasAgentModeEnabled !== false;
  const isVideoModuleSidebarEnabled =
    siteSettingsData?.videoCanvasSidebarEnabled !== false;
  const canvasToolbarConfig = useMemo(
    () => normalizeCanvasToolbarConfig(siteSettingsData?.canvasToolbarConfig),
    [siteSettingsData?.canvasToolbarConfig]
  );
  const isAgentMode = isAgentWorkspaceEnabled && requestedAgentMode;
  useEffect(() => {
    if (!isAgentMode) return;

    void loadAgentGenerationWorkspaceDarkV2().catch((error) => {
      console.warn("[Agent Workspace] preload failed:", error);
    });
  }, [isAgentMode]);

  const hasLoadedCurrentAgentProject =
    !requestedAgentMode ||
    !agentProjectId ||
    loadedAgentProjectId === agentProjectId;
  const resolvedWorkflowUiConfig = useMemo(
    () => siteSettingsData?.agentWorkflowUiConfig || defaultAgentWorkflowUiConfig,
    [siteSettingsData?.agentWorkflowUiConfig]
  );
  const workflowPageFeatureSettings = useMemo(
    () => getAgentWorkflowPageFeatureSettings(resolvedWorkflowUiConfig),
    [resolvedWorkflowUiConfig]
  );
  const workflowBusinessModeSettings = useMemo(
    () => getAgentWorkflowBusinessModeSettings(resolvedWorkflowUiConfig),
    [resolvedWorkflowUiConfig]
  );
  const isWorkflowMaterialStepEnabled =
    workflowPageFeatureSettings.materialStepEnabled !== false;
  const isStyleModeToolbarEnabled = false;
  const shouldShowStyleModeToolbarButton =
    isStyleModeToolbarEnabled && isAgentWorkspaceEnabled;
  const normalizedBrandModelName = workflowInputs.brand.trim();
  const brandModelSettingsKey =
    requestedAgentMode && normalizedBrandModelName
      ? `/api/site-settings?scope=agent-brand-model&brand=${encodeURIComponent(
          normalizedBrandModelName
        )}`
      : null;
  const { data: brandModelSettingsData } = useSWR<{
    agentWorkflowBrandModelConfig?: unknown;
  }>(brandModelSettingsKey, fetchCanvasSiteSettings, {
    errorRetryCount: 1,
    revalidateOnFocus: false,
  });
  const sanitizedWorkflowSelections = useMemo(
    () =>
      sanitizeAgentWorkflowSelections({
        config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
        selections: workflowSelections,
      }),
    [resolvedWorkflowUiConfig, workflowSelections]
  );
  const deferredSanitizedWorkflowSelections = useDeferredValue(
    sanitizedWorkflowSelections
  );
  const resolvedBrandModelConfig = useMemo(
    () =>
      normalizeAgentWorkflowBrandModelConfig(
        brandModelSettingsData?.agentWorkflowBrandModelConfig
      ),
    [brandModelSettingsData?.agentWorkflowBrandModelConfig]
  );

  useEffect(() => {
    if (!isVideoMode || nodes.length === 0) {
      return;
    }

    nodes.forEach((node) => {
      if (normalizedVideoNodeSizeIdsRef.current.has(node.id)) {
        return;
      }

      normalizedVideoNodeSizeIdsRef.current.add(node.id);
      const templateType = inferVideoWorkflowTemplateType(node);
      const definition = templateType
        ? getVideoWorkflowNodeDefinition(templateType)
        : null;
      if (!definition) {
        return;
      }

      const nextWidth = Math.min(node.size.width, definition.size.width);
      const nextHeight = Math.min(node.size.height, definition.size.height);
      if (nextWidth === node.size.width && nextHeight === node.size.height) {
        return;
      }

      updateNode(node.id, {
        size: {
          width: nextWidth,
          height: nextHeight,
        },
      });
    });
  }, [isVideoMode, nodes, updateNode]);

  // 获取选中的图片节点
  const selectedImageNode =
    selectedNodeIds.length === 1
      ? nodes.find((n) => n.id === selectedNodeIds[0] && n.type === "image")
      : null;
  const selectedVideoWorkflowNode = useMemo(
    () =>
      isVideoMode && selectedNodeIds.length === 1
        ? nodes.find((node) => node.id === selectedNodeIds[0]) || null
        : null,
    [isVideoMode, nodes, selectedNodeIds]
  );
  const selectedVideoWorkflowType = useMemo(
    () => inferVideoWorkflowTemplateType(selectedVideoWorkflowNode),
    [selectedVideoWorkflowNode]
  );
  const selectedVideoWorkflowData = useMemo(
    () =>
      selectedVideoWorkflowNode?.type === "workflow"
        ? (selectedVideoWorkflowNode.data as WorkflowNodeData)
        : null,
    [selectedVideoWorkflowNode]
  );
  const selectedVideoWorkflowDefinition = useMemo(
    () =>
      selectedVideoWorkflowType
        ? getVideoWorkflowNodeDefinition(selectedVideoWorkflowType)
        : null,
    [selectedVideoWorkflowType]
  );
  const selectedVideoCanvasMarkers = useMemo(() => {
    const metadata = (
      selectedVideoWorkflowNode?.data as { metadata?: unknown } | undefined
    )?.metadata;
    return normalizeVideoCanvasMarkers(
      isPlainObject(metadata)
        ? metadata[VIDEO_CANVAS_MARKER_METADATA_KEY]
        : undefined
    );
  }, [selectedVideoWorkflowNode]);
  const selectedVideoCanvasMarkerLabel = useMemo(() => {
    if (!selectedVideoWorkflowNode) return "未选择模块";
    const data = selectedVideoWorkflowNode.data as {
      content?: unknown;
      title?: unknown;
    };
    const title = String(data.title || data.content || "").trim();
    if (title) return title.slice(0, 36);
    return selectedVideoWorkflowDefinition?.label || "当前模块";
  }, [selectedVideoWorkflowDefinition?.label, selectedVideoWorkflowNode]);
  const selectedVideoWorkflowQuickConnects = useMemo(
    () =>
      selectedVideoWorkflowType
        ? getVideoWorkflowQuickConnectOutputs(selectedVideoWorkflowType)
        : [],
    [selectedVideoWorkflowType]
  );
  const selectedWorkflowQuickConnectAnchor = useMemo(() => {
    if (
      !isVideoMode ||
      !selectedVideoWorkflowNode ||
      selectedVideoWorkflowQuickConnects.length === 0
    ) {
      return null;
    }

    const nodeLeft =
      selectedVideoWorkflowNode.position.x * viewport.zoom + viewport.x;
    const nodeTop =
      selectedVideoWorkflowNode.position.y * viewport.zoom + viewport.y;
    const nodeWidth = selectedVideoWorkflowNode.size.width * viewport.zoom;
    const anchorX = nodeLeft + nodeWidth;
    const anchorY =
      nodeTop + (selectedVideoWorkflowNode.size.height * viewport.zoom) / 2;
    const openLeft = viewportWidth > 0 && anchorX + 260 > viewportWidth - 32;

    return {
      x: anchorX,
      y: anchorY,
      openLeft,
    };
  }, [
    isVideoMode,
    selectedVideoWorkflowNode,
    selectedVideoWorkflowQuickConnects.length,
    viewport.x,
    viewport.y,
    viewport.zoom,
    viewportWidth,
  ]);
  const selectedWorkflowQuickConnectSourceNode =
    selectedWorkflowQuickConnectAnchor && selectedVideoWorkflowNode
      ? selectedVideoWorkflowNode
      : null;
  const videoModuleSidebarWidth =
    isVideoMode && isVideoModuleSidebarEnabled
      ? isVideoModuleSidebarCollapsed
        ? 58
        : 236
      : 0;
  const selectedWorkflowPanelLeft = isVideoMode
    ? videoModuleSidebarWidth + 24
    : 16;
  const handleDeleteSelectedWorkflowNode = useCallback(() => {
    if (!selectedVideoWorkflowNode) return;
    deleteNode(selectedVideoWorkflowNode.id);
    toast.success(
      `已删除模块：${selectedVideoWorkflowDefinition?.label || "当前模块"}`
    );
  }, [
    deleteNode,
    selectedVideoWorkflowDefinition?.label,
    selectedVideoWorkflowNode,
  ]);
  const handleApplyVideoCanvasMarker = useCallback(
    (key: VideoCanvasMarkerKey, value: VideoCanvasMarkerValue) => {
      if (!selectedVideoWorkflowNode) {
        toast.info("请先选中一个模块");
        return;
      }

      const currentData = selectedVideoWorkflowNode.data;
      const currentMetadata = (currentData as { metadata?: unknown }).metadata;
      const metadata = isPlainObject(currentMetadata)
        ? { ...currentMetadata }
        : {};
      const currentMarkers = normalizeVideoCanvasMarkers(
        metadata[VIDEO_CANVAS_MARKER_METADATA_KEY]
      );
      const nextMarkers: VideoCanvasMarkerState = { ...currentMarkers };
      const nextMarkerRecord = nextMarkers as Record<string, unknown>;

      if (nextMarkerRecord[key] === value) {
        delete nextMarkerRecord[key];
      } else {
        nextMarkerRecord[key] = value;
      }

      const compactMarkers = compactVideoCanvasMarkers(nextMarkers);
      if (Object.keys(compactMarkers).length > 0) {
        metadata[VIDEO_CANVAS_MARKER_METADATA_KEY] = compactMarkers;
      } else {
        delete metadata[VIDEO_CANVAS_MARKER_METADATA_KEY];
      }

      updateNode(selectedVideoWorkflowNode.id, {
        data: {
          ...currentData,
          metadata,
        } as CanvasNode["data"],
      });
      pushHistory();
    },
    [pushHistory, selectedVideoWorkflowNode, updateNode]
  );
  const handleClearVideoCanvasMarkers = useCallback(() => {
    if (!selectedVideoWorkflowNode) {
      toast.info("请先选中一个模块");
      return;
    }

    const currentData = selectedVideoWorkflowNode.data;
    const currentMetadata = (currentData as { metadata?: unknown }).metadata;
    const metadata = isPlainObject(currentMetadata)
      ? { ...currentMetadata }
      : {};

    if (!(VIDEO_CANVAS_MARKER_METADATA_KEY in metadata)) {
      return;
    }

    delete metadata[VIDEO_CANVAS_MARKER_METADATA_KEY];
    updateNode(selectedVideoWorkflowNode.id, {
      data: {
        ...currentData,
        metadata,
      } as CanvasNode["data"],
    });
    pushHistory();
    toast.success("已清空当前模块标记");
  }, [pushHistory, selectedVideoWorkflowNode, updateNode]);
  const workflowGraph = useMemo(
    () => createWorkflowGraphContext(nodes, edges),
    [edges, nodes]
  );
  const selectedWorkflowPrompt = useMemo(
    () =>
      selectedVideoWorkflowNode
        ? buildWorkflowPrompt(selectedVideoWorkflowNode.id, workflowGraph)
        : "",
    [selectedVideoWorkflowNode, workflowGraph]
  );
  const selectedWorkflowMedia = useMemo(
    () =>
      selectedVideoWorkflowNode
        ? collectWorkflowMedia(selectedVideoWorkflowNode.id, workflowGraph)
        : [],
    [selectedVideoWorkflowNode, workflowGraph]
  );
  const selectedWorkflowStoryboardShots = useMemo(
    () =>
      selectedVideoWorkflowNode
        ? collectWorkflowStoryboardShots(
            selectedVideoWorkflowNode.id,
            workflowGraph
          )
        : [],
    [selectedVideoWorkflowNode, workflowGraph]
  );
  const selectedWorkflowStructuredData = useMemo(
    () =>
      selectedVideoWorkflowNode
        ? collectWorkflowStructuredData(
            selectedVideoWorkflowNode.id,
            workflowGraph
          )
        : {
            characters: [] as WorkflowCharacterRecord[],
            scenes: [] as WorkflowSceneRecord[],
            characterAssets: [] as WorkflowAssetRecord[],
            sceneAssets: [] as WorkflowAssetRecord[],
            relationships: [] as string[],
            recommendedNextSteps: [] as string[],
            agentPlan: [] as string[],
            deliverables: [] as string[],
            recommendedNodes: [] as string[],
          },
    [selectedVideoWorkflowNode, workflowGraph]
  );
  const selectedWorkflowInputs = useMemo(
    () =>
      selectedVideoWorkflowNode
        ? summarizeWorkflowInputs(selectedVideoWorkflowNode.id, workflowGraph)
        : { promptCount: 0, imageCount: 0, videoCount: 0 },
    [selectedVideoWorkflowNode, workflowGraph]
  );
  const linkedAgentWorkflowNode = useMemo(() => {
    if (!agentProjectId) return null;

    return (
      nodes
        .filter(
          (node) =>
            node.type === "workflow" &&
            inferVideoWorkflowTemplateType(node) === "custom-agent" &&
            String(
              ((node.data as WorkflowNodeData).metadata || {})
                ?.linkedAgentProjectId || ""
            ).trim() === agentProjectId
        )
        .sort((left, right) => {
          const leftSyncedAt = Number(
            new Date(
              String(
                (
                  ((left.data as WorkflowNodeData).metadata || {}) as Record<
                    string,
                    any
                  >
                )?.lastAgentCanvasSyncAt ||
                  (
                    ((left.data as WorkflowNodeData).metadata || {}) as Record<
                      string,
                      any
                    >
                  )?.lastAgentWorkspaceSyncAt ||
                  left.updatedAt
              )
            ).getTime()
          );
          const rightSyncedAt = Number(
            new Date(
              String(
                (
                  ((right.data as WorkflowNodeData).metadata || {}) as Record<
                    string,
                    any
                  >
                )?.lastAgentCanvasSyncAt ||
                  (
                    ((right.data as WorkflowNodeData).metadata || {}) as Record<
                      string,
                      any
                    >
                  )?.lastAgentWorkspaceSyncAt ||
                  right.updatedAt
              )
            ).getTime()
          );
          return rightSyncedAt - leftSyncedAt;
        })[0] || null
    );
  }, [agentProjectId, nodes]);
  const linkedAgentWorkflowData = useMemo(
    () =>
      linkedAgentWorkflowNode?.type === "workflow"
        ? (linkedAgentWorkflowNode.data as WorkflowNodeData)
        : null,
    [linkedAgentWorkflowNode]
  );
  const linkedAgentImportedResultUrls = useMemo(() => {
    const metadata =
      ((linkedAgentWorkflowData?.metadata || {}) as Record<string, any>) || {};
    return Array.isArray(metadata.importedAgentResultUrls)
      ? metadata.importedAgentResultUrls
          .map((item) => String(item || "").trim())
          .filter((item) => /^https?:\/\//i.test(item))
      : [];
  }, [linkedAgentWorkflowData]);
  const flattenedAgentResultEntries = useMemo(
    () =>
      (
        [
          "scene_generation",
          "detail_generation",
          "detail_replacement",
          "sku_replacement",
        ] as AgentGenerationResultModeType[]
      ).flatMap((modeType) =>
        normalizeResultCollectionUrls(
          agentProjectResultCollections[modeType]
        ).map((url, index) => ({
          modeType,
          url,
          index,
          label: AGENT_RESULT_MODE_LABELS[modeType],
        }))
      ),
    [agentProjectResultCollections]
  );
  const pendingAgentCanvasImportCount = useMemo(() => {
    const existingUrls = new Set(
      nodes
        .flatMap((node) => {
          if (node.type === "image" || node.type === "video") {
            return [
              String((node.data as Record<string, any>)?.src || "").trim(),
            ];
          }
          return [];
        })
        .filter((item) => /^https?:\/\//i.test(item))
    );
    const importedUrls = new Set(linkedAgentImportedResultUrls);
    return flattenedAgentResultEntries.filter(
      (item) => !existingUrls.has(item.url) && !importedUrls.has(item.url)
    ).length;
  }, [flattenedAgentResultEntries, linkedAgentImportedResultUrls, nodes]);
  const canSyncAgentResultsToCanvas = Boolean(
    requestedWorkspaceType === "video" &&
      isAgentMode &&
      linkedAgentWorkflowNode &&
      flattenedAgentResultEntries.length > 0
  );
  const selectedWorkflowLinkedAgentProject = useMemo(() => {
    const metadata =
      ((selectedVideoWorkflowData?.metadata || {}) as Record<string, any>) ||
      {};
    return {
      id: String(metadata.linkedAgentProjectId || "").trim(),
      title: String(metadata.linkedAgentProjectTitle || "").trim(),
      syncedAt: String(
        metadata.lastAgentWorkspaceSyncAt ||
          metadata.linkedAgentProjectUpdatedAt ||
          ""
      ).trim(),
    };
  }, [selectedVideoWorkflowData]);
  const selectedWorkflowAgentResultGroups = useMemo(() => {
    const metadata =
      ((selectedVideoWorkflowData?.metadata || {}) as Record<string, any>) ||
      {};
    return Array.isArray(metadata.agentResultGroups)
      ? metadata.agentResultGroups
          .map((item) => {
            const record = (item || {}) as Record<string, any>;
            return {
              modeType: String(record.modeType || "").trim(),
              label: String(record.label || "").trim(),
              count: Math.max(Number(record.count || 0), 0),
              importedCount: Math.max(Number(record.importedCount || 0), 0),
            };
          })
          .filter((item) => item.label && item.count > 0)
      : [];
  }, [selectedVideoWorkflowData]);
  const selectedWorkflowAgentResultAssets = useMemo<
    Array<{
      modeType: string;
      label: string;
      assets: WorkflowMediaReference[];
    }>
  >(() => {
    const metadata =
      ((selectedVideoWorkflowData?.metadata || {}) as Record<string, any>) ||
      {};
    return Array.isArray(metadata.agentResultAssets)
      ? metadata.agentResultAssets.reduce<
          Array<{
            modeType: string;
            label: string;
            assets: WorkflowMediaReference[];
          }>
        >((groups, item) => {
          const record = (item || {}) as Record<string, any>;
          const modeType = String(record.modeType || "").trim();
          const label = String(record.label || "").trim();
          const assets = Array.isArray(record.assets)
            ? record.assets.reduce<WorkflowMediaReference[]>(
                (nextAssets, asset, index) => {
                  const assetRecord = (asset || {}) as Record<string, any>;
                  const url = String(assetRecord.url || "").trim();
                  if (!/^https?:\/\//i.test(url)) return nextAssets;
                  nextAssets.push({
                    nodeId: selectedVideoWorkflowNode?.id || "",
                    kind: "image" as const,
                    url,
                    title: String(
                      assetRecord.title ||
                        `${label || "Agent 结果"} ${index + 1}`
                    ).trim(),
                    prompt: selectedWorkflowPrompt,
                    source: "workflow-result" as const,
                  });
                  return nextAssets;
                },
                []
              )
            : [];
          if (!modeType || !label || assets.length === 0) return groups;
          groups.push({
            modeType,
            label,
            assets,
          });
          return groups;
        }, [])
      : [];
  }, [
    selectedVideoWorkflowData,
    selectedVideoWorkflowNode?.id,
    selectedWorkflowPrompt,
  ]);
  const selectedWorkflowAgentResultCount = useMemo(
    () =>
      selectedWorkflowAgentResultGroups.reduce(
        (total, item) => total + item.count,
        0
      ),
    [selectedWorkflowAgentResultGroups]
  );
  const selectedWorkflowPendingAgentResultCount = useMemo(() => {
    const metadata =
      ((selectedVideoWorkflowData?.metadata || {}) as Record<string, any>) ||
      {};
    return Math.max(Number(metadata.pendingAgentResultCount || 0), 0);
  }, [selectedVideoWorkflowData]);
  const selectedStoryboardDownstreamNodes = useMemo(() => {
    if (
      !selectedVideoWorkflowNode ||
      selectedVideoWorkflowType !== "storyboard-node"
    ) {
      return [];
    }

    return getDirectDownstreamNodes(selectedVideoWorkflowNode.id, workflowGraph)
      .map((node) => ({
        node,
        templateType:
          node.type === "workflow"
            ? inferVideoWorkflowTemplateType(node)
            : null,
      }))
      .filter((item) => Boolean(item.templateType));
  }, [selectedVideoWorkflowNode, selectedVideoWorkflowType, workflowGraph]);
  const selectedStoryboardBatchTargets = useMemo(
    () =>
      selectedStoryboardDownstreamNodes.filter(
        (item) =>
          item.templateType === "gen-image" || item.templateType === "gen-video"
      ),
    [selectedStoryboardDownstreamNodes]
  );
  const selectedStoryboardChartTargets = useMemo(
    () =>
      selectedStoryboardDownstreamNodes.filter(
        (item) => item.templateType === "storyboard-chart-node"
      ),
    [selectedStoryboardDownstreamNodes]
  );
  const selectedStoryboardCanBatchExecute = useMemo(
    () =>
      selectedVideoWorkflowType === "storyboard-node" &&
      selectedStoryboardBatchTargets.length > 0 &&
      (selectedWorkflowStoryboardShots.length > 0 ||
        Boolean(selectedWorkflowPrompt.trim())),
    [
      selectedStoryboardBatchTargets.length,
      selectedVideoWorkflowType,
      selectedWorkflowPrompt,
      selectedWorkflowStoryboardShots.length,
    ]
  );
  const selectedWorkflowIsActionable = useMemo(
    () =>
      Boolean(
        selectedVideoWorkflowType &&
          [
            "video-analyze",
            "storyboard-node",
            "storyboard-chart-node",
            "table-editor-node",
            "gen-image",
            "gen-video",
            "camera-movement",
            "canvas-node",
            "motion-control",
            "doodle-canvas",
            "professional-camera",
            "image-compare",
            "inpaint-crop",
            "inpaint-stitch",
            "jimeng-super-resolution",
            "gen-music",
            "rh-app",
            "rh-comfy",
            "preview",
            "local-save",
            "extract-characters-scenes",
            "character-description",
            "scene-description",
            "create-character",
            "create-scene",
            "generate-character-image",
            "generate-character-video",
            "generate-scene-image",
            "generate-scene-video",
            "custom-agent",
          ].includes(selectedVideoWorkflowType)
      ),
    [selectedVideoWorkflowType]
  );
  const selectedWorkflowActionLabel = useMemo(() => {
    switch (selectedVideoWorkflowType) {
      case "video-analyze":
        return "分析视频";
      case "extract-characters-scenes":
        return "提取角色场景";
      case "character-description":
        return "整理角色描述";
      case "scene-description":
        return "整理场景描述";
      case "create-character":
        return "固化角色资产";
      case "create-scene":
        return "固化场景资产";
      case "storyboard-node":
        return "整理分镜";
      case "storyboard-chart-node":
        return "生成分镜表";
      case "table-editor-node":
        return "整理表格";
      case "camera-movement":
        return "测试运镜";
      case "canvas-node":
        return "整理画板";
      case "motion-control":
        return "生成动作控制";
      case "doodle-canvas":
        return "整理涂鸦画板";
      case "professional-camera":
        return "调整专业机位";
      case "gen-image":
        return "生成图片";
      case "gen-video":
        return "生成视频";
      case "image-compare":
        return "整理对比";
      case "inpaint-crop":
        return "裁剪局部重绘";
      case "inpaint-stitch":
        return "拼接补画";
      case "jimeng-super-resolution":
        return "超分增强";
      case "gen-music":
        return "生成配乐方案";
      case "rh-app":
        return "整理 RH 应用包";
      case "rh-comfy":
        return "整理 Comfy 工作流";
      case "generate-character-image":
        return "生成角色图";
      case "generate-character-video":
        return "生成角色视频";
      case "generate-scene-image":
        return "生成场景图";
      case "generate-scene-video":
        return "生成场景视频";
      case "custom-agent":
        return "更新代理计划";
      case "preview":
        return "刷新预览";
      case "local-save":
        return "下载上游结果";
      default:
        return "执行节点";
    }
  }, [selectedVideoWorkflowType]);
  const selectedWorkflowActionHint = useMemo(() => {
    switch (selectedVideoWorkflowType) {
      case "video-analyze":
        return "会调用现有视觉分析能力，整理镜头节奏、视觉母题和可继续拆解的镜头建议。";
      case "extract-characters-scenes":
        return "会从脚本、设定和参考图中提取角色与场景线索，作为后续资产节点的输入。";
      case "character-description":
        return "会把上游角色线索整理成更稳定的角色描述，方便继续生成角色图和角色视频。";
      case "scene-description":
        return "会把上游场景线索整理成更稳定的场景描述，方便继续生成环境图和场景视频。";
      case "create-character":
        return "会把上游角色信息固化成可复用角色资产，供角色图和角色视频节点复用。";
      case "create-scene":
        return "会把上游场景信息固化成可复用场景资产，供场景图和场景视频节点复用。";
      case "storyboard-node":
        return "会先整理上游脚本和素材提示，再把镜头草案派发给下游生图或生视频节点。";
      case "storyboard-chart-node":
        return "会把上游分镜草案整理成结构化镜头表，方便继续检查节奏、镜头说明和生成提示。";
      case "table-editor-node":
        return "会把上游脚本、角色、场景或镜头信息整理成表格结构，方便继续转成分镜或资产表。";
      case "camera-movement":
        return "会围绕上游脚本和参考图生成一段运镜测试片段，同时沉淀镜头运动说明。";
      case "canvas-node":
        return "会把上游素材整理成一个结构化画板节点，方便继续做对比、挑图和分支创作。";
      case "motion-control":
        return "会围绕上游脚本和主体动作生成一段动作控制片段，同时沉淀运动节奏说明。";
      case "doodle-canvas":
        return "会把上游创作意图整理成涂鸦/遮罩指令，方便继续接局部重绘或外部涂鸦工作流。";
      case "professional-camera":
        return "会复用专业机位调整能力，对上游图片做一版机位/焦距测试图，也会沉淀镜头参数。";
      case "gen-image":
        return "会复用现有生图能力，把上游脚本和参考图变成新的关键帧结果节点。";
      case "gen-video":
        return "会复用现有视频生成能力，根据上游脚本和参考图产出视频结果节点。";
      case "image-compare":
        return "会把上游图片或视频封面整理成对比卡，方便并排检查版本差异和风格一致性。";
      case "inpaint-crop":
        return "会复用框选抠图能力，先把上游图片裁出适合局部重绘的工作区域。";
      case "inpaint-stitch":
        return "会复用图像拓展能力，对上游图片做一版补边扩图，方便继续拼接或补画。";
      case "jimeng-super-resolution":
        return "会复用当前图像增强链路，对上游图片做一版高清增强并生成新的结果节点。";
      case "gen-music":
        return "会把上游脚本和分镜整理成配乐提示与节奏表，方便继续接音频制作或外部作曲工具。";
      case "rh-app":
        return "会把当前工作流上下文整理成 RH 应用可执行包，沉淀步骤、输入和交付物。";
      case "rh-comfy":
        return "会把当前工作流上下文整理成 Comfy 图谱包，沉淀节点顺序、输入资源和提示词。";
      case "generate-character-image":
        return "会围绕角色资产复用现有生图能力，产出风格稳定的角色关键帧。";
      case "generate-character-video":
        return "会围绕角色资产复用现有视频生成能力，产出角色镜头或动作片段。";
      case "generate-scene-image":
        return "会围绕场景资产复用现有生图能力，产出环境和氛围关键帧。";
      case "generate-scene-video":
        return "会围绕场景资产复用现有视频生成能力，产出环境镜头或转场片段。";
      case "custom-agent":
        return "会基于当前上下文生成一版代理执行计划，也可以一键送入 Agent 工作台继续细化执行。";
      case "preview":
        return "会从上游结果里抓取最近的图片或视频，回填到预览节点中。";
      case "local-save":
        return "会把上游图片或视频打包下载，作为当前流程的本地保存出口。";
      default:
        return "";
    }
  }, [selectedVideoWorkflowType]);
  const selectedWorkflowPrimaryTaskKey = selectedVideoWorkflowNode
    ? `${selectedVideoWorkflowNode.id}:primary`
    : null;
  const selectedWorkflowBatchTaskKey =
    selectedVideoWorkflowNode && selectedVideoWorkflowType === "storyboard-node"
      ? `${selectedVideoWorkflowNode.id}:batch`
      : null;
  const selectedWorkflowAgentTaskKey =
    selectedVideoWorkflowNode && selectedVideoWorkflowType === "custom-agent"
      ? `${selectedVideoWorkflowNode.id}:agent`
      : null;
  const selectedWorkflowBranchTaskKey =
    selectedVideoWorkflowNode && selectedVideoWorkflowType === "custom-agent"
      ? `${selectedVideoWorkflowNode.id}:branches`
      : null;
  const isSelectedWorkflowPrimaryRunning =
    Boolean(selectedWorkflowPrimaryTaskKey) &&
    activeWorkflowExecutionTaskKey === selectedWorkflowPrimaryTaskKey;
  const isSelectedWorkflowBatchRunning =
    Boolean(selectedWorkflowBatchTaskKey) &&
    activeWorkflowExecutionTaskKey === selectedWorkflowBatchTaskKey;
  const isSelectedWorkflowAgentRunning =
    Boolean(selectedWorkflowAgentTaskKey) &&
    activeWorkflowExecutionTaskKey === selectedWorkflowAgentTaskKey;
  const isSelectedWorkflowBranchRunning =
    Boolean(selectedWorkflowBranchTaskKey) &&
    activeWorkflowExecutionTaskKey === selectedWorkflowBranchTaskKey;
  const isAnyWorkflowExecutionRunning = Boolean(activeWorkflowExecutionTaskKey);

  const maxAvailableFloatingPanelWidth =
    viewportWidth > 0
      ? Math.min(
          FLOATING_PANEL_MAX_WIDTH,
          Math.max(FLOATING_PANEL_MIN_WIDTH, viewportWidth - 64)
        )
      : FLOATING_PANEL_MAX_WIDTH;
  const resolvedPanelWidth =
    viewportWidth > 0
      ? Math.min(canvasPanelWidth, maxAvailableFloatingPanelWidth)
      : canvasPanelWidth;
  const isCanvasPanelExpanded =
    !isVideoMode && resolvedPanelWidth >= maxAvailableFloatingPanelWidth - 8;
  const isFloatingSidebarVisible = !isVideoMode && isPanelOpen;
  const panelOcclusionRight = isFloatingSidebarVisible
    ? resolvedPanelWidth + DOCKED_PANEL_INSET
    : 0;
  const floatingToolbarOffset = isFloatingSidebarVisible
    ? -(panelOcclusionRight / 2)
    : 0;
  const compactControlsLeft = FLOATING_UI_GAP;

  const handleCanvasPanelResizePointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (isVideoMode) return;
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = resolvedPanelWidth;
      const maxWidth = maxAvailableFloatingPanelWidth;
      const previousCursor = document.body.style.cursor;
      const previousUserSelect = document.body.style.userSelect;

      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = startX - moveEvent.clientX;
        const nextWidth = Math.min(
          maxWidth,
          Math.max(FLOATING_PANEL_MIN_WIDTH, startWidth + delta)
        );
        setCanvasPanelWidth(nextWidth);
      };

      const handlePointerUp = () => {
        document.body.style.cursor = previousCursor;
        document.body.style.userSelect = previousUserSelect;
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerUp);
      };

      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerUp, { once: true });
    },
    [isVideoMode, maxAvailableFloatingPanelWidth, resolvedPanelWidth]
  );

  const handleToggleCanvasPanelExpand = useCallback(() => {
    if (isVideoMode) return;
    setIsPanelOpen(true);
    setCanvasPanelWidth((current) => {
      const targetWidth = maxAvailableFloatingPanelWidth;
      const currentWidth = Math.min(current, targetWidth);
      return currentWidth >= targetWidth - 16 ? FLOATING_PANEL_WIDTH : targetWidth;
    });
  }, [isVideoMode, maxAvailableFloatingPanelWidth]);

  const updateCanvasSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const nextParams = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          nextParams.delete(key);
        } else {
          nextParams.set(key, value);
        }
      });

      const nextQuery = nextParams.toString();
      router.replace(
        nextQuery ? `/canvas/${id}?${nextQuery}` : `/canvas/${id}`
      );
    },
    [id, router, searchParams]
  );

  const openLoginDialog = useCallback((message?: string) => {
    setLoginDialogMessage(
      String(message || "").trim() ||
        "当前登录状态已失效，请重新登录后继续操作。"
    );
    setIsLoginDialogOpen(true);
  }, []);

  const redirectToLogin = useCallback(() => {
    if (typeof window === "undefined") {
      router.push("/login");
      return;
    }

    const callbackUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    window.location.assign(
      `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    );
  }, [router]);

  const checkCanvasAuthSession = useCallback(async () => {
    try {
      const response = await apiFetch("/api/auth/validate-session", {
        cache: "no-store",
      });
      const session = await response.json().catch(() => null);
      const authed = response.ok && session?.valid === true && Boolean(session?.user?.id);
      setIsAuthenticated(authed);
      setAuthSessionChecked(true);
      if (authed) {
        setIsLoginDialogOpen(false);
      } else {
        openLoginDialog();
      }
      return authed;
    } catch (error) {
      console.warn("[Canvas] Failed to verify auth session:", error);
      setIsAuthenticated(true);
      setAuthSessionChecked(true);
      return true;
    }
  }, [openLoginDialog]);

  const handleToggleAgentMode = useCallback(() => {
    if (isAgentMode) {
      updateCanvasSearchParams({
        mode: null,
        agentPresetId: null,
        agentProjectId: null,
      });
      return;
    }

    updateCanvasSearchParams({
      mode: "agent",
      agentPresetId: null,
      agentProjectId: agentProjectId || null,
    });
    setIsPanelOpen(true);
    setPanelMode("chat");
  }, [agentProjectId, isAgentMode, updateCanvasSearchParams]);

  const handleStyleModeToolbarClick = useCallback(() => {
    if (isAgentWorkspaceEnabled) {
      handleToggleAgentMode();
    }
  }, [
    handleToggleAgentMode,
    isAgentWorkspaceEnabled,
  ]);

  const buildCurrentWorkflowPersistedState =
    useCallback((): AgentWorkflowPersistedState => {
      const persistedMaterials = appearanceRecognitionEnabled
        ? workflowMaterials
        : clearAppearanceSummaryFromMaterials(workflowMaterials);

      return {
        inputs: {
          primarySku: workflowInputs.primarySku.trim(),
          secondarySku: workflowInputs.secondarySku.trim(),
          brand: workflowInputs.brand.trim(),
          store: workflowInputs.store.trim(),
          officialSecondCategory: workflowInputs.officialSecondCategory.trim(),
          officialThirdCategory: workflowInputs.officialThirdCategory.trim(),
          thirdCategory: workflowInputs.thirdCategory.trim(),
          fourthCategory: workflowInputs.fourthCategory.trim(),
          fifthCategory: workflowInputs.fifthCategory.trim(),
          priceBand: workflowInputs.priceBand.trim(),
        },
        materials: persistedMaterials,
        appearanceRecognitionEnabled,
        selections: sanitizedWorkflowSelections,
        selectedBrandModel,
        selectedAgentPresetId: selectedAgentPresetId || null,
        currentStage: currentAgentStage,
        agentModeState,
      };
    }, [
      agentModeState,
      currentAgentStage,
      appearanceRecognitionEnabled,
      selectedAgentPresetId,
      selectedBrandModel,
      workflowInputs,
      workflowMaterials,
      sanitizedWorkflowSelections,
    ]);

  useEffect(() => {
    void checkCanvasAuthSession();

    const handleWindowFocus = () => {
      void checkCanvasAuthSession();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void checkCanvasAuthSession();
      }
    };

    window.addEventListener("focus", handleWindowFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      window.removeEventListener("focus", handleWindowFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [checkCanvasAuthSession]);

  // 加载画布数据
  useEffect(() => {
    console.log("[Canvas] Loading project:", id);

    const loadProject = async () => {
      setIsLoading(true);
      if (!requestedAgentMode) {
        setWorkflowHydrationSource("pending");
      }
      if (!requestedAgentMode) {
        setWorkflowInputs({
          primarySku: "",
          secondarySku: "",
          brand: "",
          store: "",
          officialSecondCategory: "",
          officialThirdCategory: "",
          thirdCategory: "",
          fourthCategory: "",
          fifthCategory: "",
          priceBand: "",
        });
        setWorkflowMaterials(createEmptyAgentWorkflowMaterialSelections());
        setWorkflowSelections({});
        setSelectedBrandModel(null);
        setSelectedAgentPresetId(null);
      }
      if (!requestedAgentMode) {
        setAgentModeState(createEmptyAgentModeWorkspaceState());
        setAgentWorkspaceState(createEmptyAgentGenerationProjectWorkspaceState());
        setAgentProjectTitle("未命名生图项目");
        setAgentProjectThumbnail(null);
        setAgentProjectResultCollections({});
        setAgentProjectDeletedResultCollections({});
        setLoadedAgentProjectId(null);
      }

      // 🆕 先清空当前画布状态，确保切换时不会显示旧数据
      useCanvasStore.getState().clearCanvas();

      const result = await canvasService.getProject(id);

      if (result.success && result.data) {
        useCanvasStore.getState().setProject(id, result.data.title);
        if (result.data.canvasData) {
          useCanvasStore.getState().loadCanvas(result.data.canvasData);
          const persistedWorkflow = result.data.canvasData.workflowState;
          if (!requestedAgentMode && persistedWorkflow) {
            const nextAppearanceRecognitionEnabled =
              persistedWorkflow.appearanceRecognitionEnabled === true;
            const nextWorkflowMaterials = nextAppearanceRecognitionEnabled
              ? normalizeAgentWorkflowMaterialSelections(
                  persistedWorkflow.materials
                )
              : clearAppearanceSummaryFromMaterials(
                  normalizeAgentWorkflowMaterialSelections(
                    persistedWorkflow.materials
                  )
                );
            setWorkflowInputs({
              primarySku: String(
                persistedWorkflow.inputs?.primarySku || ""
              ).trim(),
              secondarySku: String(
                persistedWorkflow.inputs?.secondarySku || ""
              ).trim(),
              brand: String(persistedWorkflow.inputs?.brand || "").trim(),
              store: String(persistedWorkflow.inputs?.store || "").trim(),
              officialSecondCategory: String(
                persistedWorkflow.inputs?.officialSecondCategory || ""
              ).trim(),
              officialThirdCategory: String(
                persistedWorkflow.inputs?.officialThirdCategory || ""
              ).trim(),
              thirdCategory: String(
                persistedWorkflow.inputs?.thirdCategory || ""
              ).trim(),
              fourthCategory: String(
                persistedWorkflow.inputs?.fourthCategory || ""
              ).trim(),
              fifthCategory: String(
                persistedWorkflow.inputs?.fifthCategory || ""
              ).trim(),
              priceBand: String(
                persistedWorkflow.inputs?.priceBand || ""
              ).trim(),
            });
            setWorkflowMaterials(nextWorkflowMaterials);
            setAppearanceRecognitionEnabled(nextAppearanceRecognitionEnabled);
            setWorkflowSelections(persistedWorkflow.selections || {});
            setSelectedBrandModel(
              persistedWorkflow.selectedBrandModel
                ? {
                    ...persistedWorkflow.selectedBrandModel,
                    brandName: String(
                      persistedWorkflow.selectedBrandModel.brandName || ""
                    ).trim(),
                    id: String(
                      persistedWorkflow.selectedBrandModel.id || ""
                    ).trim(),
                    imageUrl: String(
                      persistedWorkflow.selectedBrandModel.imageUrl || ""
                    ).trim(),
                    assetId:
                      String(
                        persistedWorkflow.selectedBrandModel.assetId || ""
                      ).trim() || null,
                    displayName:
                      String(
                        persistedWorkflow.selectedBrandModel.displayName || ""
                      ).trim() || null,
                    mimeType:
                      String(
                        persistedWorkflow.selectedBrandModel.mimeType || ""
                      ).trim() || null,
                    sortOrder: Number.isFinite(
                      Number(persistedWorkflow.selectedBrandModel.sortOrder)
                    )
                      ? Math.max(
                          0,
                          Math.min(
                            999,
                            Math.round(
                              Number(
                                persistedWorkflow.selectedBrandModel.sortOrder
                              )
                            )
                          )
                        )
                      : 0,
                  }
                : null
            );
            setSelectedAgentPresetId(
              String(persistedWorkflow.selectedAgentPresetId || "").trim() ||
                null
            );
            setCurrentAgentStage(
              persistedWorkflow.currentStage === "mode" ? "mode" : "workflow"
            );
            setAgentModeState(
              normalizeAgentModeWorkspaceState(persistedWorkflow.agentModeState)
            );
            setWorkflowHydrationSource("project");
          } else {
            setWorkflowHydrationSource("empty");
          }
        } else {
          setWorkflowHydrationSource("empty");
        }
      } else {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
          setWorkflowHydrationSource("empty");
          setIsLoading(false);
          lastLoadedCanvasIdRef.current = id;
          return;
        }

        // 画布不存在时，创建一个新画布
        console.log("[Canvas] 画布不存在，创建新画布:", id);
        useCanvasStore
          .getState()
          .setProject(
            id,
            requestedAgentMode ? "Agent 工作台" : defaultCanvasTitle
          );
        setWorkflowHydrationSource("empty");
        if (!requestedAgentMode) {
          // 保存新画布到数据库
          try {
            await canvasService.saveCanvasState(
              id,
              {
                nodes: [],
                edges: [],
                selectedNodeIds: [],
                viewport: { x: 0, y: 0, zoom: 1 },
                tool: "select",
              },
              activeCanvasWorkspaceType
            );
          } catch (error) {
            console.error("[Canvas] 创建新画布失败:", error);
          }
        }
      }
      setIsLoading(false);
      lastLoadedCanvasIdRef.current = id;
    };

    loadProject();
  }, [
    activeCanvasWorkspaceType,
    defaultCanvasTitle,
    id,
    openLoginDialog,
    requestedAgentMode,
  ]);

  useEffect(() => {
    const updateViewportWidth = () => setViewportWidth(window.innerWidth);
    updateViewportWidth();
    window.addEventListener("resize", updateViewportWidth);
    return () => window.removeEventListener("resize", updateViewportWidth);
  }, []);

  useEffect(() => {
    if (isVideoMode || viewportWidth <= 0) return;
    const maxWidth = maxAvailableFloatingPanelWidth;
    setCanvasPanelWidth((current) =>
      Math.min(maxWidth, Math.max(FLOATING_PANEL_MIN_WIDTH, current))
    );
  }, [isVideoMode, maxAvailableFloatingPanelWidth, viewportWidth]);

  useEffect(() => {
    if (!videoCanvasInsertMenu) return;

    const handlePointerDown = (event: PointerEvent) => {
      const menu = videoCanvasInsertMenuRef.current;
      if (menu && event.target instanceof Node && menu.contains(event.target)) {
        return;
      }
      setVideoCanvasInsertMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setVideoCanvasInsertMenu(null);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [videoCanvasInsertMenu]);

  useEffect(() => {
    if (isAgentMode) {
      setIsPanelOpen(true);
      setPanelMode("chat");
    }
  }, [isAgentMode]);

  const workflowStorageKey = useMemo(() => `canvas-workflow-state:${id}`, [id]);
  const buildPersistedCanvasData = useCallback(() => {
    return sanitizeCanvasStateForPersist(getCanvasState());
  }, [getCanvasState]);

  const handleExportVideoCanvasProject = useCallback(() => {
    if (!isVideoMode || typeof window === "undefined") {
      return;
    }

    const payload: VideoCanvasProjectExportPayload = {
      format: "video-canvas-project",
      version: 1,
      exportedAt: new Date().toISOString(),
      workspaceType: activeCanvasWorkspaceType,
      project: {
        id,
        title: projectTitle || "未命名视频画布",
      },
      canvasData: buildPersistedCanvasData(),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${sanitizeExportFileName(
      payload.project.title || "video-canvas-project"
    )}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast.success("已导出当前视频画布工程");
  }, [
    activeCanvasWorkspaceType,
    buildPersistedCanvasData,
    id,
    isVideoMode,
    projectTitle,
  ]);

  const handleImportVideoCanvasProjectClick = useCallback(() => {
    if (!isVideoMode) {
      return;
    }
    importVideoCanvasInputRef.current?.click();
  }, [isVideoMode]);

  const handleImportVideoCanvasProjectChange = useCallback(
    async (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0] || null;
      event.target.value = "";

      if (!file) {
        return;
      }

      if (
        nodes.length > 0 &&
        typeof window !== "undefined" &&
        !window.confirm("导入会替换当前视频画布内容，是否继续？")
      ) {
        return;
      }

      setIsImportingVideoCanvas(true);

      try {
        const rawText = await file.text();
        const parsed = JSON.parse(rawText);
        const normalized = normalizeImportedCanvasState(parsed);
        if (!normalized) {
          throw new Error("文件格式无法识别，请导入视频画布导出的 JSON。");
        }

        const nextTitle =
          normalized.title ||
          projectTitle ||
          (file.name ? file.name.replace(/\.json$/i, "") : "") ||
          "导入的视频画布";

        clearCanvas();
        loadCanvas(normalized.canvasData);
        setProjectTitle(nextTitle);

        const [saveResult, updateResult] = await Promise.all([
          canvasService.saveCanvasState(
            id,
            normalized.canvasData,
            activeCanvasWorkspaceType
          ),
          canvasService.updateProject(
            id,
            {
              title: nextTitle,
            },
            activeCanvasWorkspaceType
          ),
        ]);

        if (!saveResult.success) {
          throw new Error(saveResult.error || "导入后保存失败");
        }

        if (!updateResult.success) {
          console.warn(
            "[Canvas] import title update failed:",
            updateResult.error
          );
        }

        toast.success(`已导入视频画布：${nextTitle}`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "导入视频画布失败";
        toast.error(message);
      } finally {
        setIsImportingVideoCanvas(false);
      }
    },
    [
      activeCanvasWorkspaceType,
      clearCanvas,
      id,
      loadCanvas,
      nodes.length,
      projectTitle,
      setProjectTitle,
    ]
  );

  const persistedAgentProjectResultState = useMemo(() => {
    const resultCollections = {
      scene_generation: normalizeResultCollectionUrls(
        agentProjectResultCollections.scene_generation
      ),
      detail_generation: normalizeResultCollectionUrls(
        agentProjectResultCollections.detail_generation
      ),
      detail_replacement: normalizeResultCollectionUrls(
        agentProjectResultCollections.detail_replacement
      ),
      sku_replacement: normalizeResultCollectionUrls(
        agentProjectResultCollections.sku_replacement
      ),
    };

    return {
      resultCollections,
      deletedResultCollections: {
        scene_generation: normalizeResultCollectionUrls(
          agentProjectDeletedResultCollections.scene_generation
        ),
        detail_generation: normalizeResultCollectionUrls(
          agentProjectDeletedResultCollections.detail_generation
        ),
        detail_replacement: normalizeResultCollectionUrls(
          agentProjectDeletedResultCollections.detail_replacement
        ),
        sku_replacement: normalizeResultCollectionUrls(
          agentProjectDeletedResultCollections.sku_replacement
        ),
      },
      resultImageUrls: Array.from(
        new Set([
          ...resultCollections.scene_generation,
          ...resultCollections.detail_generation,
          ...resultCollections.detail_replacement,
          ...resultCollections.sku_replacement,
        ])
      ),
    };
  }, [agentProjectDeletedResultCollections, agentProjectResultCollections]);

  const buildPersistedAgentProjectState = useCallback(() => {
    const persistedMaterials = appearanceRecognitionEnabled
      ? workflowMaterials
      : clearAppearanceSummaryFromMaterials(workflowMaterials);

    const workflowState: AgentWorkflowPersistedState = {
      inputs: {
        primarySku: workflowInputs.primarySku.trim(),
        secondarySku: workflowInputs.secondarySku.trim(),
        brand: workflowInputs.brand.trim(),
        store: workflowInputs.store.trim(),
        officialSecondCategory: workflowInputs.officialSecondCategory.trim(),
        officialThirdCategory: workflowInputs.officialThirdCategory.trim(),
        thirdCategory: workflowInputs.thirdCategory.trim(),
        fourthCategory: workflowInputs.fourthCategory.trim(),
        fifthCategory: workflowInputs.fifthCategory.trim(),
        priceBand: workflowInputs.priceBand.trim(),
      },
      materials: persistedMaterials,
      appearanceRecognitionEnabled,
      selections: sanitizedWorkflowSelections,
      selectedBrandModel,
      selectedAgentPresetId: selectedAgentPresetId || null,
      currentStage: currentAgentStage,
      agentModeState,
    };

    return {
      workflowState,
      workspaceState: agentWorkspaceState,
      ...persistedAgentProjectResultState,
    };
  }, [
    agentModeState,
    agentWorkspaceState,
    currentAgentStage,
    appearanceRecognitionEnabled,
    persistedAgentProjectResultState,
    selectedAgentPresetId,
    selectedBrandModel,
    workflowInputs,
    workflowMaterials,
    sanitizedWorkflowSelections,
  ]);
  const persistedAgentProjectStateRef = useRef<AgentGenerationProjectPersistedState>(
    buildPersistedAgentProjectState()
  );

  useEffect(() => {
    persistedAgentProjectStateRef.current = buildPersistedAgentProjectState();
  }, [buildPersistedAgentProjectState]);

  const writeAgentProjectDraftSnapshot = useCallback(
    (projectState: AgentGenerationProjectPersistedState) => {
      if (!isAgentMode || !agentProjectId || typeof window === "undefined") {
        return;
      }

      try {
        const draftSnapshot: AgentProjectDraftSnapshot = {
          savedAt: Date.now(),
          title: agentProjectTitle,
          thumbnail: agentProjectThumbnail,
          projectState,
        };
        window.localStorage.setItem(
          getAgentProjectDraftStorageKey(agentProjectId),
          JSON.stringify(draftSnapshot)
        );
      } catch (error) {
        console.warn("[Agent Project] Failed to persist immediate draft:", error);
      }
    },
    [agentProjectId, agentProjectThumbnail, agentProjectTitle, isAgentMode]
  );

  const patchPersistedAgentWorkflowState = useCallback(
    (patch: Partial<AgentWorkflowPersistedState>) => {
      const currentProjectState =
        persistedAgentProjectStateRef.current ||
        createEmptyAgentGenerationProjectPersistedState();
      const currentWorkflowState =
        currentProjectState.workflowState || createEmptyAgentWorkflowPersistedState();
      const nextProjectState: AgentGenerationProjectPersistedState = {
        ...currentProjectState,
        workflowState: {
          ...currentWorkflowState,
          ...patch,
          inputs: patch.inputs || currentWorkflowState.inputs,
          selections: patch.selections || currentWorkflowState.selections,
        },
      };

      persistedAgentProjectStateRef.current = nextProjectState;
      writeAgentProjectDraftSnapshot(nextProjectState);
    },
    [writeAgentProjectDraftSnapshot]
  );

  const hydrateAgentProjectSnapshot = useCallback(
    (params: {
      projectId: string;
      title?: string | null;
      thumbnail?: string | null;
      projectState?: AgentGenerationProjectPersistedState | null;
    }) => {
      const persistedState = normalizeAgentGenerationProjectPersistedState(
        params.projectState
      );
      const persistedWorkflow =
        persistedState.workflowState ||
        createEmptyAgentWorkflowPersistedState();
      const nextAppearanceRecognitionEnabled =
        persistedWorkflow.appearanceRecognitionEnabled === true;
      const nextWorkflowMaterials = nextAppearanceRecognitionEnabled
        ? normalizeAgentWorkflowMaterialSelections(persistedWorkflow.materials)
        : clearAppearanceSummaryFromMaterials(
            normalizeAgentWorkflowMaterialSelections(
              persistedWorkflow.materials
            )
          );
      const nextWorkflowInputs = {
        primarySku: String(persistedWorkflow.inputs?.primarySku || "").trim(),
        secondarySku: String(
          persistedWorkflow.inputs?.secondarySku || ""
        ).trim(),
        brand: String(persistedWorkflow.inputs?.brand || "").trim(),
        store: String(persistedWorkflow.inputs?.store || "").trim(),
        officialSecondCategory: String(
          persistedWorkflow.inputs?.officialSecondCategory || ""
        ).trim(),
        officialThirdCategory: String(
          persistedWorkflow.inputs?.officialThirdCategory || ""
        ).trim(),
        thirdCategory: String(
          persistedWorkflow.inputs?.thirdCategory || ""
        ).trim(),
        fourthCategory: String(
          persistedWorkflow.inputs?.fourthCategory || ""
        ).trim(),
        fifthCategory: String(
          persistedWorkflow.inputs?.fifthCategory || ""
        ).trim(),
        priceBand: String(persistedWorkflow.inputs?.priceBand || "").trim(),
      };
      const nextWorkflowSelections = persistedWorkflow.selections || {};
      const nextSelectedBrandModel =
        persistedWorkflow.selectedBrandModel || null;
      const nextSelectedAgentPresetId =
        String(persistedWorkflow.selectedAgentPresetId || "").trim() || null;
      const nextCurrentAgentStage =
        persistedWorkflow.currentStage === "mode" ? "mode" : "workflow";
      const nextAgentModeState = normalizeAgentModeWorkspaceState(
        persistedWorkflow.agentModeState
      );
      const nextAgentWorkspaceState =
        persistedState.workspaceState ||
        createEmptyAgentGenerationProjectWorkspaceState();

      workflowInputsRef.current = nextWorkflowInputs;
      workflowMaterialsRef.current = nextWorkflowMaterials;
      workflowSelectionsRef.current = nextWorkflowSelections;
      appearanceRecognitionEnabledRef.current =
        nextAppearanceRecognitionEnabled;
      selectedBrandModelRef.current = nextSelectedBrandModel;

      setWorkflowInputs(nextWorkflowInputs);
      setWorkflowMaterials(nextWorkflowMaterials);
      setAppearanceRecognitionEnabled(nextAppearanceRecognitionEnabled);
      setWorkflowSelections(nextWorkflowSelections);
      setSelectedBrandModel(nextSelectedBrandModel);
      setSelectedAgentPresetId(nextSelectedAgentPresetId);
      setCurrentAgentStage(nextCurrentAgentStage);
      setAgentModeState(nextAgentModeState);
      setAgentWorkspaceState(nextAgentWorkspaceState);
      setAgentProjectTitle(
        String(params.title || "").trim() || "未命名生图项目"
      );
      setAgentProjectThumbnail(String(params.thumbnail || "").trim() || null);
      setAgentProjectResultCollections(persistedState.resultCollections || {});
      setAgentProjectDeletedResultCollections(
        persistedState.deletedResultCollections || {}
      );
      setLoadedAgentProjectId(params.projectId);
    },
    []
  );

  useEffect(() => {
    if (isAgentMode) return;
    if (typeof window === "undefined") return;
    if (workflowHydrationSource !== "empty") return;

    try {
      const raw = window.localStorage.getItem(workflowStorageKey);
      if (!raw) {
        setWorkflowHydrationSource("local");
        return;
      }

      const parsed = JSON.parse(raw) as AgentWorkflowPersistedState;
      const nextAppearanceRecognitionEnabled =
        parsed.appearanceRecognitionEnabled === true;
      const nextWorkflowMaterials = nextAppearanceRecognitionEnabled
        ? normalizeAgentWorkflowMaterialSelections(parsed.materials)
        : clearAppearanceSummaryFromMaterials(
            normalizeAgentWorkflowMaterialSelections(parsed.materials)
          );
      setWorkflowInputs({
        primarySku: String(parsed.inputs?.primarySku || "").trim(),
        secondarySku: String(parsed.inputs?.secondarySku || "").trim(),
        brand: String(parsed.inputs?.brand || "").trim(),
        store: String(parsed.inputs?.store || "").trim(),
        officialSecondCategory: String(parsed.inputs?.officialSecondCategory || "").trim(),
        officialThirdCategory: String(parsed.inputs?.officialThirdCategory || "").trim(),
        thirdCategory: String(parsed.inputs?.thirdCategory || "").trim(),
        fourthCategory: String(parsed.inputs?.fourthCategory || "").trim(),
        fifthCategory: String(parsed.inputs?.fifthCategory || "").trim(),
        priceBand: String(parsed.inputs?.priceBand || "").trim(),
      });
      setWorkflowMaterials(nextWorkflowMaterials);
      setAppearanceRecognitionEnabled(nextAppearanceRecognitionEnabled);
      setWorkflowSelections(parsed.selections || {});
      setSelectedBrandModel(
        parsed.selectedBrandModel
          ? {
              ...parsed.selectedBrandModel,
              brandName: String(
                parsed.selectedBrandModel.brandName || ""
              ).trim(),
              id: String(parsed.selectedBrandModel.id || "").trim(),
              imageUrl: String(parsed.selectedBrandModel.imageUrl || "").trim(),
              assetId:
                String(parsed.selectedBrandModel.assetId || "").trim() || null,
              displayName:
                String(parsed.selectedBrandModel.displayName || "").trim() ||
                null,
              mimeType:
                String(parsed.selectedBrandModel.mimeType || "").trim() || null,
              sortOrder: Number.isFinite(
                Number(parsed.selectedBrandModel.sortOrder)
              )
                ? Math.max(
                    0,
                    Math.min(
                      999,
                      Math.round(Number(parsed.selectedBrandModel.sortOrder))
                    )
                  )
                : 0,
            }
          : null
      );
      setSelectedAgentPresetId(
        String(parsed.selectedAgentPresetId || "").trim() || null
      );
      setCurrentAgentStage(
        parsed.currentStage === "mode" ? "mode" : "workflow"
      );
      setAgentModeState(
        normalizeAgentModeWorkspaceState(parsed.agentModeState)
      );
    } catch (error) {
      console.warn(
        "[Canvas] Failed to hydrate workflow state from localStorage:",
        error
      );
    } finally {
      setWorkflowHydrationSource("local");
    }
  }, [isAgentMode, workflowHydrationSource, workflowStorageKey]);

  useEffect(() => {
    if (isAgentMode) return;
    if (typeof window === "undefined" || workflowHydrationSource === "pending")
      return;

    return scheduleCanvasIdleTask(() => {
      try {
        const persistedMaterials = appearanceRecognitionEnabled
          ? workflowMaterials
          : clearAppearanceSummaryFromMaterials(workflowMaterials);
        window.localStorage.setItem(
          workflowStorageKey,
          JSON.stringify({
            inputs: workflowInputs,
            materials: persistedMaterials,
            appearanceRecognitionEnabled,
            selections: sanitizedWorkflowSelections,
            selectedBrandModel,
            selectedAgentPresetId,
            currentAgentStage,
            agentModeState,
          })
        );
      } catch (error) {
        console.warn("[Canvas] Failed to persist workflow state:", error);
      }
    });
  }, [
    isAgentMode,
    workflowHydrationSource,
    workflowInputs,
    workflowMaterials,
    appearanceRecognitionEnabled,
    sanitizedWorkflowSelections,
    workflowStorageKey,
    selectedBrandModel,
    selectedAgentPresetId,
    currentAgentStage,
    agentModeState,
  ]);

  useEffect(() => {
    if (!isAgentMode || !agentProjectId || !hasLoadedCurrentAgentProject)
      return;
    if (typeof window === "undefined") return;

    return scheduleCanvasIdleTask(() => {
      try {
        const draftSnapshot: AgentProjectDraftSnapshot = {
          savedAt: Date.now(),
          title: agentProjectTitle,
          thumbnail: agentProjectThumbnail,
          projectState: buildPersistedAgentProjectState(),
        };

        window.localStorage.setItem(
          getAgentProjectDraftStorageKey(agentProjectId),
          JSON.stringify(draftSnapshot)
        );
      } catch (error) {
        console.warn("[Agent Project] Failed to persist local draft:", error);
      }
    });
  }, [
    agentProjectId,
    agentProjectThumbnail,
    agentProjectTitle,
    buildPersistedAgentProjectState,
    hasLoadedCurrentAgentProject,
    isAgentMode,
  ]);

  const persistAgentProject = useCallback(
    async (
      reason: "autosave" | "manual" | "switch",
      overrides?: { title?: string | null }
    ) => {
      if (!isAgentMode || !agentProjectId) return false;
      const nextTitle =
        String(overrides?.title ?? agentProjectTitle ?? "").trim() ||
        buildDefaultAgentProjectTitle();

      const result = await agentProjectService.updateProject(agentProjectId, {
        title: nextTitle,
        thumbnail: agentProjectThumbnail,
        projectState: buildPersistedAgentProjectState(),
      });

      if (!result.success) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        console.error(`[Agent Project] ${reason} save failed:`, result.error);
        return false;
      }

      if (result.data) {
        setAgentProjectTitle(
          result.data.title || buildDefaultAgentProjectTitle()
        );
        setAgentProjectThumbnail(result.data.thumbnail || null);
      }

      return true;
    },
    [
      agentProjectId,
      agentProjectThumbnail,
      agentProjectTitle,
      buildPersistedAgentProjectState,
      isAgentMode,
      openLoginDialog,
    ]
  );

  useEffect(() => {
    if (!requestedAgentMode || !agentProjectId) return;

    let cancelled = false;
    const loadAgentProject = async () => {
      setIsAgentProjectMenuOpen(false);
      setIsAgentProjectLoading(true);
      setLoadedAgentProjectId(null);
      const localDraft = readAgentProjectDraftSnapshot(agentProjectId);
      try {
        const result = await agentProjectService.getProject(agentProjectId);
        if (!result.success || !result.data) {
          if (isUnauthorizedApiError(result.error)) {
            setIsAuthenticated(false);
            openLoginDialog(
              result.error || "当前登录状态已失效，请重新登录后继续操作。"
            );
            if (!cancelled && localDraft?.projectState) {
              hydrateAgentProjectSnapshot({
                projectId: agentProjectId,
                title: localDraft.title,
                thumbnail: localDraft.thumbnail,
                projectState: localDraft.projectState,
              });
            }
            return;
          }
          throw new Error(result.error || "加载生图项目失败");
        }
        if (cancelled) return;

        const serverUpdatedAt =
          Number(new Date(result.data.updatedAt).getTime()) || 0;
        const shouldUseLocalDraft =
          Boolean(localDraft?.projectState) &&
          Number(localDraft?.savedAt || 0) > serverUpdatedAt;

        if (shouldUseLocalDraft && localDraft?.projectState) {
          hydrateAgentProjectSnapshot({
            projectId: agentProjectId,
            title: localDraft.title || result.data.title,
            thumbnail: localDraft.thumbnail || result.data.thumbnail,
            projectState: localDraft.projectState,
          });
          return;
        }

        hydrateAgentProjectSnapshot({
          projectId: agentProjectId,
          title: result.data.title,
          thumbnail: result.data.thumbnail,
          projectState: result.data.projectState,
        });
      } catch (error) {
        if (!cancelled) {
          hydrateAgentProjectSnapshot({
            projectId: agentProjectId,
            title: localDraft?.title,
            thumbnail: localDraft?.thumbnail,
            projectState:
              localDraft?.projectState ||
              createEmptyAgentGenerationProjectPersistedState(),
          });
          toast.error(
            error instanceof Error ? error.message : "加载生图项目失败"
          );
        }
      } finally {
        if (!cancelled) {
          setIsAgentProjectLoading(false);
        }
      }
    };

    void loadAgentProject();
    return () => {
      cancelled = true;
    };
  }, [
    agentProjectId,
    hydrateAgentProjectSnapshot,
    openLoginDialog,
    requestedAgentMode,
  ]);

  useEffect(() => {
    if (isAgentProjectSheetOpen) {
      setIsAgentProjectMenuOpen(false);
    }
  }, [isAgentProjectSheetOpen]);

  useEffect(() => {
    if (!isAgentMode) return;
    if (isLoginDialogOpen || isAgentProjectSheetOpen || isAgentProjectMenuOpen) {
      return;
    }

    const restoreBodyPointerEvents = () => {
      if (document.body.style.pointerEvents === "none") {
        document.body.style.pointerEvents = "";
      }
    };

    restoreBodyPointerEvents();
    const timeoutId = window.setTimeout(restoreBodyPointerEvents, 120);
    return () => window.clearTimeout(timeoutId);
  }, [
    isAgentMode,
    isAgentProjectMenuOpen,
    isAgentProjectSheetOpen,
    isLoginDialogOpen,
  ]);

  useEffect(() => {
    if (
      !isAgentMode ||
      !agentProjectId ||
      isAgentProjectLoading ||
      !hasLoadedCurrentAgentProject ||
      (authSessionChecked && !isAuthenticated)
    ) {
      return;
    }

    const timer = window.setTimeout(async () => {
      setIsAgentProjectSaving(true);
      try {
        await persistAgentProject("autosave");
      } finally {
        setIsAgentProjectSaving(false);
      }
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    agentModeState,
    agentProjectId,
    agentProjectResultCollections,
    agentProjectThumbnail,
    agentProjectTitle,
    agentWorkspaceState,
    currentAgentStage,
    isAgentMode,
    isAgentProjectLoading,
    hasLoadedCurrentAgentProject,
    persistAgentProject,
    appearanceRecognitionEnabled,
    authSessionChecked,
    isAuthenticated,
    selectedAgentPresetId,
    selectedBrandModel,
    workflowInputs,
    workflowMaterials,
    workflowSelections,
  ]);

  useEffect(() => {
    if (
      !isAgentMode ||
      !agentProjectId ||
      isAgentProjectLoading ||
      !hasLoadedCurrentAgentProject
    ) {
      return;
    }

    const handleBeforeUnload = () => {
      const draftSnapshot: AgentProjectDraftSnapshot = {
        savedAt: Date.now(),
        title: agentProjectTitle,
        thumbnail: agentProjectThumbnail,
        projectState: persistedAgentProjectStateRef.current,
      };

      try {
        window.localStorage.setItem(
          getAgentProjectDraftStorageKey(agentProjectId),
          JSON.stringify(draftSnapshot)
        );
      } catch (error) {
        console.warn(
          "[Agent Project] Failed to persist local draft before unload:",
          error
        );
      }

      try {
        void apiKeepaliveFetch(`/api/agent-projects/${agentProjectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title:
              String(agentProjectTitle || "").trim() ||
              buildDefaultAgentProjectTitle(),
            thumbnail: agentProjectThumbnail,
            projectState: persistedAgentProjectStateRef.current,
          }),
        });
      } catch (error) {
        console.error("[Agent Project] beforeunload save failed:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [
    agentProjectId,
    agentProjectThumbnail,
    agentProjectTitle,
    hasLoadedCurrentAgentProject,
    isAgentMode,
    isAgentProjectLoading,
  ]);

  const handleSaveAsAgentProject = useCallback(async () => {
    const suggestedTitle = buildSaveAsAgentProjectTitle(agentProjectTitle);
    const promptedTitle = window.prompt(
      "请输入另存为的新项目名称",
      suggestedTitle
    );
    if (promptedTitle === null) {
      return;
    }
    const nextTitle = promptedTitle.trim();
    if (!nextTitle) {
      toast.error("项目名称不能为空");
      return;
    }

    setIsAgentProjectSaving(true);
    try {
      if (agentProjectId) {
        await persistAgentProject("switch");
      }

      const result = await agentProjectService.createProject({
        title: nextTitle,
        thumbnail: agentProjectThumbnail,
        projectState: buildPersistedAgentProjectState(),
      });
      if (!result.success || !result.data) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        toast.error(result.error || "另存为新项目失败");
        return;
      }

      toast.success("已另存为新项目");
      updateCanvasSearchParams({
        mode: "agent",
        agentProjectId: result.data.id,
      });
    } finally {
      setIsAgentProjectSaving(false);
    }
  }, [
    agentProjectId,
    agentProjectThumbnail,
    agentProjectTitle,
    buildPersistedAgentProjectState,
    openLoginDialog,
    persistAgentProject,
    updateCanvasSearchParams,
  ]);

  const handleRenameAgentProject = useCallback(
    async (targetProjectId: string, currentTitle?: string | null) => {
      const suggestedTitle =
        String(currentTitle || "").trim() || "未命名生图项目";
      const promptedTitle = window.prompt("请输入新的项目名称", suggestedTitle);
      if (promptedTitle === null) {
        return;
      }
      const nextTitle = promptedTitle.trim();
      if (!nextTitle) {
        toast.error("项目名称不能为空");
        return;
      }

      const result = await agentProjectService.updateProject(targetProjectId, {
        title: nextTitle,
      });
      if (!result.success || !result.data) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        toast.error(result.error || "更新生图项目名称失败");
        return;
      }

      if (targetProjectId === agentProjectId) {
        setAgentProjectTitle(result.data.title || nextTitle);
      }
      toast.success("项目名称已更新");
    },
    [agentProjectId, openLoginDialog]
  );

  const handleRenameCurrentAgentProject = useCallback(async () => {
    if (!agentProjectId) {
      toast.error("当前还没有可重命名的项目");
      return;
    }

    await handleRenameAgentProject(agentProjectId, agentProjectTitle);
  }, [agentProjectId, agentProjectTitle, handleRenameAgentProject]);

  const handleCreateAgentProject = useCallback(async () => {
    if (isAgentProjectSaving) {
      return;
    }

    setIsAgentProjectSaving(true);
    try {
      if (agentProjectId) {
        await persistAgentProject("switch");
      }

      const result = await agentProjectService.createProject({
        title: buildDefaultAgentProjectTitle(),
        projectState: createEmptyAgentGenerationProjectPersistedState(),
      });
      if (!result.success || !result.data) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        toast.error(result.error || "创建生图项目失败");
        return;
      }

      toast.success("已新建空白项目");
      updateCanvasSearchParams({
        mode: "agent",
        agentProjectId: result.data.id,
      });
    } finally {
      setIsAgentProjectSaving(false);
    }
  }, [
    agentProjectId,
    isAgentProjectSaving,
    openLoginDialog,
    persistAgentProject,
    updateCanvasSearchParams,
  ]);

  const handleSelectAgentProject = useCallback(
    async (nextProjectId: string) => {
      if (!nextProjectId || nextProjectId === agentProjectId) return;
      if (agentProjectId) {
        await persistAgentProject("switch");
      }
      updateCanvasSearchParams({
        mode: "agent",
        agentProjectId: nextProjectId,
      });
    },
    [agentProjectId, persistAgentProject, updateCanvasSearchParams]
  );

  const handleDeleteAgentProject = useCallback(
    async (targetProjectId: string) => {
      const result = await agentProjectService.deleteProject(targetProjectId);
      if (!result.success) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        toast.error(result.error || "删除生图项目失败");
        return;
      }

      removeAgentProjectDraftSnapshot(targetProjectId);

      if (targetProjectId === agentProjectId) {
        const listResult = await agentProjectService.getProjects();
        if (!listResult.success && isUnauthorizedApiError(listResult.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            listResult.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        const nextProject = listResult.success
          ? listResult.data?.find(
              (project) => project.id !== targetProjectId
            ) || null
          : null;

        if (nextProject) {
          updateCanvasSearchParams({
            mode: "agent",
            agentProjectId: nextProject.id,
          });
        } else {
          updateCanvasSearchParams({
            mode: "agent",
            agentProjectId: null,
          });
          setIsAgentProjectSheetOpen(true);
        }
      }

      toast.success("生图项目已删除");
    },
    [agentProjectId, openLoginDialog, updateCanvasSearchParams]
  );

  const handleAgentResultPreviewUrlsChange = useCallback(
    (modeType: AgentGenerationResultModeType, urls: string[]) => {
      const normalizedUrls = normalizeResultCollectionUrls(urls);
      setAgentProjectResultCollections((current) => {
        const nextCollections: AgentGenerationProjectResultCollections = {
          ...current,
          [modeType]: normalizedUrls,
        };
        return areResultCollectionsEqual(current, nextCollections)
          ? current
          : nextCollections;
      });
      setAgentProjectThumbnail((current) => {
        const nextThumbnail =
          normalizedUrls[0] ||
          getFirstResultUrlFromCollections({
            ...agentProjectResultCollections,
            [modeType]: normalizedUrls,
          });
        return current === nextThumbnail ? current : nextThumbnail;
      });
    },
    [agentProjectResultCollections]
  );

  const handleAgentResultImageDelete = useCallback(
    (modeType: AgentGenerationResultModeType, imageUrl: string) => {
      const normalizedUrl = String(imageUrl || "").trim();
      if (!/^https?:\/\//i.test(normalizedUrl)) {
        return;
      }

      const nextCollections: AgentGenerationProjectResultCollections = {
        ...agentProjectResultCollections,
        [modeType]: normalizeResultCollectionUrls(
          (agentProjectResultCollections[modeType] || []).filter(
            (url) => url !== normalizedUrl
          )
        ),
      };
      const nextDeletedCollections: AgentGenerationProjectResultCollections = {
        ...agentProjectDeletedResultCollections,
        [modeType]: normalizeResultCollectionUrls([
          ...(agentProjectDeletedResultCollections[modeType] || []),
          normalizedUrl,
        ]),
      };

      setAgentProjectResultCollections((current) =>
        areResultCollectionsEqual(current, nextCollections)
          ? current
          : nextCollections
      );
      setAgentProjectDeletedResultCollections((current) =>
        areResultCollectionsEqual(current, nextDeletedCollections)
          ? current
          : nextDeletedCollections
      );
      setAgentProjectThumbnail((current) => {
        const nextThumbnail =
          current === normalizedUrl
            ? getFirstResultUrlFromCollections(nextCollections)
            : current;
        return current === nextThumbnail ? current : nextThumbnail;
      });
    },
    [agentProjectDeletedResultCollections, agentProjectResultCollections]
  );

  useEffect(() => {
    const normalizedBrand = workflowInputs.brand.trim().toLowerCase();
    if (!normalizedBrand) {
      previousBrandForModelRef.current = "";
      autoSelectedBrandModelBrandRef.current = "";
      if (selectedBrandModel) {
        setSelectedBrandModel(null);
      }
      return;
    }

    const brandChanged = previousBrandForModelRef.current !== normalizedBrand;
    if (brandChanged) {
      previousBrandForModelRef.current = normalizedBrand;
      autoSelectedBrandModelBrandRef.current = "";
    }

    if (
      selectedBrandModel &&
      selectedBrandModel.brandName.toLowerCase() !== normalizedBrand
    ) {
      setSelectedBrandModel(null);
      return;
    }

    if (selectedBrandModel) {
      return;
    }

    if (autoSelectedBrandModelBrandRef.current === normalizedBrand) {
      return;
    }

    const matchedEntry =
      resolvedBrandModelConfig.entries.find(
        (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
      ) || null;
    const defaultBrandModel = matchedEntry?.images[0] || null;

    if (!defaultBrandModel) {
      return;
    }

    autoSelectedBrandModelBrandRef.current = normalizedBrand;
    setSelectedBrandModel({
      ...defaultBrandModel,
      brandName: matchedEntry?.brandName || workflowInputs.brand.trim(),
    });
  }, [
    resolvedBrandModelConfig.entries,
    selectedBrandModel,
    workflowInputs.brand,
  ]);

  const persistCanvasState = useCallback(
    async (reason: "autosave" | "delete" | "beforeunload") => {
      const canvasData = buildPersistedCanvasData();
      const result = await canvasService.saveCanvasState(
        id,
        canvasData,
        activeCanvasWorkspaceType
      );
      if (!result.success) {
        console.error(`[Canvas] ${reason} save failed:`, result.error);
      }
      return result.success;
    },
    [activeCanvasWorkspaceType, buildPersistedCanvasData, id]
  );

  // 自动保存逻辑
  useEffect(() => {
    if (isLoading || isAgentMode) return;

    const saveTimer = setTimeout(async () => {
      setIsSaving(true);
      try {
        await persistCanvasState("autosave");
      } catch (error) {
        console.error("Auto save failed:", error);
      }
      setIsSaving(false);
    }, 3000); // 3秒自动保存

    return () => clearTimeout(saveTimer);
  }, [isAgentMode, nodes, isLoading, persistCanvasState]);

  // 删除节点时立即保存（按节点ID差集检测），避免删除后快速刷新被回滚
  useEffect(() => {
    if (isLoading || isAgentMode) {
      previousNodeIdsRef.current = new Set(nodes.map((node) => node.id));
      return;
    }

    const previousIds = previousNodeIdsRef.current;
    const currentIds = new Set(nodes.map((node) => node.id));
    const removedIds: string[] = [];
    previousIds.forEach((nodeId) => {
      if (!currentIds.has(nodeId)) {
        removedIds.push(nodeId);
      }
    });
    previousNodeIdsRef.current = currentIds;

    if (removedIds.length > 0) {
      const persistAfterDelete = async () => {
        setIsSaving(true);
        try {
          await persistCanvasState("delete");
        } catch (error) {
          console.error("Delete immediate save failed:", error);
        }
        setIsSaving(false);
      };
      void persistAfterDelete();
    }
  }, [isAgentMode, nodes, isLoading, persistCanvasState]);

  // 页面关闭/刷新前尝试做一次 keepalive 保存，降低“刚删就刷新”回滚概率
  useEffect(() => {
    if (isLoading || isAgentMode) return;

    const handleBeforeUnload = () => {
      try {
        const canvasData = buildPersistedCanvasData();
        void apiKeepaliveFetch(`/api/canvas/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            canvasData,
            workspaceType: activeCanvasWorkspaceType,
          }),
        });
      } catch (error) {
        console.error("[Canvas] beforeunload save failed:", error);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("pagehide", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("pagehide", handleBeforeUnload);
    };
  }, [
    activeCanvasWorkspaceType,
    buildPersistedCanvasData,
    id,
    isAgentMode,
    isLoading,
  ]);

  // 智能命名与缩略图逻辑
  useEffect(() => {
    if (isAgentMode) return;
    const hasDefaultTitle =
      projectTitle === defaultCanvasTitle ||
      projectTitle === "新画布" ||
      projectTitle === "新视频画布";
    if (!hasDefaultTitle || nodes.length === 0) return;

    const imageNode = nodes.find(
      (n) => n.type === "image" && (n.data as any)?.src
    );
    const imageSrc = (imageNode?.data as any)?.src;
    if (!imageSrc || typeof imageSrc !== "string") return;

    const autoTitleKey = `${id}:${imageSrc}`;
    if (
      autoTitleAttemptedRef.current.has(autoTitleKey) ||
      autoTitleInFlightRef.current === autoTitleKey
    ) {
      return;
    }

    const autoTitleAndThumbnail = async () => {
      autoTitleAttemptedRef.current.add(autoTitleKey);
      autoTitleInFlightRef.current = autoTitleKey;

      try {
        if (autoThumbnailSyncedRef.current !== autoTitleKey) {
          await canvasService.updateProject(
            id,
            { thumbnail: imageSrc },
            activeCanvasWorkspaceType
          );
          autoThumbnailSyncedRef.current = autoTitleKey;
        }

        const res = await apiFetch("/api/canvas/auto-title", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: imageSrc }),
        });
        if (!res.ok) {
          throw new Error(`Auto title request failed: ${res.status}`);
        }

        const data = await res.json();
        if (data.title) {
          setProjectTitle(data.title);
          await canvasService.updateProject(
            id,
            { title: data.title },
            activeCanvasWorkspaceType
          );
          toast.success(`${workspaceLabel}已自动命名为：${data.title}`);
        }
      } catch (error) {
        console.error("Auto title failed:", error);
      } finally {
        if (autoTitleInFlightRef.current === autoTitleKey) {
          autoTitleInFlightRef.current = null;
        }
      }
    };

    // 使用防抖，避免频繁触发
    const timer = setTimeout(autoTitleAndThumbnail, 5000); // 5秒后触发，给用户一点时间操作
    return () => clearTimeout(timer);
  }, [
    activeCanvasWorkspaceType,
    defaultCanvasTitle,
    id,
    isAgentMode,
    nodes,
    projectTitle,
    setProjectTitle,
    workspaceLabel,
  ]);

  // 保存画布 (手动触发保留作为备用，但UI上移除)
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    const canvasData = buildPersistedCanvasData();
    const result = await canvasService.saveCanvasState(
      id,
      canvasData,
      activeCanvasWorkspaceType
    );

    if (result.success) {
      toast.success("保存成功");
    } else {
      toast.error(result.error || "保存失败");
    }
    setIsSaving(false);
  }, [activeCanvasWorkspaceType, buildPersistedCanvasData, id]);

  // 更新标题
  const handleUpdateTitle = async () => {
    if (!editTitle.trim() || editTitle === projectTitle) {
      setIsEditingTitle(false);
      return;
    }

    const result = await canvasService.updateProject(
      id,
      { title: editTitle.trim() },
      activeCanvasWorkspaceType
    );
    if (result.success) {
      setProjectTitle(editTitle.trim());
    } else {
      toast.error(result.error || "更新标题失败");
    }
    setIsEditingTitle(false);
  };

  const getVisibleCanvasOrigin = useCallback(
    () => ({
      x: (-viewport.x + 120) / viewport.zoom,
      y: (-viewport.y + 120) / viewport.zoom,
    }),
    [viewport.x, viewport.y, viewport.zoom]
  );

  const guessCanvasAspectRatio = useCallback(
    (nodeId: string | null | undefined) => {
      const targetNode = nodeId
        ? nodes.find((node) => node.id === nodeId) || null
        : null;
      if (!targetNode) return "auto";
      const currentRatio =
        targetNode.size.width / Math.max(1, targetNode.size.height);

      let bestPreset = SIZE_PRESETS[0];
      let bestDelta = Number.POSITIVE_INFINITY;
      SIZE_PRESETS.forEach((preset) => {
        const ratio = preset.width / preset.height;
        const delta = Math.abs(ratio - currentRatio);
        if (delta < bestDelta) {
          bestDelta = delta;
          bestPreset = preset;
        }
      });

      return bestPreset?.value || "auto";
    },
    [nodes]
  );

  const guessVideoRatio = useCallback(
    (nodeId: string | null | undefined) => {
      const targetNode = nodeId
        ? nodes.find((node) => node.id === nodeId) || null
        : null;
      if (!targetNode) return "16:9";
      const currentRatio =
        targetNode.size.width / Math.max(1, targetNode.size.height);
      const ratios = [
        { value: "16:9", width: 16, height: 9 },
        { value: "4:3", width: 4, height: 3 },
        { value: "1:1", width: 1, height: 1 },
        { value: "3:4", width: 3, height: 4 },
        { value: "9:16", width: 9, height: 16 },
        { value: "21:9", width: 21, height: 9 },
      ] as const;

      let best: (typeof ratios)[number] = ratios[0];
      let bestDelta = Number.POSITIVE_INFINITY;
      ratios.forEach((ratio) => {
        const delta = Math.abs(ratio.width / ratio.height - currentRatio);
        if (delta < bestDelta) {
          bestDelta = delta;
          best = ratio;
        }
      });
      return best.value;
    },
    [nodes]
  );

  const patchWorkflowNode = useCallback(
    (
      nodeId: string,
      patch: Partial<WorkflowNodeData> & {
        metadata?: Record<string, any>;
      }
    ) => {
      const targetNode = useCanvasStore
        .getState()
        .nodes.find((node) => node.id === nodeId && node.type === "workflow");
      if (!targetNode) return;
      const currentData = targetNode.data as WorkflowNodeData;
      updateNode(nodeId, {
        data: {
          ...currentData,
          ...patch,
          metadata: {
            ...(currentData.metadata || {}),
            ...(patch.metadata || {}),
          },
        },
      });
    },
    [updateNode]
  );

  const createWorkflowOutputNode = useCallback(
    (params: {
      sourceNodeId: string;
      anchorNodeId?: string;
      edgeSourceNodeId?: string;
      media: WorkflowMediaReference;
      title: string;
      prompt: string;
      offsetX?: number;
      offsetY?: number;
      selectAfterCreate?: boolean;
    }) => {
      const anchorNodeId = params.anchorNodeId || params.sourceNodeId;
      const anchorNode = nodes.find((node) => node.id === anchorNodeId);
      if (!anchorNode) return null;

      const size =
        params.media.kind === "video"
          ? { width: 360, height: 240 }
          : { width: 320, height: 320 };
      const nodeId = addNode({
        type: params.media.kind,
        position: {
          x:
            anchorNode.position.x +
            anchorNode.size.width +
            180 +
            (params.offsetX || 0),
          y:
            anchorNode.position.y +
            anchorNode.size.height / 2 -
            size.height / 2 +
            (params.offsetY || 0),
        },
        size,
        data:
          params.media.kind === "video"
            ? {
                src: params.media.url,
                status: "completed",
                prompt: params.prompt,
                metadata: {
                  sourceWorkflowNodeId: params.sourceNodeId,
                },
              }
            : {
                src: params.media.url,
                status: "completed",
                title: params.title,
                prompt: params.prompt,
                metadata: {
                  sourceWorkflowNodeId: params.sourceNodeId,
                },
              },
        connections: [],
      });

      addEdge({
        source: params.edgeSourceNodeId || params.sourceNodeId,
        target: nodeId,
        type: "default",
      });
      if (params.selectAfterCreate ?? true) {
        selectNodes([nodeId]);
      }
      return nodeId;
    },
    [addEdge, addNode, nodes, selectNodes]
  );

  const syncDirectPreviewNodes = useCallback(
    (
      sourceNodeId: string,
      media: WorkflowMediaReference,
      sourcePrompt: string
    ) => {
      getDirectDownstreamNodes(sourceNodeId, workflowGraph).forEach((node) => {
        const downstreamType = inferVideoWorkflowTemplateType(node);
        if (node.type !== "workflow" || downstreamType !== "preview") return;
        patchWorkflowNode(node.id, {
          status: "completed",
          summary: `已接收${media.kind === "video" ? "视频" : "图片"}预览，可继续检查结果后再保存。`,
          metadata: {
            previewMediaUrl: media.url,
            previewMediaKind: media.kind,
            previewMediaTitle: media.title || "",
            sourcePrompt,
            lastExecutedAt: new Date().toISOString(),
          },
        });
      });
    },
    [patchWorkflowNode, workflowGraph]
  );

  const handleSyncAgentResultsToCanvas = useCallback(async () => {
    if (
      !linkedAgentWorkflowNode ||
      !linkedAgentWorkflowData ||
      !agentProjectId
    ) {
      toast.error("当前 Agent 项目还没有关联到视频画布节点。");
      return;
    }

    const composeText = (parts: unknown[]) =>
      Array.from(
        new Set(parts.map((item) => String(item || "").trim()).filter(Boolean))
      ).join("\n");
    const resolveBatchOffset = (index: number) => ({
      x: (index % 2) * (320 + 28),
      y: Math.floor(index / 2) * (320 + 28),
    });

    const existingCanvasUrls = new Set(
      nodes
        .flatMap((node) => {
          if (node.type === "image" || node.type === "video") {
            return [
              String((node.data as Record<string, any>)?.src || "").trim(),
            ];
          }
          return [];
        })
        .filter((item) => /^https?:\/\//i.test(item))
    );
    const importedUrls = new Set(linkedAgentImportedResultUrls);
    const resultsToImport = flattenedAgentResultEntries.filter(
      (item) => !existingCanvasUrls.has(item.url) && !importedUrls.has(item.url)
    );
    const nowIso = new Date().toISOString();
    const sourceNodeId = linkedAgentWorkflowNode.id;
    const sourcePrompt =
      composeText([
        String(linkedAgentWorkflowData.summary || "").trim(),
        String(agentWorkspaceState.input || "").trim(),
      ]) || "来自 Agent 工作台的结果回流。";
    const previewResult =
      resultsToImport[0] || flattenedAgentResultEntries[0] || null
        ? {
            nodeId: sourceNodeId,
            kind: "image" as const,
            url: String(
              (resultsToImport[0] || flattenedAgentResultEntries[0])?.url || ""
            ).trim(),
            title: `${String((resultsToImport[0] || flattenedAgentResultEntries[0])?.label || "Agent 结果").trim()} ${Number((resultsToImport[0] || flattenedAgentResultEntries[0])?.index || 0) + 1}`,
            prompt: composeText([
              sourcePrompt,
              String(
                (resultsToImport[0] || flattenedAgentResultEntries[0])?.label ||
                  ""
              ).trim(),
            ]),
            source: "workflow-result" as const,
          }
        : null;
    const resultGroupSummaries = (
      [
        "scene_generation",
        "detail_generation",
        "detail_replacement",
        "sku_replacement",
      ] as AgentGenerationResultModeType[]
    ).reduce<
      Array<{
        modeType: AgentGenerationResultModeType;
        label: string;
        count: number;
        importedCount: number;
      }>
    >((groups, modeType) => {
      const urls = flattenedAgentResultEntries
        .filter((item) => item.modeType === modeType)
        .map((item) => item.url);
      if (urls.length === 0) return groups;
      const importedCount = urls.filter((url) => importedUrls.has(url)).length;
      groups.push({
        modeType,
        label: AGENT_RESULT_MODE_LABELS[modeType],
        count: urls.length,
        importedCount,
      });
      return groups;
    }, []);

    setIsSyncingAgentResultsToCanvas(true);
    patchWorkflowNode(sourceNodeId, {
      status: "generating",
      summary:
        resultsToImport.length > 0
          ? "正在把 Agent 结果同步回视频画布..."
          : "当前 Agent 结果已全部回流，正在切回视频画布...",
      metadata: {
        lastExecutedAt: nowIso,
      },
    });

    try {
      const createdNodeIds: string[] = [];
      const importedMediaRecords: Array<{
        nodeId: string;
        media: WorkflowMediaReference;
        modeType: AgentGenerationResultModeType;
      }> = [];

      resultsToImport.forEach((item, index) => {
        const offset = resolveBatchOffset(index);
        const promptText = composeText([sourcePrompt, item.label]);
        const media: WorkflowMediaReference = {
          nodeId: sourceNodeId,
          kind: "image",
          url: item.url,
          title: `${item.label} ${item.index + 1}`,
          prompt: promptText,
          source: "workflow-result",
        };
        const createdNodeId = createWorkflowOutputNode({
          sourceNodeId,
          media,
          title: media.title || item.label,
          prompt: promptText,
          offsetX: offset.x,
          offsetY: offset.y,
          selectAfterCreate: false,
        });

        if (!createdNodeId) {
          return;
        }

        const createdNode = useCanvasStore
          .getState()
          .nodes.find((node) => node.id === createdNodeId);
        if (createdNode) {
          const currentImageData = (createdNode.data || {}) as Record<
            string,
            any
          >;
          updateNode(createdNodeId, {
            data: {
              src: String(currentImageData.src || media.url).trim(),
              status: currentImageData.status || "completed",
              title: media.title,
              prompt: promptText,
              metadata: {
                ...((currentImageData.metadata || {}) as Record<string, any>),
                sourceWorkflowNodeId: sourceNodeId,
                sourceAgentProjectId: agentProjectId,
                sourceAgentResultModeType: item.modeType,
                importedFromAgentProject: true,
              },
            },
          });
        }

        createdNodeIds.push(createdNodeId);
        importedMediaRecords.push({
          nodeId: createdNodeId,
          media,
          modeType: item.modeType,
        });
      });

      const latestNodes = useCanvasStore.getState().nodes;
      const allImportedImageNodes = latestNodes.filter((node) => {
        if (node.type !== "image") return false;
        const metadata = ((node.data as Record<string, any>)?.metadata ||
          {}) as Record<string, any>;
        return (
          String(metadata.sourceWorkflowNodeId || "").trim() === sourceNodeId &&
          metadata.importedFromAgentProject === true &&
          String(metadata.sourceAgentProjectId || "").trim() === agentProjectId
        );
      });
      const directOutputNodes = getDirectDownstreamNodes(
        sourceNodeId,
        workflowGraph
      ).filter(
        (node) =>
          node.type === "workflow" &&
          ["preview", "local-save"].includes(
            inferVideoWorkflowTemplateType(node) || ""
          )
      );
      const syncedAgentAssets = allImportedImageNodes.map((node, index) => {
        const imageData = (node.data || {}) as Record<string, any>;
        return {
          url: String(imageData.src || "").trim(),
          title: String(imageData.title || `Agent 结果 ${index + 1}`).trim(),
        };
      });
      directOutputNodes.forEach((node) => {
        const downstreamType = inferVideoWorkflowTemplateType(node);
        if (downstreamType === "preview") {
          if (previewResult) {
            patchWorkflowNode(node.id, {
              status: "completed",
              summary: `已同步 ${Math.max(
                allImportedImageNodes.length,
                importedMediaRecords.length
              )} 个 Agent 结果，可继续检查预览。`,
              metadata: {
                previewMediaUrl: previewResult.url,
                previewMediaKind: previewResult.kind,
                previewMediaTitle: previewResult.title || "",
                sourcePrompt,
                lastExecutedAt: nowIso,
                agentResultCount: allImportedImageNodes.length,
              },
            });
          }
          return;
        }

        if (downstreamType === "local-save") {
          patchWorkflowNode(node.id, {
            status: "completed",
            summary: `已接入 ${allImportedImageNodes.length} 个 Agent 结果，可直接下载打包。`,
            metadata: {
              sourcePrompt,
              pendingAssetCount: allImportedImageNodes.length,
              agentResultCount: allImportedImageNodes.length,
              agentResultGroups: resultGroupSummaries,
              syncedAgentAssets,
              lastExecutedAt: nowIso,
            },
          });
        }
      });

      if (previewResult) {
        syncDirectPreviewNodes(sourceNodeId, previewResult, sourcePrompt);
      }

      const mergedImportedUrls = Array.from(
        new Set([
          ...linkedAgentImportedResultUrls,
          ...resultsToImport.map((item) => item.url),
        ])
      );
      patchWorkflowNode(sourceNodeId, {
        status: "completed",
        summary:
          resultsToImport.length > 0
            ? `已从 Agent 工作台回流 ${resultsToImport.length} 个结果到视频画布。`
            : "当前 Agent 结果已全部同步到视频画布。",
        metadata: {
          importedAgentResultUrls: mergedImportedUrls,
          importedAgentResultCount: mergedImportedUrls.length,
          pendingAgentResultCount: Math.max(
            flattenedAgentResultEntries.length - mergedImportedUrls.length,
            0
          ),
          agentResultAssets: resultGroupSummaries.map((item) => ({
            modeType: item.modeType,
            label: item.label,
            assets: flattenedAgentResultEntries
              .filter((entry) => entry.modeType === item.modeType)
              .map((entry) => ({
                url: entry.url,
                title: `${item.label} ${entry.index + 1}`,
              })),
          })),
          agentResultGroups: resultGroupSummaries.map((item) => ({
            ...item,
            importedCount: flattenedAgentResultEntries
              .filter((entry) => entry.modeType === item.modeType)
              .filter((entry) => mergedImportedUrls.includes(entry.url)).length,
          })),
          lastAgentCanvasSyncAt: nowIso,
          lastExecutedAt: nowIso,
          resultMediaUrl: previewResult?.url || "",
          resultMediaKind: previewResult?.kind || "",
          resultMediaTitle: previewResult?.title || "",
        },
      });

      if (createdNodeIds.length > 0) {
        selectNodes(createdNodeIds);
      } else {
        selectNodes([sourceNodeId]);
      }

      updateCanvasSearchParams({
        mode: null,
      });
      toast.success(
        resultsToImport.length > 0
          ? `已回流 ${resultsToImport.length} 个 Agent 结果`
          : "没有新的 Agent 结果需要回流"
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "同步 Agent 结果到视频画布失败";
      patchWorkflowNode(sourceNodeId, {
        status: "failed",
        summary: message,
        metadata: {
          lastExecutedAt: nowIso,
          lastError: message,
        },
      });
      toast.error(message);
    } finally {
      setIsSyncingAgentResultsToCanvas(false);
    }
  }, [
    agentProjectId,
    agentWorkspaceState.input,
    createWorkflowOutputNode,
    flattenedAgentResultEntries,
    getDirectDownstreamNodes,
    linkedAgentImportedResultUrls,
    linkedAgentWorkflowData,
    linkedAgentWorkflowNode,
    nodes,
    patchWorkflowNode,
    selectNodes,
    syncDirectPreviewNodes,
    workflowGraph,
    updateCanvasSearchParams,
    updateNode,
  ]);

  const syncDirectStoryboardChartNodes = useCallback(
    (
      sourceNodeId: string,
      shots: Array<{ title: string; description: string }>,
      sourcePrompt: string
    ) => {
      const tableColumns = [
        { key: "shot", label: "镜头" },
        { key: "title", label: "标题" },
        { key: "description", label: "镜头说明" },
        { key: "prompt", label: "生成提示" },
      ];
      const tableRows = shots.slice(0, 12).map((shot, index) => ({
        shot: `#${index + 1}`,
        title: String(shot.title || `镜头 ${index + 1}`).trim(),
        description: String(shot.description || "").trim(),
        prompt: [sourcePrompt, shot.title, shot.description]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
          .filter((item, itemIndex, items) => items.indexOf(item) === itemIndex)
          .join("\n"),
      }));
      getDirectDownstreamNodes(sourceNodeId, workflowGraph).forEach((node) => {
        const downstreamType = inferVideoWorkflowTemplateType(node);
        if (
          node.type !== "workflow" ||
          downstreamType !== "storyboard-chart-node"
        ) {
          return;
        }

        patchWorkflowNode(node.id, {
          status: "completed",
          summary: `已同步 ${shots.length} 个镜头草案，可继续连接预览节点检查节奏。`,
          metadata: {
            storyboardShots: shots,
            batchShotCount: shots.length,
            tableColumns,
            tableRows,
            sourcePrompt,
            lastExecutedAt: new Date().toISOString(),
            storyboardSourceNodeId: sourceNodeId,
          },
        });
      });
    },
    [patchWorkflowNode, workflowGraph]
  );

  const downloadWorkflowAssets = useCallback(
    async (assets: WorkflowMediaReference[], folderLabel: string) => {
      if (typeof document === "undefined" || assets.length === 0) {
        return;
      }

      const now = new Date();
      const folderName = `${folderLabel}-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
      try {
        await downloadApiFile(
          "/api/canvas/download-zip",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              folderName,
              files: assets.map((asset, index) => ({
                url: asset.url,
                name: asset.title || `${asset.kind}-result-${index + 1}`,
              })),
            }),
          },
          `${folderName}.zip`
        );
        toast.success("已开始打包下载，请留意浏览器下载栏");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "下载失败，请稍后重试");
      }
    },
    []
  );

  const buildStoryboardShots = useCallback(
    (
      promptText: string,
      mediaSummary: { imageCount: number; videoCount: number }
    ) => {
      const fragments = Array.from(
        new Set(
          promptText
            .split(/\n+/)
            .flatMap((line) => line.split(/[。！？!?；;]+/))
            .map((item) => item.trim())
            .filter(Boolean)
        )
      );

      const seeds =
        fragments.length > 0
          ? fragments.slice(0, 4)
          : [
              "围绕主体建立开场氛围",
              "推进主体动作与情绪",
              "强化关键细节",
              "用结尾镜头完成收束",
            ];

      const suffix =
        mediaSummary.imageCount > 0
          ? "保持参考图中的主体与视觉风格一致。"
          : mediaSummary.videoCount > 0
            ? "承接参考视频中的节奏与镜头情绪。"
            : "保持整体镜头风格统一。";

      return seeds.map((item, index) => ({
        title: `镜头 ${index + 1}`,
        description: `${item}${item.endsWith("。") ? "" : "。"}${suffix}`,
      }));
    },
    []
  );

  const buildStoryboardShotPrompt = useCallback(
    (basePrompt: string, shot: { title?: string; description?: string }) =>
      Array.from(
        new Set(
          [basePrompt, String(shot.title || ""), String(shot.description || "")]
            .map((item) => item.trim())
            .filter(Boolean)
        )
      ).join("\n"),
    []
  );

  const buildWorkflowTextBlock = useCallback((parts: unknown[]) => {
    return Array.from(
      new Set(parts.map((item) => String(item || "").trim()).filter(Boolean))
    ).join("\n");
  }, []);

  const buildCharacterAssets = useCallback(
    (characters: WorkflowCharacterRecord[], sourcePrompt: string) => {
      return characters.slice(0, 6).map((item) => ({
        name: item.name,
        description: buildWorkflowTextBlock([
          item.description,
          item.look ? `外观: ${item.look}` : "",
          item.wardrobe ? `服装/道具: ${item.wardrobe}` : "",
          item.signatureAction ? `动作: ${item.signatureAction}` : "",
          item.traits.length > 0 ? `特质: ${item.traits.join("、")}` : "",
        ]),
        prompt: buildWorkflowTextBlock([
          sourcePrompt,
          item.prompt,
          item.description,
          item.look,
          item.wardrobe,
          item.signatureAction,
          item.traits.join("、"),
        ]),
      }));
    },
    [buildWorkflowTextBlock]
  );

  const buildSceneAssets = useCallback(
    (scenes: WorkflowSceneRecord[], sourcePrompt: string) => {
      return scenes.slice(0, 6).map((item) => ({
        name: item.name,
        description: buildWorkflowTextBlock([
          item.description,
          item.mood ? `氛围: ${item.mood}` : "",
          item.lighting ? `布光: ${item.lighting}` : "",
          item.props.length > 0 ? `道具: ${item.props.join("、")}` : "",
        ]),
        prompt: buildWorkflowTextBlock([
          sourcePrompt,
          item.prompt,
          item.description,
          item.mood,
          item.lighting,
          item.props.join("、"),
        ]),
      }));
    },
    [buildWorkflowTextBlock]
  );

  const buildCharacterDescriptionSummary = useCallback(
    (characters: WorkflowCharacterRecord[], sourcePrompt: string) => {
      if (characters.length === 0) return sourcePrompt.trim();
      return characters
        .slice(0, 3)
        .map((item) =>
          buildWorkflowTextBlock([
            item.name,
            item.description,
            item.look,
            item.wardrobe,
            item.signatureAction,
            item.traits.join("、"),
          ])
        )
        .filter(Boolean)
        .join("\n\n");
    },
    [buildWorkflowTextBlock]
  );

  const buildSceneDescriptionSummary = useCallback(
    (scenes: WorkflowSceneRecord[], sourcePrompt: string) => {
      if (scenes.length === 0) return sourcePrompt.trim();
      return scenes
        .slice(0, 3)
        .map((item) =>
          buildWorkflowTextBlock([
            item.name,
            item.description,
            item.mood,
            item.lighting,
            item.props.join("、"),
          ])
        )
        .filter(Boolean)
        .join("\n\n");
    },
    [buildWorkflowTextBlock]
  );

  const buildStoryboardChartRows = useCallback(
    (
      shots: Array<{ title?: string; description?: string }>,
      sourcePrompt: string
    ) => {
      const normalizedShots = shots
        .map((shot, index) => ({
          title: String(shot.title || `镜头 ${index + 1}`).trim(),
          description: String(shot.description || "").trim(),
        }))
        .filter((shot) => shot.title || shot.description)
        .slice(0, 12);

      return {
        columns: [
          { key: "shot", label: "镜头" },
          { key: "title", label: "标题" },
          { key: "description", label: "镜头说明" },
          { key: "prompt", label: "生成提示" },
        ],
        rows: normalizedShots.map((shot, index) => ({
          shot: `#${index + 1}`,
          title: shot.title,
          description: shot.description,
          prompt: buildStoryboardShotPrompt(sourcePrompt, shot),
        })),
      };
    },
    [buildStoryboardShotPrompt]
  );

  const buildWorkflowTableState = useCallback(
    (params: {
      promptText: string;
      shots: Array<{ title?: string; description?: string }>;
      structuredData: typeof selectedWorkflowStructuredData;
    }) => {
      if (params.shots.length > 0) {
        const chart = buildStoryboardChartRows(params.shots, params.promptText);
        return {
          summary: `已整理 ${chart.rows.length} 行镜头表，可继续连接分镜节点或生成节点。`,
          columns: chart.columns,
          rows: chart.rows,
        };
      }

      if (
        params.structuredData.characterAssets.length > 0 ||
        params.structuredData.characters.length > 0
      ) {
        const characterRows = (
          params.structuredData.characterAssets.length > 0
            ? params.structuredData.characterAssets
            : params.structuredData.characters
        )
          .slice(0, 8)
          .map((item, index) => ({
            name: item.name || `角色 ${index + 1}`,
            description: item.description || "",
            prompt: item.prompt || "",
          }));

        return {
          summary: `已整理 ${characterRows.length} 行角色资产表，可继续固化角色或生成角色图。`,
          columns: [
            { key: "name", label: "角色" },
            { key: "description", label: "描述" },
            { key: "prompt", label: "提示词" },
          ],
          rows: characterRows,
        };
      }

      if (
        params.structuredData.sceneAssets.length > 0 ||
        params.structuredData.scenes.length > 0
      ) {
        const sceneRows = (
          params.structuredData.sceneAssets.length > 0
            ? params.structuredData.sceneAssets
            : params.structuredData.scenes
        )
          .slice(0, 8)
          .map((item, index) => ({
            name: item.name || `场景 ${index + 1}`,
            description: item.description || "",
            prompt: item.prompt || "",
          }));

        return {
          summary: `已整理 ${sceneRows.length} 行场景资产表，可继续固化场景或生成场景图。`,
          columns: [
            { key: "name", label: "场景" },
            { key: "description", label: "描述" },
            { key: "prompt", label: "提示词" },
          ],
          rows: sceneRows,
        };
      }

      const promptRows = params.promptText
        .split(/\n+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 8)
        .map((item, index) => ({
          section: `段落 ${index + 1}`,
          content: item,
        }));

      return {
        summary:
          promptRows.length > 0
            ? `已整理 ${promptRows.length} 行脚本表，可继续转成分镜节点。`
            : "上游还没有可整理成表格的内容。",
        columns: [
          { key: "section", label: "段落" },
          { key: "content", label: "内容" },
        ],
        rows: promptRows,
      };
    },
    [buildStoryboardChartRows, selectedWorkflowStructuredData]
  );

  const buildWorkflowCompareItems = useCallback(
    (media: WorkflowMediaReference[]) => {
      return media
        .filter((item) => /^https?:\/\//i.test(item.url))
        .slice(0, 4)
        .map((item, index) => ({
          label:
            index === 0
              ? "基准"
              : item.source === "workflow-result"
                ? `结果 ${index + 1}`
                : `对照 ${index + 1}`,
          kind: item.kind,
          url: item.url,
          title: String(
            item.title ||
              item.prompt ||
              `${item.kind === "video" ? "视频" : "图片"} ${index + 1}`
          ).trim(),
        }));
    },
    []
  );

  const buildWorkflowDefaultCropRect = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").toLowerCase();
    const isPortraitFocus =
      /人物|角色|主体|局部|特写|脸|肖像|portrait|close/.test(normalizedPrompt);
    const isObjectFocus = /产品|物体|商品|道具|item|product/.test(
      normalizedPrompt
    );

    const width = isPortraitFocus ? 0.5 : isObjectFocus ? 0.56 : 0.64;
    const height = isPortraitFocus ? 0.72 : isObjectFocus ? 0.58 : 0.64;
    const baseX = /左|left/.test(normalizedPrompt)
      ? 0.08
      : /右|right/.test(normalizedPrompt)
        ? 1 - width - 0.08
        : (1 - width) / 2;
    const baseY = /上|top|天空/.test(normalizedPrompt)
      ? 0.08
      : /下|bottom|地面/.test(normalizedPrompt)
        ? 1 - height - 0.08
        : (1 - height) / 2;

    return {
      x: Number(Math.max(0, Math.min(baseX, 1 - width)).toFixed(4)),
      y: Number(Math.max(0, Math.min(baseY, 1 - height)).toFixed(4)),
      width: Number(width.toFixed(4)),
      height: Number(height.toFixed(4)),
    };
  }, []);

  const inferWorkflowExtendScales = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").toLowerCase();
    const match = normalizedPrompt.match(/([1-4](?:\.\d+)?)\s*倍/);
    let xScale = match ? Number(match[1]) : 1.45;
    let yScale = match ? Number(match[1]) : 1.45;

    if (
      /左右|横向|宽屏|全景|横幅|拓宽|扩宽|panorama|wide/.test(normalizedPrompt)
    ) {
      xScale = Math.max(xScale, 1.7);
    }
    if (
      /上下|纵向|天空|地面|抬高|向上|向下|tall|vertical/.test(normalizedPrompt)
    ) {
      yScale = Math.max(yScale, 1.7);
    }
    if (/补边|延展|继续|stitch|outpaint|扩展/.test(normalizedPrompt)) {
      xScale = Math.max(xScale, 1.6);
      yScale = Math.max(yScale, 1.6);
    }

    return {
      xScale: Number(Math.min(Math.max(xScale, 1.1), 4).toFixed(2)),
      yScale: Number(Math.min(Math.max(yScale, 1.1), 4).toFixed(2)),
    };
  }, []);

  const buildWorkflowCameraPreset = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").toLowerCase();
    let horizontalAngle = 0;
    let verticalAngle = 0;
    let zoom = 5;
    const notes: string[] = [];

    if (/左侧|左前|left/.test(normalizedPrompt)) {
      horizontalAngle = 330;
      notes.push("偏左机位");
    } else if (/右侧|右前|right/.test(normalizedPrompt)) {
      horizontalAngle = 30;
      notes.push("偏右机位");
    } else if (/背面|后方|rear|back/.test(normalizedPrompt)) {
      horizontalAngle = 180;
      notes.push("背向机位");
    } else {
      notes.push("正面机位");
    }

    if (/俯拍|鸟瞰|top|overhead/.test(normalizedPrompt)) {
      verticalAngle = 38;
      notes.push("俯拍");
    } else if (/仰拍|低机位|low angle/.test(normalizedPrompt)) {
      verticalAngle = -18;
      notes.push("仰拍");
    } else if (/平视|eye level/.test(normalizedPrompt)) {
      verticalAngle = 0;
      notes.push("平视");
    } else {
      verticalAngle = 8;
      notes.push("轻微抬升");
    }

    if (/特写|close[- ]?up|近景/.test(normalizedPrompt)) {
      zoom = 7.5;
      notes.push("特写焦距");
    } else if (/远景|全景|wide shot|long shot/.test(normalizedPrompt)) {
      zoom = 3.5;
      notes.push("远景焦距");
    } else if (/中景|medium shot/.test(normalizedPrompt)) {
      zoom = 5;
      notes.push("中景焦距");
    } else {
      zoom = 5.8;
      notes.push("标准电影镜头");
    }

    return {
      horizontalAngle,
      verticalAngle,
      zoom,
      notes,
    };
  }, []);

  const buildWorkflowMovementDirective = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").toLowerCase();
    const cameraMove = /推进|推近|push|zoom in/.test(normalizedPrompt)
      ? "镜头缓慢推进，强调主体情绪和细节。"
      : /拉远|拉开|pull|zoom out/.test(normalizedPrompt)
        ? "镜头缓慢拉远，交代环境关系和空间层次。"
        : /环绕|orbit|绕拍/.test(normalizedPrompt)
          ? "镜头围绕主体轻微环绕，增强立体感与叙事张力。"
          : /摇镜|pan|横移/.test(normalizedPrompt)
            ? "镜头横向摇移，顺着主体视线或动作方向展开。"
            : "镜头以电影化的平滑运动推进，保持主体稳定、节奏自然。";
    const motionCue = /奔跑|run|冲刺/.test(normalizedPrompt)
      ? "主体动作以奔跑推进，节奏偏快。"
      : /转身|turn/.test(normalizedPrompt)
        ? "主体动作强调转身和视线转换。"
        : /抬手|挥手|gesture/.test(normalizedPrompt)
          ? "主体动作聚焦手部与上半身姿态。"
          : "主体动作自然、连贯，避免突然跳帧。";
    const rhythm = /慢|slow|舒缓/.test(normalizedPrompt)
      ? "节奏舒缓，过渡柔和。"
      : /快|fast|激烈/.test(normalizedPrompt)
        ? "节奏偏快，强调冲击力。"
        : "节奏中等，适合叙事性镜头。";

    return {
      cameraMove,
      motionCue,
      rhythm,
      cameraFixed: /固定镜头|lock|static/.test(normalizedPrompt),
    };
  }, []);

  const buildWorkflowMusicPlan = useCallback(
    (
      promptText: string,
      shots: Array<{ title?: string; description?: string }>
    ) => {
      const normalizedPrompt = String(promptText || "").toLowerCase();
      const mood = /悬疑|紧张|mystery|suspense/.test(normalizedPrompt)
        ? "悬疑推进"
        : /浪漫|温柔|romantic|warm/.test(normalizedPrompt)
          ? "温柔抒情"
          : /史诗|宏大|epic/.test(normalizedPrompt)
            ? "史诗展开"
            : /治愈|轻松|healing|light/.test(normalizedPrompt)
              ? "轻盈治愈"
              : "电影感氛围";
      const instrumentation = /电子|synth|edm/.test(normalizedPrompt)
        ? "电子氛围 + 节奏脉冲"
        : /钢琴|piano/.test(normalizedPrompt)
          ? "钢琴主旋律 + 轻弦乐"
          : /弦乐|string/.test(normalizedPrompt)
            ? "弦乐铺底 + 低频鼓点"
            : "氛围铺底 + 轻打击乐";
      const cueSeeds =
        shots.length > 0
          ? shots.slice(0, 4).map((shot, index) => ({
              cue: `Cue ${index + 1}`,
              moment: String(shot.title || `镜头 ${index + 1}`).trim(),
              mood,
              instrumentation,
            }))
          : [
              { cue: "Cue 1", moment: "开场建立", mood, instrumentation },
              { cue: "Cue 2", moment: "主体推进", mood, instrumentation },
              { cue: "Cue 3", moment: "细节强化", mood, instrumentation },
              { cue: "Cue 4", moment: "结尾收束", mood, instrumentation },
            ];

      return {
        summary: `已整理 ${cueSeeds.length} 段配乐 cue sheet，可继续交给外部音频工具或作曲流程。`,
        highlights: [
          `整体情绪建议：${mood}`,
          `主乐器建议：${instrumentation}`,
          "建议保持段落递进，避免配乐情绪和镜头节奏脱节。",
        ],
        columns: [
          { key: "cue", label: "Cue" },
          { key: "moment", label: "对应镜头" },
          { key: "mood", label: "情绪" },
          { key: "instrumentation", label: "配器" },
        ],
        rows: cueSeeds,
      };
    },
    []
  );

  const buildWorkflowHandoffPlan = useCallback(
    (
      target: "rh-app" | "rh-comfy",
      params: {
        promptText: string;
        shots: Array<{ title?: string; description?: string }>;
        structuredData: typeof selectedWorkflowStructuredData;
        media: WorkflowMediaReference[];
      }
    ) => {
      const targetLabel = target === "rh-comfy" ? "Comfy" : "RH 应用";
      const starterSteps =
        target === "rh-comfy"
          ? [
              "载入输入图片与脚本提示",
              "整理正负提示词与镜头控制",
              "连接生图/生视频节点并输出结果",
            ]
          : [
              "选择对应 RH 工作台模板",
              "填入脚本、镜头和角色资产",
              "执行生成并回收结果",
            ];

      const stepRows = starterSteps.map((step, index) => ({
        step: `${index + 1}`,
        action: step,
        input:
          index === 0
            ? params.media.length > 0
              ? `已挂接 ${params.media.length} 个媒体输入`
              : "以上游脚本文本为主"
            : index === 1
              ? `${Math.max(params.shots.length, 1)} 个镜头 / ${params.structuredData.characters.length} 个角色线索`
              : "输出到预览 / 保存节点",
      }));

      return {
        summary: `已整理一份可投递到${targetLabel}的工作流包。`,
        highlights: [
          `目标平台：${targetLabel}`,
          `建议先带入 ${Math.max(params.shots.length, 1)} 个镜头和 ${params.media.length} 个素材输入。`,
          "这份包更偏流程交付物，方便后续继续在外部工作流里执行。",
        ],
        deliverables: [
          `${targetLabel} 工作流步骤表`,
          "关键提示词与镜头说明",
          "上游素材与参考图清单",
        ],
        columns: [
          { key: "step", label: "步骤" },
          { key: "action", label: "操作" },
          { key: "input", label: "输入/说明" },
        ],
        rows: stepRows,
      };
    },
    [selectedWorkflowStructuredData]
  );

  const buildWorkflowCanvasBoardState = useCallback(
    (media: WorkflowMediaReference[], promptText: string) => {
      const boardItems = buildWorkflowCompareItems(media).slice(0, 6);
      return {
        summary:
          boardItems.length > 0
            ? `已整理 ${boardItems.length} 个素材到画板节点，可继续做对比、分支和预览。`
            : "上游暂时没有可整理进画板的素材。",
        compareItems: boardItems,
        columns: [
          { key: "slot", label: "槽位" },
          { key: "title", label: "素材" },
          { key: "kind", label: "类型" },
        ],
        rows: boardItems.map((item, index) => ({
          slot: `Board ${index + 1}`,
          title: item.title,
          kind: item.kind === "video" ? "视频/封面" : "图片",
        })),
        highlights: [
          promptText.trim()
            ? `当前画板主题：${promptText.trim().slice(0, 72)}${promptText.trim().length > 72 ? "..." : ""}`
            : "当前画板主题还未明确，可继续补充一句创作目标。",
          "建议把画板作为挑图、对比和后续分支创作的中转节点。",
        ],
      };
    },
    [buildWorkflowCompareItems]
  );

  const buildWorkflowDoodleInstructions = useCallback((promptText: string) => {
    const normalizedPrompt = String(promptText || "").trim();
    const rows = [
      {
        area: /左|left/.test(normalizedPrompt.toLowerCase())
          ? "左侧区域"
          : "主体区域",
        intent: /替换|replace/.test(normalizedPrompt) ? "替换元素" : "补充结构",
        note: normalizedPrompt || "用涂鸦勾出主体、边缘和希望补充的视觉结构。",
      },
      {
        area: /背景|environment|scene/.test(normalizedPrompt.toLowerCase())
          ? "背景区域"
          : "外围区域",
        intent: /光|氛围|mood/.test(normalizedPrompt.toLowerCase())
          ? "调整氛围"
          : "补充背景",
        note: "建议用大笔触勾出背景方向、透视和光影分区。",
      },
      {
        area: "细节区域",
        intent: "强调重点",
        note: "对关键细节、轮廓或遮罩边缘做重点标注，便于后续局部重绘。",
      },
    ];

    return {
      summary: "已整理一版涂鸦/遮罩指令，可继续连接局部重绘或外部绘制流程。",
      highlights: [
        "先用粗笔触圈出主体，再补背景方向和细节区。",
        "涂鸦节点更适合作为局部重绘、补画或外部画板的中间层。",
      ],
      columns: [
        { key: "area", label: "区域" },
        { key: "intent", label: "意图" },
        { key: "note", label: "操作说明" },
      ],
      rows,
    };
  }, []);

  const resolvePreferredCharacterPrompt = useCallback(
    (
      sourcePrompt: string,
      structuredData: typeof selectedWorkflowStructuredData
    ) => {
      return buildWorkflowTextBlock([
        sourcePrompt,
        structuredData.characterAssets[0]?.prompt,
        structuredData.characters[0]?.prompt,
      ]);
    },
    [buildWorkflowTextBlock]
  );

  const resolvePreferredScenePrompt = useCallback(
    (
      sourcePrompt: string,
      structuredData: typeof selectedWorkflowStructuredData
    ) => {
      return buildWorkflowTextBlock([
        sourcePrompt,
        structuredData.sceneAssets[0]?.prompt,
        structuredData.scenes[0]?.prompt,
      ]);
    },
    [buildWorkflowTextBlock]
  );

  const buildWorkflowAgentProjectTitle = useCallback(
    (params: {
      promptText: string;
      nodeTitle?: string | null;
      structuredData: typeof selectedWorkflowStructuredData;
    }) => {
      const rawNodeTitle = String(params.nodeTitle || "").trim();
      const normalizedNodeTitle =
        rawNodeTitle &&
        !["Agent", "自定义代理", "custom-agent"].includes(rawNodeTitle)
          ? rawNodeTitle
          : "";
      const characterName = String(
        params.structuredData.characterAssets[0]?.name ||
          params.structuredData.characters[0]?.name ||
          ""
      ).trim();
      const sceneName = String(
        params.structuredData.sceneAssets[0]?.name ||
          params.structuredData.scenes[0]?.name ||
          ""
      ).trim();
      const promptSeed =
        params.promptText
          .split(/\n+/)
          .map((item) => item.trim())
          .find(Boolean) || "视频画布任务";
      const baseTitle =
        normalizedNodeTitle ||
        [characterName, sceneName].filter(Boolean).join(" / ") ||
        promptSeed;
      const compactTitle =
        baseTitle.replace(/\s+/g, " ").trim().slice(0, 40) || "视频画布任务";
      return compactTitle.includes("Agent")
        ? compactTitle
        : `${compactTitle} Agent`;
    },
    []
  );

  const buildWorkflowAgentProjectDescription = useCallback(
    (params: {
      promptText: string;
      summary?: string | null;
      structuredData: typeof selectedWorkflowStructuredData;
    }) => {
      return buildWorkflowTextBlock([
        params.summary,
        params.structuredData.deliverables[0],
        params.structuredData.recommendedNextSteps[0],
        params.promptText.slice(0, 140),
      ]).slice(0, 220);
    },
    [buildWorkflowTextBlock]
  );

  const buildWorkflowAgentWorkspaceInput = useCallback(
    (params: {
      promptText: string;
      storyboardShots: Array<{ title?: string; description?: string }>;
      structuredData: typeof selectedWorkflowStructuredData;
    }) => {
      const toLines = (items: string[], limit = 6) =>
        Array.from(
          new Set(
            items.map((item) => String(item || "").trim()).filter(Boolean)
          )
        ).slice(0, limit);

      const buildSection = (label: string, items: string[], limit = 6) => {
        const lines = toLines(items, limit);
        if (lines.length === 0) return "";
        return `${label}:\n${lines.map((item, index) => `${index + 1}. ${item}`).join("\n")}`;
      };

      const buildNamedSection = (
        label: string,
        items: Array<Record<string, any>>,
        limit = 4
      ) => {
        const lines = items
          .slice(0, limit)
          .map((item, index) => {
            const name = String(
              item.name || item.title || `条目 ${index + 1}`
            ).trim();
            const detail = buildWorkflowTextBlock([
              item.description,
              item.prompt,
              item.look,
              item.wardrobe,
              item.signatureAction,
              item.mood,
              item.lighting,
              Array.isArray(item.traits) ? item.traits.join("、") : "",
              Array.isArray(item.props) ? item.props.join("、") : "",
            ]).replace(/\n+/g, " / ");
            return detail ? `${name}: ${detail}` : name;
          })
          .filter(Boolean);
        return buildSection(label, lines, limit);
      };

      const shotLines = params.storyboardShots
        .slice(0, 6)
        .map((item, index) =>
          buildWorkflowTextBlock([
            String(item.title || `镜头 ${index + 1}`).trim(),
            String(item.description || "").trim(),
          ]).replace(/\n+/g, " / ")
        );

      return [
        buildSection(
          "任务目标",
          [params.promptText || "请基于当前视频画布上下文继续推进创作任务。"],
          3
        ),
        buildSection("分镜草案", shotLines, 6),
        buildNamedSection("角色线索", [
          ...params.structuredData.characters,
          ...params.structuredData.characterAssets,
        ]),
        buildNamedSection("场景线索", [
          ...params.structuredData.scenes,
          ...params.structuredData.sceneAssets,
        ]),
        buildSection("代理计划", params.structuredData.agentPlan, 6),
        buildSection("交付物", params.structuredData.deliverables, 6),
        buildSection(
          "推荐后续动作",
          [
            ...params.structuredData.recommendedNextSteps,
            ...params.structuredData.recommendedNodes,
          ],
          6
        ),
      ]
        .filter(Boolean)
        .join("\n\n");
    },
    [buildWorkflowTextBlock]
  );

  const buildWorkflowAgentAttachments = useCallback(
    (
      media: WorkflowMediaReference[]
    ): AgentGenerationProjectWorkspaceAttachment[] => {
      const seen = new Set<string>();
      return media
        .filter((item) => item.kind === "image")
        .filter((item) => {
          const url = String(item.url || "").trim();
          if (!url || seen.has(url)) return false;
          seen.add(url);
          return true;
        })
        .slice(0, 8)
        .map((item, index) => ({
          url: item.url,
          name: item.title || `参考图 ${index + 1}`,
          contentType: "image/png",
          assetId: null,
        }));
    },
    []
  );

  const mergeWorkflowAgentAttachments = useCallback(
    (
      existing: Array<
        AgentGenerationProjectWorkspaceAttachment | null | undefined
      >,
      incoming: AgentGenerationProjectWorkspaceAttachment[]
    ) => {
      const seen = new Set<string>();
      return [...incoming, ...existing]
        .map((item) => {
          if (!item) return null;
          const url = String(item.url || "").trim();
          if (!url || seen.has(url)) return null;
          seen.add(url);
          return {
            url,
            name: String(item.name || "").trim() || null,
            contentType: String(item.contentType || "").trim() || null,
            assetId: String(item.assetId || "").trim() || null,
          };
        })
        .filter(Boolean)
        .slice(0, 16) as AgentGenerationProjectWorkspaceAttachment[];
    },
    []
  );

  const mergeWorkflowAgentInput = useCallback(
    (existingInput: string, syncInput: string) => {
      const contextBlock =
        `${WORKFLOW_AGENT_CONTEXT_START}\n${syncInput.trim()}\n${WORKFLOW_AGENT_CONTEXT_END}`.trim();
      const normalizedExisting = String(existingInput || "").trim();
      if (!normalizedExisting) {
        return contextBlock;
      }

      const startIndex = normalizedExisting.indexOf(
        WORKFLOW_AGENT_CONTEXT_START
      );
      const endIndex = normalizedExisting.indexOf(WORKFLOW_AGENT_CONTEXT_END);

      if (startIndex >= 0 && endIndex > startIndex) {
        const before = normalizedExisting.slice(0, startIndex).trim();
        const after = normalizedExisting
          .slice(endIndex + WORKFLOW_AGENT_CONTEXT_END.length)
          .trim();
        return [before, contextBlock, after].filter(Boolean).join("\n\n");
      }

      return [contextBlock, normalizedExisting].filter(Boolean).join("\n\n");
    },
    []
  );

  const handleOpenSelectedWorkflowInAgent = useCallback(async () => {
    if (
      !selectedVideoWorkflowNode ||
      selectedVideoWorkflowType !== "custom-agent"
    ) {
      return;
    }

    const workflowData = selectedVideoWorkflowData;
    if (!workflowData) {
      return;
    }

    const nodeId = selectedVideoWorkflowNode.id;
    const taskKey = `${nodeId}:agent`;
    const nowIso = new Date().toISOString();
    const storyboardShots = selectedWorkflowStoryboardShots.slice(0, 8);
    const workflowPrompt =
      selectedWorkflowPrompt.trim() ||
      "请基于当前视频画布中的脚本、分镜、角色和场景资产继续推进创作。";
    const syncInput = buildWorkflowAgentWorkspaceInput({
      promptText: workflowPrompt,
      storyboardShots,
      structuredData: selectedWorkflowStructuredData,
    });
    const incomingAttachments = buildWorkflowAgentAttachments(
      selectedWorkflowMedia
    );
    const firstIncomingAttachmentNodeId = incomingAttachments[0]
      ? selectedWorkflowMedia.find(
          (item) =>
            item.kind === "image" && item.url === incomingAttachments[0]?.url
        )?.nodeId || null
      : null;
    const inferredAspectRatio =
      incomingAttachments.length > 0
        ? guessCanvasAspectRatio(firstIncomingAttachmentNodeId)
        : selectedWorkflowInputs.videoCount > 0
          ? guessVideoRatio(
              selectedWorkflowMedia.find((item) => item.kind === "video")
                ?.nodeId || nodeId
            )
          : "auto";
    const nextProjectTitle = buildWorkflowAgentProjectTitle({
      promptText: workflowPrompt,
      nodeTitle: workflowData.title,
      structuredData: selectedWorkflowStructuredData,
    });
    const nextProjectDescription = buildWorkflowAgentProjectDescription({
      promptText: workflowPrompt,
      summary: workflowData.summary,
      structuredData: selectedWorkflowStructuredData,
    });
    const fallbackWorkflowState = {
      ...createEmptyAgentGenerationProjectPersistedState().workflowState,
      ...buildCurrentWorkflowPersistedState(),
      currentStage: "mode" as const,
    };

    setActiveWorkflowExecutionTaskKey(taskKey);
    patchWorkflowNode(nodeId, {
      status: "generating",
      summary: selectedWorkflowLinkedAgentProject.id
        ? "正在同步到已关联的 Agent 项目..."
        : "正在创建 Agent 项目并同步当前上下文...",
      metadata: {
        lastExecutedAt: nowIso,
      },
    });

    try {
      let existingProject: AgentGenerationProject | null = null;
      if (selectedWorkflowLinkedAgentProject.id) {
        const linkedResult = await agentProjectService.getProject(
          selectedWorkflowLinkedAgentProject.id
        );
        if (linkedResult.success && linkedResult.data) {
          existingProject = linkedResult.data;
        } else if (isUnauthorizedApiError(linkedResult.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            linkedResult.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
          throw new Error(
            linkedResult.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
      }

      const existingPersistedState = existingProject
        ? normalizeAgentGenerationProjectPersistedState(
            existingProject.projectState
          )
        : createEmptyAgentGenerationProjectPersistedState();
      const defaultWorkspaceState =
        createEmptyAgentGenerationProjectWorkspaceState();
      const nextWorkspaceState: AgentGenerationProjectWorkspaceState = {
        ...defaultWorkspaceState,
        ...(existingPersistedState.workspaceState || {}),
        input: mergeWorkflowAgentInput(
          String(existingPersistedState.workspaceState?.input || ""),
          syncInput
        ),
        attachments: mergeWorkflowAgentAttachments(
          existingPersistedState.workspaceState?.attachments || [],
          incomingAttachments
        ),
        selectedModelId:
          String(
            existingPersistedState.workspaceState?.selectedModelId || ""
          ).trim() || "auto",
        imageParams: {
          ...defaultWorkspaceState.imageParams,
          ...(existingPersistedState.workspaceState?.imageParams || {}),
          aspectRatio:
            String(
              existingPersistedState.workspaceState?.imageParams?.aspectRatio ||
                ""
            ).trim() ||
            inferredAspectRatio ||
            "auto",
        },
      };
      const nextPersistedState: AgentGenerationProjectPersistedState = {
        ...existingPersistedState,
        workflowState: existingProject
          ? {
              ...(existingPersistedState.workflowState ||
                fallbackWorkflowState),
              currentStage: "mode",
            }
          : fallbackWorkflowState,
        workspaceState: nextWorkspaceState,
        resultCollections: existingPersistedState.resultCollections || {},
        deletedResultCollections:
          existingPersistedState.deletedResultCollections || {},
        resultImageUrls: existingPersistedState.resultImageUrls || [],
      };

      const payload = {
        title: existingProject?.title || nextProjectTitle,
        description:
          existingProject?.description || nextProjectDescription || null,
        thumbnail:
          incomingAttachments[0]?.url || existingProject?.thumbnail || null,
        projectState: nextPersistedState,
      };

      const result = existingProject
        ? await agentProjectService.updateProject(existingProject.id, payload)
        : await agentProjectService.createProject(payload);

      if (!result.success || !result.data) {
        if (isUnauthorizedApiError(result.error)) {
          setIsAuthenticated(false);
          openLoginDialog(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
          throw new Error(
            result.error || "当前登录状态已失效，请重新登录后继续操作。"
          );
        }
        throw new Error(result.error || "同步 Agent 项目失败");
      }

      patchWorkflowNode(nodeId, {
        status: "completed",
        summary: existingProject
          ? "已同步到 Agent 工作台，可继续完善提示词、参考图和执行步骤。"
          : "已创建 Agent 项目并同步当前上下文，可继续在 Agent 工作台推进。",
        metadata: {
          linkedAgentProjectId: result.data.id,
          linkedAgentProjectTitle: result.data.title || nextProjectTitle,
          linkedAgentProjectUpdatedAt: String(result.data.updatedAt || nowIso),
          lastAgentWorkspaceSyncAt: nowIso,
          lastExecutedAt: nowIso,
        },
      });

      setIsPanelOpen(true);
      setPanelMode("chat");
      updateCanvasSearchParams({
        mode: "agent",
        agentProjectId: result.data.id,
      });
      toast.success(
        existingProject ? "已同步到 Agent 工作台" : "已创建 Agent 项目"
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "打开 Agent 工作台失败";
      patchWorkflowNode(nodeId, {
        status: "failed",
        summary: message,
        metadata: {
          lastExecutedAt: nowIso,
          lastError: message,
        },
      });
      toast.error(message);
    } finally {
      setActiveWorkflowExecutionTaskKey((current) =>
        current === taskKey ? null : current
      );
    }
  }, [
    buildCurrentWorkflowPersistedState,
    buildWorkflowAgentAttachments,
    buildWorkflowAgentProjectDescription,
    buildWorkflowAgentProjectTitle,
    buildWorkflowAgentWorkspaceInput,
    guessCanvasAspectRatio,
    guessVideoRatio,
    mergeWorkflowAgentAttachments,
    mergeWorkflowAgentInput,
    openLoginDialog,
    patchWorkflowNode,
    selectedVideoWorkflowData,
    selectedVideoWorkflowNode,
    selectedVideoWorkflowType,
    selectedWorkflowInputs.videoCount,
    selectedWorkflowLinkedAgentProject.id,
    selectedWorkflowMedia,
    selectedWorkflowPrompt,
    selectedWorkflowStoryboardShots,
    selectedWorkflowStructuredData,
    updateCanvasSearchParams,
  ]);

  const getWorkflowBatchOutputOffset = useCallback(
    (kind: WorkflowMediaReference["kind"], index: number) => {
      const size =
        kind === "video"
          ? { width: 360, height: 240 }
          : { width: 320, height: 320 };
      const columns = 2;
      return {
        x: (index % columns) * (size.width + 28),
        y: Math.floor(index / columns) * (size.height + 28),
      };
    },
    []
  );

  // 添加文本节点
  const getVideoWorkflowPlacement = useCallback(
    (size: { width: number; height: number }) => {
      if (!isVideoMode || selectedNodeIds.length !== 1) {
        const origin = getVisibleCanvasOrigin();
        return {
          x: origin.x + Math.random() * 120,
          y: origin.y + Math.random() * 120,
        };
      }

      const sourceNode = nodes.find((node) => node.id === selectedNodeIds[0]);
      if (!sourceNode) {
        const origin = getVisibleCanvasOrigin();
        return {
          x: origin.x + Math.random() * 120,
          y: origin.y + Math.random() * 120,
        };
      }

      return {
        x: sourceNode.position.x + sourceNode.size.width + 180,
        y: sourceNode.position.y + sourceNode.size.height / 2 - size.height / 2,
      };
    },
    [getVisibleCanvasOrigin, isVideoMode, nodes, selectedNodeIds]
  );

  const createCanvasNode = useCallback(
    (
      nodeConfig: Parameters<typeof addNode>[0],
      options?: {
        connectFromSelection?: boolean;
        connectFromNodeId?: string | null;
        selectNewNode?: boolean;
      }
    ) => {
      const connectFromSelection = options?.connectFromSelection ?? true;
      const selectNewNode = options?.selectNewNode ?? true;
      const explicitSourceNodeId = options?.connectFromNodeId || null;
      const nodeId = addNode(nodeConfig);
      const sourceNodeId =
        connectFromSelection && isVideoMode
          ? explicitSourceNodeId ||
            (selectedNodeIds.length === 1 ? selectedNodeIds[0] || null : null)
          : null;
      if (sourceNodeId && sourceNodeId !== nodeId) {
        addEdge({
          source: sourceNodeId,
          target: nodeId,
          type: "default",
        });
      }
      if (selectNewNode) {
        selectNodes([nodeId]);
      }
      return nodeId;
    },
    [addEdge, addNode, isVideoMode, selectNodes, selectedNodeIds]
  );

  const handleAddWorkflowNode = useCallback(
    (
      templateType: VideoWorkflowTemplateType,
      options?: {
        position?: Position;
        connectFromSelection?: boolean;
        connectFromNodeId?: string | null;
        selectNewNode?: boolean;
      }
    ) => {
      const definition = getVideoWorkflowNodeDefinition(templateType);
      if (!definition) return;
      const placement =
        options?.position || getVideoWorkflowPlacement(definition.size);
      createCanvasNode(buildVideoWorkflowCanvasNode(templateType, placement), {
        connectFromSelection: options?.connectFromSelection ?? true,
        connectFromNodeId: options?.connectFromNodeId ?? null,
        selectNewNode: options?.selectNewNode ?? true,
      });
    },
    [createCanvasNode, getVideoWorkflowPlacement]
  );

  const handleOpenVideoCanvasInsertMenu = useCallback(
    (payload: VideoCanvasInsertMenuState) => {
      if (!isVideoMode) return;
      setVideoCanvasInsertMenu(payload);
    },
    [isVideoMode]
  );

  const handleInsertWorkflowNodeFromMenu = useCallback(
    (templateType: VideoWorkflowTemplateType) => {
      if (!videoCanvasInsertMenu) return;

      const definition = getVideoWorkflowNodeDefinition(templateType);
      const sourceNode = videoCanvasInsertMenu.sourceNodeId
        ? nodes.find((node) => node.id === videoCanvasInsertMenu.sourceNodeId)
        : null;
      const anchoredPosition =
        sourceNode && definition
          ? {
              x: videoCanvasInsertMenu.openLeft
                ? sourceNode.position.x - definition.size.width - 180
                : sourceNode.position.x + sourceNode.size.width + 180,
              y:
                sourceNode.position.y +
                sourceNode.size.height / 2 -
                definition.size.height / 2,
            }
          : definition
            ? {
                x:
                  videoCanvasInsertMenu.canvasPosition.x -
                  Math.min(Math.round(definition.size.width * 0.18), 84),
                y:
                  videoCanvasInsertMenu.canvasPosition.y -
                  Math.min(Math.round(definition.size.height * 0.12), 42),
              }
            : videoCanvasInsertMenu.canvasPosition;

      handleAddWorkflowNode(templateType, {
        position: anchoredPosition,
        connectFromSelection: Boolean(sourceNode),
        connectFromNodeId: sourceNode?.id || null,
      });
      setVideoCanvasInsertMenu(null);
    },
    [handleAddWorkflowNode, nodes, videoCanvasInsertMenu]
  );

  const handleCreateSelectedAgentResultBranches = useCallback(async () => {
    if (
      !selectedVideoWorkflowNode ||
      selectedVideoWorkflowType !== "custom-agent" ||
      selectedWorkflowAgentResultAssets.length === 0
    ) {
      toast.error("当前自定义代理节点还没有可展开的 Agent 结果分组。");
      return;
    }

    const sourceNodeId = selectedVideoWorkflowNode.id;
    const sourceNode = selectedVideoWorkflowNode;
    const taskKey = `${sourceNodeId}:branches`;
    const nowIso = new Date().toISOString();
    const touchedNodeIds: string[] = [];

    const findExistingBranchNode = (
      modeType: string,
      branchRole: "preview" | "local-save"
    ) =>
      nodes.find((node) => {
        if (node.type !== "workflow") return false;
        const templateType = inferVideoWorkflowTemplateType(node);
        if (templateType !== branchRole) return false;
        const metadata = ((node.data as WorkflowNodeData).metadata ||
          {}) as Record<string, any>;
        return (
          String(metadata.sourceWorkflowNodeId || "").trim() === sourceNodeId &&
          String(metadata.agentResultModeType || "").trim() === modeType &&
          String(metadata.agentBranchRole || "").trim() === branchRole
        );
      }) || null;

    setActiveWorkflowExecutionTaskKey(taskKey);
    patchWorkflowNode(sourceNodeId, {
      status: "generating",
      summary: "正在按 Agent 结果分组整理下游分支...",
      metadata: {
        lastExecutedAt: nowIso,
      },
    });

    try {
      selectedWorkflowAgentResultAssets.forEach((group, index) => {
        const previewPosition = {
          x: sourceNode.position.x + sourceNode.size.width + 220,
          y: sourceNode.position.y + index * 220,
        };
        const savePosition = {
          x: previewPosition.x + 520,
          y: previewPosition.y + 24,
        };
        const previewNode =
          findExistingBranchNode(group.modeType, "preview") ||
          (() => {
            const nodeId = createCanvasNode(
              buildVideoWorkflowCanvasNode("preview", previewPosition),
              {
                connectFromSelection: false,
                selectNewNode: false,
              }
            );
            return (
              useCanvasStore
                .getState()
                .nodes.find((node) => node.id === nodeId) || null
            );
          })();
        const saveNode =
          findExistingBranchNode(group.modeType, "local-save") ||
          (() => {
            const nodeId = createCanvasNode(
              buildVideoWorkflowCanvasNode("local-save", savePosition),
              {
                connectFromSelection: false,
                selectNewNode: false,
              }
            );
            return (
              useCanvasStore
                .getState()
                .nodes.find((node) => node.id === nodeId) || null
            );
          })();

        const firstAsset = group.assets[0] || null;
        const previewNodeId = previewNode?.id || null;
        const saveNodeId = saveNode?.id || null;

        if (previewNodeId) {
          patchWorkflowNode(previewNodeId, {
            title: `${group.label}预览`,
            description: `检查 ${group.label} 结果并决定是否继续加工或保存。`,
            status: "completed",
            summary: `已整理 ${group.assets.length} 个 ${group.label} 结果，可直接预览。`,
            metadata: {
              sourceWorkflowNodeId: sourceNodeId,
              sourceAgentProjectId:
                selectedWorkflowLinkedAgentProject.id || agentProjectId,
              agentResultModeType: group.modeType,
              agentResultGroupLabel: group.label,
              agentBranchRole: "preview",
              syncedAgentAssets: group.assets.map((asset) => ({
                url: asset.url,
                title: asset.title || "",
              })),
              previewMediaUrl: firstAsset?.url || "",
              previewMediaKind: "image",
              previewMediaTitle: firstAsset?.title || "",
              sourcePrompt: selectedWorkflowPrompt,
              lastExecutedAt: nowIso,
            },
          });
          addEdge({
            source: sourceNodeId,
            target: previewNodeId,
            type: "default",
          });
          touchedNodeIds.push(previewNodeId);
        }

        if (saveNodeId) {
          patchWorkflowNode(saveNodeId, {
            title: `${group.label}保存`,
            description: `把 ${group.label} 结果直接整理并下载到本地。`,
            status: "completed",
            summary: `已整理 ${group.assets.length} 个 ${group.label} 结果，可直接打包下载。`,
            metadata: {
              sourceWorkflowNodeId: sourceNodeId,
              sourceAgentProjectId:
                selectedWorkflowLinkedAgentProject.id || agentProjectId,
              agentResultModeType: group.modeType,
              agentResultGroupLabel: group.label,
              agentBranchRole: "local-save",
              syncedAgentAssets: group.assets.map((asset) => ({
                url: asset.url,
                title: asset.title || "",
              })),
              pendingAssetCount: group.assets.length,
              sourcePrompt: selectedWorkflowPrompt,
              lastExecutedAt: nowIso,
            },
          });
          if (previewNodeId) {
            addEdge({
              source: previewNodeId,
              target: saveNodeId,
              type: "default",
            });
          } else {
            addEdge({
              source: sourceNodeId,
              target: saveNodeId,
              type: "default",
            });
          }
          touchedNodeIds.push(saveNodeId);
        }
      });

      patchWorkflowNode(sourceNodeId, {
        status: "completed",
        summary: `已按 ${selectedWorkflowAgentResultAssets.length} 组 Agent 结果整理下游分支。`,
        metadata: {
          lastAgentBranchSyncAt: nowIso,
          lastExecutedAt: nowIso,
          branchResultModeCount: selectedWorkflowAgentResultAssets.length,
        },
      });

      if (touchedNodeIds.length > 0) {
        selectNodes(Array.from(new Set(touchedNodeIds)));
      }
      toast.success(
        `已展开 ${selectedWorkflowAgentResultAssets.length} 组结果分支`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "展开 Agent 结果分支失败";
      patchWorkflowNode(sourceNodeId, {
        status: "failed",
        summary: message,
        metadata: {
          lastExecutedAt: nowIso,
          lastError: message,
        },
      });
      toast.error(message);
    } finally {
      setActiveWorkflowExecutionTaskKey((current) =>
        current === taskKey ? null : current
      );
    }
  }, [
    addEdge,
    agentProjectId,
    createCanvasNode,
    nodes,
    patchWorkflowNode,
    selectNodes,
    selectedVideoWorkflowNode,
    selectedVideoWorkflowType,
    selectedWorkflowAgentResultAssets,
    selectedWorkflowLinkedAgentProject.id,
    selectedWorkflowPrompt,
  ]);

  const handleAddTextNode = useCallback(() => {
    if (isVideoMode) {
      handleAddWorkflowNode("text-node");
      return;
    }

    createCanvasNode({
      type: "text",
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 200, height: 100 },
      data: {
        color: DEFAULT_CANVAS_TEXT_COLOR,
        content: "双击编辑文本",
      },
      connections: [],
    });
  }, [createCanvasNode, handleAddWorkflowNode, isVideoMode]);

  // 添加图片节点
  const handleAddImageNode = useCallback(() => {
    if (isVideoMode) {
      handleAddWorkflowNode("input-image");
      return;
    }

    createCanvasNode({
      type: "image",
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 300, height: 300 },
      data: {
        src: "",
        status: "pending",
        title: "新图片",
        prompt: "",
      },
      connections: [],
    });
  }, [createCanvasNode, handleAddWorkflowNode, isVideoMode]);

  const handleAddVideoNode = useCallback(() => {
    if (isVideoMode) {
      handleAddWorkflowNode("video-input");
      return;
    }

    createCanvasNode({
      type: "video",
      position: { x: 100 + Math.random() * 200, y: 100 + Math.random() * 200 },
      size: { width: 320, height: 220 },
      data: {
        src: "",
        status: "pending",
        prompt: "",
      },
      connections: [],
    });
  }, [createCanvasNode, handleAddWorkflowNode, isVideoMode]);

  const handleRunStoryboardBatch = useCallback(async () => {
    if (
      selectedVideoWorkflowType !== "storyboard-node" ||
      !selectedVideoWorkflowNode
    ) {
      return;
    }

    const nodeId = selectedVideoWorkflowNode.id;
    const taskKey = `${nodeId}:batch`;
    const nowIso = new Date().toISOString();
    const imageMedia = selectedWorkflowMedia.filter(
      (item) => item.kind === "image"
    );
    const primaryImage = imageMedia[0] || null;
    const shots =
      selectedWorkflowStoryboardShots.length > 0
        ? selectedWorkflowStoryboardShots
        : selectedWorkflowPrompt.trim()
          ? buildStoryboardShots(selectedWorkflowPrompt, {
              imageCount: selectedWorkflowInputs.imageCount,
              videoCount: selectedWorkflowInputs.videoCount,
            })
          : [];

    if (selectedStoryboardBatchTargets.length === 0) {
      toast.error("当前分镜节点右侧还没有连接生成图片或生成视频节点。");
      return;
    }

    if (shots.length === 0) {
      toast.error("请先整理分镜，或至少接入一段上游脚本再执行批量生成。");
      return;
    }

    setActiveWorkflowExecutionTaskKey(taskKey);

    try {
      patchWorkflowNode(nodeId, {
        status: "generating",
        summary: `正在把 ${shots.length} 个镜头派发到 ${selectedStoryboardBatchTargets.length} 个下游节点...`,
        metadata: {
          sourcePrompt: selectedWorkflowPrompt,
          storyboardShots: shots,
          batchShotCount: shots.length,
          batchTargetCount: selectedStoryboardBatchTargets.length,
          lastExecutedAt: nowIso,
          lastBatchExecutedAt: nowIso,
        },
      });

      if (selectedStoryboardChartTargets.length > 0) {
        syncDirectStoryboardChartNodes(nodeId, shots, selectedWorkflowPrompt);
      }

      const allCreatedNodeIds: string[] = [];
      let totalSuccessCount = 0;
      let totalFailureCount = 0;

      for (const target of selectedStoryboardBatchTargets) {
        const targetNodeId = target.node.id;
        const targetType = target.templateType;
        const targetLabel = targetType === "gen-video" ? "视频镜头" : "关键帧";

        patchWorkflowNode(targetNodeId, {
          status: "generating",
          summary: `正在批量生成 ${shots.length} 个${targetLabel}...`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            storyboardShots: shots,
            batchMode: targetType,
            batchShotCount: shots.length,
            lastExecutedAt: nowIso,
            storyboardSourceNodeId: nodeId,
          },
        });

        let successCount = 0;
        let failureCount = 0;
        let lastMedia: WorkflowMediaReference | null = null;
        const failureMessages: string[] = [];

        for (const shot of shots) {
          const shotPrompt = buildStoryboardShotPrompt(
            selectedWorkflowPrompt,
            shot
          );
          const outputIndex = successCount;

          try {
            if (targetType === "gen-image") {
              const result = await imageGenerationService.generateImage({
                prompt:
                  shotPrompt ||
                  "基于当前分镜镜头生成一张适合后续视频工作流使用的关键帧。",
                referenceImage: primaryImage?.url,
                aspectRatio: guessCanvasAspectRatio(
                  primaryImage?.nodeId || targetNodeId
                ),
                imageSize,
                imageCount: 1,
              });

              const imageUrl =
                result.data?.images?.[0]?.originalUrl ||
                result.data?.images?.[0]?.thumbnailUrl ||
                "";
              if (!result.success || !imageUrl) {
                throw new Error(result.error || "图片生成失败");
              }

              const media: WorkflowMediaReference = {
                nodeId: targetNodeId,
                kind: "image",
                url: imageUrl,
                title: `${shot.title || `镜头 ${outputIndex + 1}`}-关键帧`,
                prompt: shotPrompt,
                source: "workflow-result",
              };
              const offset = getWorkflowBatchOutputOffset(
                media.kind,
                outputIndex
              );
              const createdNodeId = createWorkflowOutputNode({
                sourceNodeId: targetNodeId,
                anchorNodeId: targetNodeId,
                edgeSourceNodeId: targetNodeId,
                media,
                title: media.title || "生成图片",
                prompt: shotPrompt,
                offsetX: offset.x,
                offsetY: offset.y,
                selectAfterCreate: false,
              });

              if (createdNodeId) {
                allCreatedNodeIds.push(createdNodeId);
              }
              lastMedia = media;
              successCount += 1;
              continue;
            }

            const mode = inferVideoGenerationModeFromMedia(imageMedia);
            const result = await videoGenerationService.generateVideo({
              prompt:
                shotPrompt ||
                "基于当前分镜镜头生成一段镜头感明确、动作自然的视频片段。",
              mode,
              images: imageMedia.map((item) => item.url).slice(0, 4),
              ratio: guessVideoRatio(primaryImage?.nodeId || targetNodeId),
              duration: 5,
              returnLastFrame: false,
            });

            const videoUrl = String(result.data?.url || "").trim();
            if (!result.success || !videoUrl) {
              throw new Error(result.error || "视频生成失败");
            }

            const media: WorkflowMediaReference = {
              nodeId: targetNodeId,
              kind: "video",
              url: videoUrl,
              title: `${shot.title || `镜头 ${outputIndex + 1}`}-视频`,
              prompt: shotPrompt,
              source: "workflow-result",
            };
            const offset = getWorkflowBatchOutputOffset(
              media.kind,
              outputIndex
            );
            const createdNodeId = createWorkflowOutputNode({
              sourceNodeId: targetNodeId,
              anchorNodeId: targetNodeId,
              edgeSourceNodeId: targetNodeId,
              media,
              title: media.title || "生成视频",
              prompt: shotPrompt,
              offsetX: offset.x,
              offsetY: offset.y,
              selectAfterCreate: false,
            });

            if (createdNodeId) {
              allCreatedNodeIds.push(createdNodeId);
            }
            lastMedia = media;
            successCount += 1;
          } catch (error) {
            failureCount += 1;
            failureMessages.push(
              `${shot.title || `镜头 ${failureCount}`}: ${
                error instanceof Error
                  ? error.message
                  : `${targetLabel}生成失败`
              }`
            );
          }
        }

        totalSuccessCount += successCount;
        totalFailureCount += failureCount;

        if (lastMedia) {
          syncDirectPreviewNodes(
            targetNodeId,
            lastMedia,
            lastMedia.prompt || selectedWorkflowPrompt
          );
        }

        patchWorkflowNode(targetNodeId, {
          status: successCount > 0 ? "completed" : "failed",
          summary:
            successCount > 0
              ? failureCount > 0
                ? `已完成 ${successCount}/${shots.length} 个${targetLabel}，其余 ${failureCount} 个失败。`
                : `已批量生成 ${successCount} 个${targetLabel}。`
              : `批量${targetLabel}生成失败，请检查提示词和上游素材。`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            storyboardShots: shots,
            batchMode: targetType,
            batchShotCount: shots.length,
            batchResultCount: successCount,
            batchFailedCount: failureCount,
            batchErrors: failureMessages.slice(0, 4),
            resultMediaUrl: lastMedia?.url || "",
            resultMediaKind: lastMedia?.kind || "",
            resultMediaTitle: lastMedia?.title || "",
            lastExecutedAt: nowIso,
            lastBatchExecutedAt: nowIso,
            storyboardSourceNodeId: nodeId,
          },
        });
      }

      if (allCreatedNodeIds.length > 0) {
        selectNodes(allCreatedNodeIds);
      }

      patchWorkflowNode(nodeId, {
        status: totalSuccessCount > 0 ? "completed" : "failed",
        summary:
          totalSuccessCount > 0
            ? totalFailureCount > 0
              ? `已派发 ${shots.length} 个镜头，生成 ${totalSuccessCount} 个结果，${totalFailureCount} 个失败。`
              : `已把 ${shots.length} 个镜头批量派发到下游节点，共生成 ${totalSuccessCount} 个结果。`
            : "分镜已派发，但下游生成全部失败。",
        metadata: {
          sourcePrompt: selectedWorkflowPrompt,
          storyboardShots: shots,
          batchShotCount: shots.length,
          batchTargetCount: selectedStoryboardBatchTargets.length,
          batchResultCount: totalSuccessCount,
          batchFailedCount: totalFailureCount,
          lastExecutedAt: nowIso,
          lastBatchExecutedAt: nowIso,
        },
      });

      if (totalSuccessCount > 0) {
        toast.success(
          totalFailureCount > 0
            ? `已生成 ${totalSuccessCount} 个结果，${totalFailureCount} 个失败`
            : `已生成 ${totalSuccessCount} 个分镜结果`
        );
      } else {
        toast.error("分镜已派发，但下游生成全部失败");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "分镜批量执行失败";
      patchWorkflowNode(nodeId, {
        status: "failed",
        summary: message,
        metadata: {
          lastExecutedAt: nowIso,
          lastError: message,
        },
      });
      toast.error(message);
    } finally {
      setActiveWorkflowExecutionTaskKey((current) =>
        current === taskKey ? null : current
      );
    }
  }, [
    buildStoryboardShotPrompt,
    buildStoryboardShots,
    createWorkflowOutputNode,
    getWorkflowBatchOutputOffset,
    guessCanvasAspectRatio,
    guessVideoRatio,
    imageGenerationService,
    patchWorkflowNode,
    selectNodes,
    selectedStoryboardBatchTargets,
    selectedStoryboardChartTargets.length,
    selectedVideoWorkflowNode,
    selectedVideoWorkflowType,
    selectedWorkflowInputs.imageCount,
    selectedWorkflowInputs.videoCount,
    selectedWorkflowMedia,
    selectedWorkflowPrompt,
    selectedWorkflowStoryboardShots,
    syncDirectPreviewNodes,
    syncDirectStoryboardChartNodes,
    videoGenerationService,
  ]);

  const handleRunSelectedWorkflowNode = useCallback(async () => {
    if (
      !selectedVideoWorkflowNode ||
      !selectedVideoWorkflowType ||
      !selectedWorkflowIsActionable
    ) {
      return;
    }

    const nodeId = selectedVideoWorkflowNode.id;
    const taskKey = `${nodeId}:primary`;
    const imageMedia = selectedWorkflowMedia.filter(
      (item) => item.kind === "image"
    );
    const videoMedia = selectedWorkflowMedia.filter(
      (item) => item.kind === "video"
    );
    const primaryImage = imageMedia[0] || null;
    const nowIso = new Date().toISOString();
    setActiveWorkflowExecutionTaskKey(taskKey);

    try {
      if (selectedVideoWorkflowType === "storyboard-node") {
        if (!selectedWorkflowPrompt.trim()) {
          throw new Error(
            "请先在上游接入脚本、画面描述或参考素材，再整理分镜。"
          );
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在整理镜头草案...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            lastExecutedAt: nowIso,
          },
        });

        const shots = buildStoryboardShots(selectedWorkflowPrompt, {
          imageCount: selectedWorkflowInputs.imageCount,
          videoCount: selectedWorkflowInputs.videoCount,
        });

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已整理 ${shots.length} 个镜头草案，可继续连接生成图片或生成视频。`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            storyboardShots: shots,
            batchShotCount: shots.length,
            lastExecutedAt: nowIso,
          },
        });
        syncDirectStoryboardChartNodes(nodeId, shots, selectedWorkflowPrompt);
        toast.success(`已整理 ${shots.length} 个分镜草案`);
        return;
      }

      if (selectedVideoWorkflowType === "video-analyze") {
        if (
          !selectedWorkflowPrompt.trim() &&
          imageMedia.length === 0 &&
          videoMedia.length === 0
        ) {
          throw new Error(
            "请先接入参考视频、封面图或脚本说明，再执行视频分析。"
          );
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在分析视频节奏和镜头结构...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            lastExecutedAt: nowIso,
          },
        });

        const result = await workflowAnalysisService.analyze({
          mode: "video-analysis",
          prompt: selectedWorkflowPrompt,
          imageUrls: imageMedia.map((item) => item.url).slice(0, 4),
          videoUrls: videoMedia.map((item) => item.url).slice(0, 4),
          nodeTitle:
            (selectedVideoWorkflowNode.data as { title?: string } | undefined)
              ?.title || "视频分析",
        });
        if (!result.success) {
          throw new Error(result.error || "视频分析失败");
        }

        const highlights =
          result.data?.highlights && result.data.highlights.length > 0
            ? result.data.highlights
            : [
                `当前串联了 ${selectedWorkflowInputs.videoCount} 个视频素材和 ${selectedWorkflowInputs.imageCount} 个参考图。`,
                selectedWorkflowPrompt.trim()
                  ? `上游创作意图：${selectedWorkflowPrompt.trim().slice(0, 80)}${selectedWorkflowPrompt.trim().length > 80 ? "..." : ""}`
                  : "上游暂未明确脚本，可先补一段镜头目标或情绪描述。",
              ];
        const shotIdeas =
          result.data?.shotIdeas && result.data.shotIdeas.length > 0
            ? result.data.shotIdeas
            : buildStoryboardShots(selectedWorkflowPrompt, {
                imageCount: selectedWorkflowInputs.imageCount,
                videoCount: selectedWorkflowInputs.videoCount,
              });

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            result.data?.summary ||
            "已整理一版结构化视频分析结果，可继续连接分镜节点或关键帧生成。",
          metadata: {
            analysisHighlights: highlights,
            storyboardShots: shotIdeas,
            batchShotCount: shotIdeas.length,
            visualMotifs: result.data?.visualMotifs || [],
            recommendedNextSteps: result.data?.recommendedNextSteps || [],
            sourcePrompt: selectedWorkflowPrompt,
            analysisModel: result.data?.model || "",
            lastExecutedAt: nowIso,
          },
        });
        toast.success("视频分析节点已生成结构化结果");
        return;
      }

      if (selectedVideoWorkflowType === "extract-characters-scenes") {
        if (!selectedWorkflowPrompt.trim() && imageMedia.length === 0) {
          throw new Error("请先接入小说、脚本或参考图，再提取角色与场景。");
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在提取角色、场景与关系线索...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            lastExecutedAt: nowIso,
          },
        });

        const result = await workflowAnalysisService.analyze({
          mode: "character-scene-extraction",
          prompt: selectedWorkflowPrompt,
          imageUrls: imageMedia.map((item) => item.url).slice(0, 4),
          nodeTitle:
            (selectedVideoWorkflowNode.data as { title?: string } | undefined)
              ?.title || "提取角色场景",
        });
        if (!result.success) {
          throw new Error(result.error || "角色场景提取失败");
        }

        const characters = Array.isArray(result.data?.characters)
          ? result.data?.characters
          : [];
        const scenes = Array.isArray(result.data?.scenes)
          ? result.data?.scenes
          : [];

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            result.data?.summary ||
            `已提取 ${characters.length} 个角色和 ${scenes.length} 个场景线索。`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            characters,
            scenes,
            relationships: result.data?.relationships || [],
            recommendedNextSteps: result.data?.recommendedNextSteps || [],
            analysisModel: result.data?.model || "",
            lastExecutedAt: nowIso,
          },
        });
        toast.success(
          `已提取 ${characters.length} 个角色和 ${scenes.length} 个场景`
        );
        return;
      }

      if (selectedVideoWorkflowType === "character-description") {
        const descriptionText = buildCharacterDescriptionSummary(
          selectedWorkflowStructuredData.characters,
          selectedWorkflowPrompt
        );
        if (!descriptionText.trim()) {
          throw new Error("上游还没有可整理的角色线索，请先提取角色场景。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已整理 ${Math.max(
            selectedWorkflowStructuredData.characters.length,
            1
          )} 组角色描述，可继续固化角色资产。`,
          metadata: {
            sourcePrompt: descriptionText,
            characters: selectedWorkflowStructuredData.characters,
            recommendedNextSteps:
              selectedWorkflowStructuredData.recommendedNextSteps,
            lastExecutedAt: nowIso,
          },
        });
        toast.success("角色描述节点已整理完成");
        return;
      }

      if (selectedVideoWorkflowType === "scene-description") {
        const descriptionText = buildSceneDescriptionSummary(
          selectedWorkflowStructuredData.scenes,
          selectedWorkflowPrompt
        );
        if (!descriptionText.trim()) {
          throw new Error("上游还没有可整理的场景线索，请先提取角色场景。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已整理 ${Math.max(
            selectedWorkflowStructuredData.scenes.length,
            1
          )} 组场景描述，可继续固化场景资产。`,
          metadata: {
            sourcePrompt: descriptionText,
            scenes: selectedWorkflowStructuredData.scenes,
            recommendedNextSteps:
              selectedWorkflowStructuredData.recommendedNextSteps,
            lastExecutedAt: nowIso,
          },
        });
        toast.success("场景描述节点已整理完成");
        return;
      }

      if (selectedVideoWorkflowType === "create-character") {
        const characterAssets =
          selectedWorkflowStructuredData.characterAssets.length > 0
            ? selectedWorkflowStructuredData.characterAssets
            : buildCharacterAssets(
                selectedWorkflowStructuredData.characters,
                selectedWorkflowPrompt
              );
        if (characterAssets.length === 0) {
          throw new Error("上游还没有可固化的角色信息，请先提取角色场景。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已固化 ${characterAssets.length} 个角色资产，可继续生成角色图或角色视频。`,
          metadata: {
            sourcePrompt: buildWorkflowTextBlock([
              selectedWorkflowPrompt,
              characterAssets.map((item) => item.prompt).join("\n"),
            ]),
            characters: selectedWorkflowStructuredData.characters,
            characterAssets,
            recommendedNextSteps: ["连接生成角色图片", "连接生成角色视频"],
            lastExecutedAt: nowIso,
          },
        });
        toast.success(`已固化 ${characterAssets.length} 个角色资产`);
        return;
      }

      if (selectedVideoWorkflowType === "create-scene") {
        const sceneAssets =
          selectedWorkflowStructuredData.sceneAssets.length > 0
            ? selectedWorkflowStructuredData.sceneAssets
            : buildSceneAssets(
                selectedWorkflowStructuredData.scenes,
                selectedWorkflowPrompt
              );
        if (sceneAssets.length === 0) {
          throw new Error("上游还没有可固化的场景信息，请先提取角色场景。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已固化 ${sceneAssets.length} 个场景资产，可继续生成场景图或场景视频。`,
          metadata: {
            sourcePrompt: buildWorkflowTextBlock([
              selectedWorkflowPrompt,
              sceneAssets.map((item) => item.prompt).join("\n"),
            ]),
            scenes: selectedWorkflowStructuredData.scenes,
            sceneAssets,
            recommendedNextSteps: ["连接生成场景图片", "连接生成场景视频"],
            lastExecutedAt: nowIso,
          },
        });
        toast.success(`已固化 ${sceneAssets.length} 个场景资产`);
        return;
      }

      if (selectedVideoWorkflowType === "storyboard-chart-node") {
        const chartShots =
          selectedWorkflowStoryboardShots.length > 0
            ? selectedWorkflowStoryboardShots.map((shot) => ({
                title: shot.title,
                description: shot.description,
              }))
            : buildStoryboardShots(selectedWorkflowPrompt, {
                imageCount: selectedWorkflowInputs.imageCount,
                videoCount: selectedWorkflowInputs.videoCount,
              });

        if (
          chartShots.length === 0 &&
          !selectedWorkflowPrompt.trim() &&
          imageMedia.length === 0 &&
          videoMedia.length === 0
        ) {
          throw new Error("请先接入脚本、分镜或参考素材，再生成分镜表。");
        }

        const chart = buildStoryboardChartRows(
          chartShots,
          selectedWorkflowPrompt
        );

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已整理 ${chart.rows.length} 行分镜视表，可继续连接预览节点检查镜头节奏。`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            storyboardShots: chartShots,
            batchShotCount: chartShots.length,
            tableColumns: chart.columns,
            tableRows: chart.rows,
            previewMediaUrl: primaryImage?.url || "",
            previewMediaKind: primaryImage?.kind || "image",
            previewMediaTitle: primaryImage?.title || "分镜参考",
            lastExecutedAt: nowIso,
          },
        });
        toast.success(`已整理 ${chart.rows.length} 行分镜视表`);
        return;
      }

      if (selectedVideoWorkflowType === "table-editor-node") {
        const tableState = buildWorkflowTableState({
          promptText: selectedWorkflowPrompt,
          shots: selectedWorkflowStoryboardShots.map((shot) => ({
            title: shot.title,
            description: shot.description,
          })),
          structuredData: selectedWorkflowStructuredData,
        });

        if (tableState.rows.length === 0) {
          throw new Error(
            "上游还没有可整理成表格的内容，请先接入脚本、角色、场景或分镜。"
          );
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: tableState.summary,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            tableColumns: tableState.columns,
            tableRows: tableState.rows,
            lastExecutedAt: nowIso,
          },
        });
        toast.success(`已整理 ${tableState.rows.length} 行结构化表格`);
        return;
      }

      if (selectedVideoWorkflowType === "image-compare") {
        const compareItems = buildWorkflowCompareItems(selectedWorkflowMedia);
        if (compareItems.length < 2) {
          throw new Error("请至少接入两个上游图片或视频结果，再整理对比节点。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已整理 ${compareItems.length} 个结果用于并排对比。`,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            compareItems,
            previewMediaUrl: compareItems[0]?.url || "",
            previewMediaKind: compareItems[0]?.kind || "image",
            previewMediaTitle: compareItems[0]?.title || "对比基准",
            lastExecutedAt: nowIso,
          },
        });
        toast.success(`已整理 ${compareItems.length} 个结果用于对比`);
        return;
      }

      if (selectedVideoWorkflowType === "jimeng-super-resolution") {
        if (!primaryImage?.url) {
          throw new Error("请先接入一张图片，再执行超分增强。");
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在生成高清增强版本...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            sourceMediaUrl: primaryImage.url,
            lastExecutedAt: nowIso,
          },
        });

        const result = await imageGenerationService.enhanceImage(
          primaryImage.url
        );
        const enhancedUrl = String(result.data?.url || "").trim();
        if (!result.success || !enhancedUrl) {
          throw new Error(result.error || "超分增强失败");
        }

        const promptText = buildWorkflowTextBlock([
          selectedWorkflowPrompt,
          primaryImage.prompt,
          "高清增强 / 超分修复",
        ]);
        const media: WorkflowMediaReference = {
          nodeId,
          kind: "image",
          url: enhancedUrl,
          title: `${String(primaryImage.title || "高清增强").trim() || "高清增强"}-结果`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: "已生成一版高清增强结果，可继续预览或下载。",
          metadata: {
            sourcePrompt: promptText,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            previewMediaUrl: media.url,
            previewMediaKind: media.kind,
            previewMediaTitle: media.title,
            sourceMediaUrl: primaryImage.url,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "高清增强",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("超分增强节点已产出新结果");
        return;
      }

      if (selectedVideoWorkflowType === "inpaint-crop") {
        if (!primaryImage?.url) {
          throw new Error("请先接入一张图片，再执行局部裁剪。");
        }

        const cropRect = buildWorkflowDefaultCropRect(selectedWorkflowPrompt);
        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在裁出局部重绘工作区...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            cropRect,
            sourceMediaUrl: primaryImage.url,
            lastExecutedAt: nowIso,
          },
        });

        const result = await imageGenerationService.boxCutout({
          imageUrl: primaryImage.url,
          cropRect,
          paddingRatio: 0.08,
          sourceNodeId: primaryImage.nodeId,
        });
        const croppedUrl = String(result.data?.url || "").trim();
        if (!result.success || !croppedUrl) {
          throw new Error(result.error || "局部裁剪失败");
        }

        const promptText = buildWorkflowTextBlock([
          selectedWorkflowPrompt,
          "局部裁剪 / 重绘工作区",
        ]);
        const media: WorkflowMediaReference = {
          nodeId,
          kind: "image",
          url: croppedUrl,
          title: `${String(primaryImage.title || "局部裁剪").trim() || "局部裁剪"}-结果`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: "已裁出一块适合继续局部重绘的工作区域。",
          metadata: {
            sourcePrompt: promptText,
            cropRect,
            cropRectApplied: result.data?.cropRectApplied,
            paddedCropRectApplied: result.data?.paddedCropRectApplied,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            previewMediaUrl: media.url,
            previewMediaKind: media.kind,
            previewMediaTitle: media.title,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "局部裁剪",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("局部裁剪节点已产出新结果");
        return;
      }

      if (selectedVideoWorkflowType === "inpaint-stitch") {
        if (!primaryImage?.url) {
          throw new Error("请先接入一张图片，再执行拼接补画。");
        }

        const extendScales = inferWorkflowExtendScales(selectedWorkflowPrompt);
        const promptText = buildWorkflowTextBlock([
          selectedWorkflowPrompt,
          "拼接补画 / 背景延展",
        ]);

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在补边扩图，准备继续拼接...",
          metadata: {
            sourcePrompt: promptText,
            extendScales,
            sourceMediaUrl: primaryImage.url,
            lastExecutedAt: nowIso,
          },
        });

        const result = await imageGenerationService.extendImage(
          primaryImage.url,
          {
            prompt: promptText,
            xScale: extendScales.xScale,
            yScale: extendScales.yScale,
          }
        );
        const extendedUrl = String(result.data?.url || "").trim();
        if (!result.success || !extendedUrl) {
          throw new Error(result.error || "拼接补画失败");
        }

        const media: WorkflowMediaReference = {
          nodeId,
          kind: "image",
          url: extendedUrl,
          title: `${String(primaryImage.title || "拼接补画").trim() || "拼接补画"}-结果`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: "已生成一版补边扩图结果，可继续预览或保存。",
          metadata: {
            sourcePrompt: promptText,
            extendScales,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            previewMediaUrl: media.url,
            previewMediaKind: media.kind,
            previewMediaTitle: media.title,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "拼接补画",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("拼接补画节点已产出新结果");
        return;
      }

      if (selectedVideoWorkflowType === "professional-camera") {
        const cameraPreset = buildWorkflowCameraPreset(selectedWorkflowPrompt);
        const cameraRows = [
          { field: "水平角度", value: `${cameraPreset.horizontalAngle}°` },
          { field: "垂直角度", value: `${cameraPreset.verticalAngle}°` },
          { field: "镜头缩放", value: `${cameraPreset.zoom}` },
          { field: "镜头备注", value: cameraPreset.notes.join(" / ") },
        ];

        if (!primaryImage?.url) {
          patchWorkflowNode(nodeId, {
            status: "completed",
            summary: "已整理一版专业机位参数，可继续接入参考图后生成测试图。",
            metadata: {
              sourcePrompt: selectedWorkflowPrompt,
              analysisHighlights: cameraPreset.notes,
              tableColumns: [
                { key: "field", label: "参数" },
                { key: "value", label: "设定" },
              ],
              tableRows: cameraRows,
              lastExecutedAt: nowIso,
            },
          });
          toast.success("已整理专业机位参数");
          return;
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在生成专业机位测试图...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            tableColumns: [
              { key: "field", label: "参数" },
              { key: "value", label: "设定" },
            ],
            tableRows: cameraRows,
            lastExecutedAt: nowIso,
          },
        });

        const result = await imageGenerationService.editAngle({
          imageUrl: primaryImage.url,
          horizontalAngle: cameraPreset.horizontalAngle,
          verticalAngle: cameraPreset.verticalAngle,
          zoom: cameraPreset.zoom,
        });
        const angleUrl = String(result.data?.url || "").trim();
        if (!result.success || !angleUrl) {
          throw new Error(result.error || "专业机位测试失败");
        }

        const promptText = buildWorkflowTextBlock([
          selectedWorkflowPrompt,
          result.data?.prompt,
          cameraPreset.notes.join(" / "),
        ]);
        const media: WorkflowMediaReference = {
          nodeId,
          kind: "image",
          url: angleUrl,
          title: `${String(primaryImage.title || "专业机位").trim() || "专业机位"}-测试图`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: "已生成一版专业机位测试图，可继续生图或生视频。",
          metadata: {
            sourcePrompt: promptText,
            analysisHighlights: cameraPreset.notes,
            tableColumns: [
              { key: "field", label: "参数" },
              { key: "value", label: "设定" },
            ],
            tableRows: cameraRows,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            previewMediaUrl: media.url,
            previewMediaKind: media.kind,
            previewMediaTitle: media.title,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "专业机位测试图",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("专业机位节点已产出新结果");
        return;
      }

      if (
        selectedVideoWorkflowType === "camera-movement" ||
        selectedVideoWorkflowType === "motion-control"
      ) {
        const directive = buildWorkflowMovementDirective(
          selectedWorkflowPrompt
        );
        const basePrompt = buildWorkflowTextBlock([
          selectedWorkflowPrompt,
          directive.cameraMove,
          directive.motionCue,
          directive.rhythm,
          selectedVideoWorkflowType === "camera-movement"
            ? "强调镜头运动的电影感和空间推进。"
            : "强调动作连续性和主体运动控制。",
        ]);
        const mode = inferVideoGenerationModeFromMedia(imageMedia);

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary:
            selectedVideoWorkflowType === "camera-movement"
              ? "正在生成运镜测试片段..."
              : "正在生成动作控制片段...",
          metadata: {
            sourcePrompt: basePrompt,
            analysisHighlights: [
              directive.cameraMove,
              directive.motionCue,
              directive.rhythm,
            ],
            tableColumns: [
              { key: "field", label: "控制维度" },
              { key: "value", label: "说明" },
            ],
            tableRows: [
              { field: "镜头运动", value: directive.cameraMove },
              { field: "主体动作", value: directive.motionCue },
              { field: "节奏", value: directive.rhythm },
            ],
            videoGenerationMode: mode,
            lastExecutedAt: nowIso,
          },
        });

        const result = await videoGenerationService.generateVideo({
          prompt: basePrompt,
          mode,
          images: imageMedia.map((item) => item.url).slice(0, 4),
          ratio: guessVideoRatio(primaryImage?.nodeId || nodeId),
          duration: 5,
          cameraFixed: directive.cameraFixed,
          returnLastFrame: false,
        });
        const videoUrl = String(result.data?.url || "").trim();
        if (!result.success || !videoUrl) {
          throw new Error(
            result.error ||
              (selectedVideoWorkflowType === "camera-movement"
                ? "运镜测试失败"
                : "动作控制失败")
          );
        }

        const media: WorkflowMediaReference = {
          nodeId,
          kind: "video",
          url: videoUrl,
          title:
            selectedVideoWorkflowType === "camera-movement"
              ? "运镜测试-结果"
              : "动作控制-结果",
          prompt: basePrompt,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            selectedVideoWorkflowType === "camera-movement"
              ? "已生成一段运镜测试片段。"
              : "已生成一段动作控制片段。",
          metadata: {
            sourcePrompt: basePrompt,
            analysisHighlights: [
              directive.cameraMove,
              directive.motionCue,
              directive.rhythm,
            ],
            tableColumns: [
              { key: "field", label: "控制维度" },
              { key: "value", label: "说明" },
            ],
            tableRows: [
              { field: "镜头运动", value: directive.cameraMove },
              { field: "主体动作", value: directive.motionCue },
              { field: "节奏", value: directive.rhythm },
            ],
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            resultPosterUrl: String(
              (result.data?.metadata as Record<string, any> | undefined)
                ?.lastFrameUrl ||
                (result.data?.metadata as Record<string, any> | undefined)
                  ?.coverUrl ||
                ""
            ).trim(),
            videoGenerationMode: result.data?.mode || mode,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "控制片段",
          prompt: basePrompt,
        });
        syncDirectPreviewNodes(nodeId, media, basePrompt);
        toast.success(
          selectedVideoWorkflowType === "camera-movement"
            ? "运镜测试节点已产出新结果"
            : "动作控制节点已产出新结果"
        );
        return;
      }

      if (selectedVideoWorkflowType === "canvas-node") {
        const boardState = buildWorkflowCanvasBoardState(
          selectedWorkflowMedia,
          selectedWorkflowPrompt
        );
        if (boardState.compareItems.length === 0) {
          throw new Error("请先接入图片、视频或结果节点，再整理画板。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: boardState.summary,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            compareItems: boardState.compareItems,
            tableColumns: boardState.columns,
            tableRows: boardState.rows,
            analysisHighlights: boardState.highlights,
            previewMediaUrl: boardState.compareItems[0]?.url || "",
            previewMediaKind: boardState.compareItems[0]?.kind || "image",
            previewMediaTitle: boardState.compareItems[0]?.title || "画板主图",
            lastExecutedAt: nowIso,
          },
        });
        toast.success("已整理画板节点");
        return;
      }

      if (selectedVideoWorkflowType === "doodle-canvas") {
        const doodleState = buildWorkflowDoodleInstructions(
          selectedWorkflowPrompt
        );
        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: doodleState.summary,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            analysisHighlights: doodleState.highlights,
            tableColumns: doodleState.columns,
            tableRows: doodleState.rows,
            previewMediaUrl: primaryImage?.url || "",
            previewMediaKind: primaryImage?.kind || "image",
            previewMediaTitle: primaryImage?.title || "涂鸦参考",
            lastExecutedAt: nowIso,
          },
        });
        toast.success("已整理涂鸦画板指令");
        return;
      }

      if (selectedVideoWorkflowType === "gen-music") {
        const musicPlan = buildWorkflowMusicPlan(
          selectedWorkflowPrompt,
          selectedWorkflowStoryboardShots.map((shot) => ({
            title: shot.title,
            description: shot.description,
          }))
        );

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: musicPlan.summary,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            analysisHighlights: musicPlan.highlights,
            tableColumns: musicPlan.columns,
            tableRows: musicPlan.rows,
            deliverables: ["配乐 cue sheet", "情绪与配器建议", "段落节奏建议"],
            lastExecutedAt: nowIso,
          },
        });
        toast.success("已整理一版配乐方案");
        return;
      }

      if (
        selectedVideoWorkflowType === "rh-app" ||
        selectedVideoWorkflowType === "rh-comfy"
      ) {
        const handoffPlan = buildWorkflowHandoffPlan(
          selectedVideoWorkflowType,
          {
            promptText: selectedWorkflowPrompt,
            shots: selectedWorkflowStoryboardShots.map((shot) => ({
              title: shot.title,
              description: shot.description,
            })),
            structuredData: selectedWorkflowStructuredData,
            media: selectedWorkflowMedia,
          }
        );

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: handoffPlan.summary,
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            analysisHighlights: handoffPlan.highlights,
            deliverables: handoffPlan.deliverables,
            tableColumns: handoffPlan.columns,
            tableRows: handoffPlan.rows,
            lastExecutedAt: nowIso,
          },
        });
        toast.success(
          selectedVideoWorkflowType === "rh-comfy"
            ? "已整理 Comfy 工作流包"
            : "已整理 RH 应用包"
        );
        return;
      }

      if (
        selectedVideoWorkflowType === "gen-image" ||
        selectedVideoWorkflowType === "generate-character-image" ||
        selectedVideoWorkflowType === "generate-scene-image"
      ) {
        const promptText =
          selectedVideoWorkflowType === "generate-character-image"
            ? resolvePreferredCharacterPrompt(
                selectedWorkflowPrompt,
                selectedWorkflowStructuredData
              ) || "根据角色资产生成一张适合后续视频工作流使用的角色关键帧。"
            : selectedVideoWorkflowType === "generate-scene-image"
              ? resolvePreferredScenePrompt(
                  selectedWorkflowPrompt,
                  selectedWorkflowStructuredData
                ) || "根据场景资产生成一张适合后续视频工作流使用的环境关键帧。"
              : selectedWorkflowPrompt.trim() ||
                "基于上游脚本与素材生成一张适合视频工作流继续推进的关键帧。";

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary:
            selectedVideoWorkflowType === "generate-character-image"
              ? "正在生成角色关键帧..."
              : selectedVideoWorkflowType === "generate-scene-image"
                ? "正在生成场景关键帧..."
                : "正在生成关键帧...",
          metadata: {
            sourcePrompt: promptText,
            lastExecutedAt: nowIso,
          },
        });

        const result = await imageGenerationService.generateImage({
          prompt: promptText,
          referenceImage: primaryImage?.url,
          aspectRatio: guessCanvasAspectRatio(primaryImage?.nodeId),
          imageSize,
          imageCount: 1,
        });

        const imageUrl =
          result.data?.images?.[0]?.originalUrl ||
          result.data?.images?.[0]?.thumbnailUrl ||
          "";
        if (!result.success || !imageUrl) {
          throw new Error(result.error || "图片生成失败");
        }

        const media: WorkflowMediaReference = {
          nodeId,
          kind: "image",
          url: imageUrl,
          title: `${promptText.slice(0, 18) || "关键帧"}-结果图`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            selectedVideoWorkflowType === "generate-character-image"
              ? "已根据角色资产生成关键帧。"
              : selectedVideoWorkflowType === "generate-scene-image"
                ? "已根据场景资产生成关键帧。"
                : primaryImage
                  ? "已根据上游脚本和参考图生成关键帧。"
                  : "已根据上游脚本生成关键帧。",
          metadata: {
            sourcePrompt: promptText,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "生成图片",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("图片节点已产出新结果");
        return;
      }

      if (
        selectedVideoWorkflowType === "gen-video" ||
        selectedVideoWorkflowType === "generate-character-video" ||
        selectedVideoWorkflowType === "generate-scene-video"
      ) {
        const promptText =
          selectedVideoWorkflowType === "generate-character-video"
            ? resolvePreferredCharacterPrompt(
                selectedWorkflowPrompt,
                selectedWorkflowStructuredData
              ) || "根据角色资产生成一段镜头感明确、动作自然的角色视频片段。"
            : selectedVideoWorkflowType === "generate-scene-video"
              ? resolvePreferredScenePrompt(
                  selectedWorkflowPrompt,
                  selectedWorkflowStructuredData
                ) ||
                "根据场景资产生成一段环境氛围明确、转场自然的场景视频片段。"
              : selectedWorkflowPrompt.trim() ||
                "基于上游脚本与参考图生成一段镜头感明确、动作自然的视频片段。";
        const mode = inferVideoGenerationModeFromMedia(imageMedia);

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary:
            selectedVideoWorkflowType === "generate-character-video"
              ? "正在生成角色视频片段..."
              : selectedVideoWorkflowType === "generate-scene-video"
                ? "正在生成场景视频片段..."
                : "正在生成视频片段...",
          metadata: {
            sourcePrompt: promptText,
            lastExecutedAt: nowIso,
            videoGenerationMode: mode,
          },
        });

        const result = await videoGenerationService.generateVideo({
          prompt: promptText,
          mode,
          images: imageMedia.map((item) => item.url).slice(0, 4),
          ratio: guessVideoRatio(primaryImage?.nodeId || nodeId),
          duration: 5,
          returnLastFrame: false,
        });

        const videoUrl = String(result.data?.url || "").trim();
        if (!result.success || !videoUrl) {
          throw new Error(result.error || "视频生成失败");
        }

        const media: WorkflowMediaReference = {
          nodeId,
          kind: "video",
          url: videoUrl,
          title: `${promptText.slice(0, 18) || "视频"}-结果`,
          prompt: promptText,
          source: "workflow-result",
        };

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            selectedVideoWorkflowType === "generate-character-video"
              ? "已根据角色资产生成角色视频。"
              : selectedVideoWorkflowType === "generate-scene-video"
                ? "已根据场景资产生成场景视频。"
                : mode === "text-to-video"
                  ? "已根据上游脚本生成视频。"
                  : "已结合上游参考图生成视频。",
          metadata: {
            sourcePrompt: promptText,
            resultMediaUrl: media.url,
            resultMediaKind: media.kind,
            resultMediaTitle: media.title,
            resultModel: result.data?.modelDisplayName || "",
            videoGenerationMode: result.data?.mode || mode,
            resultPosterUrl: String(
              (result.data?.metadata as Record<string, any> | undefined)
                ?.lastFrameUrl ||
                (result.data?.metadata as Record<string, any> | undefined)
                  ?.coverUrl ||
                ""
            ).trim(),
            lastExecutedAt: nowIso,
          },
        });
        createWorkflowOutputNode({
          sourceNodeId: nodeId,
          media,
          title: media.title || "生成视频",
          prompt: promptText,
        });
        syncDirectPreviewNodes(nodeId, media, promptText);
        toast.success("视频节点已产出新结果");
        return;
      }

      if (selectedVideoWorkflowType === "custom-agent") {
        if (
          !selectedWorkflowPrompt.trim() &&
          imageMedia.length === 0 &&
          videoMedia.length === 0
        ) {
          throw new Error("请先给自定义代理节点提供脚本、参考图或视频上下文。");
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在生成代理执行计划...",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            lastExecutedAt: nowIso,
          },
        });

        const result = await workflowAnalysisService.analyze({
          mode: "agent-plan",
          prompt: selectedWorkflowPrompt,
          imageUrls: imageMedia.map((item) => item.url).slice(0, 4),
          videoUrls: videoMedia.map((item) => item.url).slice(0, 4),
          nodeTitle: selectedVideoWorkflowData?.title || "自定义代理",
        });
        if (!result.success) {
          throw new Error(result.error || "代理计划生成失败");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary:
            result.data?.summary ||
            "已生成一版代理执行计划，可据此继续组织节点和连接关系。",
          metadata: {
            sourcePrompt: selectedWorkflowPrompt,
            agentPlan: result.data?.agentPlan || [],
            deliverables: result.data?.deliverables || [],
            recommendedNodes: result.data?.recommendedNodes || [],
            analysisModel: result.data?.model || "",
            lastExecutedAt: nowIso,
          },
        });
        toast.success("自定义代理节点已生成计划");
        return;
      }

      if (selectedVideoWorkflowType === "preview") {
        const fallbackPreviewMedia = (() => {
          const metadata =
            ((selectedVideoWorkflowData?.metadata || {}) as Record<
              string,
              any
            >) || {};
          const syncedAsset = Array.isArray(metadata.syncedAgentAssets)
            ? (metadata.syncedAgentAssets as Array<Record<string, any>>)[0] ||
              null
            : null;
          const previewUrl = String(
            metadata.previewMediaUrl || syncedAsset?.url || ""
          ).trim();
          if (!/^https?:\/\//i.test(previewUrl)) {
            return null;
          }
          return {
            nodeId,
            kind: "image" as const,
            url: previewUrl,
            title: String(
              metadata.previewMediaTitle || syncedAsset?.title || "预览结果"
            ).trim(),
            prompt:
              selectedWorkflowPrompt ||
              String(metadata.sourcePrompt || "").trim(),
            source: "workflow-preview" as const,
          };
        })();
        const previewMedia =
          getBestWorkflowPreviewMedia(nodeId, workflowGraph) ||
          fallbackPreviewMedia;
        if (!previewMedia) {
          throw new Error("预览节点上游还没有可预览的图片或视频。");
        }

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已刷新${previewMedia.kind === "video" ? "视频" : "图片"}预览，可继续检查结果。`,
          metadata: {
            previewMediaUrl: previewMedia.url,
            previewMediaKind: previewMedia.kind,
            previewMediaTitle: previewMedia.title || "",
            sourcePrompt: selectedWorkflowPrompt || previewMedia.prompt || "",
            lastExecutedAt: nowIso,
          },
        });
        toast.success("预览节点已刷新");
        return;
      }

      if (selectedVideoWorkflowType === "local-save") {
        const syncedAgentAssets: WorkflowMediaReference[] = Array.isArray(
          ((selectedVideoWorkflowData?.metadata || {}) as Record<string, any>)
            ?.syncedAgentAssets
        )
          ? (
              ((
                (selectedVideoWorkflowData?.metadata || {}) as Record<
                  string,
                  any
                >
              ).syncedAgentAssets || []) as Array<Record<string, any>>
            ).reduce<WorkflowMediaReference[]>((assets, item, index) => {
              const url = String(item?.url || "").trim();
              if (!/^https?:\/\//i.test(url)) {
                return assets;
              }
              assets.push({
                nodeId,
                kind: "image",
                url,
                title: String(item?.title || `Agent 结果 ${index + 1}`).trim(),
                prompt: selectedWorkflowPrompt,
                source: "workflow-result",
              });
              return assets;
            }, [])
          : [];
        const assetsToDownload =
          syncedAgentAssets.length > 0
            ? syncedAgentAssets
            : selectedWorkflowMedia.slice(0, 24);

        if (assetsToDownload.length === 0) {
          throw new Error("保存节点上游还没有可下载的图片或视频。");
        }

        patchWorkflowNode(nodeId, {
          status: "generating",
          summary: "正在整理下载包...",
          metadata: {
            lastExecutedAt: nowIso,
          },
        });

        downloadWorkflowAssets(
          assetsToDownload.slice(0, 24),
          "video-workflow-export"
        );

        patchWorkflowNode(nodeId, {
          status: "completed",
          summary: `已发起下载 ${Math.min(assetsToDownload.length, 24)} 个上游结果。`,
          metadata: {
            lastExecutedAt: nowIso,
            lastSavedAt: nowIso,
            savedAssetCount: Math.min(assetsToDownload.length, 24),
          },
        });
        toast.success("已开始下载上游结果");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "节点执行失败";
      patchWorkflowNode(nodeId, {
        status: "failed",
        summary: message,
        metadata: {
          lastExecutedAt: nowIso,
          lastError: message,
        },
      });
      toast.error(message);
    } finally {
      setActiveWorkflowExecutionTaskKey((current) =>
        current === taskKey ? null : current
      );
    }
  }, [
    buildCharacterAssets,
    buildCharacterDescriptionSummary,
    buildStoryboardChartRows,
    buildWorkflowCanvasBoardState,
    buildWorkflowCameraPreset,
    buildWorkflowCompareItems,
    buildWorkflowDefaultCropRect,
    buildWorkflowDoodleInstructions,
    buildWorkflowHandoffPlan,
    buildWorkflowMovementDirective,
    buildWorkflowMusicPlan,
    buildWorkflowTableState,
    buildSceneAssets,
    buildSceneDescriptionSummary,
    buildStoryboardShots,
    buildWorkflowTextBlock,
    createWorkflowOutputNode,
    downloadWorkflowAssets,
    guessCanvasAspectRatio,
    guessVideoRatio,
    inferWorkflowExtendScales,
    imageGenerationService,
    patchWorkflowNode,
    resolvePreferredCharacterPrompt,
    resolvePreferredScenePrompt,
    imageSize,
    selectedVideoWorkflowData,
    selectedVideoWorkflowNode,
    selectedVideoWorkflowType,
    selectedWorkflowInputs.imageCount,
    selectedWorkflowInputs.videoCount,
    selectedWorkflowIsActionable,
    selectedWorkflowMedia,
    selectedWorkflowPrompt,
    selectedWorkflowStructuredData,
    syncDirectPreviewNodes,
    syncDirectStoryboardChartNodes,
    workflowAnalysisService,
    workflowGraph,
  ]);

  // 处理图片操作（通过事件分发到选中图片节点执行）
  const handleAction = (action: string) => {
    if (!selectedImageNode) {
      toast.error("请先选择一张图片");
      return;
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("canvas:image-action", {
          detail: {
            nodeId: selectedImageNode.id,
            action,
          },
        })
      );
    }
  };

  // AI 生成图片
  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("请输入提示词");
      return;
    }

    setGenerating(true);

    // 先创建占位节点（显示生成中状态）
    const placeholderNodeIds: string[] = [];
    for (let i = 0; i < imageCount; i++) {
      const nodeId = addNode({
        type: "image",
        position: {
          x: 100 + (i % 3) * 320,
          y: 100 + Math.floor(i / 3) * 320,
        },
        size: { width: 300, height: 300 },
        data: {
          src: "",
          status: "generating",
          title: prompt.slice(0, 24) || "生成中",
          prompt,
        },
        connections: [],
      });
      placeholderNodeIds.push(nodeId);
    }

    try {
      // 调用 AI 图片生成 API
      const result = await imageGenerationService.generateImage({
        prompt,
        negativePrompt,
        aspectRatio,
        imageSize,
        imageCount,
      });

      if (result.success && result.data?.images) {
        // 更新节点为生成的图片
        result.data.images.forEach((image, index) => {
          if (placeholderNodeIds[index]) {
            updateNode(placeholderNodeIds[index], {
              data: {
                src: image.originalUrl || image.thumbnailUrl,
                status: "completed",
                title: `${prompt.slice(0, 20) || "生成图片"}-${index + 1}`,
                prompt,
              },
            });
          }
        });

        toast.success(`成功生成 ${result.data.images.length} 张图片`);
        setPrompt(""); // 清空提示词
      } else {
        // 生成失败，更新节点状态
        placeholderNodeIds.forEach((nodeId) => {
          updateNode(nodeId, {
            data: {
              src: "",
              status: "failed",
              title: "生成失败",
              prompt,
            },
          });
        });
        toast.error(result.error || "图片生成失败");
      }
    } catch (error) {
      console.error("AI 图片生成失败:", error);
      // 生成失败，更新节点状态
      placeholderNodeIds.forEach((nodeId) => {
        updateNode(nodeId, {
          data: {
            src: "",
            status: "failed",
            title: "生成失败",
            prompt,
          },
        });
      });
      toast.error("图片生成失败，请重试");
    } finally {
      setGenerating(false);
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 如果正在输入则不触发快捷键（包括 input、textarea 和 contentEditable 元素）
      if (isCanvasTextEntryTarget(e.target)) {
        return;
      }

      // Ctrl/Cmd + S 保存
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      // Ctrl/Cmd + A：当已选中图片时，选中画布内全部图片
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        const { nodes: currentNodes, selectedNodeIds: currentSelectedNodeIds } =
          useCanvasStore.getState();
        const selectedHasImage = currentSelectedNodeIds.some((selectedId) =>
          currentNodes.some(
            (node) => node.id === selectedId && node.type === "image"
          )
        );
        if (selectedHasImage) {
          const allImageNodeIds = currentNodes
            .filter(
              (node) =>
                node.type === "image" && Boolean((node.data as any)?.src)
            )
            .map((node) => node.id);
          if (allImageNodeIds.length > 0) {
            e.preventDefault();
            selectNodes(allImageNodeIds);
          }
        }
      }
      // Ctrl/Cmd + Z 撤销
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      // Ctrl/Cmd + Shift + Z 重做
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      // V 选择工具
      if (e.key === "v" && !e.ctrlKey && !e.metaKey) {
        setTool("select");
      }
      // H 平移工具
      if (e.key === "h" && !e.ctrlKey && !e.metaKey) {
        setTool("pan");
      }
      // L 连线工具（仅视频画布）
      if (isVideoMode && e.key === "l" && !e.ctrlKey && !e.metaKey) {
        setTool("draw");
      }
      // Delete 删除选中
      if (e.key === "Delete" || e.key === "Backspace") {
        useCanvasStore.getState().deleteSelectedNodes();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleSave,
    isCanvasTextEntryTarget,
    isVideoMode,
    nodes,
    redo,
    selectNodes,
    selectedNodeIds,
    setTool,
    undo,
  ]);

  useEffect(() => {
    const isBrowserZoomShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return null;
      }

      const { code, key } = event;
      if (
        code === "Equal" ||
        code === "NumpadAdd" ||
        key === "+" ||
        key === "="
      ) {
        return "in";
      }
      if (
        code === "Minus" ||
        code === "NumpadSubtract" ||
        key === "-" ||
        key === "_"
      ) {
        return "out";
      }
      if (code === "Digit0" || code === "Numpad0" || key === "0") {
        return "reset";
      }

      return null;
    };

    const handleBrowserZoomKeyDown = (event: KeyboardEvent) => {
      const zoomAction = isBrowserZoomShortcut(event);
      if (!zoomAction) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      if (isCanvasTextEntryTarget(event.target)) {
        return;
      }

      if (zoomAction === "in") {
        applyCanvasViewportZoom(1.2);
        return;
      }

      if (zoomAction === "out") {
        applyCanvasViewportZoom(1 / 1.2);
        return;
      }

      setViewport({ x: 0, y: 0, zoom: 1 });
    };

    const handleBrowserZoomWheel = (event: WheelEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }

      if (event.cancelable) {
        event.preventDefault();
      }

      if (isCanvasTextEntryTarget(event.target)) {
        return;
      }

      const workspaceElement = document.querySelector<HTMLElement>(
        '[data-canvas-workspace-root="true"]'
      );

      if (
        workspaceElement &&
        event.target instanceof Node &&
        workspaceElement.contains(event.target)
      ) {
        return;
      }

      applyCanvasViewportZoom(event.deltaY > 0 ? 0.95 : 1.05, {
        clientX: event.clientX,
        clientY: event.clientY,
      });
    };

    const handleGestureStart = (event: Event) => {
      safariGestureScaleRef.current = 1;
      event.preventDefault();
    };

    const handleGestureChange = (event: Event) => {
      event.preventDefault();

      const gestureEvent = event as Event & {
        scale?: number;
        clientX?: number;
        clientY?: number;
        target?: EventTarget | null;
      };

      if (isCanvasTextEntryTarget(gestureEvent.target ?? null)) {
        return;
      }

      const currentScale =
        typeof gestureEvent.scale === "number" &&
        Number.isFinite(gestureEvent.scale) &&
        gestureEvent.scale > 0
          ? gestureEvent.scale
          : 1;

      const zoomFactor = currentScale / safariGestureScaleRef.current;
      safariGestureScaleRef.current = currentScale;

      if (!Number.isFinite(zoomFactor) || zoomFactor <= 0 || zoomFactor === 1) {
        return;
      }

      applyCanvasViewportZoom(zoomFactor, {
        clientX: gestureEvent.clientX,
        clientY: gestureEvent.clientY,
      });
    };

    const handleGestureEnd = () => {
      safariGestureScaleRef.current = 1;
    };

    window.addEventListener("keydown", handleBrowserZoomKeyDown, {
      capture: true,
    });
    window.addEventListener("wheel", handleBrowserZoomWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("gesturestart", handleGestureStart, {
      passive: false,
    });
    window.addEventListener("gesturechange", handleGestureChange, {
      passive: false,
    });
    window.addEventListener("gestureend", handleGestureEnd);

    return () => {
      window.removeEventListener("keydown", handleBrowserZoomKeyDown, {
        capture: true,
      });
      window.removeEventListener("wheel", handleBrowserZoomWheel, {
        capture: true,
      });
      window.removeEventListener("gesturestart", handleGestureStart);
      window.removeEventListener("gesturechange", handleGestureChange);
      window.removeEventListener("gestureend", handleGestureEnd);
    };
  }, [applyCanvasViewportZoom, isCanvasTextEntryTarget, setViewport]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverscrollX = html.style.overscrollBehaviorX;
    const prevBodyOverscrollX = body.style.overscrollBehaviorX;

    html.style.overscrollBehaviorX = "none";
    body.style.overscrollBehaviorX = "none";

    const preventHistorySwipe = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY)) return;
      if (event.cancelable) {
        event.preventDefault();
      }
    };

    window.addEventListener("wheel", preventHistorySwipe, { passive: false });

    return () => {
      window.removeEventListener("wheel", preventHistorySwipe);
      html.style.overscrollBehaviorX = prevHtmlOverscrollX;
      body.style.overscrollBehaviorX = prevBodyOverscrollX;
    };
  }, []);

  useEffect(() => {
    const currentSerialized = JSON.stringify(workflowSelections);
    const sanitizedSerialized = JSON.stringify(sanitizedWorkflowSelections);
    if (currentSerialized === sanitizedSerialized) {
      return;
    }

    workflowSelectionsRef.current = sanitizedWorkflowSelections;
    setWorkflowSelections(sanitizedWorkflowSelections);
  }, [sanitizedWorkflowSelections, workflowSelections]);

  const [workflowContext, setWorkflowContext] =
    useState<AgentWorkflowComposerContext | null>(null);
  useEffect(() => {
    let canceled = false;
    const cancelIdleTask = scheduleCanvasIdleTask(() => {
      const nextWorkflowContext = buildAgentWorkflowComposerContext({
        config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
        inputs: workflowInputs,
        materials: workflowMaterials,
        selectedBrandModel,
        appearanceRecognitionEnabled,
        selections: deferredSanitizedWorkflowSelections,
      });

      if (canceled) {
        return;
      }

      startTransition(() => {
        setWorkflowContext(nextWorkflowContext);
      });
    }, 450);

    return () => {
      canceled = true;
      cancelIdleTask();
    };
  }, [
    appearanceRecognitionEnabled,
    deferredSanitizedWorkflowSelections,
    resolvedWorkflowUiConfig,
    selectedBrandModel,
    workflowInputs,
    workflowMaterials,
  ]);
  useEffect(() => {
    workflowInputsRef.current = workflowInputs;
  }, [workflowInputs]);
  useEffect(() => {
    workflowMaterialsRef.current = workflowMaterials;
  }, [workflowMaterials]);
  useEffect(() => {
    workflowSelectionsRef.current = sanitizedWorkflowSelections;
  }, [sanitizedWorkflowSelections]);
  useEffect(() => {
    appearanceRecognitionEnabledRef.current = appearanceRecognitionEnabled;
  }, [appearanceRecognitionEnabled]);
  useEffect(() => {
    selectedBrandModelRef.current = selectedBrandModel;
  }, [selectedBrandModel]);
  const handleWorkflowInputsChange = useCallback(
    (next: AgentWorkflowInputs) => {
      workflowInputsRef.current = next;
      patchPersistedAgentWorkflowState({ inputs: next });
      setWorkflowInputs(next);
    },
    [patchPersistedAgentWorkflowState]
  );
  const handleWorkflowMaterialsChange = useCallback(
    (next: AgentWorkflowMaterialSelections) => {
      const nextMaterials = appearanceRecognitionEnabledRef.current
        ? next
        : clearAppearanceSummaryFromMaterials(next);
      workflowMaterialsRef.current = nextMaterials;
      patchPersistedAgentWorkflowState({ materials: nextMaterials });
      setWorkflowMaterials(nextMaterials);
    },
    [patchPersistedAgentWorkflowState]
  );
  const handleAppearanceRecognitionEnabledChange = useCallback(
    (next: boolean) => {
      appearanceRecognitionEnabledRef.current = next;
      setAppearanceRecognitionEnabled(next);

      if (!next) {
        const clearedMaterials = clearAppearanceSummaryFromMaterials(
          workflowMaterialsRef.current
        );
        workflowMaterialsRef.current = clearedMaterials;
        patchPersistedAgentWorkflowState({
          appearanceRecognitionEnabled: next,
          materials: clearedMaterials,
        });
        setWorkflowMaterials(clearedMaterials);
      } else {
        patchPersistedAgentWorkflowState({
          appearanceRecognitionEnabled: next,
          materials: workflowMaterialsRef.current,
        });
      }
    },
    [patchPersistedAgentWorkflowState]
  );
  const handleWorkflowSelectionsChange = useCallback(
    (next: Partial<Record<AgentWorkflowStepKey, string>>) => {
      const normalizedCurrentSelections = sanitizeAgentWorkflowSelections({
        config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
        selections: workflowSelectionsRef.current,
      });
      const normalizedNextSelections = sanitizeAgentWorkflowSelections({
        config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
        selections: next,
      });

      const orderedStepKeys = flattenVisibleAgentWorkflowSteps(
        getEnabledAgentWorkflowStepTree(
          (resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig).steps
        ),
        normalizedCurrentSelections
      ).map(({ step }) => step.key);
      const earliestChangedIndex = orderedStepKeys.findIndex((stepKey) => {
        return (
          String(normalizedCurrentSelections[stepKey] || "") !==
          String(normalizedNextSelections[stepKey] || "")
        );
      });
      const changedStepKeys = new Set(
        orderedStepKeys.filter(
          (stepKey) =>
            String(normalizedCurrentSelections[stepKey] || "") !==
            String(normalizedNextSelections[stepKey] || "")
        )
      );

      let clearedSelections = { ...normalizedNextSelections };
      if (earliestChangedIndex >= 0) {
        orderedStepKeys.slice(earliestChangedIndex + 1).forEach((stepKey) => {
          if (!changedStepKeys.has(stepKey)) {
            delete clearedSelections[stepKey];
          }
        });
      }

      clearedSelections = sanitizeAgentWorkflowSelections({
        config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
        selections: clearedSelections,
      });

      workflowSelectionsRef.current = clearedSelections;
      patchPersistedAgentWorkflowState({ selections: clearedSelections });
      startTransition(() => {
        setWorkflowSelections(clearedSelections);
      });
    },
    [patchPersistedAgentWorkflowState, resolvedWorkflowUiConfig]
  );
  const handleSelectedBrandModelChange = useCallback(
    (next: AgentWorkflowSelectedBrandModel | null) => {
      selectedBrandModelRef.current = next;
      patchPersistedAgentWorkflowState({ selectedBrandModel: next });
      setSelectedBrandModel(next);
    },
    [patchPersistedAgentWorkflowState]
  );
  const getLatestWorkflowContext = useCallback(() => {
    return buildAgentWorkflowComposerContext({
      config: resolvedWorkflowUiConfig || defaultAgentWorkflowUiConfig,
      inputs: workflowInputsRef.current,
      materials: workflowMaterialsRef.current,
      selectedBrandModel: selectedBrandModelRef.current,
      appearanceRecognitionEnabled: appearanceRecognitionEnabledRef.current,
      selections: workflowSelectionsRef.current,
    });
  }, [resolvedWorkflowUiConfig]);
  const effectiveSelectedAgentPresetId = null;
  const { data: selectedAgentPresetResponse } = useSWR<{
    success?: boolean;
    data?: AgentPreset;
  }>(
    effectiveSelectedAgentPresetId
      ? `/api/agents/${effectiveSelectedAgentPresetId}`
      : null,
    fetcher
  );
  const selectedAgentPresetData = useMemo(
    () =>
      selectedAgentPresetResponse?.success && selectedAgentPresetResponse.data
        ? selectedAgentPresetResponse.data
        : null,
    [selectedAgentPresetResponse]
  );
  const selectedAgentPresetModeConfig = useMemo(
    () =>
      normalizeAgentPresetModeConfig(selectedAgentPresetData?.defaultParams),
    [selectedAgentPresetData?.defaultParams]
  );
  const materialProductSelectionLimit = useMemo(() => {
    if (selectedAgentPresetData?.type !== "image") {
      return null;
    }
    if (selectedAgentPresetModeConfig.modeType === "scene_generation") {
      return selectedAgentPresetModeConfig.scene.productImageSlotCount;
    }
    if (selectedAgentPresetModeConfig.modeType === "detail_replacement") {
      return selectedAgentPresetModeConfig.detail.productImageSlotCount;
    }
    if (selectedAgentPresetModeConfig.modeType === "sku_replacement") {
      return selectedAgentPresetModeConfig.sku.productImageSlotCount;
    }
    return 2;
  }, [selectedAgentPresetData?.type, selectedAgentPresetModeConfig]);
  const materialModelImageRequirement = useMemo(() => {
    if (selectedAgentPresetData?.type !== "image") {
      return 0;
    }
    if (selectedAgentPresetModeConfig.modeType === "scene_generation") {
      return selectedAgentPresetModeConfig.scene.includeModelSlot ? 1 : 0;
    }
    if (selectedAgentPresetModeConfig.modeType === "detail_replacement") {
      return selectedAgentPresetModeConfig.detail.includeModelSlot ? 1 : 0;
    }
    if (selectedAgentPresetModeConfig.modeType === "sku_replacement") {
      return selectedAgentPresetModeConfig.sku.includeModelSlot ? 1 : 0;
    }
    return 1;
  }, [selectedAgentPresetData?.type, selectedAgentPresetModeConfig]);
  const materialTotalUploadRequirement = useMemo(() => {
    if (selectedAgentPresetData?.type !== "image") {
      return null;
    }
    const explicitCount = Number(selectedAgentPresetData.requiredUploadCount);
    if (Number.isFinite(explicitCount) && explicitCount > 0) {
      return Math.max(
        materialProductSelectionLimit || 0,
        Math.max(1, Math.round(explicitCount))
      );
    }
    return (materialProductSelectionLimit || 0) + materialModelImageRequirement;
  }, [
    materialModelImageRequirement,
    materialProductSelectionLimit,
    selectedAgentPresetData?.requiredUploadCount,
    selectedAgentPresetData?.type,
  ]);
  const resolvedAgentProjectTitle = hasActiveAgentProject
    ? String(agentProjectTitle || "").trim() || "未命名生图项目"
    : "未选择项目";

  const canvasTopBarLogo = resolveDefaultSiteLogo(
    siteSettingsData?.siteLogo || siteSettingsData?.siteLogoDark
  );
  const canvasTopBarLogoAlt = siteSettingsData?.siteName || "返回首页";
  const canvasUser = canvasAuthSession?.user ?? null;
  const canvasUserName = String(
    canvasUser?.name || canvasUser?.email || "用户"
  ).trim();
  const canvasUserEmail = String(canvasUser?.email || "").trim();
  const canvasUserInitials = (canvasUserName || "U").slice(0, 2).toUpperCase();
  const topBarTitle = projectTitle || defaultCanvasTitle;
  const brandEntry = isVideoMode ? (
    <div
      className="absolute top-4 left-4 z-20 rounded-full px-1 py-1 shadow-none"
      style={{ backgroundColor: canvasSurfaceBackground }}
    >
      <Button
        className="h-9 gap-2 rounded-full border-0 bg-transparent px-2.5 shadow-none hover:bg-transparent hover:text-foreground"
        onClick={goHome}
        variant="ghost"
      >
        <img
          alt={canvasTopBarLogoAlt}
          className={cn(
            "h-7 w-7 object-contain",
            shouldInvertDefaultLogoForTheme(
              canvasTopBarLogo,
              resolvedTheme === "dark" ? "dark" : "light"
            ) && "brightness-0"
          )}
          draggable={false}
          src={canvasTopBarLogo}
        />
        <span className="max-w-[180px] truncate font-semibold text-base text-foreground">
          {siteSettingsData?.siteName || "返回首页"}
        </span>
      </Button>
    </div>
  ) : (
    <div className="absolute inset-x-0 top-0 z-40 flex h-[49px] items-center justify-between border-[#e6e8eb] border-b bg-white px-2 text-[#0f1419] dark:border-white/[0.08] dark:bg-[#050607] dark:text-white">
      <div className="flex min-w-0 items-center gap-1">
        <Button
          aria-label="返回首页"
          className="h-9 w-8 rounded-[8px] border-0 bg-transparent p-0 text-[#0f1419] shadow-none hover:bg-black/[0.04] hover:text-[#0f1419] dark:text-white dark:hover:bg-white/[0.08] dark:hover:text-white"
          onClick={goHome}
          size="icon"
          variant="ghost"
        >
          {canvasTopBarLogo ? (
            <img
              alt={canvasTopBarLogoAlt}
              className={cn(
                "h-5 w-5 object-contain",
                shouldInvertDefaultLogoForTheme(
                  canvasTopBarLogo,
                  isDarkCanvasTheme ? "dark" : "light"
                ) && "brightness-0"
              )}
              draggable={false}
              src={canvasTopBarLogo}
            />
          ) : (
            <Grid3X3 className="h-4 w-4" />
          )}
        </Button>
        {isEditingTitle ? (
          <form
            className="min-w-0"
            onSubmit={(event) => {
              event.preventDefault();
              void handleUpdateTitle();
            }}
          >
            <input
              autoFocus
              className="h-8 w-[min(320px,calc(100vw-680px))] min-w-[180px] rounded-[8px] border border-black/[0.08] bg-black/[0.03] px-2 text-[14px] font-medium text-[#0f1419] outline-none transition-colors placeholder:text-[#72808a] focus:border-black/[0.16] focus:bg-white dark:border-white/[0.12] dark:bg-white/[0.06] dark:text-white dark:placeholder:text-white/42 dark:focus:border-white/[0.24] dark:focus:bg-white/[0.08]"
              onBlur={() => {
                void handleUpdateTitle();
              }}
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setIsEditingTitle(false);
                  setEditTitle(topBarTitle);
                }
              }}
              value={editTitle}
            />
          </form>
        ) : (
          <button
            className="flex h-9 min-w-0 max-w-[260px] items-center gap-1 rounded-[8px] px-2 text-left text-[14px] font-medium text-[#0f1419] hover:bg-black/[0.04] dark:text-white dark:hover:bg-white/[0.08]"
            onClick={() => {
              setEditTitle(topBarTitle);
              setIsEditingTitle(true);
            }}
            title={topBarTitle}
            type="button"
          >
            <span className="truncate">{topBarTitle}</span>
            <ChevronDown className="h-4 w-4 shrink-0 text-[#536471] dark:text-white/60" />
          </button>
        )}
        <Button
          aria-label="保存画布"
          className="h-9 w-9 rounded-[8px] border-0 bg-transparent p-0 text-[#72808a] shadow-none hover:bg-black/[0.04] hover:text-[#0f1419] dark:text-white/58 dark:hover:bg-white/[0.08] dark:hover:text-white"
          disabled={isSaving}
          onClick={handleSave}
          size="icon"
          type="button"
          variant="ghost"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
        </Button>
      </div>
      <div className="flex items-center gap-1.5 pr-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="用户菜单"
              className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-black/[0.08] bg-[#f1f3f5] text-[11px] font-semibold text-[#171b20] transition-colors hover:bg-[#e9ecef] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/45 dark:border-white/[0.12] dark:bg-white/[0.10] dark:text-white dark:hover:bg-white/[0.16]"
              title={canvasUserName}
              type="button"
            >
              {canvasUser?.image ? (
                <img
                  alt={canvasUserName}
                  className="h-full w-full object-cover"
                  draggable={false}
                  src={canvasUser.image}
                />
              ) : (
                canvasUserInitials
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 rounded-[18px] border border-black/[0.08] bg-white p-2 text-[#171b20] shadow-[0_18px_42px_rgba(15,23,42,0.14)] dark:border-white/[0.10] dark:bg-[#121416] dark:text-white dark:shadow-[0_18px_48px_rgba(0,0,0,0.38)]"
          >
            <div className="px-2.5 py-2">
              <div className="truncate text-[13px] font-semibold">
                {canvasUserName}
              </div>
              {canvasUserEmail ? (
                <div className="mt-0.5 truncate text-[11px] text-[#7b8493] dark:text-white/50">
                  {canvasUserEmail}
                </div>
              ) : null}
            </div>
            <DropdownMenuSeparator className="bg-black/[0.06] dark:bg-white/[0.10]" />
            <DropdownMenuItem
              className="cursor-pointer rounded-[12px] text-[13px] focus:bg-black/[0.05] dark:focus:bg-white/[0.08]"
              onSelect={(event) => {
                event.preventDefault();
                toast.info("会员中心后续会接入到账户菜单");
              }}
            >
              会员中心
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer rounded-[12px] text-[13px] focus:bg-black/[0.05] dark:focus:bg-white/[0.08]"
              onSelect={(event) => {
                event.preventDefault();
                redirectToLogin();
              }}
            >
              切换账号
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

  const agentDisabledNotice =
    requestedAgentMode && !isAgentWorkspaceEnabled ? (
      <div className="-translate-x-1/2 absolute top-4 left-1/2 z-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-amber-800 text-sm shadow-sm dark:border-amber-900/60 dark:bg-amber-950/80 dark:text-amber-200">
          <AlertCircle className="h-4 w-4" />
          <span>Agent 功能未开启，请联系管理员在系统设置中开启。</span>
        </div>
      </div>
    ) : null;

  const agentProjectNavSlot = isAgentMode ? (
    <div className="flex items-center gap-2">
      {canSyncAgentResultsToCanvas ? (
        <Button
          className="h-9 gap-2 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
          disabled={
            isAgentProjectLoading ||
            isAgentProjectSaving ||
            isSyncingAgentResultsToCanvas
          }
          onClick={() => {
            void handleSyncAgentResultsToCanvas();
          }}
          type="button"
          variant="outline"
        >
          {isSyncingAgentResultsToCanvas ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <GitBranch className="h-4 w-4" />
          )}
          {pendingAgentCanvasImportCount > 0
            ? `回流到视频画布 (${pendingAgentCanvasImportCount})`
            : "返回视频画布"}
        </Button>
      ) : null}

      <div className="hidden h-9 min-w-0 max-w-[180px] items-center gap-2 rounded-[12px] border border-white/10 bg-white/[0.03] px-2.5 sm:flex">
        {isAgentProjectLoading || isAgentProjectSaving ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-emerald-300" />
        ) : (
          <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
        )}
        <span
          className="truncate font-medium text-[13px] text-white"
          title={resolvedAgentProjectTitle}
        >
          {resolvedAgentProjectTitle}
        </span>
      </div>

      <DropdownMenu
        onOpenChange={setIsAgentProjectMenuOpen}
        open={isAgentProjectMenuOpen}
      >
        <DropdownMenuTrigger asChild>
          <Button
            className="h-9 gap-2 border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.08] hover:text-white"
            disabled={isAgentProjectLoading}
            type="button"
            variant="outline"
          >
            {isAgentProjectSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FolderOpen className="h-4 w-4" />
            )}
            项目操作
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-48 border-white/10 bg-[#0b0d0f] text-white"
        >
          <DropdownMenuItem
            className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
            disabled={isAgentProjectLoading || isAgentProjectSaving}
            onSelect={(event) => {
              event.preventDefault();
              setIsAgentProjectMenuOpen(false);
              void handleCreateAgentProject();
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            新建项目
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
            disabled={isAgentProjectLoading || isAgentProjectSaving}
            onSelect={(event) => {
              event.preventDefault();
              setIsAgentProjectMenuOpen(false);
              void handleSaveAsAgentProject();
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            另存为新项目
          </DropdownMenuItem>
          <DropdownMenuItem
            className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
            disabled={
              !hasActiveAgentProject ||
              isAgentProjectLoading ||
              isAgentProjectSaving
            }
            onSelect={(event) => {
              event.preventDefault();
              setIsAgentProjectMenuOpen(false);
              void handleRenameCurrentAgentProject();
            }}
          >
            <Pencil className="mr-2 h-4 w-4" />
            重命名当前项目
          </DropdownMenuItem>
          <DropdownMenuSeparator className="bg-white/10" />
          <DropdownMenuItem
            className="cursor-pointer text-white focus:bg-white/10 focus:text-white"
            onSelect={(event) => {
              event.preventDefault();
              setIsAgentProjectMenuOpen(false);
              setIsAgentProjectSheetOpen(true);
            }}
          >
            <Grid3X3 className="mr-2 h-4 w-4" />
            项目列表
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isAgentProjectSheetOpen ? (
        <AgentProjectListSheet
          currentProjectId={agentProjectId || null}
          onCreateProject={handleCreateAgentProject}
          onDeleteProject={handleDeleteAgentProject}
          onOpenChange={setIsAgentProjectSheetOpen}
          onRenameProject={handleRenameAgentProject}
          onSelectProject={handleSelectAgentProject}
          open={isAgentProjectSheetOpen}
        />
      ) : null}
    </div>
  ) : null;

  const loginDialogElement = (
    <Dialog onOpenChange={setIsLoginDialogOpen} open={isLoginDialogOpen}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>登录已失效</DialogTitle>
          <DialogDescription>{loginDialogMessage}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            onClick={() => {
              void checkCanvasAuthSession();
            }}
            type="button"
            variant="outline"
          >
            刷新状态
          </Button>
          <Button onClick={redirectToLogin} type="button">
            去登录
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
  const projectLoadingBadge = isLoading ? (
    <div
      aria-label="正在同步项目数据"
      className="pointer-events-none fixed top-[18px] right-[82px] z-[90] inline-flex h-6 w-6 items-center justify-center text-[#8a94a3] dark:text-white/58"
      title="正在同步项目数据"
    >
      <Loader2 className="h-[18px] w-[18px] animate-spin" />
      <span className="sr-only">正在同步项目数据</span>
    </div>
  ) : null;

  const agentProjectSelectionScreen =
    isAgentMode && !hasActiveAgentProject ? (
      <div className="min-h-screen bg-[#050607] text-white">
        <AgentCanvasTopNavDark
          activeKey="agent"
          rightSlot={agentProjectNavSlot}
          siteLogo={siteSettingsData?.siteLogo}
          siteLogoDark={siteSettingsData?.siteLogoDark}
          siteName={siteSettingsData?.siteName}
        />
        <main className="flex min-h-screen items-center justify-center px-6 pt-24 pb-8">
          <div className="w-full max-w-[860px] rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.02)_100%)] p-8 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-10">
            <div className="mx-auto max-w-[620px] text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-emerald-400/20 bg-emerald-500/[0.10] text-emerald-200">
                <FolderOpen className="h-8 w-8" />
              </div>
              <h1 className="mt-6 font-semibold text-3xl text-white tracking-[0.02em] md:text-4xl">
                先选择一个生图项目
              </h1>
              <p className="mt-4 text-sm text-white/55 leading-7 md:text-base">
                打开历史项目可以继续沿用之前的生图结果、模式和工作流。只有在你明确点击新建项目时，系统才会创建一个全新的 Agent 项目。
              </p>
            </div>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <button
                className="rounded-[28px] border border-white/10 bg-black/30 p-5 text-left transition-colors hover:border-white/18 hover:bg-white/[0.04]"
                onClick={() => setIsAgentProjectSheetOpen(true)}
                type="button"
              >
                <div className="flex items-center gap-3 text-emerald-200">
                  <Grid3X3 className="h-5 w-5" />
                  <span className="font-medium text-sm">打开历史项目</span>
                </div>
                <div className="mt-3 text-sm text-white/55 leading-6">
                  从项目列表里继续昨天或今天的 Agent 项目，避免生成结果分散在多个空项目中。
                </div>
              </button>

              <button
                className="rounded-[28px] border border-emerald-400/20 bg-emerald-500/[0.10] p-5 text-left transition-colors hover:border-emerald-300/35 hover:bg-emerald-500/[0.16]"
                disabled={isAgentProjectSaving}
                onClick={() => {
                  void handleCreateAgentProject();
                }}
                type="button"
              >
                <div className="flex items-center gap-3 text-emerald-100">
                  {isAgentProjectSaving ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Plus className="h-5 w-5" />
                  )}
                  <span className="font-medium text-sm">
                    {isAgentProjectSaving ? "正在新建项目" : "新建空白项目"}
                  </span>
                </div>
                <div className="mt-3 text-emerald-50/70 text-sm leading-6">
                  仅在你要开始一条全新的场景生图流程时再创建，避免项目列表里自动冒出一堆无效项目。
                </div>
              </button>
            </div>
          </div>
        </main>
      </div>
    ) : null;

  const agentProjectOpeningScreen =
    isAgentMode && hasActiveAgentProject && !hasLoadedCurrentAgentProject ? (
      <div className="min-h-screen bg-[#050607] text-white">
        <AgentCanvasTopNavDark
          activeKey="agent"
          rightSlot={agentProjectNavSlot}
          siteLogo={siteSettingsData?.siteLogo}
          siteLogoDark={siteSettingsData?.siteLogoDark}
          siteName={siteSettingsData?.siteName}
        />
        <main className="flex min-h-screen items-center justify-center px-6 pt-24 pb-8">
          <CanvasLazyPanelLoader
            className="min-h-0 bg-transparent text-white/65"
            label="正在打开生图项目..."
          />
        </main>
      </div>
    ) : null;

  const workflowStylePanel = useMemo(
    () => (
      <AgentWorkflowPanelDarkV2
        config={resolvedWorkflowUiConfig}
        embedded
        inputs={workflowInputs}
        materials={workflowMaterials}
        onInputsChange={handleWorkflowInputsChange}
        onMaterialsChange={handleWorkflowMaterialsChange}
        onSelectionsChange={handleWorkflowSelectionsChange}
        selections={sanitizedWorkflowSelections}
        showBrandStoreSection={false}
      />
    ),
    [
      handleWorkflowInputsChange,
      handleWorkflowMaterialsChange,
      handleWorkflowSelectionsChange,
      resolvedWorkflowUiConfig,
      sanitizedWorkflowSelections,
      workflowInputs,
      workflowMaterials,
    ]
  );

  if (isAgentMode) {
    if (!hasActiveAgentProject) {
      return (
        <>
          {agentProjectSelectionScreen}
          {loginDialogElement}
          {projectLoadingBadge}
        </>
      );
    }

    if (agentProjectOpeningScreen) {
      return (
        <>
          {agentProjectOpeningScreen}
          {loginDialogElement}
          {projectLoadingBadge}
        </>
      );
    }

    return (
      <>
        <AgentGenerationWorkspaceDarkV2
          agentModeState={agentModeState}
          brandModelPanel={
            <AgentWorkflowBrandModelPicker
              brand={workflowInputs.brand}
              onSelectBrandModel={handleSelectedBrandModelChange}
              selectedBrandModel={selectedBrandModel}
              theme="dark"
            />
          }
          brandStorePanel={
            <AgentWorkflowBrandStorePanel
              config={resolvedWorkflowUiConfig}
              inputs={workflowInputs}
              onInputsChange={handleWorkflowInputsChange}
              theme="dark"
            />
          }
          chatId={agentModeChatId}
          deletedResultCollections={agentProjectDeletedResultCollections}
          getLatestWorkflowContext={getLatestWorkflowContext}
          materialSelectionPanel={
            isWorkflowMaterialStepEnabled ? (
              <AgentWorkflowMaterialSelectionPanel
                appearanceRecognitionEnabled={appearanceRecognitionEnabled}
                disabled={false}
                inputs={workflowInputs}
                materials={workflowMaterials}
                modelImageRequirement={materialModelImageRequirement}
                onAppearanceRecognitionEnabledChange={
                  handleAppearanceRecognitionEnabledChange
                }
                onInputsChange={handleWorkflowInputsChange}
                onMaterialsChange={handleWorkflowMaterialsChange}
                productSelectionLimit={materialProductSelectionLimit}
                theme="dark"
                totalUploadRequirement={materialTotalUploadRequirement}
              />
            ) : null
          }
          onAgentModeStateChange={setAgentModeState}
          onDeleteResultImage={handleAgentResultImageDelete}
          onOpenCanvasEditor={() => {
            updateCanvasSearchParams({
              mode: null,
            });
          }}
          onResultPreviewUrlsChange={handleAgentResultPreviewUrlsChange}
          onWorkspaceStateChange={setAgentWorkspaceState}
          projectId={agentProjectId}
          key={agentProjectId}
          resultCollections={agentProjectResultCollections}
          selectedAgentPresetId={
            isAgentWorkspaceEnabled ? effectiveSelectedAgentPresetId : null
          }
          selectedBrandModel={selectedBrandModel}
          showcaseConfig={siteSettingsData?.agentWorkflowShowcaseConfig}
          siteLogo={siteSettingsData?.siteLogo}
          siteLogoDark={siteSettingsData?.siteLogoDark}
          siteName={siteSettingsData?.siteName}
          syncGeneratedResultsToCanvas={false}
          topNavRightSlot={agentProjectNavSlot}
          workflowContext={workflowContext}
          workflowBusinessModeSettings={workflowBusinessModeSettings}
          workflowFeatureSettings={workflowPageFeatureSettings}
          // 嵌入的 Agent 选择面板
          workflowPromptOptimizationEnabled={appearanceRecognitionEnabled}
          workflowStylePanel={workflowStylePanel}
          workspaceState={agentWorkspaceState}
        />
        {loginDialogElement}
        {projectLoadingBadge}
      </>
    );
  }

  return (
    <TooltipProvider>
      <div
        className="relative h-dvh w-full overflow-hidden overscroll-none"
        style={
          {
            "--canvas-surface-background": canvasSurfaceBackground,
            backgroundColor: canvasSurfaceBackground,
          } as React.CSSProperties
        }
      >
        {/* 1. Canvas Layer (Full Screen) - 使用 key 强制在 id 变化时重新挂载 */}
        <div
          className={cn(
            "absolute z-0",
            isVideoMode ? "inset-0" : "left-0 bottom-0"
          )}
          data-canvas-stage="true"
          key={`workspace-${id}`}
          style={
            isVideoMode
              ? undefined
              : {
                  top: JIMENG_CANVAS_TOP_BAR_HEIGHT,
                  right: isPanelOpen ? resolvedPanelWidth : 0,
                }
          }
        >
          <CanvasWorkspace
            canvasToolbarConfig={canvasToolbarConfig}
            emptyStateDescription={
              isVideoMode
                ? "先在右侧选择文生视频、主体参考或首尾帧模式，再开始生成"
                : '点击顶部"添加"按钮开始创作'
            }
            occlusionRight={panelOcclusionRight}
            onBlankCanvasDoubleClick={handleOpenVideoCanvasInsertMenu}
            showEmptyState={!isVideoMode}
            showZoomControls={isVideoMode}
            workspaceLabel={workspaceLabel}
            workspaceVariant={isVideoMode ? "video" : "canvas"}
            layerSplitEnabled={isLayerSplitEnabled}
            angleEditEnabled={isAngleEditEnabled}
          />
        </div>

        {isVideoMode && videoCanvasInsertMenu
          ? (() => {
              const menuWidth = 312;
              const menuLeft =
                viewportWidth > 0
                  ? Math.max(
                      12,
                      Math.min(
                        videoCanvasInsertMenu.screenPosition.x,
                        Math.max(12, viewportWidth - menuWidth - 12)
                      )
                    )
                  : videoCanvasInsertMenu.screenPosition.x;
              const menuTop = Math.max(
                12,
                videoCanvasInsertMenu.screenPosition.y + 14
              );
              const renderChildButton = (child: VideoCanvasInsertMenuChild) => (
                <button
                  className="flex w-full items-center rounded-xl px-3 py-2 text-left font-medium text-[13px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-950 dark:text-slate-200 dark:hover:bg-zinc-900"
                  key={child.id}
                  onClick={() =>
                    handleInsertWorkflowNodeFromMenu(child.templateType)
                  }
                  type="button"
                >
                  {child.label}
                </button>
              );
              const renderInsertItem = (
                item: VideoCanvasInsertMenuItem,
                highlighted = false
              ) => {
                const Icon = item.icon;
                const textClassName = highlighted
                  ? "text-orange-600 dark:text-orange-300"
                  : "text-slate-700 dark:text-slate-100";
                const iconClassName = highlighted
                  ? "text-orange-500"
                  : "text-slate-400 dark:text-zinc-500";

                if (item.children?.length) {
                  return (
                    <div className="rounded-2xl" key={item.id}>
                      <div
                        className={cn(
                          "flex items-center gap-3 rounded-2xl px-4 py-3 font-semibold text-[15px]",
                          textClassName
                        )}
                      >
                        <Icon className={cn("h-5 w-5", iconClassName)} />
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 opacity-60" />
                      </div>
                      <div className="ml-8 mr-2 mb-1 grid gap-0.5 border-slate-100 border-l pl-2 dark:border-zinc-800">
                        {item.children.map(renderChildButton)}
                      </div>
                    </div>
                  );
                }

                return (
                  <button
                    className={cn(
                      "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left font-medium text-[15px] transition-colors hover:bg-slate-50 dark:hover:bg-zinc-900",
                      textClassName
                    )}
                    key={item.id}
                    onClick={() =>
                      item.templateType &&
                      handleInsertWorkflowNodeFromMenu(item.templateType)
                    }
                    type="button"
                  >
                    <Icon className={cn("h-5 w-5", iconClassName)} />
                    <span>{item.label}</span>
                  </button>
                );
              };
              const highlightedItem = VIDEO_CANVAS_INSERT_MENU_ITEMS.at(-1);

              return (
                <div
                  className="fixed z-[70] max-h-[calc(100vh-24px)] overflow-y-auto rounded-[28px] border border-slate-200 bg-white p-2.5 text-foreground shadow-[0_28px_80px_-32px_rgba(15,23,42,0.35)] dark:border-zinc-800 dark:bg-zinc-950"
                  data-canvas-overlay="true"
                  onClick={(event) => event.stopPropagation()}
                  onPointerDown={(event) => event.stopPropagation()}
                  ref={videoCanvasInsertMenuRef}
                  style={{
                    left: `${menuLeft}px`,
                    top: `${menuTop}px`,
                    width: `${menuWidth}px`,
                  }}
                >
                  <div className="px-4 py-3 font-semibold text-[14px] text-slate-500 dark:text-zinc-400">
                    @{siteSettingsData?.siteName || "视频画布"}
                  </div>

                  <div className="grid gap-0.5">
                    {VIDEO_CANVAS_INSERT_MENU_ITEMS.slice(0, -1).map((item) =>
                      renderInsertItem(item)
                    )}
                  </div>

                  {highlightedItem ? (
                    <>
                      <div className="mx-3 my-2 h-px bg-slate-200 dark:bg-zinc-800" />
                      {renderInsertItem(highlightedItem, true)}
                    </>
                  ) : null}
                </div>
              );
            })()
          : null}

        {isVideoMode && isVideoModuleSidebarEnabled ? (
          <div
            className="pointer-events-auto absolute top-16 left-4 z-20"
            style={{ width: `${videoModuleSidebarWidth}px` }}
          >
            <div
              className={cn(
                "overflow-hidden rounded-[24px] border border-black/10 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-zinc-800 dark:bg-zinc-950",
                isVideoModuleSidebarCollapsed ? "w-[58px]" : "w-[236px]"
              )}
            >
              <div
                className={cn(
                  "flex items-center border-b border-black/5 px-2.5 py-2.5 dark:border-zinc-800",
                  isVideoModuleSidebarCollapsed
                    ? "relative justify-center"
                    : "justify-between"
                )}
              >
                {isVideoModuleSidebarCollapsed ? (
                  <div className="flex w-full justify-center">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-black/10 bg-[#f7f8fb] text-[#5b76fe]">
                      <Layers className="h-4 w-4" />
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-[14px] border border-black/10 bg-[#f7f8fb] text-[#5b76fe]">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <div className="text-[15px] font-semibold text-[#16181d]">
                        视频模块
                      </div>
                      <div className="text-[12px] text-[#7a766f]">
                        工作流分层
                      </div>
                    </div>
                  </div>
                )}
                <Button
                  className={cn(
                    "h-8 w-8 rounded-[12px] text-[#7a766f] hover:bg-[#f6f5f4] hover:text-[#16181d] dark:hover:bg-zinc-900",
                    isVideoModuleSidebarCollapsed &&
                      "absolute top-2.5 right-2.5"
                  )}
                  onClick={() =>
                    setIsVideoModuleSidebarCollapsed((prev) => !prev)
                  }
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  {isVideoModuleSidebarCollapsed ? (
                    <ChevronRight className="h-4 w-4" />
                  ) : (
                    <ChevronLeft className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {isVideoModuleSidebarCollapsed ? (
                <div className="flex flex-col items-center gap-1.5 px-2 py-2">
                  {VIDEO_CANVAS_SIDEBAR_GROUPS.map((group) => {
                    const GroupIcon = group.icon;
                    const groupStyle =
                      VIDEO_CANVAS_SIDEBAR_GROUP_STYLES[group.id];
                    return (
                      <button
                        className="flex h-10 w-10 items-center justify-center rounded-[12px] border border-transparent bg-transparent transition-colors hover:bg-[#f6f5f4] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                        key={group.id}
                        onClick={() => {
                          setIsVideoModuleSidebarCollapsed(false);
                          setVideoModuleSectionOpen((prev) => ({
                            ...prev,
                            [group.id]: true,
                          }));
                        }}
                        title={group.label}
                        type="button"
                        style={{ color: groupStyle.iconText }}
                      >
                        <GroupIcon className="h-4 w-4" />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <ScrollArea className="max-h-[calc(100vh-164px)]">
                  <div className="space-y-2 p-2.5">
                    {VIDEO_CANVAS_SIDEBAR_GROUPS.map((group) => {
                      const GroupIcon = group.icon;
                      const groupStyle =
                        VIDEO_CANVAS_SIDEBAR_GROUP_STYLES[group.id];
                      return (
                        <Collapsible
                          key={group.id}
                          onOpenChange={(open) =>
                            setVideoModuleSectionOpen((prev) => ({
                              ...prev,
                              [group.id]: open,
                            }))
                          }
                          open={videoModuleSectionOpen[group.id] !== false}
                        >
                          <div className="overflow-hidden rounded-[16px] border border-black/5 bg-[#fbfbfa] dark:border-zinc-800 dark:bg-zinc-900">
                            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-2.5 py-2.5 text-left transition-colors hover:bg-black/[0.018]">
                              <div className="flex min-w-0 items-center gap-2.5">
                                <span
                                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                                  style={{
                                    backgroundColor: groupStyle.iconBg,
                                    borderColor: groupStyle.iconBorder,
                                    color: groupStyle.iconText,
                                  }}
                                >
                                  <GroupIcon className="h-4 w-4" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <span className="block truncate text-[14px] font-semibold text-[#16181d]">
                                    {group.label}
                                  </span>
                                  <span className="block truncate text-[11px] text-[#8b867e]">
                                    {group.description}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="rounded-full border border-black/8 bg-white px-2 py-0.5 text-[11px] text-[#7a766f] dark:border-zinc-800 dark:bg-zinc-950">
                                  {group.nodeTypes.length}
                                </span>
                                <ChevronDown
                                  className={cn(
                                    "h-4 w-4 shrink-0 text-[#7a766f] transition-transform",
                                    videoModuleSectionOpen[group.id] !== false
                                      ? "rotate-0"
                                      : "-rotate-90"
                                  )}
                                />
                              </div>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <div className="border-t border-black/5 px-2.5 pb-2.5 pt-1.5 dark:border-zinc-800">
                                <div
                                  className="ml-4 space-y-0.5 border-l pl-3"
                                  style={{ borderColor: groupStyle.rail }}
                                >
                                  {group.nodeTypes.map((type) => {
                                    const definition =
                                      getVideoWorkflowNodeDefinition(type);
                                    if (!definition) return null;
                                    const Icon =
                                      getVideoWorkflowQuickConnectIcon(type);
                                    return (
                                      <button
                                        className="flex w-full items-center gap-2 rounded-[12px] border border-transparent bg-transparent px-2 py-1.5 text-left transition-all hover:bg-white hover:shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:hover:bg-zinc-950"
                                        key={type}
                                        onClick={() =>
                                          handleAddWorkflowNode(type)
                                        }
                                        title={definition.label}
                                        type="button"
                                      >
                                        <span
                                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-transparent dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                                          style={{
                                            color: groupStyle.iconText,
                                            backgroundColor: groupStyle.iconBg,
                                          }}
                                        >
                                          <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                          <span className="block truncate text-[13px] font-medium text-[#23211e]">
                                            {definition.label}
                                          </span>
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </CollapsibleContent>
                          </div>
                        </Collapsible>
                      );
                    })}
                  </div>
                </ScrollArea>
              )}
            </div>
          </div>
        ) : null}

        {isVideoMode &&
        selectedWorkflowQuickConnectAnchor &&
        selectedWorkflowQuickConnectSourceNode &&
        selectedVideoWorkflowQuickConnects.length > 0 &&
        !videoCanvasInsertMenu ? (
          <div
            className="pointer-events-none absolute z-20"
            style={{
              left: selectedWorkflowQuickConnectAnchor.x,
              top: selectedWorkflowQuickConnectAnchor.y,
            }}
          >
            <svg
              className="pointer-events-none absolute top-0 left-0 overflow-visible"
              height="1"
              width="1"
            >
              {selectedVideoWorkflowQuickConnects.map((item, index, items) => {
                const total = items.length;
                const y = (index - (total - 1) / 2) * 72;
                const x = 96 + Math.abs(y) * 0.28;
                const direction = selectedWorkflowQuickConnectAnchor.openLeft
                  ? -1
                  : 1;
                const targetX = x * direction;
                const cp1X = 36 * direction;
                const cp2X = (x - 26) * direction;
                return (
                  <path
                    d={`M 0 0 C ${cp1X} 0, ${cp2X} ${y}, ${targetX} ${y}`}
                    fill="none"
                    key={`quick-connect-line-${item.type}`}
                    stroke="var(--brand-selection)"
                    strokeLinecap="round"
                    strokeWidth="2.25"
                  />
                );
              })}
            </svg>

            <button
              aria-label="展开关联模块"
              className="-translate-x-1/2 -translate-y-1/2 pointer-events-auto absolute top-0 left-0 flex h-14 w-14 items-center justify-center rounded-[20px] border border-[#d7dff1] bg-white text-[#5b76fe] shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_18px_34px_rgba(22,24,29,0.12)] transition-colors hover:bg-[#f5f8ff] hover:text-[#3954db] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setVideoCanvasInsertMenu({
                  screenPosition: {
                    x: selectedWorkflowQuickConnectAnchor.x,
                    y: selectedWorkflowQuickConnectAnchor.y,
                  },
                  canvasPosition: {
                    x:
                      selectedWorkflowQuickConnectSourceNode.position.x +
                      selectedWorkflowQuickConnectSourceNode.size.width,
                    y:
                      selectedWorkflowQuickConnectSourceNode.position.y +
                      selectedWorkflowQuickConnectSourceNode.size.height / 2,
                  },
                  sourceNodeId: selectedWorkflowQuickConnectSourceNode.id,
                  openLeft: selectedWorkflowQuickConnectAnchor.openLeft,
                });
              }}
              type="button"
            >
              <Plus className="h-8 w-8" />
            </button>

            {selectedVideoWorkflowQuickConnects.map((item, index, items) => {
              const total = items.length;
              const y = (index - (total - 1) / 2) * 72;
              const x = 96 + Math.abs(y) * 0.28;
              const direction = selectedWorkflowQuickConnectAnchor.openLeft
                ? -1
                : 1;
              const Icon = getVideoWorkflowQuickConnectIcon(item.type);
              const definition = getVideoWorkflowNodeDefinition(item.type);
              return (
                <button
                  aria-label={item.label}
                  className="-translate-x-1/2 -translate-y-1/2 pointer-events-auto absolute flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dbe2ee] bg-white text-[#566377] shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_14px_26px_rgba(22,24,29,0.1)] transition-all hover:scale-[1.03] hover:border-[#cfdcff] hover:bg-[#f5f8ff] hover:text-[#3954db] dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
                  key={`quick-connect-node-${item.type}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const position = definition
                      ? {
                          x: selectedWorkflowQuickConnectAnchor.openLeft
                            ? selectedWorkflowQuickConnectSourceNode.position
                                .x -
                              definition.size.width -
                              180
                            : selectedWorkflowQuickConnectSourceNode.position
                                .x +
                              selectedWorkflowQuickConnectSourceNode.size
                                .width +
                              180,
                          y:
                            selectedWorkflowQuickConnectSourceNode.position.y +
                            selectedWorkflowQuickConnectSourceNode.size.height /
                              2 -
                            definition.size.height / 2 +
                            y / viewport.zoom,
                        }
                      : null;
                    handleAddWorkflowNode(item.type, {
                      connectFromSelection: true,
                      connectFromNodeId:
                        selectedWorkflowQuickConnectSourceNode.id,
                      ...(position ? { position } : {}),
                    });
                  }}
                  style={{
                    left: `${x * direction}px`,
                    top: `${y}px`,
                  }}
                  title={item.label}
                  type="button"
                >
                  <Icon className="h-6 w-6" />
                </button>
              );
            })}
          </div>
        ) : null}

        {isVideoMode &&
        selectedVideoWorkflowDefinition &&
        selectedWorkflowIsActionable ? (
          <div
            className="pointer-events-none absolute top-16 z-20 flex w-[min(360px,calc(100vw-32px))] flex-col gap-3"
            style={{ left: `${selectedWorkflowPanelLeft}px` }}
          >
            {selectedWorkflowIsActionable ? (
              <Card className={VIDEO_CANVAS_PANEL_CLASS}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-sm">
                        {selectedVideoWorkflowDefinition.label}
                      </CardTitle>
                      <CardDescription className="mt-1 line-clamp-1 text-xs">
                        {selectedWorkflowActionHint}
                      </CardDescription>
                    </div>
                    <Badge
                      className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                      variant="outline"
                    >
                      执行
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3 pb-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                      variant="outline"
                    >
                      提示词 {selectedWorkflowInputs.promptCount}
                    </Badge>
                    <Badge
                      className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                      variant="outline"
                    >
                      图片 {selectedWorkflowInputs.imageCount}
                    </Badge>
                    <Badge
                      className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                      variant="outline"
                    >
                      视频 {selectedWorkflowInputs.videoCount}
                    </Badge>
                    {selectedVideoWorkflowType === "storyboard-node" ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        分镜 {selectedWorkflowStoryboardShots.length}
                      </Badge>
                    ) : null}
                    {selectedVideoWorkflowType === "storyboard-node" ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        下游 {selectedStoryboardBatchTargets.length}
                      </Badge>
                    ) : null}
                    {selectedWorkflowStructuredData.characters.length > 0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        角色 {selectedWorkflowStructuredData.characters.length}
                      </Badge>
                    ) : null}
                    {selectedWorkflowStructuredData.scenes.length > 0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        场景 {selectedWorkflowStructuredData.scenes.length}
                      </Badge>
                    ) : null}
                    {selectedWorkflowStructuredData.characterAssets.length >
                    0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        角色资产{" "}
                        {selectedWorkflowStructuredData.characterAssets.length}
                      </Badge>
                    ) : null}
                    {selectedWorkflowStructuredData.sceneAssets.length > 0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        场景资产{" "}
                        {selectedWorkflowStructuredData.sceneAssets.length}
                      </Badge>
                    ) : null}
                    {selectedVideoWorkflowType === "custom-agent" &&
                    selectedWorkflowLinkedAgentProject.id ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        Agent 已连接
                      </Badge>
                    ) : null}
                    {selectedVideoWorkflowType === "custom-agent" &&
                    selectedWorkflowAgentResultCount > 0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        Agent 结果 {selectedWorkflowAgentResultCount}
                      </Badge>
                    ) : null}
                    {selectedVideoWorkflowType === "custom-agent" &&
                    selectedWorkflowPendingAgentResultCount > 0 ? (
                      <Badge
                        className={VIDEO_CANVAS_PANEL_BADGE_CLASS}
                        variant="outline"
                      >
                        待回流 {selectedWorkflowPendingAgentResultCount}
                      </Badge>
                    ) : null}
                  </div>

                  <div className={VIDEO_CANVAS_SUBSECTION_CLASS}>
                    <div className="line-clamp-3 whitespace-pre-line text-foreground/85 text-xs leading-5">
                      {selectedWorkflowPrompt.trim()
                        ? selectedWorkflowPrompt
                        : "当前还没有抽取到可执行提示词，先在上游接入脚本、分镜或参考素材。"}
                    </div>
                  </div>

                  {selectedVideoWorkflowType === "custom-agent" &&
                  selectedWorkflowLinkedAgentProject.id ? (
                    <div className={VIDEO_CANVAS_SUBSECTION_CLASS}>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-[0.16em]">
                        已关联 Agent 项目
                      </div>
                      <div className="mt-2 font-medium text-foreground text-sm">
                        {selectedWorkflowLinkedAgentProject.title ||
                          selectedWorkflowLinkedAgentProject.id}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Button
                      className="w-full rounded-[18px] bg-brand-accent text-brand-accent-foreground shadow-[0_16px_30px_-18px_rgb(var(--brand-accent-rgb)/0.56)] hover:bg-brand-accent-hover"
                      disabled={isAnyWorkflowExecutionRunning}
                      onClick={() => void handleRunSelectedWorkflowNode()}
                      type="button"
                    >
                      {isSelectedWorkflowPrimaryRunning ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          执行中...
                        </>
                      ) : (
                        selectedWorkflowActionLabel
                      )}
                    </Button>

                    {selectedVideoWorkflowType === "custom-agent" ? (
                      <Button
                        className="w-full rounded-[18px] border border-[#dbe2ee] bg-white text-[#202430] hover:bg-[#f7f9ff] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        disabled={isAnyWorkflowExecutionRunning}
                        onClick={() => void handleOpenSelectedWorkflowInAgent()}
                        type="button"
                        variant="secondary"
                      >
                        {isSelectedWorkflowAgentRunning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            同步 Agent 项目中...
                          </>
                        ) : selectedWorkflowLinkedAgentProject.id ? (
                          "继续 Agent 项目"
                        ) : (
                          "送入 Agent 工作台"
                        )}
                      </Button>
                    ) : null}

                    {selectedVideoWorkflowType === "custom-agent" &&
                    selectedWorkflowAgentResultAssets.length > 0 ? (
                      <Button
                        className="w-full rounded-[18px] border border-[#dbe2ee] bg-white text-[#202430] hover:bg-[#f7f9ff] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        disabled={isAnyWorkflowExecutionRunning}
                        onClick={() =>
                          void handleCreateSelectedAgentResultBranches()
                        }
                        type="button"
                        variant="secondary"
                      >
                        {isSelectedWorkflowBranchRunning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            展开结果分支中...
                          </>
                        ) : (
                          `展开结果分支 (${selectedWorkflowAgentResultAssets.length})`
                        )}
                      </Button>
                    ) : null}

                    {selectedStoryboardCanBatchExecute ? (
                      <Button
                        className="w-full rounded-[18px] border border-[#dbe2ee] bg-white text-[#202430] hover:bg-[#f7f9ff] dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                        disabled={isAnyWorkflowExecutionRunning}
                        onClick={() => void handleRunStoryboardBatch()}
                        type="button"
                        variant="secondary"
                      >
                        {isSelectedWorkflowBatchRunning ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            批量执行中...
                          </>
                        ) : (
                          `批量执行下游 (${selectedStoryboardBatchTargets.length})`
                        )}
                      </Button>
                    ) : null}

                    <Button
                      className="w-full rounded-[18px] border border-[#f0d1d8] bg-[#fff7f8] text-[#d24f63] shadow-none hover:bg-[#ffeff2]"
                      disabled={isAnyWorkflowExecutionRunning}
                      onClick={handleDeleteSelectedWorkflowNode}
                      type="button"
                      variant="destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      删除当前模块
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>
        ) : null}

        {brandEntry}
        {agentDisabledNotice}

        {!isVideoMode ? (
          <div className="absolute left-2 top-1/2 z-20 flex w-[48px] -translate-y-1/2 flex-col items-center gap-1 rounded-[16px] border border-black/[0.06] bg-white/92 p-1 shadow-[0_12px_30px_rgba(15,23,42,0.08),0_1px_2px_rgba(15,23,42,0.05)] backdrop-blur-[18px] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:shadow-[0_18px_46px_rgba(0,0,0,0.38)]">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                    tool === "select" && JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                  )}
                  aria-label={getCanvasToolbarItem(canvasToolbarConfig, "selectTool").label}
                  aria-pressed={tool === "select"}
                  onClick={() => setTool("select")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    active={tool === "select"}
                    className="h-[18px] w-[18px]"
                    fallback={MousePointer2}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "selectTool")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {getCanvasToolbarItem(canvasToolbarConfig, "selectTool").label}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                    tool === "pan" && JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                  )}
                  aria-label={getCanvasToolbarItem(canvasToolbarConfig, "panTool").label}
                  aria-pressed={tool === "pan"}
                  onClick={() => setTool("pan")}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    active={tool === "pan"}
                    className="h-[18px] w-[18px]"
                    fallback={Move}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "panTool")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {getCanvasToolbarItem(canvasToolbarConfig, "panTool").label}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS}
                  onClick={handleAddImageNode}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-[18px] w-[18px]"
                    fallback={Images}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "addImage")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {getCanvasToolbarItem(canvasToolbarConfig, "addImage").label}
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS}
                  onClick={handleAddTextNode}
                  size="icon"
                  type="button"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-[18px] w-[18px]"
                    fallback={LetterText}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "addText")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                {getCanvasToolbarItem(canvasToolbarConfig, "addText").label}
              </TooltipContent>
            </Tooltip>
          </div>
        ) : null}

        {/* 2. Floating Actions (Top Right) */}
        {!isVideoMode && !isPanelOpen && (
          <div
            className="absolute z-20"
            style={{
              top: JIMENG_CANVAS_TOP_BAR_HEIGHT + FLOATING_PANEL_INSET,
              right: FLOATING_PANEL_INSET,
            }}
          >
            <Button
              className="h-9 rounded-[10px] border border-black/[0.06] bg-white px-3 text-[#0f1419] text-sm shadow-[0_4px_12px_rgba(0,0,0,0.06)] backdrop-blur-[12px] hover:bg-[#f7f8f9] hover:text-[#0f1419] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:text-white dark:shadow-[0_14px_34px_rgba(0,0,0,0.34)] dark:hover:bg-white/[0.08] dark:hover:text-white"
              onClick={() => setIsPanelOpen(true)}
              variant="ghost"
            >
              <MessageCircle className="mr-1.5 h-4 w-4" />
              对话
            </Button>
          </div>
        )}

        {/* 4. Floating Sidebar (Right) */}
        {isVideoMode ? null : (
          <div
            className={cn(
              "absolute z-30 transition-all duration-300 ease-in-out",
              isPanelOpen
                ? "translate-x-0 opacity-100"
                : "pointer-events-none translate-x-full opacity-0"
            )}
            data-canvas-right-panel="true"
            style={{
              top: JIMENG_CANVAS_TOP_BAR_HEIGHT,
              right: 0,
              bottom: 0,
              width: resolvedPanelWidth,
              maxWidth: "calc(100vw - 64px)",
            }}
          >
            <div
              aria-label="拖动调整对话框宽度"
              aria-orientation="vertical"
              aria-valuemax={FLOATING_PANEL_MAX_WIDTH}
              aria-valuemin={FLOATING_PANEL_MIN_WIDTH}
              aria-valuenow={Math.round(resolvedPanelWidth)}
              className="group absolute left-0 top-0 z-40 flex h-full w-2 -translate-x-1 cursor-col-resize items-center justify-center"
              data-canvas-no-drag="true"
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
                  return;
                }
                event.preventDefault();
                const direction = event.key === "ArrowLeft" ? 1 : -1;
                setCanvasPanelWidth((current) =>
                  Math.min(
                    FLOATING_PANEL_MAX_WIDTH,
                    Math.max(
                      FLOATING_PANEL_MIN_WIDTH,
                      current + direction * 24
                    )
                  )
                );
              }}
              onPointerDown={handleCanvasPanelResizePointerDown}
              role="separator"
              tabIndex={0}
            >
              <span className="h-12 w-px rounded-full bg-transparent transition-colors group-hover:bg-[#cfd6df] dark:group-hover:bg-white/20" />
            </div>
            <div className={JIMENG_CANVAS_PANEL_CLASS}>
              {panelMode === "chat" ? (
                // AI 对话内容 - 使用 key 强制在 id 变化时重新挂载
                <div className="flex-1 overflow-hidden" key={`chat-${id}`}>
                  <CanvasChatPanel
                    agentEnabled={isCanvasAgentModeEnabled}
                    canvasToolbarConfig={canvasToolbarConfig}
                    chatId={`canvas-${id}`}
                    chatScope="canvas"
                    isExpanded={isCanvasPanelExpanded}
                    onClose={() => setIsPanelOpen(false)}
                    onOpenFileList={() => setPanelMode("fileList")}
                    onToggleExpand={handleToggleCanvasPanelExpand}
                    panelTone={isDarkCanvasTheme ? "dark" : "light"}
                    selectedAgentPresetId={
                      isCanvasAgentModeEnabled ? selectedAgentPresetId : null
                    }
                    workspaceVariant="canvas"
                  />
                </div>
              ) : (
                // 文件列表
                <CanvasFileListPanel
                  buildProjectUrl={buildWorkspaceProjectUrl}
                  createUrl={createNewCanvasUrl}
                  currentId={id}
                  onClose={() => setPanelMode("chat")}
                  workspaceLabel={workspaceLabel}
                  workspaceType={activeCanvasWorkspaceType}
                />
              )}
            </div>
          </div>
        )}

        {isVideoMode && isVideoCanvasFileListOpen ? (
          <div
            className="absolute z-30 overflow-hidden rounded-[28px] border border-border/70 bg-background/95 shadow-[0_24px_80px_rgba(15,23,42,0.18)] backdrop-blur-xl"
            style={{
              top: DOCKED_PANEL_INSET,
              right: DOCKED_PANEL_INSET,
              bottom: `${FLOATING_BOTTOM_INSET + 76}px`,
              width: 380,
              maxWidth: `calc(100vw - ${DOCKED_PANEL_INSET * 2}px)`,
            }}
          >
            <CanvasFileListPanel
              buildProjectUrl={buildWorkspaceProjectUrl}
              createUrl={createNewCanvasUrl}
              currentId={id}
              onClose={() => setIsVideoCanvasFileListOpen(false)}
              workspaceLabel={workspaceLabel}
              workspaceType={activeCanvasWorkspaceType}
            />
          </div>
        ) : null}

        {isVideoMode && isVideoCanvasMarkerPanelOpen ? (
          <div
            className="absolute z-30"
            data-canvas-overlay="true"
            style={{
              top: DOCKED_PANEL_INSET,
              right: DOCKED_PANEL_INSET,
              bottom: `${FLOATING_BOTTOM_INSET + 76}px`,
              width: 324,
              maxWidth: `calc(100vw - ${DOCKED_PANEL_INSET * 2}px)`,
            }}
          >
            <VideoCanvasMarkerPanel
              hasSelection={Boolean(selectedVideoWorkflowNode)}
              markers={selectedVideoCanvasMarkers}
              onApply={handleApplyVideoCanvasMarker}
              onClear={handleClearVideoCanvasMarkers}
              onClose={() => setIsVideoCanvasMarkerPanelOpen(false)}
              selectedLabel={selectedVideoCanvasMarkerLabel}
            />
          </div>
        ) : null}

        {/* 5. Floating Toolbar (Bottom) */}
        <div
          className={cn(
            "-translate-x-1/2 absolute left-1/2 z-20",
            !isVideoMode && "hidden"
          )}
          data-canvas-floating-toolbar="true"
          style={{ bottom: `${FLOATING_BOTTOM_INSET}px` }}
        >
          <div
            className={cn(
              isVideoMode
                ? VIDEO_CANVAS_TOOLBAR_CLASS
                : JIMENG_CANVAS_TOOLBAR_CLASS
            )}
            style={{ marginLeft: `${floatingToolbarOffset}px` }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    isVideoMode
                      ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                      : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                    tool === "select" &&
                      (isVideoMode
                        ? VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                        : JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS)
                  )}
                  aria-label={getCanvasToolbarItem(canvasToolbarConfig, "selectTool").label}
                  aria-pressed={tool === "select"}
                  onClick={() => setTool("select")}
                  size="icon"
                  variant={tool === "select" ? "secondary" : "ghost"}
                >
                  <CanvasToolbarIcon
                    active={tool === "select"}
                    className="h-[18px] w-[18px]"
                    fallback={MousePointer2}
                    item={getCanvasToolbarItem(
                      canvasToolbarConfig,
                      "selectTool"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {getCanvasToolbarItem(canvasToolbarConfig, "selectTool").label}{" "}
                (V)
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    isVideoMode
                      ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                      : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                    tool === "pan" &&
                      (isVideoMode
                        ? VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                        : JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS)
                  )}
                  aria-label={getCanvasToolbarItem(canvasToolbarConfig, "panTool").label}
                  aria-pressed={tool === "pan"}
                  onClick={() => setTool("pan")}
                  size="icon"
                  variant={tool === "pan" ? "secondary" : "ghost"}
                >
                  <CanvasToolbarIcon
                    active={tool === "pan"}
                    className="h-[18px] w-[18px]"
                    fallback={Move}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "panTool")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {getCanvasToolbarItem(canvasToolbarConfig, "panTool").label} (H)
              </TooltipContent>
            </Tooltip>

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    disabled={isSaving}
                    onClick={handleSave}
                    size="icon"
                    variant="ghost"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CanvasToolbarIcon
                        className="h-4 w-4"
                        fallback={Save}
                        item={getCanvasToolbarItem(
                          canvasToolbarConfig,
                          "saveCanvas"
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(canvasToolbarConfig, "saveCanvas")
                      .label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    onClick={() => {
                      setIsVideoCanvasMarkerPanelOpen(false);
                      setIsVideoCanvasFileListOpen(true);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <CanvasToolbarIcon
                      className="h-4 w-4"
                      fallback={FolderOpen}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "cloudFiles"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(canvasToolbarConfig, "cloudFiles")
                      .label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS,
                      isVideoCanvasMarkerPanelOpen &&
                        VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                    )}
                    onClick={() => {
                      setIsVideoCanvasFileListOpen(false);
                      setIsVideoCanvasMarkerPanelOpen((open) => !open);
                    }}
                    size="icon"
                    variant="ghost"
                  >
                    <CanvasToolbarIcon
                      active={isVideoCanvasMarkerPanelOpen}
                      className="h-4 w-4"
                      fallback={Tag}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "markerPanel"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(canvasToolbarConfig, "markerPanel")
                      .label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      isVideoMode
                        ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                        : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                      tool === "draw" &&
                        (isVideoMode
                          ? VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                          : JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS)
                    )}
                    onClick={() => setTool("draw")}
                    size="icon"
                    variant={tool === "draw" ? "secondary" : "ghost"}
                  >
                    <CanvasToolbarIcon
                      active={tool === "draw"}
                      className="h-4 w-4"
                      fallback={GitBranch}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "workflowConnection"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(
                      canvasToolbarConfig,
                      "workflowConnection"
                    ).label
                  }{" "}
                  (L)
                </TooltipContent>
              </Tooltip>
            ) : null}

            {shouldShowStyleModeToolbarButton && !isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={cn(
                      isVideoMode
                        ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                        : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS,
                      isAgentWorkspaceEnabled &&
                        isAgentMode &&
                        (isVideoMode
                          ? VIDEO_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS
                          : JIMENG_CANVAS_TOOLBAR_ACTIVE_BUTTON_CLASS)
                    )}
                    onClick={handleStyleModeToolbarClick}
                    size="icon"
                    variant={
                      isAgentWorkspaceEnabled && isAgentMode
                        ? "secondary"
                        : "ghost"
                    }
                  >
                    <CanvasToolbarIcon
                      active={isAgentWorkspaceEnabled && isAgentMode}
                      className="h-4 w-4"
                      fallback={Wand2}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "styleMode"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {getCanvasToolbarItem(canvasToolbarConfig, "styleMode").label}
                </TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    isVideoMode
                      ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                      : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS
                  )}
                  onClick={handleAddImageNode}
                  size="icon"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-[18px] w-[18px]"
                    fallback={Images}
                    item={getCanvasToolbarItem(
                      canvasToolbarConfig,
                      isVideoMode ? "addImageInput" : "addImage"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {
                  getCanvasToolbarItem(
                    canvasToolbarConfig,
                    isVideoMode ? "addImageInput" : "addImage"
                  ).label
                }
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    isVideoMode
                      ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                      : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS
                  )}
                  onClick={handleAddTextNode}
                  size="icon"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-[18px] w-[18px]"
                    fallback={LetterText}
                    item={getCanvasToolbarItem(
                      canvasToolbarConfig,
                      isVideoMode ? "addScriptNode" : "addText"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {
                  getCanvasToolbarItem(
                    canvasToolbarConfig,
                    isVideoMode ? "addScriptNode" : "addText"
                  ).label
                }
              </TooltipContent>
            </Tooltip>

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    onClick={handleAddVideoNode}
                    size="icon"
                    variant="ghost"
                  >
                    <CanvasToolbarIcon
                      className="h-4 w-4"
                      fallback={Video}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "addVideoInput"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(canvasToolbarConfig, "addVideoInput")
                      .label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            {isVideoMode ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    size="icon"
                    title={
                      getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "workflowNodeLibrary"
                      ).label
                    }
                    variant="ghost"
                  >
                    <CanvasToolbarIcon
                      className="h-4 w-4"
                      fallback={Grid3X3}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "workflowNodeLibrary"
                      )}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="center"
                  className="w-[420px] rounded-2xl border bg-background p-0 shadow-2xl"
                  side="top"
                >
                  <div className="border-b px-4 py-3">
                    <div className="font-semibold text-foreground text-sm">
                      视频工作流节点库
                    </div>
                    <div className="mt-1 text-muted-foreground text-xs">
                      这里按参考 APP
                      的节点目录整理，先把结构补齐，再逐步接入具体能力。
                    </div>
                  </div>
                  <ScrollArea className="max-h-[60vh]">
                    <div className="space-y-4 p-3">
                      {VIDEO_WORKFLOW_LIBRARY_SECTIONS.map((section) => {
                        const sectionNodes = getVideoWorkflowSectionNodes(
                          section.id
                        );
                        return (
                          <div className="space-y-2" key={section.id}>
                            <div className="px-2">
                              <div className="font-semibold text-muted-foreground text-xs uppercase tracking-[0.16em]">
                                {section.label}
                              </div>
                              <div className="mt-1 text-muted-foreground text-xs">
                                {section.description}
                              </div>
                            </div>
                            <div className="grid gap-1">
                              {sectionNodes.map((nodeDefinition) => (
                                <DropdownMenuItem
                                  className="flex items-start gap-3 rounded-xl px-3 py-3"
                                  key={nodeDefinition.type}
                                  onClick={() =>
                                    handleAddWorkflowNode(nodeDefinition.type)
                                  }
                                >
                                  <div
                                    className="mt-0.5 h-2.5 w-2.5 rounded-full"
                                    style={{
                                      backgroundColor:
                                        nodeDefinition.accentColor,
                                    }}
                                  />
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                      <span className="font-medium text-foreground text-sm">
                                        {nodeDefinition.label}
                                      </span>
                                      <span className="font-mono text-[10px] text-muted-foreground">
                                        {nodeDefinition.type}
                                      </span>
                                    </div>
                                    <div className="mt-1 text-muted-foreground text-xs leading-5">
                                      {nodeDefinition.description}
                                    </div>
                                  </div>
                                </DropdownMenuItem>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    onClick={handleExportVideoCanvasProject}
                    size="icon"
                    variant="ghost"
                  >
                    <CanvasToolbarIcon
                      className="h-4 w-4"
                      fallback={Download}
                      item={getCanvasToolbarItem(
                        canvasToolbarConfig,
                        "exportVideoCanvas"
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(
                      canvasToolbarConfig,
                      "exportVideoCanvas"
                    ).label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            {isVideoMode ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className={VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS}
                    disabled={isImportingVideoCanvas}
                    onClick={handleImportVideoCanvasProjectClick}
                    size="icon"
                    variant="ghost"
                  >
                    {isImportingVideoCanvas ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CanvasToolbarIcon
                        className="h-4 w-4"
                        fallback={Upload}
                        item={getCanvasToolbarItem(
                          canvasToolbarConfig,
                          "importVideoCanvas"
                        )}
                      />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {
                    getCanvasToolbarItem(
                      canvasToolbarConfig,
                      "importVideoCanvas"
                    ).label
                  }
                </TooltipContent>
              </Tooltip>
            ) : null}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    isVideoMode
                      ? VIDEO_CANVAS_TOOLBAR_BUTTON_CLASS
                      : JIMENG_CANVAS_TOOLBAR_BUTTON_CLASS
                  )}
                  onClick={() => router.push(createNewCanvasUrl)}
                  size="icon"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-4 w-4"
                    fallback={Plus}
                    item={getCanvasToolbarItem(
                      canvasToolbarConfig,
                      isVideoMode ? "newVideoCanvas" : "newCanvas"
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {
                  getCanvasToolbarItem(
                    canvasToolbarConfig,
                    isVideoMode ? "newVideoCanvas" : "newCanvas"
                  ).label
                }
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <input
          accept="application/json,.json"
          className="hidden"
          onChange={handleImportVideoCanvasProjectChange}
          ref={importVideoCanvasInputRef}
          type="file"
        />

        {/* 6. Bottom Left Compact Controls */}
        <div
          className="absolute z-20"
          style={{
            bottom: `${FLOATING_BOTTOM_INSET + 4}px`,
            left: `${compactControlsLeft + 8}px`,
          }}
        >
          <div
            className={cn(
              "flex items-center gap-1",
              !isVideoMode &&
                "rounded-[8px] border border-black/[0.05] bg-white/95 px-1.5 py-1 text-[#536471] shadow-none backdrop-blur-[12px] dark:border-white/[0.10] dark:bg-[#121416]/92 dark:text-white/62",
              isVideoMode && VIDEO_CANVAS_COMPACT_CONTROLS_CLASS
            )}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    "h-6 w-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-white/48 dark:hover:text-white",
                    isVideoMode ? "rounded-full" : "rounded-none"
                  )}
                  disabled={!canUndo}
                  onClick={undo}
                  size="icon"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-3 w-3"
                    fallback={Undo2}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "undo")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {getCanvasToolbarItem(canvasToolbarConfig, "undo").label}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  className={cn(
                    "h-6 w-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-white/48 dark:hover:text-white",
                    isVideoMode ? "rounded-full" : "rounded-none"
                  )}
                  disabled={!canRedo}
                  onClick={redo}
                  size="icon"
                  variant="ghost"
                >
                  <CanvasToolbarIcon
                    className="h-3 w-3"
                    fallback={Redo2}
                    item={getCanvasToolbarItem(canvasToolbarConfig, "redo")}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {getCanvasToolbarItem(canvasToolbarConfig, "redo").label}
              </TooltipContent>
            </Tooltip>

            <div className="mx-1 h-4 w-px bg-border/70 dark:bg-white/[0.12]" />

            <Button
              className={cn(
                "h-6 w-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-white/48 dark:hover:text-white",
                isVideoMode ? "rounded-full" : "rounded-none"
              )}
              onClick={zoomOut}
              size="icon"
              title={getCanvasToolbarItem(canvasToolbarConfig, "zoomOut").label}
              variant="ghost"
            >
              <CanvasToolbarIcon
                className="h-3.5 w-3.5"
                fallback={ZoomOut}
                item={getCanvasToolbarItem(canvasToolbarConfig, "zoomOut")}
              />
            </Button>
            <span
              className="w-10 text-center font-medium text-[10px] text-muted-foreground tabular-nums dark:text-white/48"
              title={
                getCanvasToolbarItem(canvasToolbarConfig, "resetZoom").label
              }
            >
              {Math.round(viewport.zoom * 100)}%
            </span>
            <Button
              className={cn(
                "h-6 w-6 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground dark:text-white/48 dark:hover:text-white",
                isVideoMode ? "rounded-full" : "rounded-none"
              )}
              onClick={zoomIn}
              size="icon"
              title={getCanvasToolbarItem(canvasToolbarConfig, "zoomIn").label}
              variant="ghost"
            >
              <CanvasToolbarIcon
                className="h-3.5 w-3.5"
                fallback={ZoomIn}
                item={getCanvasToolbarItem(canvasToolbarConfig, "zoomIn")}
              />
            </Button>
          </div>
        </div>

        {loginDialogElement}
        {projectLoadingBadge}
      </div>
    </TooltipProvider>
  );
}
