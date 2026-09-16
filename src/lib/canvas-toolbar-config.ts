// Modified for standalone community distribution; see NOTICE.
export const CANVAS_TOOLBAR_CONFIG_SETTING_KEY = "canvas_toolbar_config";
export const DEFAULT_SELECTED_IMAGE_INLINE_ACTION_COUNT = 7;
export const MIN_SELECTED_IMAGE_INLINE_ACTION_COUNT = 3;
export const MAX_SELECTED_IMAGE_INLINE_ACTION_COUNT = 12;

export const DEFAULT_CANVAS_TOOLBAR_ITEMS = [
  {
    key: "selectTool",
    group: "画布主工具栏",
    label: "选择",
    description: "选择和移动画布节点",
  },
  {
    key: "panTool",
    group: "画布主工具栏",
    label: "平移",
    description: "拖动画布视图",
  },
  {
    key: "saveCanvas",
    group: "画布主工具栏",
    label: "保存到云端",
    description: "保存当前视频画布",
  },
  {
    key: "cloudFiles",
    group: "画布主工具栏",
    label: "云文件列表",
    description: "打开当前画布文件列表",
  },
  {
    key: "markerPanel",
    group: "画布主工具栏",
    label: "标记",
    description: "给视频画布节点添加标记",
  },
  {
    key: "workflowConnection",
    group: "画布主工具栏",
    label: "工作流连线",
    description: "连接视频工作流节点",
  },
  {
    key: "styleMode",
    group: "画布主工具栏",
    label: "Agent 模式",
    description: "进入 Agent 创作工作区",
    enabled: false,
  },
  {
    key: "addImage",
    group: "画布主工具栏",
    label: "添加图片",
    description: "在普通画布添加图片节点",
  },
  {
    key: "addImageInput",
    group: "画布主工具栏",
    label: "添加图片输入",
    description: "在视频画布添加图片输入节点",
  },
  {
    key: "addText",
    group: "画布主工具栏",
    label: "添加文本",
    description: "在普通画布添加文本节点",
  },
  {
    key: "addScriptNode",
    group: "画布主工具栏",
    label: "添加脚本节点",
    description: "在视频画布添加脚本节点",
  },
  {
    key: "addVideoInput",
    group: "画布主工具栏",
    label: "添加视频输入",
    description: "在视频画布添加视频输入节点",
  },
  {
    key: "workflowNodeLibrary",
    group: "画布主工具栏",
    label: "视频工作流节点库",
    description: "打开视频工作流节点库",
  },
  {
    key: "exportVideoCanvas",
    group: "画布主工具栏",
    label: "导出视频画布",
    description: "导出视频画布 JSON",
  },
  {
    key: "importVideoCanvas",
    group: "画布主工具栏",
    label: "导入视频画布",
    description: "导入视频画布 JSON",
  },
  {
    key: "newCanvas",
    group: "画布主工具栏",
    label: "新建画布",
    description: "新建普通画布",
  },
  {
    key: "newVideoCanvas",
    group: "画布主工具栏",
    label: "新建视频画布",
    description: "新建视频画布",
  },
  {
    key: "undo",
    group: "画布快捷工具条",
    label: "撤销",
    description: "撤销上一步操作",
  },
  {
    key: "redo",
    group: "画布快捷工具条",
    label: "重做",
    description: "重做上一步操作",
  },
  {
    key: "zoomOut",
    group: "画布快捷工具条",
    label: "缩小",
    description: "缩小画布视图",
  },
  {
    key: "resetZoom",
    group: "画布快捷工具条",
    label: "重置缩放",
    description: "恢复 100% 缩放",
  },
  {
    key: "zoomIn",
    group: "画布快捷工具条",
    label: "放大",
    description: "放大画布视图",
  },
  {
    key: "downloadFolder",
    group: "画布快捷工具条",
    label: "下载文件夹",
    description: "打包下载选中的图片节点",
  },
  {
    key: "imageNodeMore",
    group: "节点工具栏",
    label: "更多",
    description: "打开图片节点更多工具",
  },
  {
    key: "imageAddToChat",
    group: "节点工具栏",
    label: "问图",
    description: "把图片作为上下文继续提问",
  },
  {
    key: "imagePickObject",
    group: "节点工具栏",
    label: "识别",
    description: "识别图片中的主体与物品",
  },
  {
    key: "imageEnhance",
    group: "节点工具栏",
    label: "超清",
    description: "提升图片清晰度与细节",
  },
  {
    key: "imageRemoveBackground",
    group: "节点工具栏",
    label: "去背景",
    description: "移除背景并保留主体",
  },
  {
    key: "imageBoxCutout",
    group: "节点工具栏",
    label: "区域抠图",
    description: "框选区域后单独抠出主体",
  },
  {
    key: "imageLocalEdit",
    group: "节点工具栏",
    label: "局部重绘",
    description: "框选多个区域并按提示词局部改图",
  },
  {
    key: "imageRemoveWatermark",
    group: "节点工具栏",
    label: "去水印",
    description: "清理图片水印或瑕疵",
  },
  {
    key: "imageResize",
    group: "节点工具栏",
    label: "改尺寸",
    description: "调整图片尺寸",
  },
  {
    key: "imageTextEdit",
    group: "节点工具栏",
    label: "改文字",
    description: "编辑图片中的文字",
  },
  {
    key: "imageMultiAngle",
    group: "节点工具栏",
    label: "换视角",
    description: "生成图片多视角版本",
  },
  {
    key: "imageLayerSplit",
    group: "节点工具栏",
    label: "拆图层",
    description: "拆分图片图层",
  },
  {
    key: "imageExtend",
    group: "节点工具栏",
    label: "扩画布",
    description: "扩展图片画幅",
  },
  {
    key: "imageCrop",
    group: "节点工具栏",
    label: "裁图",
    description: "打开图片裁剪面板",
  },
  {
    key: "imageAdjust",
    group: "节点工具栏",
    label: "调色",
    description: "打开图片调整面板",
  },
  {
    key: "imageFlipRotate",
    group: "节点工具栏",
    label: "翻转",
    description: "打开图片翻转与旋转工具条",
  },
  {
    key: "imagePromptRegenerate",
    group: "节点工具栏",
    label: "重绘",
    description: "基于新提示词重绘图片",
  },
  {
    key: "imageNote",
    group: "节点工具栏",
    label: "加备注",
    description: "打开或显示图片备注",
  },
  {
    key: "imageRename",
    group: "节点工具栏",
    label: "改名",
    description: "重命名图片节点",
  },
  {
    key: "imageDownload",
    group: "节点工具栏",
    label: "保存",
    description: "下载图片节点资源",
  },
  {
    key: "imageDelete",
    group: "节点工具栏",
    label: "删除",
    description: "删除图片节点",
  },
  {
    key: "imageCompare",
    group: "节点工具栏",
    label: "对比",
    description: "打开图片前后对比视图",
  },
  {
    key: "imageConfirmCutout",
    group: "节点工具栏",
    label: "确认区域",
    description: "确认区域抠图结果",
  },
  {
    key: "imageCancelCutout",
    group: "节点工具栏",
    label: "退出区域",
    description: "退出区域抠图状态",
  },
  {
    key: "textDelete",
    group: "节点工具栏",
    label: "删除文本模块",
    description: "删除文本节点",
  },
  {
    key: "uiScreenReview",
    group: "节点工具栏",
    label: "检查并修复 UI",
    description: "检查并自动修复 UI Screen 节点",
  },
  {
    key: "uiScreenDelete",
    group: "节点工具栏",
    label: "删除 UI Screen",
    description: "删除 UI Screen 节点",
  },
  {
    key: "uiScreenSaveText",
    group: "节点工具栏",
    label: "保存",
    description: "保存 UI Screen 选中图层文字",
  },
  {
    key: "videoUpload",
    group: "节点工具栏",
    label: "上传视频",
    description: "视频节点上传入口",
  },
  {
    key: "videoPlay",
    group: "节点工具栏",
    label: "播放",
    description: "视频节点播放按钮",
  },
  {
    key: "videoPause",
    group: "节点工具栏",
    label: "暂停",
    description: "视频节点暂停按钮",
  },
  {
    key: "videoMute",
    group: "节点工具栏",
    label: "静音",
    description: "视频节点静音按钮",
  },
  {
    key: "videoUnmute",
    group: "节点工具栏",
    label: "取消静音",
    description: "视频节点取消静音按钮",
  },
  {
    key: "videoMore",
    group: "节点工具栏",
    label: "更多操作",
    description: "视频节点更多菜单",
  },
  {
    key: "videoDownload",
    group: "节点工具栏",
    label: "下载",
    description: "下载视频节点资源",
  },
  {
    key: "videoDelete",
    group: "节点工具栏",
    label: "删除",
    description: "删除视频节点",
  },
  {
    key: "workflowDelete",
    group: "节点工具栏",
    label: "删除模块",
    description: "删除工作流节点",
  },
  {
    key: "chatModeAgentActive",
    group: "对话框工具栏",
    label: "Auto Agent",
    description: "对话框当前 Agent 模式名称",
  },
  {
    key: "chatModePresetAgent",
    group: "对话框工具栏",
    label: "预设 Agent",
    description: "对话框当前预设 Agent 模式名称",
  },
  {
    key: "chatModeAgentMenu",
    group: "对话框工具栏",
    label: "Agent 对话",
    description: "模式菜单里的 Agent 入口",
  },
  {
    key: "chatModeDetailActive",
    group: "对话框工具栏",
    label: "AI详情",
    description: "对话框当前 AI 详情模式名称",
  },
  {
    key: "chatModeDetailMenu",
    group: "对话框工具栏",
    label: "AI详情生成",
    description: "模式菜单里的 AI 详情入口",
  },
  {
    key: "chatModeImageActive",
    group: "对话框工具栏",
    label: "生图",
    description: "对话框当前图像生成模式名称",
  },
  {
    key: "chatModeImageMenu",
    group: "对话框工具栏",
    label: "图像生成",
    description: "模式菜单里的图像生成入口",
  },
  {
    key: "chatModeVideoActive",
    group: "对话框工具栏",
    label: "视频",
    description: "对话框当前视频生成模式名称",
  },
  {
    key: "chatModeVideoMenu",
    group: "对话框工具栏",
    label: "视频生成",
    description: "模式菜单里的视频生成入口",
  },
  {
    key: "chatAttach",
    group: "对话框工具栏",
    label: "上传图片",
    description: "对话框附件上传按钮",
  },
  {
    key: "chatDeepThinking",
    group: "对话框工具栏",
    label: "深度思考",
    description: "图像生成深度思考开关",
  },
  {
    key: "chatModelSelector",
    group: "对话框工具栏",
    label: "选择模型",
    description: "对话框模型选择按钮",
  },
  {
    key: "chatPoints",
    group: "对话框工具栏",
    label: "积分",
    description: "对话框预计积分展示",
  },
  {
    key: "chatSend",
    group: "对话框工具栏",
    label: "发送",
    description: "对话框发送按钮",
  },
  {
    key: "chatStartGeneration",
    group: "对话框工具栏",
    label: "开始生成",
    description: "工作区模式下的生成按钮名称",
  },
] as const;

