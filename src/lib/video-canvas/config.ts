// Modified for standalone community distribution; see NOTICE.
export const VIDEO_CANVAS_FUNCTION_CONFIG_KEY = "video_canvas_function_config";

export type VideoCanvasFunctionKind =
  | "multimodal"
  | "image"
  | "image-edit"
  | "video"
  | "audio"
  | "utility"
  | "workflow";

export type VideoCanvasBackendRoute =
  | "canvas-generate-image"
  | "canvas-generate-video"
  | "canvas-workflow-analyze"
  | "angle-edit"
  | "enhance"
  | "enhance-pro"
  | "extend"
  | "pick-object"
  | "remove-bg"
  | "layer-split"
  | "local";

export type VideoCanvasFunctionDefinition = {
  key: string;
  label: string;
  kind: VideoCanvasFunctionKind;
  route: VideoCanvasBackendRoute;
  enabled: boolean;
  model?: string;
  prompt: string;
  description: string;
  requiresBackend?: boolean;
};

export type VideoCanvasFunctionBillingCopy = {
  shortLabel: string;
  description: string;
};

export type VideoCanvasEffectPreset = {
  id: string;
  title: string;
  author: string;
  usageCount: number;
  model: string;
  thumbnailUrl: string;
  prompt: string;
  commercial: boolean;
};

export type VideoCanvasMotionPreset = {
  id: string;
  name: string;
  previewUrl: string;
  prompt: string;
};

export type VideoCanvasRolePreset = {
  id: string;
  assetId: string;
  name: string;
  accent: string;
  description: string;
  prompt: string;
  tags: string;
  compliant: boolean;
  images: {
    expression: string;
    face: string;
    full: string;
    threeView: string;
  };
  filters: {
    age: string;
    build: string;
    culture: string;
    era: string;
    gender: string;
    hairColor: string;
    species: string;
  };
};

export type VideoCanvasFunctionConfig = {
  enabled: boolean;
  defaultImageModel: string;
  defaultVideoModel: string;
  defaultMultimodalModel: string;
  effectPresets: VideoCanvasEffectPreset[];
  motionPresets: VideoCanvasMotionPreset[];
  rolePresets: VideoCanvasRolePreset[];
  functions: Record<string, VideoCanvasFunctionDefinition>;
};

const defaultFunctions: VideoCanvasFunctionDefinition[] = [
  {
    key: "story-beat-grid-4",
    label: "剧情推演四宫格",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为角色身份、服装、发型、场景光线、镜头距离和画面质感的唯一参考，生成一张 2x2 剧情推演四宫格合成图。画面中只能有 4 个画面区域，只允许一条竖向分割线和一条横向分割线；严禁出现 3 行 3 列、9 个画面区域或九宫格布局。四格都必须保持参考图的近景/半身近中景人物构图，主体占画面主要面积，不要远景、全景、森林空镜或主体很小的画面。四格是同一角色在同一自然光场景中的连续轻微剧情变化：1 正面安静凝视，2 保留参考图抬手/袖摆动作的延续，3 视线或表情轻微变化，4 情绪收束的近中景反应。保持五官、发型、绿色服装、柔和森林逆光、色调和景深一致；每格角度和动作有轻微差异，但不能像 9 个不同机位分镜。输出单张 16:9 图片，2x2 等分排版，分割线清晰干净，不能出现文字、水印、编号、边框标签或 3x3/5x5 宫格。",
    description: "官方剧情推演四宫格：基于参考图生成 2x2 连续剧情分镜合成图。",
  },
  {
    key: "character-three-view",
    label: "角色三视图生成",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为唯一角色参考，生成一张角色三视图设定图。只输出正面、侧面、背面 3 个完整站姿人物，三人横向并排在同一张 16:9 画面中，白色或浅灰干净背景。必须保持同一角色身份、五官、发型、绿色服装、材质、体型比例和配饰一致；正面、侧面、背面视角要清晰可辨，人物全身完整入画，站姿自然。禁止生成 3x3 九宫格、多机位分镜、黑色分割线、重复头像、文字、水印、编号、环境场景或额外人物。",
    description: "官方角色三视图预设，使用参考图生图/编辑模型。",
  },
  {
    key: "multi-view-nine-grid",
    label: "多机位九宫格",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为角色、服装、发型、场景光线的唯一参考，生成一张 3x3 多机位分镜合成图。必须是 9 个明显不同的镜头画面，不是同一张图裁切或重复人脸。九格分别包含：1 森林环境远景/主体很小，2 全身远景，3 中景正面，4 侧面半身，5 低机位或俯拍，6 面部近景，7 手部/衣袖/动作细节，8 背面或侧背，9 仰视或情绪特写。保持同一角色身份、绿色服装、自然森林光线一致，每格构图、景别、机位和主体大小必须不同。输出为单张 16:9 图片，九格之间使用清晰黑色分割线，不能出现文字、水印、编号，不能白底棚拍。",
    description: "官方九宫格工具：先生成带黑色分割线的 3x3 分镜图，再由宫格切分拆成单张镜头。",
  },
  {
    key: "continuous-storyboard-grid-25",
    label: "25宫格连贯分镜",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为角色、服装、发型、场景光线和电影质感的唯一参考，生成一张 5x5 连贯分镜合成图。必须是 25 个连续镜头，体现从远景建立场景、人物动作推进、情绪变化、细节特写到结尾反应的完整微型叙事，不是同一张图重复裁切。保持同一角色身份和绿色服装一致，森林自然光线统一；每格景别、机位、主体大小或动作都要有明显差异。输出为单张 16:9 图片，必须严格 5x5 等分排版，25 个宫格的宽高一致、间距一致、边界完整，所有宫格之间使用清晰纯黑分割线，分割线等宽且横线竖线都要贯穿整张图；禁止使用白线、浅色线、柔边、渐变线、不规则拼贴、错位排版、跨格大图、留白边距、文字、水印、编号或额外边框说明。",
    description: "官方 25 宫格连贯分镜：生成 5x5 连续镜头合成图。",
  },
  {
    key: "cinematic-lighting-correction",
    label: "电影级光影校正",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片为唯一参考，在保持角色身份、发型、服装、姿态和构图一致的前提下，进行电影级光影校正。增强自然逆光、轮廓光、皮肤通透感、背景层次和柔和景深，保留原始角色与场景，不改变人物数量，不生成宫格或分镜。输出单张 16:9 图片，不能出现文字、水印、编号或额外边框。",
    description: "官方电影级光影校正：对参考图做单张电影感光影重塑。",
  },
  {
    key: "frame-prediction-plus-3s",
    label: "画面推演 - 3秒后",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为当前画面，推演同一镜头时间线 3 秒后的画面。保持角色身份、服装、发型、场景和自然光线一致，只让动作、表情、衣袖/头发摆动、视线或镜头位置发生合理连续变化。输出单张 16:9 图片，不要生成宫格、分镜、文字、水印或编号。",
    description: "官方画面推演：根据当前帧生成 3 秒后的单帧结果。",
  },
  {
    key: "frame-prediction-minus-5s",
    label: "画面推演 - 5秒前",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "以选中图片作为当前画面，反向推演同一镜头时间线 5 秒前的画面。保持角色身份、服装、发型、场景和自然光线一致，只让动作起势、姿态、表情、衣袖/头发位置或镜头位置回到合理的前一状态。输出单张 16:9 图片，不要生成宫格、分镜、文字、水印或编号。",
    description: "官方画面推演：根据当前帧生成 5 秒前的单帧结果。",
  },
  {
    key: "grid-split",
    label: "宫格切分",
    kind: "utility",
    route: "local",
    enabled: true,
    prompt: "按当前图的标准宫格布局进行固定等分切分，将合成图切分为可单独调整的镜头图片。",
    description: "对齐官方画布：4/9/16/25 和自定义宫格都按当前图的行列固定等分切分，并支持在当前图上多选宫格后继续创建生图或高清节点。",
  },
  {
    key: "lighting",
    label: "打光",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt:
      "在保持主体、构图和身份一致的前提下，对图片进行电影级光影重塑，增强轮廓光、层次、对比和空间感，保留自然材质细节。",
    description: "图片编辑生图模型，复刻官方打光工具。",
  },
  {
    key: "hd-upscale",
    label: "高清",
    kind: "utility",
    route: "enhance",
    enabled: true,
    prompt: "提升图片清晰度、细节和分辨率，保持原图内容不变。",
    description: "接入现有图片增强接口；高清重绘可在模型字段指定增强 Pro。",
  },
  {
    key: "panorama-720",
    label: "720 全景",
    kind: "image-edit",
    route: "extend",
    enabled: true,
    prompt:
      "基于当前图片向四周扩展为 720 全景视野，保持主体与场景一致，补全自然环境和空间透视，避免变形和重复纹理。",
    description: "优先使用拓图接口，必要时可切到图片编辑生图模型。",
  },
  {
    key: "image-outpaint",
    label: "扩图",
    kind: "utility",
    route: "extend",
    enabled: true,
    prompt: "在保持主体不变的前提下扩展画面边界，补全自然背景和构图。",
    description: "对应官方高清菜单里的扩图。",
  },
  {
    key: "image-repaint",
    label: "重绘",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt: "保持主体结构和身份一致，按照用户补充提示重绘画面局部或整体风格。",
    description: "对应官方高清菜单里的重绘。",
  },
  {
    key: "image-erase",
    label: "擦除",
    kind: "image-edit",
    route: "canvas-generate-image",
    enabled: true,
    prompt: "根据用户标记或文字说明移除指定元素，并自然补全背景纹理。",
    description: "当前以前端提示词占位接图片编辑模型，后续可替换为蒙版编辑接口。",
  },
  {
    key: "remove-bg",
    label: "抠图",
    kind: "utility",
    route: "remove-bg",
    enabled: true,
    prompt: "移除图片背景，保留主体透明或干净背景结果。",
    description: "接入现有抠图接口。",
  },
  {
    key: "image-crop",
    label: "裁剪",
    kind: "utility",
    route: "local",
    enabled: true,
    prompt: "按用户选择的裁剪比例或宫格切片范围处理图片。",
    description: "本地画布裁剪/宫格切分能力。",
  },
  {
    key: "angle-edit",
    label: "多角度编辑器",
    kind: "image-edit",
    route: "angle-edit",
    enabled: true,
    prompt: "根据水平环绕、垂直俯仰和景别缩放参数生成新的角色/主体视角。",
    description: "接现有 /api/angle-edit，多角度编辑器提交时触发。",
  },
  {
    key: "story-script",
    label: "故事脚本生成",
    kind: "multimodal",
    route: "canvas-workflow-analyze",
    enabled: true,
    prompt: "根据输入文本、图片或视频参考，生成结构化分镜脚本，包含镜号、场景、画面、声音和镜头节奏。",
    description: "多模态大模型/文本模型生成脚本表格。",
  },
  {
    key: "video-analysis",
    label: "视频解析",
    kind: "multimodal",
    route: "canvas-workflow-analyze",
    enabled: true,
    prompt:
      "解析当前视频的镜头节奏、景别变化、主体动作、背景音乐、人声/音效、关键帧要点，并输出可直接衔接后续图像生成与视频生成节点的结构化故事表。",
    description: "多模态视频解析：抽取关键帧并输出视频故事表。",
  },
  {
    key: "image-to-prompt",
    label: "图片反推提示词",
    kind: "multimodal",
    route: "canvas-workflow-analyze",
    enabled: true,
    prompt: "分析参考图片，输出结构化中文提示词，包括主体、环境、构图、光影、镜头语言和风格关键词。",
    description: "多模态识图生成提示词。",
  },
  {
    key: "element-mark",
    label: "视频元素标记",
    kind: "multimodal",
    route: "pick-object",
    enabled: true,
    model: "qwen3-vl-plus",
    prompt:
      "图片中有一个红色圆形标记和十字线。请识别红色标记正中心所指向的视觉元素，并给出从宽泛主体到精确局部的可切换标签层级。若点中完整人物，首项用“人物”；若点中人物面部，首项用“人物面部”；若点中眼睛、手部等明确局部，可返回如 [\"人物\",\"眼睛\"] 的层级；商品或物体同理，先给完整主体，再给确实可见的局部。标签必须简短、客观、互不重复，每项不超过 8 个汉字，最多 4 项。严格返回纯 JSON：{\"name\":\"默认标签\",\"labels\":[\"默认标签\",\"更精确标签\"],\"position\":\"位置描述\",\"confidence\":0.95}。position 必须从以下选项中选择：{{positionOptions}}。不要输出 Markdown 或额外解释。",
    description: "视频节点“标记”使用的点选元素识别规则；结果以可切换的结构化标签写入提示词。",
    requiresBackend: true,
  },
  {
    key: "text-to-video",
    label: "文生视频",
    kind: "video",
    route: "canvas-generate-video",
    enabled: true,
    prompt: "根据文本描述生成短视频，保持镜头运动、节奏和电影级质感。",
    description: "视频生成模型，走现有视频生成接口。",
  },
  {
    key: "first-frame-video",
    label: "首帧图生视频",
    kind: "video",
    route: "canvas-generate-video",
    enabled: true,
    prompt: "以参考图片作为视频首帧，生成自然流畅的短视频。",
    description: "图片到视频/首帧生视频。",
  },
  {
    key: "first-last-frame-video",
    label: "首尾帧生成视频",
    kind: "video",
    route: "canvas-generate-video",
    enabled: true,
    prompt: "以两张参考图作为首帧和尾帧，生成首尾连贯的短视频。",
    description: "首尾帧视频生成。",
  },
  {
    key: "audio-to-video",
    label: "音频生视频",
    kind: "video",
    route: "canvas-generate-video",
    enabled: true,
    prompt: "根据上传音频生成对应场景画面，镜头语言、节奏、音乐匹配情绪变化，电影级质感。",
    description: "官方为音频+参考图到视频；当前先接视频生成提示词和参考图，音频节拍解析接口后续补充。",
    requiresBackend: true,
  },
];