export type CanvasToolbarItemKey =
  (typeof DEFAULT_CANVAS_TOOLBAR_ITEMS)[number]["key"];

export type CanvasToolbarItemConfig = {
  label: string;
  iconUrl: string;
  enabled: boolean;
};

export type CanvasToolbarConfig = {
  items: Record<CanvasToolbarItemKey, CanvasToolbarItemConfig>;
  selectedImageInlineActionCount: number;
};

const DEFAULT_ITEM_BY_KEY = DEFAULT_CANVAS_TOOLBAR_ITEMS.reduce(
  (acc, item) => {
    acc[item.key] = {
      label: item.label,
      iconUrl: "",
      enabled: true,
    };
    return acc;
  },
  {} as Record<CanvasToolbarItemKey, CanvasToolbarItemConfig>
);

export const defaultCanvasToolbarConfig: CanvasToolbarConfig = {
  items: DEFAULT_ITEM_BY_KEY,
  selectedImageInlineActionCount: DEFAULT_SELECTED_IMAGE_INLINE_ACTION_COUNT,
};

const LEGACY_CANVAS_TOOLBAR_DEFAULT_LABELS: Partial<
  Record<CanvasToolbarItemKey, string[]>
> = {
  imageNodeMore: ["更多操作"],
  imageAddToChat: ["添加对话"],
  imagePickObject: ["识物"],
  imageEnhance: ["高清", "增强"],
  imageRemoveBackground: ["抠图"],
  imageBoxCutout: ["框选抠图"],
  imageLocalEdit: ["局部编辑"],
  imageRemoveWatermark: ["去印"],
  imageResize: ["尺寸", "调尺"],
  imageTextEdit: ["文字", "改字"],
  imageMultiAngle: ["多视角", "视角"],
  imageLayerSplit: ["图层拆分"],
  imageExtend: ["扩图"],
  imageCrop: ["裁剪"],
  imageAdjust: ["调整"],
  imageFlipRotate: ["翻转与旋转"],
  imageNote: ["备注"],
  imageDownload: ["下载"],
  imageCompare: ["开启对比"],
  imageConfirmCutout: ["确认抠图"],
  imageCancelCutout: ["取消抠图"],
};