export const defaultVideoCanvasEffectPresets: VideoCanvasEffectPreset[] = [
  {
    id: "bee-camera",
    title: "小蜜蜂运镜",
    author: "赛博蒲公英",
    usageCount: 1100,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "使用微型飞行器第一人称视角快速穿行场景，贴近主体掠过并保持连续、灵活的空间运动，形成小蜜蜂般轻盈迅捷的运镜。",
    commercial: true,
  },
  {
    id: "cloud-dive",
    title: "穿云而入",
    author: "数据星云",
    usageCount: 528,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "镜头从高空云层快速向下俯冲，穿透云雾后自然揭示参考图主体和场景，保持方向连续并强化速度与纵深感。",
    commercial: true,
  },
  {
    id: "horizon-flight",
    title: "飞跃地平线",
    author: "赛博蒲公英",
    usageCount: 1000,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "镜头低空高速前进并在接近地平线时抬升飞越，空间尺度逐步展开，主体和环境运动保持稳定连贯。",
    commercial: true,
  },
  {
    id: "reverse-gravity",
    title: "逆转引力",
    author: "量子呢喃",
    usageCount: 239,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "让场景和主体在保持结构一致的前提下出现引力反转，镜头随空间翻转并平滑过渡，避免突然跳切和形体崩坏。",
    commercial: true,
  },
  {
    id: "earth-zoom",
    title: "地球缩放",
    author: "数字游隼",
    usageCount: 180,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "从参考场景连续快速拉远到城市、云层和地球尺度，保持地理方向和中心主体一致，形成无缝地球缩放转场。",
    commercial: true,
  },
  {
    id: "global-zoom",
    title: "环球缩放",
    author: "比特浮尘",
    usageCount: 184,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "围绕地球尺度完成连续环绕和缩放，镜头从局部场景扩展至全球视野后平滑落回目标区域，运动轨迹清晰稳定。",
    commercial: true,
  },
  {
    id: "iris-push",
    title: "瞳孔推镜",
    author: "参数迷宫",
    usageCount: 387,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "镜头平滑推近人物眼睛并穿入瞳孔，以瞳孔纹理作为转场中心，保持面部身份稳定并避免眼部畸变。",
    commercial: true,
  },
  {
    id: "earth-dive",
    title: "俯冲地球",
    author: "神经元旋涡",
    usageCount: 275,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "从太空视角向地球目标区域高速俯冲，依次穿过大气、云层和城市，最终自然抵达参考画面。",
    commercial: true,
  },
  {
    id: "product-light-sweep",
    title: "产品扫光",
    author: "模型幻景",
    usageCount: 943,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "在不改变产品造型、材质和品牌细节的前提下，让精致轮廓光从一侧平滑扫过产品表面，突出质感与高光细节。",
    commercial: true,
  },
  {
    id: "prada-change",
    title: "普拉达换装",
    author: "量子呢喃",
    usageCount: 71,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "保持人物身份、姿态和镜头不变，以高级时装广告节奏完成连续换装，服装材质真实且每次变化衔接自然。",
    commercial: true,
  },
  {
    id: "multi-angle",
    title: "多角度定点",
    author: "代码极光",
    usageCount: 546,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "围绕主体在多个固定机位间平滑切换，主体位置和比例保持稳定，每个角度清晰展示不同侧面并避免身份漂移。",
    commercial: true,
  },
  {
    id: "underwater-slow",
    title: "水下慢镜头",
    author: "代码极光",
    usageCount: 253,
    model: "Seedance 2.0",
    thumbnailUrl: "/placeholders/preview.svg",
    prompt: "将动作转为水下慢镜头质感，加入自然漂浮、细微气泡和柔和水体折射，保持主体外观清晰并让运动流畅连贯。",
    commercial: true,
  },
  ...[
    ["eye-makeup", "试妆特写", "像素漫游者", 98, "iris-push.webp"],
    ["float-in", "悬浮缓入", "像素漫游者", 171, "cloud-dive.webp"],
    ["macro-push", "微距推镜", "智能碎屑", 273, "product-light-sweep.webp"],
    ["helicopter-reveal", "直升机揭幕", "认知碎片", 100, "horizon-flight.webp"],
    ["mountain-chase", "山路追击", "代码极光", 185, "multi-angle.webp"],
    ["snow-race", "雪地赛车", "智能碎屑", 102, "earth-dive.webp"],
    ["city-drive", "City Drive", "像素漫游者", 70, "bee-camera.webp"],
    ["deconstruct-3d", "3D解构", "算法织梦者", 296, "reverse-gravity.webp"],
    ["face-orbit", "面部环拍", "比特浮尘", 183, "multi-angle.webp"],
    ["showroom", "Showroom", "智能碎屑", 65, "product-light-sweep.webp"],
    ["jewelry-closeup", "饰品特写", "逻辑褶皱", 62, "product-light-sweep.webp"],
    ["giant-lookdown", "巨人俯瞰", "算法织梦者", 116, "reverse-gravity.webp"],
    ["runway", "Runway", "算力潮汐", 81, "horizon-flight.webp"],
    ["ai-dance", "AI 编舞", "比特浮尘", 501, "multi-angle.webp"],
    ["android", "机械姬", "认知碎片", 137, "product-light-sweep.webp"],
    ["star-scene", "巨星名场面", "数据星云", 80, "horizon-flight.webp"],
    ["mirror-double", "镜面分身", "赛博蒲公英", 56, "reverse-gravity.webp"],
    ["iris-mutation", "瞳孔异变", "数字游隼", 50, "iris-push.webp"],
  ].map(([id, title, author, usageCount, thumbnail]) => ({
    id: String(id),
    title: String(title),
    author: String(author),
    usageCount: Number(usageCount),
    model: "Seedance 2.0",
    thumbnailUrl: `/video-canvas/effects/${String(thumbnail)}`,
    prompt: `保持参考主体和画面结构稳定，应用“${String(title)}”的专业视频特效与镜头运动，过渡自然、动作连续、避免形体畸变和闪烁。`,
    commercial: true,
  })),
];

const defaultMotionPreviewUrls = {
  still: "/placeholders/preview.svg",
  follow: "/placeholders/preview.svg",
  orbit: "/placeholders/preview.svg",
  tilt: "/placeholders/preview.svg",
  pan: "/placeholders/preview.svg",
  rise: "/placeholders/preview.svg",
  descend: "/placeholders/preview.svg",
  push: "/placeholders/preview.svg",
  pull: "/placeholders/preview.svg",
  zoom: "/placeholders/preview.svg",
} as const;

export const defaultVideoCanvasMotionPresets: VideoCanvasMotionPreset[] = [
  { id: "fixed", name: "固定镜头", previewUrl: defaultMotionPreviewUrls.still, prompt: "固定镜头" },
  { id: "follow", name: "跟随拍摄", previewUrl: defaultMotionPreviewUrls.follow, prompt: "跟随拍摄" },
  { id: "orbit-up", name: "盘旋抬升", previewUrl: defaultMotionPreviewUrls.orbit, prompt: "盘旋抬升" },
  { id: "orbit-down", name: "盘旋下降", previewUrl: defaultMotionPreviewUrls.orbit, prompt: "盘旋下降" },
  { id: "tilt-up", name: "镜头上摇", previewUrl: defaultMotionPreviewUrls.tilt, prompt: "镜头上摇" },
  { id: "tilt-down", name: "镜头下摇", previewUrl: defaultMotionPreviewUrls.tilt, prompt: "镜头下摇" },
  { id: "pan-left", name: "镜头左摇", previewUrl: defaultMotionPreviewUrls.pan, prompt: "镜头左摇" },
  { id: "pan-right", name: "镜头右摇", previewUrl: defaultMotionPreviewUrls.pan, prompt: "镜头右摇" },
  { id: "rise", name: "镜头上升", previewUrl: defaultMotionPreviewUrls.rise, prompt: "镜头上升" },
  { id: "descend", name: "镜头下降", previewUrl: defaultMotionPreviewUrls.descend, prompt: "镜头下降" },
  { id: "truck-left", name: "镜头左移", previewUrl: defaultMotionPreviewUrls.pan, prompt: "镜头左移" },
  { id: "truck-right", name: "镜头右移", previewUrl: defaultMotionPreviewUrls.pan, prompt: "镜头右移" },
  { id: "push-in", name: "镜头前推", previewUrl: defaultMotionPreviewUrls.push, prompt: "镜头前推" },
  { id: "pull-out", name: "镜头后移", previewUrl: defaultMotionPreviewUrls.pull, prompt: "镜头后移" },
  { id: "zoom-in", name: "变焦推进", previewUrl: defaultMotionPreviewUrls.push, prompt: "变焦推进" },
  { id: "zoom-out", name: "变焦拉远", previewUrl: defaultMotionPreviewUrls.zoom, prompt: "变焦拉远" },
  { id: "dolly-zoom", name: "柯克变焦", previewUrl: defaultMotionPreviewUrls.zoom, prompt: "柯克变焦" },
  { id: "orbit", name: "环绕拍摄", previewUrl: defaultMotionPreviewUrls.orbit, prompt: "环绕拍摄" },
  { id: "roll", name: "滚筒旋转", previewUrl: defaultMotionPreviewUrls.orbit, prompt: "滚筒旋转" },
  { id: "first-person", name: "第一视角", previewUrl: defaultMotionPreviewUrls.follow, prompt: "第一视角" },
];