function normalizeString(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeToolbarLabel(
  key: CanvasToolbarItemKey,
  value: unknown,
  fallback: string
) {
  const label = normalizeString(value, 40);
  if (!label) return fallback;
  if (LEGACY_CANVAS_TOOLBAR_DEFAULT_LABELS[key]?.includes(label)) {
    return fallback;
  }
  return label;
}

function normalizeInteger(
  value: unknown,
  fallback: number,
  min: number,
  max: number
) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value)
        : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

export function normalizeCanvasToolbarConfig(
  value: unknown
): CanvasToolbarConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawItems =
    raw.items && typeof raw.items === "object" && !Array.isArray(raw.items)
      ? (raw.items as Record<string, unknown>)
      : raw;
  const items = {} as Record<CanvasToolbarItemKey, CanvasToolbarItemConfig>;

  DEFAULT_CANVAS_TOOLBAR_ITEMS.forEach((defaultItem) => {
    const rawItem =
      rawItems[defaultItem.key] &&
      typeof rawItems[defaultItem.key] === "object" &&
      !Array.isArray(rawItems[defaultItem.key])
        ? (rawItems[defaultItem.key] as Record<string, unknown>)
        : {};
    const label = normalizeToolbarLabel(
      defaultItem.key,
      rawItem.label,
      defaultItem.label
    );
    const iconUrl = normalizeString(rawItem.iconUrl, 2000);

    items[defaultItem.key] = {
      label,
      iconUrl,
      enabled:
        typeof rawItem.enabled === "boolean" ? rawItem.enabled : true,
    };
  });

  return {
    items,
    selectedImageInlineActionCount: normalizeInteger(
      raw.selectedImageInlineActionCount,
      DEFAULT_SELECTED_IMAGE_INLINE_ACTION_COUNT,
      MIN_SELECTED_IMAGE_INLINE_ACTION_COUNT,
      MAX_SELECTED_IMAGE_INLINE_ACTION_COUNT
    ),
  };
}

export function getSelectedImageInlineActionCount(
  config: CanvasToolbarConfig | null | undefined
): number {
  return normalizeCanvasToolbarConfig(config).selectedImageInlineActionCount;
}

export function getDefaultCanvasToolbarItem(
  key: CanvasToolbarItemKey
): CanvasToolbarItemConfig {
  return DEFAULT_ITEM_BY_KEY[key];
}

export function getCanvasToolbarItem(
  config: CanvasToolbarConfig | null | undefined,
  key: CanvasToolbarItemKey
): CanvasToolbarItemConfig {
  return config?.items?.[key] || DEFAULT_ITEM_BY_KEY[key];
}

export function isCanvasToolbarItemEnabled(
  config: CanvasToolbarConfig | null | undefined,
  key: CanvasToolbarItemKey
): boolean {
  return getCanvasToolbarItem(config, key).enabled !== false;
}