const defaultRoleImages: VideoCanvasRolePreset["images"] = {
  expression:
    "/placeholders/preview.svg",
  face:
    "/placeholders/preview.svg",
  full:
    "/placeholders/preview.svg",
  threeView:
    "/placeholders/preview.svg",
};

function createDefaultRolePreset(
  input: Omit<VideoCanvasRolePreset, "assetId" | "compliant" | "images">,
): VideoCanvasRolePreset {
  return {
    ...input,
    assetId: `public-role:${input.id}`,
    compliant: true,
    images: { ...defaultRoleImages },
  };
}

export const defaultVideoCanvasRolePresets: VideoCanvasRolePreset[] = [
  createDefaultRolePreset({
    id: "fresh-girl",
    name: "甜妹/清新少女",
    accent: "linear-gradient(135deg,#ffd8df,#ffd4a8)",
    description: "甜妹/清新少女，含角色立绘、脸部近景、表情参考与三视图。",
    prompt: "保持清新少女的五官、发型、浅色穿搭和温柔气质稳定，动作自然，所有镜头中身份一致。",
    tags: "女主 女 现代 青年 温柔",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "女", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "executive-man",
    name: "霸总/精英大佬",
    accent: "linear-gradient(135deg,#d6e3ff,#a8b5ff)",
    description: "精英大佬/霸总角色，西装、冷静、掌控感强。",
    prompt: "保持都市精英男性的面部、黑发、深色西装和冷静强势气质稳定，避免身份与服装漂移。",
    tags: "男主 男 现代 青年 精英",
    filters: { age: "青年", build: "健壮", culture: "东亚", era: "现代", gender: "男", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "gentle-mature-man",
    name: "温柔熟男/理想男友",
    accent: "linear-gradient(135deg,#f6e6c9,#d4b98b)",
    description: "成熟、稳定、生活感强，适合情感叙事和陪伴感镜头。",
    prompt: "保持成熟温柔男性的面部、发型、针织穿搭和温暖眼神一致，表演自然克制。",
    tags: "男主 男 现代 熟男 温柔",
    filters: { age: "中年", build: "匀称", culture: "东亚", era: "现代", gender: "男", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "cool-heiress",
    name: "清冷千金/白切黑女主",
    accent: "linear-gradient(135deg,#f2f4ff,#bcc8e8)",
    description: "外表克制优雅、内在反差强，适合悬疑和都市情节。",
    prompt: "保持清冷女性的五官、黑发、浅色套装和克制表情一致，突出优雅与反差感。",
    tags: "女主 女 现代 青年 清冷",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "女", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "ancient-male-lead",
    name: "古风男主",
    accent: "linear-gradient(135deg,#d9c7a8,#8f6d47)",
    description: "长袍束发、侠气和权谋感兼具，适合宫廷、江湖和玄幻故事。",
    prompt: "保持古风男性的五官、束发、长袍材质和沉稳英气一致，动作符合古装角色身份。",
    tags: "男主 男 古风 青年 英气",
    filters: { age: "青年", build: "健壮", culture: "东亚", era: "古代", gender: "男", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "ancient-female-lead",
    name: "古风女主",
    accent: "linear-gradient(135deg,#ffdce8,#b7d9ff)",
    description: "柔美但有行动力，适合穿越、宫廷、仙侠和小说推文分镜。",
    prompt: "保持古风女性的五官、精致发髻、浅色罗裙和柔美坚定气质一致，避免妆造漂移。",
    tags: "女主 女 古风 青年 柔美",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "古代", gender: "女", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "villainess",
    name: "恶毒女配/白莲花",
    accent: "linear-gradient(135deg,#ffe9f1,#e4b8d5)",
    description: "表情管理强，适合冲突镜头、反派转折和情绪戏。",
    prompt: "保持精致女性反派的身份、妆发和华丽服装一致，用细微表情表现柔弱外表与反派反差。",
    tags: "女配 女 现代 反派 戏剧",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "女", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "lifestyle-person",
    name: "生活方式普通人",
    accent: "linear-gradient(135deg,#e7f2d3,#b6d49a)",
    description: "真实自然、易代入，适合口播、日常剧情和产品场景。",
    prompt: "保持普通生活方式人物的身份、自然穿搭和真实表情一致，避免过度精修与商业模特感。",
    tags: "普通人 现代 日常 真实",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "中性", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "fashion-asian-man",
    name: "时尚感亚洲男生",
    accent: "linear-gradient(135deg,#d7f0ff,#8dc5e8)",
    description: "潮流、干净、镜头表现力强，适合品牌短片和社媒内容。",
    prompt: "保持时尚亚洲男性的面部、妆发和潮流穿搭一致，呈现干净自信的商业镜头表现。",
    tags: "男 亚洲 时尚 青年",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "男", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "fashion-asian-woman",
    name: "时尚感亚洲女生",
    accent: "linear-gradient(135deg,#ffe2ef,#ffd0bc)",
    description: "造型感强，适合妆造、服饰、电商和生活方式短片。",
    prompt: "保持时尚亚洲女性的五官、精致妆发和潮流穿搭一致，姿态自信，服饰细节稳定。",
    tags: "女 亚洲 时尚 青年",
    filters: { age: "青年", build: "匀称", culture: "东亚", era: "现代", gender: "女", hairColor: "黑发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "fashion-western-man",
    name: "时尚感欧美男生",
    accent: "linear-gradient(135deg,#dde7ff,#c7d0dc)",
    description: "轮廓鲜明，适合国际化品牌、运动、科技和旅拍内容。",
    prompt: "保持时尚欧美男性的鲜明轮廓、发型和现代穿搭一致，动作有品牌广告的克制力量感。",
    tags: "男 欧美 时尚 青年",
    filters: { age: "青年", build: "健壮", culture: "欧美", era: "现代", gender: "男", hairColor: "棕发", species: "人类" },
  }),
  createDefaultRolePreset({
    id: "fashion-western-woman",
    name: "时尚感欧美女生",
    accent: "linear-gradient(135deg,#ffe5f5,#d8c2ff)",
    description: "适合美妆、服饰、旅行和高质感商业镜头。",
    prompt: "保持时尚欧美女性的五官、精致造型和现代服饰一致，呈现明亮自信的商业大片质感。",
    tags: "女 欧美 时尚 青年",
    filters: { age: "青年", build: "匀称", culture: "欧美", era: "现代", gender: "女", hairColor: "棕发", species: "人类" },
  }),
];

export const defaultVideoCanvasFunctionConfig: VideoCanvasFunctionConfig = {
  enabled: true,
  defaultImageModel: "auto",
  defaultVideoModel: "auto",
  defaultMultimodalModel: "auto",
  effectPresets: defaultVideoCanvasEffectPresets,
  motionPresets: defaultVideoCanvasMotionPresets,
  rolePresets: defaultVideoCanvasRolePresets,
  functions: Object.fromEntries(defaultFunctions.map((item) => [item.key, item])),
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

const legacyFunctionPrompts: Record<string, string[]> = {
  "story-beat-grid-4": [
    "以选中图片作为角色身份、服装、发型、场景光线、镜头距离和画面质感的唯一参考，生成一张 2x2 剧情推演四宫格合成图。四格都必须保持参考图的近景/半身近中景人物构图，主体占画面主要面积，不要远景、全景、森林空镜或主体很小的画面。四格是同一角色在同一自然光场景中的连续轻微剧情变化：1 正面安静凝视，2 保留参考图抬手/袖摆动作的延续，3 视线或表情轻微变化，4 情绪收束的近中景反应。保持五官、发型、绿色服装、柔和森林逆光、色调和景深一致；每格角度和动作有轻微差异，但不能像 9 个不同机位分镜。输出单张 16:9 图片，2x2 等分排版，分割线清晰干净，不能出现文字、水印、编号、边框标签或 3x3/5x5 宫格。",
    "以选中图片作为角色、服装、发型、场景光线的唯一参考，生成一张 3x3 多机位分镜合成图。必须是 9 个明显不同的镜头画面，不是同一张图裁切或重复人脸。九格分别包含：1 森林环境远景/主体很小，2 全身远景，3 中景正面，4 侧面半身，5 低机位或俯拍，6 面部近景，7 手部/衣袖/动作细节，8 背面或侧背，9 仰视或情绪特写。保持同一角色身份、绿色服装、自然森林光线一致，每格构图、景别、机位和主体大小必须不同。输出为单张 16:9 图片，九格之间使用清晰黑色分割线，不能出现文字、水印、编号，不能白底棚拍。",
  ],
  "continuous-storyboard-grid-25": [
    "以选中图片作为角色、服装、发型、场景光线和电影质感的唯一参考，生成一张 5x5 连贯分镜合成图。必须是 25 个连续镜头，体现从远景建立场景、人物动作推进、情绪变化、细节特写到结尾反应的完整微型叙事，不是同一张图重复裁切。保持同一角色身份和绿色服装一致，森林自然光线统一；每格景别、机位、主体大小或动作都要有明显差异。输出为单张 16:9 图片，5x5 等分排版，使用清晰分割线，不能出现文字、水印、编号或多余边框说明。",
  ],
  "character-three-view": [
    "以输入角色图为唯一角色参考，生成正面、侧面、背面三视图角色设定图。保持五官、发型、服装、颜色和体型一致，干净白底，三视图水平排布，适合后续视频角色一致性使用。",
  ],
};

const legacyFunctionLabels: Record<string, string[]> = {
  "character-three-view": ["角色三视图"],
};

function normalizeComparableText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function normalizeFunctionLabel(
  key: string,
  value: unknown,
  fallbackLabel: string,
) {
  const label = typeof value === "string" ? value.trim() : "";
  if (!label) return fallbackLabel;
  const normalizedLabel = normalizeComparableText(label);
  const isLegacyLabel = (legacyFunctionLabels[key] || []).some(
    (legacyLabel) => normalizeComparableText(legacyLabel) === normalizedLabel,
  );
  return isLegacyLabel ? fallbackLabel : label;
}

function normalizeFunctionPrompt(
  key: string,
  value: unknown,
  fallbackPrompt: string,
) {
  const prompt = typeof value === "string" ? value.trim() : "";
  if (!prompt) return fallbackPrompt;
  const normalizedPrompt = normalizeComparableText(prompt);
  const isStoryPromptClearlyNineGrid =
    key === "story-beat-grid-4" &&
    /(?:生成一张\s*3\s*[x×]\s*3|生成一张[^。]*九宫格|九格分别|必须是\s*9\s*个)/.test(
      normalizedPrompt,
    );
  if (isStoryPromptClearlyNineGrid) return fallbackPrompt;
  const isLegacyPrompt = (legacyFunctionPrompts[key] || []).some(
    (legacyPrompt) => normalizeComparableText(legacyPrompt) === normalizedPrompt,
  );
  return isLegacyPrompt ? fallbackPrompt : prompt;
}

function normalizeFunctionDefinition(
  key: string,
  value: unknown,
  fallback: VideoCanvasFunctionDefinition,
): VideoCanvasFunctionDefinition {
  const incoming = isRecord(value) ? value : {};
  const normalized: VideoCanvasFunctionDefinition = {
    ...fallback,
    key,
    label: normalizeFunctionLabel(key, incoming.label, fallback.label),
    kind: (incoming.kind as VideoCanvasFunctionKind) || fallback.kind,
    route: (incoming.route as VideoCanvasBackendRoute) || fallback.route,
    enabled: typeof incoming.enabled === "boolean" ? incoming.enabled : fallback.enabled,
    model: typeof incoming.model === "string" ? incoming.model : fallback.model,
    prompt: normalizeFunctionPrompt(key, incoming.prompt, fallback.prompt),
    description: String(incoming.description || fallback.description),
    requiresBackend:
      typeof incoming.requiresBackend === "boolean"
        ? incoming.requiresBackend
        : fallback.requiresBackend,
  };
  return normalized;
}

export function normalizeVideoCanvasFunctionConfig(value: unknown): VideoCanvasFunctionConfig {
  if (!isRecord(value)) return defaultVideoCanvasFunctionConfig;
  const incomingFunctions = isRecord(value.functions) ? value.functions : {};
  const functions: Record<string, VideoCanvasFunctionDefinition> = {};

  for (const [key, fallback] of Object.entries(defaultVideoCanvasFunctionConfig.functions)) {
    functions[key] = normalizeFunctionDefinition(key, incomingFunctions[key], fallback);
  }

  for (const [key, customValue] of Object.entries(incomingFunctions)) {
    if (functions[key] || !isRecord(customValue)) continue;
    const fallback: VideoCanvasFunctionDefinition = {
      key,
      label: String(customValue.label || key),
      kind: (customValue.kind as VideoCanvasFunctionKind) || "workflow",
      route: (customValue.route as VideoCanvasBackendRoute) || "local",
      enabled: customValue.enabled !== false,
      prompt: String(customValue.prompt || ""),
      description: String(customValue.description || "自定义视频画布功能"),
    };
    functions[key] = normalizeFunctionDefinition(key, customValue, fallback);
  }

  return {
    enabled: value.enabled !== false,
    defaultImageModel:
      typeof value.defaultImageModel === "string" && value.defaultImageModel.trim()
        ? value.defaultImageModel.trim()
        : defaultVideoCanvasFunctionConfig.defaultImageModel,
    defaultVideoModel:
      typeof value.defaultVideoModel === "string" && value.defaultVideoModel.trim()
        ? value.defaultVideoModel.trim()
        : defaultVideoCanvasFunctionConfig.defaultVideoModel,
    defaultMultimodalModel:
      typeof value.defaultMultimodalModel === "string" && value.defaultMultimodalModel.trim()
        ? value.defaultMultimodalModel.trim()
        : defaultVideoCanvasFunctionConfig.defaultMultimodalModel,
    effectPresets: Array.isArray(value.effectPresets) && value.effectPresets.length > 0
      ? value.effectPresets
          .slice(0, 100)
          .map((item, index) => {
            const incoming = isRecord(item) ? item : {};
            const fallback =
              defaultVideoCanvasEffectPresets[index] ||
              defaultVideoCanvasEffectPresets[0];
            return {
              id: String(incoming.id || fallback.id || `effect-${index + 1}`),
              title: String(incoming.title || fallback.title || `视频特效 ${index + 1}`),
              author: String(incoming.author || fallback.author || "官方预设"),
              usageCount: Math.max(
                0,
                Math.round(Number(incoming.usageCount ?? fallback.usageCount) || 0),
              ),
              model: String(incoming.model || fallback.model || "Seedance 2.0"),
              thumbnailUrl: String(
                incoming.thumbnailUrl || fallback.thumbnailUrl || "",
              ),
              prompt: String(incoming.prompt || fallback.prompt || ""),
              commercial:
                typeof incoming.commercial === "boolean"
                  ? incoming.commercial
                  : fallback.commercial,
            } satisfies VideoCanvasEffectPreset;
          })
          .filter((item) => item.title && item.thumbnailUrl)
      : defaultVideoCanvasEffectPresets,
    motionPresets: Array.isArray(value.motionPresets) && value.motionPresets.length > 0
      ? value.motionPresets
          .slice(0, 100)
          .map((item, index) => {
            const incoming = isRecord(item) ? item : {};
            const fallback =
              defaultVideoCanvasMotionPresets[index] ||
              defaultVideoCanvasMotionPresets[0];
            return {
              id: String(incoming.id || fallback.id || `motion-${index + 1}`),
              name: String(incoming.name || fallback.name || `运镜 ${index + 1}`),
              previewUrl: String(
                incoming.previewUrl || fallback.previewUrl || "",
              ),
              prompt: String(incoming.prompt || fallback.prompt || ""),
            } satisfies VideoCanvasMotionPreset;
          })
          .filter((item) => item.name && item.previewUrl)
      : defaultVideoCanvasMotionPresets,
    rolePresets: Array.isArray(value.rolePresets) && value.rolePresets.length > 0
      ? value.rolePresets
          .slice(0, 100)
          .map((item, index) => {
            const incoming = isRecord(item) ? item : {};
            const fallback =
              defaultVideoCanvasRolePresets[index] ||
              defaultVideoCanvasRolePresets[0];
            const incomingImages = isRecord(incoming.images) ? incoming.images : {};
            const incomingFilters = isRecord(incoming.filters) ? incoming.filters : {};
            return {
              id: String(incoming.id || fallback.id || `role-${index + 1}`),
              assetId: String(
                incoming.assetId || fallback.assetId || `public-role:role-${index + 1}`,
              ),
              name: String(incoming.name || fallback.name || `角色 ${index + 1}`),
              accent: String(incoming.accent || fallback.accent || "#525252"),
              description: String(incoming.description || fallback.description || ""),
              prompt: String(incoming.prompt || fallback.prompt || ""),
              tags: String(incoming.tags || fallback.tags || ""),
              compliant:
                typeof incoming.compliant === "boolean"
                  ? incoming.compliant
                  : fallback.compliant,
              images: {
                expression: String(
                  incomingImages.expression || fallback.images.expression || "",
                ),
                face: String(incomingImages.face || fallback.images.face || ""),
                full: String(incomingImages.full || fallback.images.full || ""),
                threeView: String(
                  incomingImages.threeView || fallback.images.threeView || "",
                ),
              },
              filters: {
                age: String(incomingFilters.age || fallback.filters.age || ""),
                build: String(incomingFilters.build || fallback.filters.build || ""),
                culture: String(
                  incomingFilters.culture || fallback.filters.culture || "",
                ),
                era: String(incomingFilters.era || fallback.filters.era || ""),
                gender: String(
                  incomingFilters.gender || fallback.filters.gender || "",
                ),
                hairColor: String(
                  incomingFilters.hairColor || fallback.filters.hairColor || "",
                ),
                species: String(
                  incomingFilters.species || fallback.filters.species || "",
                ),
              },
            } satisfies VideoCanvasRolePreset;
          })
          .filter((item) => item.name && item.images.full)
      : defaultVideoCanvasRolePresets,
    functions,
  };
}

export function getVideoCanvasFunctionBillingCopy(
  definition: Pick<VideoCanvasFunctionDefinition, "key" | "route">
): VideoCanvasFunctionBillingCopy {
  if (definition.route === "local") {
    return {
      shortLabel: "本地",
      description: "本地画布工具，不单独扣积分。",
    };
  }

  if (definition.key === "character-three-view" || definition.key === "multi-view-nine-grid") {
    return {
      shortLabel: "多视角",
      description: "跟随全站“图片多视角”积分设置，不在视频画布单独改价。",
    };
  }

  if (definition.key === "image-repaint") {
    return {
      shortLabel: "重绘",
      description: "跟随全站“图片重绘”积分设置，不在视频画布单独改价。",
    };
  }

  if (definition.route === "remove-bg") {
    return {
      shortLabel: "抠图",
      description: "跟随全站“抠图”积分设置，不在视频画布单独改价。",
    };
  }

  if (definition.route === "extend") {
    return {
      shortLabel: "扩图",
      description: "跟随全站“图像拓展”积分设置，不在视频画布单独改价。",
    };
  }

  if (definition.route === "enhance-pro") {
    return {
      shortLabel: "增强Pro",
      description: "跟随全站“图像增强 Pro”积分设置，不在视频画布单独改价。",
    };
  }

  if (definition.route === "enhance") {
    return {
      shortLabel: "按站点",
      description: "沿用站点统一高清/增强能力，不在视频画布单独配置扣点。",
    };
  }

  if (definition.route === "canvas-generate-video") {
    return {
      shortLabel: "按站点",
      description: "沿用站点统一视频模型与积分规则，不在视频画布单独改价。",
    };
  }

  if (definition.route === "canvas-workflow-analyze" || definition.route === "angle-edit") {
    return {
      shortLabel: "按站点",
      description: "沿用站点统一模型与功能规则，不在视频画布单独改价。",
    };
  }

  return {
    shortLabel: "按站点",
    description: "沿用站点统一图片生成与功能积分规则，不在视频画布单独改价。",
  };
}
