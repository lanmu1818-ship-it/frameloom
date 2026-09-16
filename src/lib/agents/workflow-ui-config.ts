// Modified for standalone community distribution; see NOTICE.
import type {
  AgentWorkflowBusinessModeConfig,
  AgentWorkflowBusinessModeIconKey,
  AgentWorkflowBusinessModeKey,
  AgentWorkflowBusinessModeSettings,
  AgentWorkflowBrandStoreEntry,
  AgentWorkflowCategoryLabels,
  AgentWorkflowConstraintSettings,
  AgentWorkflowFourthCategoryEntry,
  AgentWorkflowOptionUiConfig,
  AgentWorkflowOfficialSecondCategoryEntry,
  AgentWorkflowOfficialThirdCategoryEntry,
  AgentWorkflowPageFeatureSettings,
  AgentWorkflowStoreEntry,
  AgentWorkflowThirdCategoryEntry,
  AgentWorkflowStepKey,
  AgentWorkflowStepUiConfig,
  AgentWorkflowUiConfig,
} from "@/types/agent";

export const AGENT_WORKFLOW_UI_CONFIG_KEY = "agent_workflow_ui_config";
export const AGENT_WORKFLOW_MAX_TREE_DEPTH = 8;
export const AGENT_WORKFLOW_MAX_OPTION_DEPTH = 100;
export const AGENT_WORKFLOW_PROMPT_FRAGMENT_MAX_LENGTH = 20_000;
export const AGENT_WORKFLOW_BLOCKED_OPTION_KEYS_MAX = 5000;
export const AGENT_WORKFLOW_INPUT_OPTIONS_MAX_ITEMS = 5000;
const AGENT_WORKFLOW_SPECIAL_MODULE_ALLOWED_KEYS_MAX = 5000;
export const defaultAgentWorkflowCategoryLabels: AgentWorkflowCategoryLabels = {
  firstCategory: "品牌",
  secondCategory: "店铺",
  thirdCategory: "三级分类",
  fourthCategory: "四级分类",
  fifthCategory: "五级分类",
};
export const defaultAgentWorkflowOfficialCategoryEntries: AgentWorkflowOfficialSecondCategoryEntry[] = [
  {
    categoryName: "住宅家具",
    thirdCategories: [
      "柜类",
      "床类",
      "床垫类",
      "沙发类",
      "坐具类",
      "几类",
      "桌类",
      "架类",
      "箱类",
      "镜子类",
      "榻榻米空间",
      "根雕类",
      "屏风/花窗",
      "案/台类",
      "户外/庭院家具",
      "宜家IKEA",
      "家具辅料",
      "二手/闲置专区",
      "成套家具",
      "情趣家具",
      "设计师家具",
    ],
    thirdCategoryEntries: [
      "柜类",
      "床类",
      "床垫类",
      "沙发类",
      "坐具类",
      "几类",
      "桌类",
      "架类",
      "箱类",
      "镜子类",
      "榻榻米空间",
      "根雕类",
      "屏风/花窗",
      "案/台类",
      "户外/庭院家具",
      "宜家IKEA",
      "家具辅料",
      "二手/闲置专区",
      "成套家具",
      "情趣家具",
      "设计师家具",
    ].map((categoryName, sortOrder) => ({ categoryName, sortOrder })),
    sortOrder: 0,
  },
];
export const defaultAgentWorkflowConstraintSettings: AgentWorkflowConstraintSettings = {
  crossLevelMutualExclusionEnabled: false,
};
export const defaultAgentWorkflowPageFeatureSettings: AgentWorkflowPageFeatureSettings = {
  presetStepEnabled: true,
  materialStepEnabled: true,
};
export const defaultAgentWorkflowBusinessModeSettings: AgentWorkflowBusinessModeSettings = {
  modes: [
    {
      key: "main_sku",
      title: "主图/SKU图模式",
      description: "用于主图、SKU 图和场景化商品图输出，复用当前 Agent 提示词配置。",
      enabled: true,
      iconKey: "main-sku",
      customSvgUrl: "",
      defaultModelId: null,
      sortOrder: 0,
    },
    {
      key: "detail",
      title: "详情模式",
      description: "包含详情图替换和详情图生成，适合做商品详情页内容。",
      enabled: true,
      iconKey: "detail",
      customSvgUrl: "",
      defaultModelId: null,
      sortOrder: 1,
      referenceReplaceEnabled: true,
      aiDetailGenerateEnabled: true,
    },
    {
      key: "buyer_show",
      title: "买家秀模式",
      description: "买家秀业务模块已预留，后续可在这里接入专用素材和提示词规则。",
      enabled: false,
      iconKey: "buyer-show",
      customSvgUrl: "",
      defaultModelId: null,
      sortOrder: 2,
    },
  ],
};

export interface AgentWorkflowBrandCategoryOption {
  value: string;
  level: "third" | "fourth" | "fifth";
  levelLabel: string;
}

export interface FlattenedAgentWorkflowStep {
  step: AgentWorkflowStepUiConfig;
  depth: number;
  parentKeys: string[];
}

export interface AgentWorkflowMissingPreviewOption {
  key: string;
  label: string;
  path: string;
  stepKey: string;
  stepPath: string;
  disabled: boolean;
  childCount: number;
}

function cloneOption(
  option: AgentWorkflowOptionUiConfig
): AgentWorkflowOptionUiConfig {
  return {
    ...option,
    description: option.description || "",
    previewImageUrl: option.previewImageUrl || "",
    previewImageSourceUrl: option.previewImageSourceUrl || "",
    promptFragment: option.promptFragment || "",
    blockedOptionKeys: Array.from(new Set((option.blockedOptionKeys || []).filter(Boolean))).slice(
      0,
      AGENT_WORKFLOW_BLOCKED_OPTION_KEYS_MAX
    ),
    availableOfficialCategoryKeys: Array.from(
      new Set((option.availableOfficialCategoryKeys || []).filter(Boolean))
    ).slice(0, AGENT_WORKFLOW_INPUT_OPTIONS_MAX_ITEMS),
    specialModuleEnabled: Boolean(option.specialModuleEnabled),
    specialModuleExclusionEnabled: Boolean(option.specialModuleExclusionEnabled),
    specialModuleAllowedOptionKeys: Array.from(
      new Set((option.specialModuleAllowedOptionKeys || []).filter(Boolean))
    ).slice(0, AGENT_WORKFLOW_SPECIAL_MODULE_ALLOWED_KEYS_MAX),
    children: (option.children || []).map(cloneOption),
  };
}

function cloneStep(step: AgentWorkflowStepUiConfig): AgentWorkflowStepUiConfig {
  return {
    ...step,
    description: step.description || "",
    specialModuleEnabled: Boolean(step.specialModuleEnabled),
    options: step.options.map(cloneOption),
    children: (step.children || []).map(cloneStep),
  };
}

function createStep(
  key: string,
  title: string,
  description: string,
  options: AgentWorkflowOptionUiConfig[]
): AgentWorkflowStepUiConfig {
  return {
    key,
    title,
    description,
    enabled: true,
    sortOrder: 0,
    specialModuleEnabled: false,
    options,
    children: [],
  };
}

function createOption(
  key: string,
  buttonName: string,
  promptFragment: string,
  sortOrder: number
): AgentWorkflowOptionUiConfig {
  return {
    key,
    buttonName,
    description: "",
    previewImageUrl: "",
    previewImageSourceUrl: "",
    enabled: true,
    sortOrder,
    promptFragment,
    blockedOptionKeys: [],
    specialModuleEnabled: false,
    specialModuleExclusionEnabled: false,
    specialModuleAllowedOptionKeys: [],
    children: [],
  };
}

const defaultSteps: AgentWorkflowStepUiConfig[] = [
  createStep("audience", "人群选择", "先确认目标家庭结构与生活状态。", [
    createOption("single_youth", "独居青年", "面向独居青年，强调轻盈、效率感和个人表达。", 0),
    createOption("young_couple", "年轻情侣", "面向年轻情侣，强调陪伴感、松弛感和高颜值日常。", 1),
    createOption("midlife_no_kids", "中年无孩夫妻", "面向中年无孩夫妻，强调稳定、质感与舒适收纳。", 2),
    createOption("family_with_kids", "有孩家庭", "面向有孩家庭，强调互动、耐用、安全与成长场景。", 3),
    createOption("senior_couple", "老年夫妻", "面向老年夫妻，强调便利、温暖、低刺激与安心动线。", 4),
  ]),
  createStep("style", "主题风格", "确定空间视觉主风格。", [
    createOption("japanese", "日系风", "整体风格为日系，强调自然木色、留白与温和秩序。", 0),
    createOption("new_chinese", "新中式", "整体风格为新中式，强调东方韵味与现代克制。", 1),
    createOption("american", "美式", "整体风格为美式，强调舒展体量、生活感与复古质感。", 2),
    createOption("healing", "治愈风", "整体风格为治愈风，强调柔和、放松与亲和力。", 3),
    createOption("modern", "现代风", "整体风格为现代风，强调简洁、利落与当代感。", 4),
    createOption("eclectic", "混搭风", "整体风格为混搭风，强调层次变化与个性搭配。", 5),
    createOption("vintage", "中古风", "整体风格为中古风，强调复古家具与时间感。", 6),
    createOption("cream", "奶油风", "整体风格为奶油风，强调柔光、低饱和与绵密材质。", 7),
  ]),
  createStep("space", "空间选择", "确定主要空间。", [
    createOption("living_room", "客厅", "主空间为客厅。", 0),
    createOption("kitchen", "厨房", "主空间为厨房。", 1),
    createOption("bedroom", "卧室", "主空间为卧室。", 2),
    createOption("dining_room", "餐厅", "主空间为餐厅。", 3),
    createOption("study", "书房", "主空间为书房。", 4),
    createOption("foyer", "门厅", "主空间为门厅。", 5),
    createOption("balcony", "阳台", "主空间为阳台。", 6),
    createOption("bathroom", "卫生间", "主空间为卫生间。", 7),
  ]),
  createStep("subSpace", "子空间选择", "确定重点表现区域。", [
    createOption("tv_console", "电视柜空间", "重点表现电视柜空间与背景墙关系。", 0),
    createOption("sofa_area", "沙发空间", "重点表现沙发空间与会客氛围。", 1),
    createOption("dining_table", "餐桌空间", "重点表现餐桌空间与就餐动线。", 2),
    createOption("bedside_area", "床头空间", "重点表现床头空间与睡眠氛围。", 3),
    createOption("island_area", "岛台空间", "重点表现岛台空间与操作效率。", 4),
    createOption("desk_area", "书桌空间", "重点表现书桌空间与专注氛围。", 5),
  ]),
  createStep("hardDecoration", "硬装方案", "确定空间硬装基调。", [
    createOption("hard_plan_1", "硬装方案1", "硬装采用方案1，整体偏克制基础款。", 0),
    createOption("hard_plan_2", "硬装方案2", "硬装采用方案2，整体偏精致层次款。", 1),
    createOption("hard_plan_3", "硬装方案3", "硬装采用方案3，整体偏视觉强化款。", 2),
  ]),
  createStep("softDecoration", "软装方案", "确定软装搭配方向。", [
    createOption("soft_plan_1", "软装方案1", "软装采用方案1，整体偏稳妥耐看。", 0),
    createOption("soft_plan_2", "软装方案2", "软装采用方案2，整体偏生活感与柔和搭配。", 1),
    createOption("soft_plan_3", "软装方案3", "软装采用方案3，整体偏高辨识度和氛围表达。", 2),
  ]),
  createStep("lighting", "光氛选择", "确定光照时段与氛围。", [
    createOption("natural_daylight", "自然阳光", "光照氛围为自然阳光，通透明亮。", 0),
    createOption("warm_afternoon", "暖调午后", "光照氛围为暖调午后，柔和松弛。", 1),
    createOption("romantic_night", "浪漫夜晚", "光照氛围为浪漫夜晚，暖光层次分明。", 2),
  ]),
  createStep("accessories", "配饰陈列", "确定配饰收口与陈列方式。", [
    createOption("accessories_a", "配饰方案A", "配饰采用方案A，强调克制点缀。", 0),
    createOption("accessories_b", "配饰方案B", "配饰采用方案B，强调生活化陈列。", 1),
    createOption("accessories_c", "配饰方案C", "配饰采用方案C，强调高完成度展示。", 2),
  ]),
];

export const defaultAgentWorkflowUiConfig: AgentWorkflowUiConfig = {
  inputOptions: {
    brands: [],
    stores: [],
    categoryLabels: defaultAgentWorkflowCategoryLabels,
    officialCategoryEntries: defaultAgentWorkflowOfficialCategoryEntries,
    thirdCategories: [],
    fourthCategories: [],
    fifthCategories: [],
    priceBands: [],
    brandStoreEntries: [],
  },
  constraintSettings: defaultAgentWorkflowConstraintSettings,
  pageFeatureSettings: defaultAgentWorkflowPageFeatureSettings,
  businessModeSettings: defaultAgentWorkflowBusinessModeSettings,
  steps: defaultSteps.map((step, index) =>
    cloneStep({
      ...step,
      sortOrder: index,
    })
  ),
};

export function normalizeAgentWorkflowCategoryLabels(
  value: unknown
): AgentWorkflowCategoryLabels {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  const normalizeLabel = (candidate: unknown, fallback: string) => {
    const text = normalizeText(candidate, 24);
    return text || fallback;
  };

  return {
    firstCategory: normalizeLabel(
      record.firstCategory ?? record.firstCategoryLabel ?? record.brand ?? record.brandLabel,
      defaultAgentWorkflowCategoryLabels.firstCategory
    ),
    secondCategory: normalizeLabel(
      record.secondCategory ?? record.secondCategoryLabel ?? record.store ?? record.storeLabel,
      defaultAgentWorkflowCategoryLabels.secondCategory
    ),
    thirdCategory: normalizeLabel(
      record.thirdCategory ?? record.thirdCategoryLabel,
      defaultAgentWorkflowCategoryLabels.thirdCategory
    ),
    fourthCategory: normalizeLabel(
      record.fourthCategory ?? record.fourthCategoryLabel,
      defaultAgentWorkflowCategoryLabels.fourthCategory
    ),
    fifthCategory: normalizeLabel(
      record.fifthCategory ?? record.fifthCategoryLabel,
      defaultAgentWorkflowCategoryLabels.fifthCategory
    ),
  };
}

export function normalizeAgentWorkflowConstraintSettings(
  value: unknown
): AgentWorkflowConstraintSettings {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    crossLevelMutualExclusionEnabled: normalizeBoolean(
      record.crossLevelMutualExclusionEnabled ?? record.enableCrossLevelMutualExclusion,
      defaultAgentWorkflowConstraintSettings.crossLevelMutualExclusionEnabled
    ),
  };
}

export function normalizeAgentWorkflowPageFeatureSettings(
  value: unknown
): AgentWorkflowPageFeatureSettings {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};

  return {
    presetStepEnabled: normalizeBoolean(
      record.presetStepEnabled ?? record.modeStepEnabled ?? record.enablePresetStep,
      defaultAgentWorkflowPageFeatureSettings.presetStepEnabled
    ),
    materialStepEnabled: normalizeBoolean(
      record.materialStepEnabled ?? record.skuStepEnabled ?? record.enableMaterialStep,
      defaultAgentWorkflowPageFeatureSettings.materialStepEnabled
    ),
  };
}

function normalizeAgentWorkflowBusinessModeKey(
  value: unknown
): AgentWorkflowBusinessModeKey | null {
  return value === "main_sku" || value === "detail" || value === "buyer_show"
    ? value
    : null;
}

function normalizeAgentWorkflowBusinessModeIconKey(
  value: unknown,
  fallback: AgentWorkflowBusinessModeIconKey
): AgentWorkflowBusinessModeIconKey {
  return value === "main-sku" || value === "detail" || value === "buyer-show"
    ? value
    : fallback;
}

function normalizeAgentWorkflowBusinessModeConfig(
  value: unknown,
  fallback: AgentWorkflowBusinessModeConfig
): AgentWorkflowBusinessModeConfig {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const title = normalizeText(record.title ?? record.label ?? record.name, 40);
  const description = normalizeText(record.description, 220);

  const normalized: AgentWorkflowBusinessModeConfig = {
    key: fallback.key,
    title: title || fallback.title,
    description: description || fallback.description || "",
    enabled: normalizeBoolean(record.enabled, fallback.enabled),
    iconKey: normalizeAgentWorkflowBusinessModeIconKey(record.iconKey, fallback.iconKey),
    customSvgUrl: normalizeText(record.customSvgUrl ?? record.iconSvgUrl, 2000),
    defaultModelId:
      normalizeText(record.defaultModelId ?? record.modelId, 128) ||
      fallback.defaultModelId ||
      null,
    sortOrder: normalizeNumber(record.sortOrder, fallback.sortOrder, 99),
  };

  if (
    fallback.referenceReplaceEnabled !== undefined ||
    record.referenceReplaceEnabled !== undefined
  ) {
    normalized.referenceReplaceEnabled = normalizeBoolean(
      record.referenceReplaceEnabled,
      fallback.referenceReplaceEnabled !== false
    );
  }

  if (
    fallback.aiDetailGenerateEnabled !== undefined ||
    record.aiDetailGenerateEnabled !== undefined
  ) {
    normalized.aiDetailGenerateEnabled = normalizeBoolean(
      record.aiDetailGenerateEnabled,
      fallback.aiDetailGenerateEnabled !== false
    );
  }

  return normalized;
}

export function normalizeAgentWorkflowBusinessModeSettings(
  value: unknown
): AgentWorkflowBusinessModeSettings {
  const record =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const rawModes = Array.isArray(record.modes) ? record.modes : [];
  const modeByKey = new Map<AgentWorkflowBusinessModeKey, unknown>();

  rawModes.forEach((item) => {
    const itemRecord =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    const key = normalizeAgentWorkflowBusinessModeKey(itemRecord.key);
    if (key && !modeByKey.has(key)) {
      modeByKey.set(key, item);
    }
  });

  return {
    modes: defaultAgentWorkflowBusinessModeSettings.modes
      .map((fallback) =>
        normalizeAgentWorkflowBusinessModeConfig(modeByKey.get(fallback.key), fallback)
      )
      .sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

export function flattenAgentWorkflowSteps(
  steps: AgentWorkflowStepUiConfig[],
  depth = 1,
  parentKeys: string[] = []
): FlattenedAgentWorkflowStep[] {
  return steps.flatMap((step) => [
    {
      step,
      depth,
      parentKeys,
    },
    ...flattenAgentWorkflowSteps(step.children || [], depth + 1, [...parentKeys, step.key]),
  ]);
}

export function flattenVisibleAgentWorkflowSteps(
  steps: AgentWorkflowStepUiConfig[],
  selections: Partial<Record<string, string>>,
  depth = 1,
  parentKeys: string[] = [],
  ancestorsSatisfied = true
): FlattenedAgentWorkflowStep[] {
  return [...steps]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .flatMap((step) => {
      const normalizedStep = {
        ...step,
        options: [...(step.options || [])].sort((left, right) => left.sortOrder - right.sortOrder),
        children: [...(step.children || [])].sort((left, right) => left.sortOrder - right.sortOrder),
      };

      if (!ancestorsSatisfied) {
        return [] as FlattenedAgentWorkflowStep[];
      }

      const currentEntry: FlattenedAgentWorkflowStep = {
        step: normalizedStep,
        depth,
        parentKeys,
      };
      const currentSatisfied =
        normalizedStep.options.length === 0 || Boolean(String(selections[normalizedStep.key] || "").trim());

      return [
        currentEntry,
        ...flattenVisibleAgentWorkflowSteps(
          normalizedStep.children,
          selections,
          depth + 1,
          [...parentKeys, normalizedStep.key],
          currentSatisfied
        ),
      ];
    });
}

export function findAgentWorkflowStepByKey(
  steps: AgentWorkflowStepUiConfig[],
  stepKey: string
): AgentWorkflowStepUiConfig | null {
  for (const step of steps) {
    if (step.key === stepKey) {
      return step;
    }
    const foundChild = findAgentWorkflowStepByKey(step.children || [], stepKey);
    if (foundChild) {
      return foundChild;
    }
  }
  return null;
}

export function countAgentWorkflowSteps(steps: AgentWorkflowStepUiConfig[]): number {
  return flattenAgentWorkflowSteps(steps).length;
}

export function countAgentWorkflowOptions(steps: AgentWorkflowStepUiConfig[]): number {
  return flattenAgentWorkflowSteps(steps).reduce(
    (total, item) =>
      total +
      flattenAgentWorkflowOptionTree(item.step.options || []).length,
    0
  );
}

export function normalizeAgentWorkflowStepOrdering(
  steps: AgentWorkflowStepUiConfig[]
): AgentWorkflowStepUiConfig[] {
  return steps.map((step, stepIndex) => ({
    ...step,
    sortOrder: stepIndex,
    options: normalizeAgentWorkflowOptionOrdering(step.options || []),
    children: normalizeAgentWorkflowStepOrdering(step.children || []),
  }));
}

export interface FlattenedAgentWorkflowOption {
  option: AgentWorkflowOptionUiConfig;
  depth: number;
  parentKeys: string[];
}

const enabledStepTreeCache = new WeakMap<
  AgentWorkflowStepUiConfig[],
  AgentWorkflowStepUiConfig[]
>();
const renderableStepTreeCache = new WeakMap<
  AgentWorkflowStepUiConfig[],
  AgentWorkflowStepUiConfig[]
>();
const enabledOptionTreeCache = new WeakMap<
  AgentWorkflowOptionUiConfig[],
  AgentWorkflowOptionUiConfig[]
>();
const renderableOptionTreeCache = new WeakMap<
  AgentWorkflowOptionUiConfig[],
  AgentWorkflowOptionUiConfig[]
>();
const flattenedOptionTreeCache = new WeakMap<
  AgentWorkflowOptionUiConfig[],
  FlattenedAgentWorkflowOption[]
>();
const optionLookupCache = new WeakMap<
  AgentWorkflowOptionUiConfig[],
  Map<string, AgentWorkflowOptionUiConfig>
>();

function getWorkflowOptionLookup(options: AgentWorkflowOptionUiConfig[]) {
  const cached = optionLookupCache.get(options);
  if (cached) {
    return cached;
  }

  const lookup = new Map(
    options
      .map((option) => [option.key, option] as const)
      .filter(([key]) => Boolean(String(key || "").trim()))
  );
  optionLookupCache.set(options, lookup);
  return lookup;
}

export function getEnabledAgentWorkflowStepTree(
  steps: AgentWorkflowStepUiConfig[]
): AgentWorkflowStepUiConfig[] {
  const cached = enabledStepTreeCache.get(steps);
  if (cached) {
    return cached;
  }

  const nextSteps = [...steps]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((step) => step.enabled !== false)
    .map((step) => ({
      ...step,
      options: getEnabledAgentWorkflowOptionTree(step.options || []),
      children: getEnabledAgentWorkflowStepTree(step.children || []),
    }))
    .filter((step) => step.options.length > 0 || (step.children || []).length > 0);
  enabledStepTreeCache.set(steps, nextSteps);
  return nextSteps;
}

export function getRenderableAgentWorkflowOptionTree(
  options: AgentWorkflowOptionUiConfig[]
): AgentWorkflowOptionUiConfig[] {
  const cached = renderableOptionTreeCache.get(options);
  if (cached) {
    return cached;
  }

  const nextOptions = [...options]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((option) => hasAgentWorkflowOptionRenderablePreview(option))
    .map((option) => ({
      ...option,
      children: getRenderableAgentWorkflowOptionTree(option.children || []),
    }));
  renderableOptionTreeCache.set(options, nextOptions);
  return nextOptions;
}

export function getRenderableAgentWorkflowStepTree(
  steps: AgentWorkflowStepUiConfig[]
): AgentWorkflowStepUiConfig[] {
  const cached = renderableStepTreeCache.get(steps);
  if (cached) {
    return cached;
  }

  const nextSteps = [...steps]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((step) => step.enabled !== false)
    .map((step) => ({
      ...step,
      options: getRenderableAgentWorkflowOptionTree(step.options || []),
      children: getRenderableAgentWorkflowStepTree(step.children || []),
    }))
    .filter(
      (step) =>
        getEnabledAgentWorkflowOptionTree(step.options || []).length > 0 ||
        (step.children || []).length > 0
    );
  renderableStepTreeCache.set(steps, nextSteps);
  return nextSteps;
}

function optionMatchesOfficialCategory(
  option: AgentWorkflowOptionUiConfig,
  selectedCategoryKeys: Set<string>
) {
  const availableKeys = normalizeOfficialCategoryKeyList(option.availableOfficialCategoryKeys);
  if (availableKeys.length === 0 || selectedCategoryKeys.size === 0) {
    return true;
  }
  return availableKeys.some((key) => selectedCategoryKeys.has(key));
}

function filterAgentWorkflowOptionTreeByOfficialCategory(
  options: AgentWorkflowOptionUiConfig[],
  selectedCategoryKeys: Set<string>
): AgentWorkflowOptionUiConfig[] {
  const filteredOptions: AgentWorkflowOptionUiConfig[] = [];

  for (const option of [...options].sort((left, right) => left.sortOrder - right.sortOrder)) {
    const children = filterAgentWorkflowOptionTreeByOfficialCategory(
      option.children || [],
      selectedCategoryKeys
    );
    const matches = optionMatchesOfficialCategory(option, selectedCategoryKeys);
    if (!matches && children.length === 0) {
      continue;
    }
    filteredOptions.push({
      ...option,
      children,
    });
  }

  return filteredOptions;
}

export function filterAgentWorkflowStepTreeByOfficialCategory(params: {
  steps: AgentWorkflowStepUiConfig[];
  officialSecondCategory?: string | null;
  officialThirdCategory?: string | null;
}): AgentWorkflowStepUiConfig[] {
  const secondKey = getAgentWorkflowOfficialSecondCategoryKey(
    params.officialSecondCategory || ""
  );
  const thirdKey = getAgentWorkflowOfficialThirdCategoryKey({
    secondCategory: params.officialSecondCategory,
    thirdCategory: params.officialThirdCategory,
  });
  const selectedCategoryKeys = new Set([secondKey, thirdKey].filter(Boolean));
  if (selectedCategoryKeys.size === 0) {
    return params.steps;
  }

  return [...params.steps]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .map((step) => ({
      ...step,
      options: filterAgentWorkflowOptionTreeByOfficialCategory(
        step.options || [],
        selectedCategoryKeys
      ),
      children: filterAgentWorkflowStepTreeByOfficialCategory({
        steps: step.children || [],
        officialSecondCategory: params.officialSecondCategory,
        officialThirdCategory: params.officialThirdCategory,
      }),
    }))
    .filter((step) => step.options.length > 0 || (step.children || []).length > 0);
}

export function flattenAgentWorkflowOptionTree(
  options: AgentWorkflowOptionUiConfig[],
  depth = 1,
  parentKeys: string[] = []
): FlattenedAgentWorkflowOption[] {
  const canUseRootCache = depth === 1 && parentKeys.length === 0;
  if (canUseRootCache) {
    const cached = flattenedOptionTreeCache.get(options);
    if (cached) {
      return cached;
    }
  }

  const flattened = options.flatMap((option) => [
    {
      option,
      depth,
      parentKeys,
    },
    ...flattenAgentWorkflowOptionTree(
      option.children || [],
      depth + 1,
      [...parentKeys, option.key]
    ),
  ]);
  if (canUseRootCache) {
    flattenedOptionTreeCache.set(options, flattened);
  }
  return flattened;
}

export function countAgentWorkflowOptionTree(
  options: AgentWorkflowOptionUiConfig[]
): number {
  return flattenAgentWorkflowOptionTree(options).length;
}

export interface AgentWorkflowDestructiveChangeSummary {
  totalBeforeOptionCount: number;
  totalAfterOptionCount: number;
  removedOptionCount: number;
  removedEnabledOptionCount: number;
  promptClearedCount: number;
  previewClearedCount: number;
  removedOptionSamples: string[];
  promptClearedSamples: string[];
  previewClearedSamples: string[];
}

const AGENT_WORKFLOW_DESTRUCTIVE_CHANGE_SAMPLE_LIMIT = 12;

function collectAgentWorkflowAuditEntries(
  steps: AgentWorkflowStepUiConfig[],
  stepKeyPath: string[] = [],
  stepLabelPath: string[] = [],
  output: Array<{
    identityPath: string;
    displayPath: string;
    enabled: boolean;
    hasPrompt: boolean;
    hasPreview: boolean;
  }> = []
) {
  for (const step of [...(steps || [])].sort((left, right) => left.sortOrder - right.sortOrder)) {
    const nextStepKeyPath = [...stepKeyPath, `s:${String(step.key || "").trim()}`];
    const nextStepLabelPath = [
      ...stepLabelPath,
      String(step.title || step.key || "未命名模块").trim() || "未命名模块",
    ];

    const visitOptions = (
      options: AgentWorkflowOptionUiConfig[],
      parentKeyPath: string[],
      parentLabelPath: string[]
    ) => {
      for (const option of [...(options || [])].sort((left, right) => left.sortOrder - right.sortOrder)) {
        const optionKey = String(option.key || "").trim() || "option";
        const optionLabel =
          String(option.buttonName || option.key || "未命名卡片").trim() || "未命名卡片";
        const nextKeyPath = [...parentKeyPath, `o:${optionKey}`];
        const nextLabelPath = [...parentLabelPath, optionLabel];
        output.push({
          identityPath: nextKeyPath.join(">"),
          displayPath: nextLabelPath.join(" > "),
          enabled: option.enabled !== false,
          hasPrompt: Boolean(String(option.promptFragment || "").trim()),
          hasPreview: hasAgentWorkflowOptionOwnPreview(option),
        });
        visitOptions(option.children || [], nextKeyPath, nextLabelPath);
      }
    };

    visitOptions(step.options || [], nextStepKeyPath, nextStepLabelPath);
    collectAgentWorkflowAuditEntries(
      step.children || [],
      nextStepKeyPath,
      nextStepLabelPath,
      output
    );
  }

  return output;
}

export function summarizeAgentWorkflowDestructiveChange(
  beforeConfig: AgentWorkflowUiConfig,
  afterConfig: AgentWorkflowUiConfig
): AgentWorkflowDestructiveChangeSummary {
  const beforeEntries = collectAgentWorkflowAuditEntries(beforeConfig.steps || []);
  const afterEntries = collectAgentWorkflowAuditEntries(afterConfig.steps || []);
  const afterByIdentityPath = new Map(
    afterEntries.map((entry) => [entry.identityPath, entry])
  );

  const removedEntries = beforeEntries.filter(
    (entry) => !afterByIdentityPath.has(entry.identityPath)
  );
  const promptClearedEntries = beforeEntries.filter((entry) => {
    const nextEntry = afterByIdentityPath.get(entry.identityPath);
    return Boolean(nextEntry && entry.hasPrompt && !nextEntry.hasPrompt);
  });
  const previewClearedEntries = beforeEntries.filter((entry) => {
    const nextEntry = afterByIdentityPath.get(entry.identityPath);
    return Boolean(nextEntry && entry.hasPreview && !nextEntry.hasPreview);
  });

  return {
    totalBeforeOptionCount: beforeEntries.length,
    totalAfterOptionCount: afterEntries.length,
    removedOptionCount: removedEntries.length,
    removedEnabledOptionCount: removedEntries.filter((entry) => entry.enabled).length,
    promptClearedCount: promptClearedEntries.length,
    previewClearedCount: previewClearedEntries.length,
    removedOptionSamples: removedEntries
      .slice(0, AGENT_WORKFLOW_DESTRUCTIVE_CHANGE_SAMPLE_LIMIT)
      .map((entry) => entry.displayPath),
    promptClearedSamples: promptClearedEntries
      .slice(0, AGENT_WORKFLOW_DESTRUCTIVE_CHANGE_SAMPLE_LIMIT)
      .map((entry) => entry.displayPath),
    previewClearedSamples: previewClearedEntries
      .slice(0, AGENT_WORKFLOW_DESTRUCTIVE_CHANGE_SAMPLE_LIMIT)
      .map((entry) => entry.displayPath),
  };
}

export function isAgentWorkflowDestructiveChangeSignificant(
  summary: AgentWorkflowDestructiveChangeSummary
) {
  if (summary.removedEnabledOptionCount >= 10) {
    return true;
  }

  if (summary.removedOptionCount >= 20) {
    return true;
  }

  if (
    summary.totalBeforeOptionCount > 0 &&
    summary.removedOptionCount / summary.totalBeforeOptionCount >= 0.03
  ) {
    return true;
  }

  if (summary.promptClearedCount >= 10) {
    return true;
  }

  return summary.previewClearedCount >= 5;
}

export function hasAgentWorkflowOptionOwnPreview(
  option: AgentWorkflowOptionUiConfig
): boolean {
  return Boolean(
    String(option.previewImageUrl || "").trim() ||
      String(option.previewImageSourceUrl || "").trim()
  );
}

function getFirstAgentWorkflowOptionPreview(
  option: AgentWorkflowOptionUiConfig
): { previewImageUrl: string; previewImageSourceUrl: string } | null {
  const ownPreviewImageUrl = String(option.previewImageUrl || "").trim();
  const ownPreviewImageSourceUrl = String(option.previewImageSourceUrl || "").trim();
  if (ownPreviewImageUrl || ownPreviewImageSourceUrl) {
    return {
      previewImageUrl: ownPreviewImageUrl || ownPreviewImageSourceUrl,
      previewImageSourceUrl: ownPreviewImageSourceUrl || ownPreviewImageUrl,
    };
  }

  for (const child of option.children || []) {
    if (child.enabled === false) {
      continue;
    }
    const childPreview = getFirstAgentWorkflowOptionPreview(child);
    if (childPreview) {
      return childPreview;
    }
  }

  return null;
}

function hasAgentWorkflowOptionRenderablePreview(
  option: AgentWorkflowOptionUiConfig
): boolean {
  return Boolean(getFirstAgentWorkflowOptionPreview(option));
}

export function getAgentWorkflowMissingPreviewOptions(
  steps: AgentWorkflowStepUiConfig[],
  options: { enabledOnly?: boolean } = {}
): AgentWorkflowMissingPreviewOption[] {
  const enabledOnly = options.enabledOnly !== false;
  const missingOptions: AgentWorkflowMissingPreviewOption[] = [];

  const walkOptions = (
    optionItems: AgentWorkflowOptionUiConfig[],
    stepKey: string,
    stepPath: string,
    parentPath: string[] = []
  ) => {
    for (const option of [...(optionItems || [])].sort(
      (left, right) => left.sortOrder - right.sortOrder
    )) {
      const disabled = option.enabled === false;
      const label = option.buttonName || option.key;
      const pathParts = [...parentPath, label];

      if (
        (!enabledOnly || !disabled) &&
        !hasAgentWorkflowOptionRenderablePreview(option)
      ) {
        missingOptions.push({
          key: option.key,
          label,
          path: pathParts.join(" / "),
          stepKey,
          stepPath,
          disabled,
          childCount: (option.children || []).length,
        });
      }

      if (!enabledOnly || !disabled) {
        walkOptions(option.children || [], stepKey, stepPath, pathParts);
      }
    }
  };

  const walkSteps = (stepItems: AgentWorkflowStepUiConfig[], parentPath: string[] = []) => {
    for (const step of [...(stepItems || [])].sort(
      (left, right) => left.sortOrder - right.sortOrder
    )) {
      if (enabledOnly && step.enabled === false) {
        continue;
      }

      const stepTitle = step.title || step.key;
      const stepPathParts = [...parentPath, stepTitle];
      const stepPath = stepPathParts.join(" / ");
      walkOptions(step.options || [], step.key, stepPath);
      walkSteps(step.children || [], stepPathParts);
    }
  };

  walkSteps(steps || []);
  return missingOptions;
}

function collectWorkflowOptionKeySetFromSteps(
  steps: AgentWorkflowStepUiConfig[]
): Set<string> {
  return new Set(
    flattenAgentWorkflowSteps(steps).flatMap(({ step }) =>
      flattenAgentWorkflowOptionTree(step.options || []).map(({ option }) => option.key)
    )
  );
}

export function normalizeAgentWorkflowOptionOrdering(
  options: AgentWorkflowOptionUiConfig[]
): AgentWorkflowOptionUiConfig[] {
  return options.map((option, optionIndex) => ({
    ...option,
    sortOrder: optionIndex,
    children: normalizeAgentWorkflowOptionOrdering(option.children || []),
  }));
}

export function getEnabledAgentWorkflowOptionTree(
  options: AgentWorkflowOptionUiConfig[]
): AgentWorkflowOptionUiConfig[] {
  const cached = enabledOptionTreeCache.get(options);
  if (cached) {
    return cached;
  }

  const nextOptions = [...options]
    .sort((left, right) => left.sortOrder - right.sortOrder)
    .filter((option) => option.enabled !== false)
    .filter((option) => hasAgentWorkflowOptionRenderablePreview(option))
    .map((option) => ({
      ...option,
      children: getEnabledAgentWorkflowOptionTree(option.children || []),
    }));
  enabledOptionTreeCache.set(options, nextOptions);
  return nextOptions;
}

export function findAgentWorkflowOptionByKey(
  options: AgentWorkflowOptionUiConfig[],
  optionKey: string
): AgentWorkflowOptionUiConfig | null {
  for (const option of options) {
    if (option.key === optionKey) {
      return option;
    }
    const foundChild = findAgentWorkflowOptionByKey(option.children || [], optionKey);
    if (foundChild) {
      return foundChild;
    }
  }
  return null;
}

function normalizeText(value: unknown, maxLength: number) {
  return String(value || "").trim().slice(0, maxLength);
}

function normalizeKey(value: unknown, fallback: string) {
  const normalized = String(value || "")
    .trim()
    .slice(0, 64)
    .replace(/\s+/g, "_")
    .replace(/[^\w-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized || fallback;
}

function normalizeBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeNumber(value: unknown, fallback: number, max = 999) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.min(max, Math.round(parsed)));
}

function normalizeKeyList(value: unknown, max = 100) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(
      value
        .map((item, index) => normalizeKey(item, `blocked_option_${index + 1}`))
        .filter(Boolean)
        .slice(0, max)
    )
  );
}

function normalizeOfficialCategoryKey(value: unknown) {
  return String(value || "").trim().slice(0, 160);
}

function normalizeOfficialCategoryKeyList(value: unknown, max = AGENT_WORKFLOW_INPUT_OPTIONS_MAX_ITEMS) {
  if (!Array.isArray(value)) return [] as string[];
  return Array.from(
    new Set(
      value
        .map(normalizeOfficialCategoryKey)
        .filter(Boolean)
        .slice(0, max)
    )
  );
}

export function getAgentWorkflowOfficialSecondCategoryKey(secondCategory: string) {
  const normalizedSecond = String(secondCategory || "").trim();
  return normalizedSecond ? `official-second:${normalizedSecond}` : "";
}

export function getAgentWorkflowOfficialThirdCategoryKey(params: {
  secondCategory?: string | null;
  thirdCategory?: string | null;
}) {
  const normalizedSecond = String(params.secondCategory || "").trim();
  const normalizedThird = String(params.thirdCategory || "").trim();
  return normalizedSecond && normalizedThird
    ? `official-third:${normalizedSecond}>${normalizedThird}`
    : "";
}

export function getAgentWorkflowOfficialCategoryEntries(
  config?: AgentWorkflowUiConfig | null
) {
  return config?.inputOptions?.officialCategoryEntries &&
    config.inputOptions.officialCategoryEntries.length > 0
    ? config.inputOptions.officialCategoryEntries
    : defaultAgentWorkflowOfficialCategoryEntries;
}

export function getAgentWorkflowOfficialSecondCategoryOptions(
  config?: AgentWorkflowUiConfig | null
) {
  return getAgentWorkflowOfficialCategoryEntries(config).map((entry) => entry.categoryName);
}

export function getAgentWorkflowOfficialThirdCategoryOptions(params: {
  config?: AgentWorkflowUiConfig | null;
  secondCategory?: string | null;
}) {
  const normalizedSecond = String(params.secondCategory || "").trim().toLowerCase();
  if (!normalizedSecond) {
    return [];
  }
  const matchedEntry = getAgentWorkflowOfficialCategoryEntries(params.config).find(
    (entry) => entry.categoryName.trim().toLowerCase() === normalizedSecond
  );
  return matchedEntry?.thirdCategories || [];
}

export function getAgentWorkflowOfficialCategoryKeyLabels(
  config?: AgentWorkflowUiConfig | null
) {
  const labels = new Map<string, string>();
  for (const secondEntry of getAgentWorkflowOfficialCategoryEntries(config)) {
    const secondKey = getAgentWorkflowOfficialSecondCategoryKey(secondEntry.categoryName);
    if (secondKey) {
      labels.set(secondKey, `二级：${secondEntry.categoryName}`);
    }
    for (const thirdCategory of secondEntry.thirdCategories || []) {
      const thirdKey = getAgentWorkflowOfficialThirdCategoryKey({
        secondCategory: secondEntry.categoryName,
        thirdCategory,
      });
      if (thirdKey) {
        labels.set(thirdKey, `三级：${secondEntry.categoryName} / ${thirdCategory}`);
      }
    }
  }
  return labels;
}

function sanitizeBlockedOptionTree(
  options: AgentWorkflowOptionUiConfig[],
  validKeys = new Set(
    flattenAgentWorkflowOptionTree(options).map(({ option }) => option.key)
  )
): AgentWorkflowOptionUiConfig[] {
  return options.map((option) => ({
    ...option,
    blockedOptionKeys: Array.from(
      new Set(
        (option.blockedOptionKeys || []).filter(
          (blockedKey) => blockedKey !== option.key && validKeys.has(blockedKey)
        )
      )
    ).slice(0, AGENT_WORKFLOW_BLOCKED_OPTION_KEYS_MAX),
    children: sanitizeBlockedOptionTree(option.children || [], validKeys),
  }));
}

function sanitizeBlockedWorkflowStepTree(
  steps: AgentWorkflowStepUiConfig[],
  validKeys: Set<string>
): AgentWorkflowStepUiConfig[] {
  return steps.map((step) => ({
    ...step,
    options: sanitizeBlockedOptionTree(step.options || [], validKeys),
    children: sanitizeBlockedWorkflowStepTree(step.children || [], validKeys),
  }));
}

function createSpecialModuleRootOptionFromStep(
  step: AgentWorkflowStepUiConfig
): AgentWorkflowOptionUiConfig {
  return {
    key: step.key,
    buttonName: step.title || step.key,
    description: step.description || "",
    previewImageUrl: "",
    previewImageSourceUrl: "",
    enabled: step.enabled,
    sortOrder: step.sortOrder,
    promptFragment: "",
    blockedOptionKeys: [],
    specialModuleEnabled: true,
    specialModuleExclusionEnabled: false,
    specialModuleAllowedOptionKeys: [],
    children: [
      ...(step.options || []),
      ...(step.children || []).map(createSpecialModuleRootOptionFromStep),
    ].sort((left, right) => left.sortOrder - right.sortOrder),
  };
}

export function getAgentWorkflowSpecialModuleRootOptions(
  steps: AgentWorkflowStepUiConfig[]
): AgentWorkflowOptionUiConfig[] {
  return flattenAgentWorkflowSteps(steps).flatMap(({ step }) => {
    const specialRoots = (step.options || []).filter((option) => option.specialModuleEnabled);
    return step.specialModuleEnabled
      ? [createSpecialModuleRootOptionFromStep(step), ...specialRoots]
      : specialRoots;
  });
}

export function normalizeAgentWorkflowUiConfig(value: unknown): AgentWorkflowUiConfig {
  const raw =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  const hasRawSteps = Array.isArray(raw.steps);
  const rawSteps = Array.isArray(raw.steps) ? raw.steps : [];
  const normalizeStringList = (input: unknown) => {
    if (!Array.isArray(input)) return [] as string[];
    return Array.from(
      new Set(
        input
          .map((item) => normalizeText(item, 64))
          .filter(Boolean)
          .slice(0, 300)
      )
    );
  };
  const rawInputOptions =
    raw.inputOptions && typeof raw.inputOptions === "object" && !Array.isArray(raw.inputOptions)
      ? (raw.inputOptions as Record<string, unknown>)
      : {};
  const normalizeOfficialCategoryEntries = (input: unknown) => {
    const source = Array.isArray(input) ? input : defaultAgentWorkflowOfficialCategoryEntries;
    const seenSecondCategories = new Set<string>();
    const normalizedEntries: AgentWorkflowOfficialSecondCategoryEntry[] = [];

    source.forEach((item, index) => {
      const record =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const categoryName = normalizeText(record.categoryName ?? record.name, 64);
      const secondKey = categoryName.toLowerCase();
      if (!categoryName || seenSecondCategories.has(secondKey)) {
        return;
      }
      seenSecondCategories.add(secondKey);

      const thirdCategoryEntriesSource = Array.isArray(record.thirdCategoryEntries)
        ? (record.thirdCategoryEntries as unknown[])
        : normalizeStringList(record.thirdCategories).map((thirdCategory, thirdIndex) => ({
            categoryName: thirdCategory,
            sortOrder: thirdIndex,
          }));
      const seenThirdCategories = new Set<string>();
      const thirdCategoryEntries = thirdCategoryEntriesSource
        .map((thirdItem, thirdIndex): AgentWorkflowOfficialThirdCategoryEntry | null => {
          const thirdRecord =
            thirdItem && typeof thirdItem === "object" && !Array.isArray(thirdItem)
              ? (thirdItem as Record<string, unknown>)
              : {};
          const thirdName = normalizeText(thirdRecord.categoryName ?? thirdRecord.name ?? thirdItem, 64);
          const thirdKey = thirdName.toLowerCase();
          if (!thirdName || seenThirdCategories.has(thirdKey)) {
            return null;
          }
          seenThirdCategories.add(thirdKey);
          return {
            categoryName: thirdName,
            sortOrder: normalizeNumber(thirdRecord.sortOrder, thirdIndex),
          };
        })
        .filter((entry): entry is AgentWorkflowOfficialThirdCategoryEntry => Boolean(entry))
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
        .map((entry, thirdIndex) => ({
          ...entry,
          sortOrder: thirdIndex,
        }));

      normalizedEntries.push({
        categoryName,
        thirdCategories: thirdCategoryEntries.map((entry) => entry.categoryName),
        thirdCategoryEntries,
        sortOrder: normalizeNumber(record.sortOrder, index),
      });
    });

    return normalizedEntries.length > 0
      ? normalizedEntries
          .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
          .map((entry, index) => ({
            ...entry,
            sortOrder: index,
          }))
      : defaultAgentWorkflowOfficialCategoryEntries;
  };
  const normalizeBrandStoreEntries = (input: unknown) => {
    if (!Array.isArray(input)) return [] as AgentWorkflowBrandStoreEntry[];

    const normalizeFourthCategoryEntries = (
      rawFourthCategoryEntries: unknown,
      legacyFourthCategories: string[]
    ): AgentWorkflowFourthCategoryEntry[] => {
      const mappedEntries: Array<AgentWorkflowFourthCategoryEntry | null> = Array.isArray(
        rawFourthCategoryEntries
      )
        ? rawFourthCategoryEntries.map((fourthItem, fourthIndex) => {
            if (typeof fourthItem === "string") {
              const categoryName = normalizeText(fourthItem, 64);
              if (!categoryName) return null;
              return {
                categoryName,
                fifthCategories: [],
                sortOrder: fourthIndex,
              };
            }

            const fourthRecord =
              fourthItem && typeof fourthItem === "object" && !Array.isArray(fourthItem)
                ? (fourthItem as Record<string, unknown>)
                : {};
            const categoryName = normalizeText(
              fourthRecord.categoryName ?? fourthRecord.fourthCategoryName,
              64
            );
            if (!categoryName) return null;
            return {
              categoryName,
              fifthCategories: normalizeStringList(fourthRecord.fifthCategories).slice(0, 300),
              sortOrder: normalizeNumber(fourthRecord.sortOrder, fourthIndex),
            };
          })
        : [];

      const normalizedFromEntries = mappedEntries
        .filter((item): item is AgentWorkflowFourthCategoryEntry => item !== null)
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
        .map((entry, index) => ({
          ...entry,
          fifthCategories: Array.from(
            new Set((entry.fifthCategories || []).map((item) => item.trim()).filter(Boolean))
          ).slice(0, 300),
          sortOrder: index,
        }));

      if (normalizedFromEntries.length > 0) {
        return normalizedFromEntries;
      }

      return legacyFourthCategories.map((categoryName, index) => ({
        categoryName,
        fifthCategories: [],
        sortOrder: index,
      }));
    };

    const normalizeThirdCategoryEntries = (
      rawThirdCategoryEntries: unknown,
      legacyThirdCategories: string[]
    ): AgentWorkflowThirdCategoryEntry[] => {
      const mappedEntries: Array<AgentWorkflowThirdCategoryEntry | null> = Array.isArray(
        rawThirdCategoryEntries
      )
        ? rawThirdCategoryEntries.map((thirdItem, thirdIndex) => {
            if (typeof thirdItem === "string") {
              const categoryName = normalizeText(thirdItem, 64);
              if (!categoryName) return null;
              return {
                categoryName,
                fourthCategories: [],
                fourthCategoryEntries: [],
                sortOrder: thirdIndex,
              };
            }

            const thirdRecord =
              thirdItem && typeof thirdItem === "object" && !Array.isArray(thirdItem)
                ? (thirdItem as Record<string, unknown>)
                : {};
            const categoryName = normalizeText(
              thirdRecord.categoryName ?? thirdRecord.thirdCategoryName,
              64
            );
            if (!categoryName) return null;

            const legacyFourthCategories = normalizeStringList(thirdRecord.fourthCategories).slice(
              0,
              300
            );
            const fourthCategoryEntries = normalizeFourthCategoryEntries(
              thirdRecord.fourthCategoryEntries,
              legacyFourthCategories
            );

            return {
              categoryName,
              fourthCategories:
                fourthCategoryEntries.length > 0
                  ? fourthCategoryEntries.map((entry) => entry.categoryName)
                  : legacyFourthCategories,
              fourthCategoryEntries,
              sortOrder: normalizeNumber(thirdRecord.sortOrder, thirdIndex),
            };
          })
        : [];

      const normalizedFromEntries = mappedEntries
        .filter((item): item is AgentWorkflowThirdCategoryEntry => item !== null)
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
        .map((entry, index) => ({
          ...entry,
          fourthCategories: Array.from(
            new Set((entry.fourthCategories || []).map((item) => item.trim()).filter(Boolean))
          ).slice(0, 300),
          fourthCategoryEntries: (entry.fourthCategoryEntries || []).map((fourthEntry, fourthIndex) => ({
            ...fourthEntry,
            fifthCategories: Array.from(
              new Set((fourthEntry.fifthCategories || []).map((item) => item.trim()).filter(Boolean))
            ).slice(0, 300),
            sortOrder: fourthIndex,
          })),
          sortOrder: index,
        }));

      if (normalizedFromEntries.length > 0) {
        return normalizedFromEntries;
      }

      return legacyThirdCategories.map((categoryName, index) => ({
        categoryName,
        fourthCategories: [],
        fourthCategoryEntries: [],
        sortOrder: index,
      }));
    };

    const normalizeStoreEntries = (
      rawStoreEntries: unknown,
      legacyStores: string[]
    ): AgentWorkflowStoreEntry[] => {
      const mappedEntries: Array<AgentWorkflowStoreEntry | null> = Array.isArray(rawStoreEntries)
        ? rawStoreEntries.map((storeItem, storeIndex) => {
            if (typeof storeItem === "string") {
              const storeName = normalizeText(storeItem, 64);
              if (!storeName) return null;
              return {
                storeName,
                thirdCategories: [],
                sortOrder: storeIndex,
              };
            }

            const storeRecord =
              storeItem && typeof storeItem === "object" && !Array.isArray(storeItem)
                ? (storeItem as Record<string, unknown>)
                : {};
            const storeName = normalizeText(storeRecord.storeName, 64);
            if (!storeName) return null;
            const legacyThirdCategories = normalizeStringList(storeRecord.thirdCategories).slice(
              0,
              300
            );
            const thirdCategoryEntries = normalizeThirdCategoryEntries(
              storeRecord.thirdCategoryEntries,
              legacyThirdCategories
            );
            return {
              storeName,
              thirdCategories:
                thirdCategoryEntries.length > 0
                  ? thirdCategoryEntries.map((entry) => entry.categoryName)
                  : legacyThirdCategories,
              thirdCategoryEntries,
              sortOrder: normalizeNumber(storeRecord.sortOrder, storeIndex),
            };
          })
        : [];

      const normalizedFromEntries = mappedEntries
        .filter((item): item is AgentWorkflowStoreEntry => item !== null)
        .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
        .map((entry, index) => ({
          ...entry,
          thirdCategories: Array.from(
            new Set((entry.thirdCategories || []).map((item) => item.trim()).filter(Boolean))
          ).slice(0, 300),
          thirdCategoryEntries: (entry.thirdCategoryEntries || []).map((thirdEntry, thirdIndex) => ({
            ...thirdEntry,
            fourthCategories: Array.from(
              new Set((thirdEntry.fourthCategories || []).map((item) => item.trim()).filter(Boolean))
            ).slice(0, 300),
            fourthCategoryEntries: (thirdEntry.fourthCategoryEntries || []).map(
              (fourthEntry, fourthIndex) => ({
                ...fourthEntry,
                fifthCategories: Array.from(
                  new Set((fourthEntry.fifthCategories || []).map((item) => item.trim()).filter(Boolean))
                ).slice(0, 300),
                sortOrder: fourthIndex,
              })
            ),
            sortOrder: thirdIndex,
          })),
          sortOrder: index,
        }));

      if (normalizedFromEntries.length > 0) {
        return normalizedFromEntries;
      }

      return legacyStores.map((storeName, index) => ({
        storeName,
        thirdCategories: [],
        thirdCategoryEntries: [],
        sortOrder: index,
      }));
    };

    const mappedEntries: Array<AgentWorkflowBrandStoreEntry | null> = input.map((item, index) => {
      const record =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : {};
      const brandName = normalizeText(record.brandName, 64);
      if (!brandName) return null;
      const legacyStores = normalizeStringList(record.stores).slice(0, 300);
      const storeEntries = normalizeStoreEntries(record.storeEntries, legacyStores);
      const stores = storeEntries.map((entry) => entry.storeName);

      return {
        brandName,
        stores,
        storeEntries,
        sortOrder: normalizeNumber(record.sortOrder, index),
      };
    });

    return mappedEntries
      .filter((item): item is AgentWorkflowBrandStoreEntry => item !== null)
      .sort((left, right) => (left.sortOrder || 0) - (right.sortOrder || 0))
      .map((entry, index) => ({
        ...entry,
        sortOrder: index,
      }));
  };
  const normalizedBrandStoreEntries = normalizeBrandStoreEntries(
    rawInputOptions.brandStoreEntries
  );
  const normalizedCategoryLabels = normalizeAgentWorkflowCategoryLabels(
    rawInputOptions.categoryLabels ?? rawInputOptions
  );
  const normalizedBrands = normalizeStringList(rawInputOptions.brands);
  const normalizedStores = normalizeStringList(rawInputOptions.stores);
  const normalizedThirdCategories = normalizeStringList(rawInputOptions.thirdCategories);
  const normalizedFourthCategories = normalizeStringList(rawInputOptions.fourthCategories);
  const normalizedFifthCategories = normalizeStringList(rawInputOptions.fifthCategories);
  const normalizedPriceBands = normalizeStringList(rawInputOptions.priceBands);
  const normalizedOfficialCategoryEntries = normalizeOfficialCategoryEntries(
    rawInputOptions.officialCategoryEntries
  );
  const fallbackBrandStoreEntries: AgentWorkflowBrandStoreEntry[] =
    normalizedBrandStoreEntries.length > 0
      ? normalizedBrandStoreEntries
      : normalizedBrands.map((brandName, index) => ({
          brandName,
          stores: normalizedBrands.length === 1 ? normalizedStores : [],
          storeEntries:
            normalizedBrands.length === 1
              ? normalizedStores.map((storeName, storeIndex) => ({
                  storeName,
                  thirdCategories: [],
                  thirdCategoryEntries: [],
                  sortOrder: storeIndex,
                }))
              : [],
          sortOrder: index,
        }));
  const defaultStepByKey = new Map(
    flattenAgentWorkflowSteps(defaultAgentWorkflowUiConfig.steps).map(({ step }) => [
      step.key,
      step,
    ] as const)
  );
  const sourceSteps = hasRawSteps ? rawSteps : (defaultAgentWorkflowUiConfig.steps as unknown[]);
  const usedStepKeys = new Set<string>();

  const normalizeOption = (
    item: unknown,
    optionIndex: number,
    stepKey: string,
    usedOptionKeys: Set<string>,
    defaultOptions: AgentWorkflowOptionUiConfig[],
    depth: number
  ): AgentWorkflowOptionUiConfig => {
    const optionRecord =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : {};
    const defaultOption = defaultOptions.find(
      (defaultItem) => defaultItem.key === normalizeText(optionRecord.key, 64)
    );
    const optionBaseKey = normalizeKey(
      optionRecord.key,
      defaultOption?.key || `${stepKey}_option_${optionIndex + 1}`
    );
    let optionKey = optionBaseKey;
    let optionDuplicateIndex = 2;
    while (usedOptionKeys.has(optionKey)) {
      optionKey = `${optionBaseKey}_${optionDuplicateIndex}`;
      optionDuplicateIndex += 1;
    }
    usedOptionKeys.add(optionKey);

    const buttonName =
      normalizeText(optionRecord.buttonName, 64) ||
      defaultOption?.buttonName ||
      `选项${optionIndex + 1}`;
    const promptFragment =
      normalizeText(optionRecord.promptFragment, AGENT_WORKFLOW_PROMPT_FRAGMENT_MAX_LENGTH) ||
      defaultOption?.promptFragment ||
      buttonName;
    const hasRawBlockedOptionKeys = Array.isArray(optionRecord.blockedOptionKeys);
    const hasRawAvailableOfficialCategoryKeys = Array.isArray(
      optionRecord.availableOfficialCategoryKeys
    );
    const hasRawSpecialModuleAllowedOptionKeys = Array.isArray(
      optionRecord.specialModuleAllowedOptionKeys
    );
    const hasRawChildren = Array.isArray(optionRecord.children);
    const rawChildren = hasRawChildren ? (optionRecord.children as unknown[]) : [];
    const defaultChildren =
      !hasRawChildren && defaultOption?.children ? defaultOption.children : [];
    const childSource =
      depth < AGENT_WORKFLOW_MAX_OPTION_DEPTH && (rawChildren.length > 0 || hasRawChildren)
        ? rawChildren
        : depth < AGENT_WORKFLOW_MAX_OPTION_DEPTH
          ? defaultChildren
          : [];
    const children =
      depth < AGENT_WORKFLOW_MAX_OPTION_DEPTH
        ? childSource
            .map((child, childIndex) =>
              normalizeOption(
                child,
                childIndex,
                optionKey,
                usedOptionKeys,
                defaultOption?.children || [],
                depth + 1
              )
            )
            .sort((left, right) => left.sortOrder - right.sortOrder)
        : [];
    const directPreviewImageUrl =
      normalizeText(optionRecord.previewImageUrl, 1000) ||
      defaultOption?.previewImageUrl ||
      "";
    const directPreviewImageSourceUrl =
      normalizeText(optionRecord.previewImageSourceUrl, 1000) ||
      defaultOption?.previewImageSourceUrl ||
      "";
    const descendantPreview = getFirstAgentWorkflowOptionPreview({
      key: optionKey,
      buttonName,
      description: "",
      previewImageUrl: directPreviewImageUrl,
      previewImageSourceUrl: directPreviewImageSourceUrl,
      enabled: true,
      sortOrder: optionIndex,
      promptFragment,
      blockedOptionKeys: [],
      specialModuleEnabled: false,
      specialModuleExclusionEnabled: false,
      specialModuleAllowedOptionKeys: [],
      children,
    });

    return {
      key: optionKey,
      buttonName,
      description:
        normalizeText(optionRecord.description, 300) || defaultOption?.description || "",
      previewImageUrl: directPreviewImageUrl || descendantPreview?.previewImageUrl || "",
      previewImageSourceUrl:
        directPreviewImageSourceUrl ||
        descendantPreview?.previewImageSourceUrl ||
        "",
      enabled: normalizeBoolean(optionRecord.enabled, defaultOption?.enabled ?? true),
      sortOrder: normalizeNumber(
        optionRecord.sortOrder,
        defaultOption?.sortOrder ?? optionIndex
      ),
      promptFragment,
      blockedOptionKeys: hasRawBlockedOptionKeys
        ? normalizeKeyList(optionRecord.blockedOptionKeys, AGENT_WORKFLOW_BLOCKED_OPTION_KEYS_MAX)
        : normalizeKeyList(defaultOption?.blockedOptionKeys, AGENT_WORKFLOW_BLOCKED_OPTION_KEYS_MAX),
      availableOfficialCategoryKeys: hasRawAvailableOfficialCategoryKeys
        ? normalizeOfficialCategoryKeyList(optionRecord.availableOfficialCategoryKeys)
        : normalizeOfficialCategoryKeyList(defaultOption?.availableOfficialCategoryKeys),
      specialModuleEnabled: normalizeBoolean(
        optionRecord.specialModuleEnabled,
        defaultOption?.specialModuleEnabled ?? false
      ),
      specialModuleExclusionEnabled: normalizeBoolean(
        optionRecord.specialModuleExclusionEnabled,
        defaultOption?.specialModuleExclusionEnabled ?? false
      ),
      specialModuleAllowedOptionKeys: hasRawSpecialModuleAllowedOptionKeys
        ? normalizeKeyList(
            optionRecord.specialModuleAllowedOptionKeys,
            AGENT_WORKFLOW_SPECIAL_MODULE_ALLOWED_KEYS_MAX
          )
        : normalizeKeyList(
            defaultOption?.specialModuleAllowedOptionKeys,
            AGENT_WORKFLOW_SPECIAL_MODULE_ALLOWED_KEYS_MAX
          ),
      children,
    };
  };

  const normalizeStep = (
    item: unknown,
    stepIndex: number,
    depth: number
  ): AgentWorkflowStepUiConfig => {
    const stepRecord =
      item && typeof item === "object" && !Array.isArray(item)
        ? (item as Record<string, unknown>)
        : null;
    const candidateKey = normalizeKey(stepRecord?.key, `step_${stepIndex + 1}`);
    let stepKey = candidateKey;
    let duplicateIndex = 2;
    while (usedStepKeys.has(stepKey)) {
      stepKey = `${candidateKey}_${duplicateIndex}`;
      duplicateIndex += 1;
    }
    usedStepKeys.add(stepKey);

    const defaultStep = defaultStepByKey.get(stepKey);
    const fallbackTitle = defaultStep?.title || `步骤${stepIndex + 1}`;
    const fallbackDescription = defaultStep?.description || "";
    const hasRawOptions = Array.isArray(stepRecord?.options);
    const rawOptions = hasRawOptions ? (stepRecord?.options as unknown[]) : [];
    const defaultOptions = !hasRawOptions && defaultStep?.options ? defaultStep.options : [];
    const optionSource = rawOptions.length > 0 || hasRawOptions ? rawOptions : defaultOptions;
    const usedOptionKeys = new Set<string>();

    const options = optionSource
      .map((option, optionIndex) =>
        normalizeOption(option, optionIndex, stepKey, usedOptionKeys, defaultOptions, 1)
      )
      .sort((left, right) => left.sortOrder - right.sortOrder);
    const hasRawChildren = Array.isArray(stepRecord?.children);
    const rawChildren = hasRawChildren ? (stepRecord?.children as unknown[]) : [];
    const defaultChildren =
      !hasRawChildren && defaultStep?.children ? defaultStep.children : [];
    const childSource =
      depth < AGENT_WORKFLOW_MAX_TREE_DEPTH && (rawChildren.length > 0 || hasRawChildren)
        ? rawChildren
        : depth < AGENT_WORKFLOW_MAX_TREE_DEPTH
          ? defaultChildren
          : [];

    return {
      key: stepKey,
      title: normalizeText(stepRecord?.title, 64) || fallbackTitle,
      description: normalizeText(stepRecord?.description, 300) || fallbackDescription,
      enabled: normalizeBoolean(stepRecord?.enabled, defaultStep?.enabled ?? true),
      sortOrder: normalizeNumber(stepRecord?.sortOrder, defaultStep?.sortOrder ?? stepIndex),
      specialModuleEnabled: normalizeBoolean(
        stepRecord?.specialModuleEnabled,
        defaultStep?.specialModuleEnabled ?? false
      ),
      options,
      children:
        depth < AGENT_WORKFLOW_MAX_TREE_DEPTH
          ? childSource
              .map((child, childIndex) => normalizeStep(child, childIndex, depth + 1))
              .sort((left, right) => left.sortOrder - right.sortOrder)
          : [],
    };
  };

  const normalizedSteps = sourceSteps
    .map((item, stepIndex) => normalizeStep(item, stepIndex, 1))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const validOptionKeys = collectWorkflowOptionKeySetFromSteps(normalizedSteps);
  const sanitizedSteps = sanitizeBlockedWorkflowStepTree(normalizedSteps, validOptionKeys);

  return {
    inputOptions: {
      brands:
        fallbackBrandStoreEntries.length > 0
          ? fallbackBrandStoreEntries.map((entry) => entry.brandName)
          : normalizedBrands,
      stores:
        fallbackBrandStoreEntries.length > 0
          ? Array.from(
              new Set(
                fallbackBrandStoreEntries.flatMap((entry) =>
                  (entry.storeEntries || []).map((storeEntry) => storeEntry.storeName)
                )
              )
            )
          : normalizedStores,
      thirdCategories:
        fallbackBrandStoreEntries.length > 0
          ? Array.from(
              new Set(
                fallbackBrandStoreEntries.flatMap((entry) =>
                  (entry.storeEntries || []).flatMap(
                    (storeEntry) => storeEntry.thirdCategories || []
                  )
                )
              )
            )
          : normalizedThirdCategories,
      fourthCategories:
        fallbackBrandStoreEntries.length > 0
          ? Array.from(
              new Set(
                fallbackBrandStoreEntries.flatMap((entry) =>
                  (entry.storeEntries || []).flatMap((storeEntry) =>
                    (storeEntry.thirdCategoryEntries || []).flatMap(
                      (thirdEntry) => thirdEntry.fourthCategories || []
                    )
                  )
                )
              )
            )
          : normalizedFourthCategories,
      fifthCategories:
        fallbackBrandStoreEntries.length > 0
          ? Array.from(
              new Set(
                fallbackBrandStoreEntries.flatMap((entry) =>
                  (entry.storeEntries || []).flatMap((storeEntry) =>
                    (storeEntry.thirdCategoryEntries || []).flatMap((thirdEntry) =>
                      (thirdEntry.fourthCategoryEntries || []).flatMap(
                        (fourthEntry) => fourthEntry.fifthCategories || []
                      )
                    )
                  )
                )
              )
            )
          : normalizedFifthCategories,
      categoryLabels: normalizedCategoryLabels,
      officialCategoryEntries: normalizedOfficialCategoryEntries,
      priceBands: normalizedPriceBands,
      brandStoreEntries: fallbackBrandStoreEntries,
    },
    constraintSettings: normalizeAgentWorkflowConstraintSettings(
      raw.constraintSettings ?? {
        crossLevelMutualExclusionEnabled: raw.crossLevelMutualExclusionEnabled,
      }
    ),
    pageFeatureSettings: normalizeAgentWorkflowPageFeatureSettings(
      raw.pageFeatureSettings ?? {
        presetStepEnabled: raw.presetStepEnabled ?? raw.modeStepEnabled,
        materialStepEnabled: raw.materialStepEnabled ?? raw.skuStepEnabled,
      }
    ),
    businessModeSettings: normalizeAgentWorkflowBusinessModeSettings(
      raw.businessModeSettings ?? raw.fixedModeSettings ?? raw.businessModes
    ),
    steps: sanitizedSteps,
  };
}

export function getAgentWorkflowBrandStoreEntries(config?: AgentWorkflowUiConfig | null) {
  return config?.inputOptions?.brandStoreEntries || defaultAgentWorkflowUiConfig.inputOptions?.brandStoreEntries || [];
}

export function getAgentWorkflowCategoryLabels(
  config?: AgentWorkflowUiConfig | null
) {
  return normalizeAgentWorkflowCategoryLabels(config?.inputOptions?.categoryLabels);
}

export function getAgentWorkflowConstraintSettings(
  config?: AgentWorkflowUiConfig | null
) {
  return normalizeAgentWorkflowConstraintSettings(config?.constraintSettings);
}

export function getAgentWorkflowPageFeatureSettings(
  config?: AgentWorkflowUiConfig | null
) {
  return normalizeAgentWorkflowPageFeatureSettings(config?.pageFeatureSettings);
}

export function getAgentWorkflowBusinessModeSettings(
  config?: AgentWorkflowUiConfig | null
) {
  return normalizeAgentWorkflowBusinessModeSettings(config?.businessModeSettings);
}

export function getAgentWorkflowCategoryOptionsByBrand(params: {
  config?: AgentWorkflowUiConfig | null;
  brand?: string | null;
}) {
  const entries = getAgentWorkflowBrandStoreEntries(params.config);
  const labels = getAgentWorkflowCategoryLabels(params.config);
  const normalizedBrand = String(params.brand || "").trim().toLowerCase();
  const options: AgentWorkflowBrandCategoryOption[] = [];
  const seenValues = new Set<string>();

  const pushOption = (
    value: string,
    level: AgentWorkflowBrandCategoryOption["level"],
    levelLabel: string
  ) => {
    const normalizedValue = String(value || "").trim();
    if (!normalizedValue) {
      return;
    }

    const dedupeKey = normalizedValue.toLowerCase();
    if (seenValues.has(dedupeKey)) {
      return;
    }

    seenValues.add(dedupeKey);
    options.push({
      value: normalizedValue,
      level,
      levelLabel,
    });
  };

  if (normalizedBrand) {
    const matchedEntry = entries.find(
      (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
    );

    if (matchedEntry) {
      for (const storeEntry of matchedEntry.storeEntries || []) {
        for (const thirdEntry of storeEntry.thirdCategoryEntries || []) {
          pushOption(thirdEntry.categoryName, "third", labels.thirdCategory);

          for (const fourthEntry of thirdEntry.fourthCategoryEntries || []) {
            pushOption(fourthEntry.categoryName, "fourth", labels.fourthCategory);

            for (const fifthCategory of fourthEntry.fifthCategories || []) {
              pushOption(fifthCategory, "fifth", labels.fifthCategory);
            }
          }
        }
      }

      if (options.length > 0) {
        return options;
      }
    }
  }

  for (const thirdCategory of params.config?.inputOptions?.thirdCategories || []) {
    pushOption(thirdCategory, "third", labels.thirdCategory);
  }
  for (const fourthCategory of params.config?.inputOptions?.fourthCategories || []) {
    pushOption(fourthCategory, "fourth", labels.fourthCategory);
  }
  for (const fifthCategory of params.config?.inputOptions?.fifthCategories || []) {
    pushOption(fifthCategory, "fifth", labels.fifthCategory);
  }

  return options;
}

export function getAgentWorkflowStoreOptionsByBrand(params: {
  config?: AgentWorkflowUiConfig | null;
  brand?: string | null;
}) {
  const entries = getAgentWorkflowBrandStoreEntries(params.config);
  const normalizedBrand = String(params.brand || "").trim().toLowerCase();
  if (!normalizedBrand) {
    return [];
  }

  const matchedEntry = entries.find(
    (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
  );
  const storeOptions = matchedEntry
    ? (matchedEntry.storeEntries || []).map((entry) => entry.storeName).filter(Boolean)
    : [];
  if (storeOptions.length > 0) {
    return storeOptions;
  }
  if (matchedEntry && matchedEntry.stores.length > 0) {
    return matchedEntry.stores;
  }

  return params.config?.inputOptions?.stores || defaultAgentWorkflowUiConfig.inputOptions?.stores || [];
}

export function getAgentWorkflowThirdCategoryOptionsByBrandStore(params: {
  config?: AgentWorkflowUiConfig | null;
  brand?: string | null;
  store?: string | null;
}) {
  const entries = getAgentWorkflowBrandStoreEntries(params.config);
  const normalizedBrand = String(params.brand || "").trim().toLowerCase();
  const normalizedStore = String(params.store || "").trim().toLowerCase();
  if (!normalizedBrand || !normalizedStore) {
    return [];
  }

  const matchedEntry = entries.find(
    (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
  );
  const matchedStoreEntry = matchedEntry?.storeEntries?.find(
    (storeEntry) => storeEntry.storeName.trim().toLowerCase() === normalizedStore
  );
  const thirdCategoryOptions =
    matchedStoreEntry?.thirdCategoryEntries && matchedStoreEntry.thirdCategoryEntries.length > 0
      ? matchedStoreEntry.thirdCategoryEntries.map((entry) => entry.categoryName).filter(Boolean)
      : matchedStoreEntry?.thirdCategories || [];
  if (thirdCategoryOptions.length > 0) {
    return thirdCategoryOptions;
  }
  if (matchedStoreEntry && matchedStoreEntry.thirdCategories.length > 0) {
    return matchedStoreEntry.thirdCategories;
  }

  return params.config?.inputOptions?.thirdCategories || defaultAgentWorkflowUiConfig.inputOptions?.thirdCategories || [];
}

export function getAgentWorkflowFourthCategoryOptionsByBrandStoreThirdCategory(params: {
  config?: AgentWorkflowUiConfig | null;
  brand?: string | null;
  store?: string | null;
  thirdCategory?: string | null;
}) {
  const entries = getAgentWorkflowBrandStoreEntries(params.config);
  const normalizedBrand = String(params.brand || "").trim().toLowerCase();
  const normalizedStore = String(params.store || "").trim().toLowerCase();
  const normalizedThirdCategory = String(params.thirdCategory || "").trim().toLowerCase();
  if (!normalizedBrand || !normalizedStore || !normalizedThirdCategory) {
    return [];
  }

  const matchedEntry = entries.find(
    (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
  );
  const matchedStoreEntry = matchedEntry?.storeEntries?.find(
    (storeEntry) => storeEntry.storeName.trim().toLowerCase() === normalizedStore
  );
  const matchedThirdEntry = matchedStoreEntry?.thirdCategoryEntries?.find(
    (thirdEntry) => thirdEntry.categoryName.trim().toLowerCase() === normalizedThirdCategory
  );
  if (matchedThirdEntry && matchedThirdEntry.fourthCategories.length > 0) {
    return matchedThirdEntry.fourthCategories;
  }

  return params.config?.inputOptions?.fourthCategories || defaultAgentWorkflowUiConfig.inputOptions?.fourthCategories || [];
}

export function getAgentWorkflowFifthCategoryOptionsByBrandStoreThirdFourth(params: {
  config?: AgentWorkflowUiConfig | null;
  brand?: string | null;
  store?: string | null;
  thirdCategory?: string | null;
  fourthCategory?: string | null;
}) {
  const entries = getAgentWorkflowBrandStoreEntries(params.config);
  const normalizedBrand = String(params.brand || "").trim().toLowerCase();
  const normalizedStore = String(params.store || "").trim().toLowerCase();
  const normalizedThirdCategory = String(params.thirdCategory || "").trim().toLowerCase();
  const normalizedFourthCategory = String(params.fourthCategory || "").trim().toLowerCase();
  if (!normalizedBrand || !normalizedStore || !normalizedThirdCategory || !normalizedFourthCategory) {
    return [];
  }

  const matchedEntry = entries.find(
    (entry) => entry.brandName.trim().toLowerCase() === normalizedBrand
  );
  const matchedStoreEntry = matchedEntry?.storeEntries?.find(
    (storeEntry) => storeEntry.storeName.trim().toLowerCase() === normalizedStore
  );
  const matchedThirdEntry = matchedStoreEntry?.thirdCategoryEntries?.find(
    (thirdEntry) => thirdEntry.categoryName.trim().toLowerCase() === normalizedThirdCategory
  );
  const matchedFourthEntry = matchedThirdEntry?.fourthCategoryEntries?.find(
    (fourthEntry) => fourthEntry.categoryName.trim().toLowerCase() === normalizedFourthCategory
  );
  if (matchedFourthEntry && matchedFourthEntry.fifthCategories.length > 0) {
    return matchedFourthEntry.fifthCategories;
  }

  return params.config?.inputOptions?.fifthCategories || defaultAgentWorkflowUiConfig.inputOptions?.fifthCategories || [];
}

export function getAgentWorkflowPriceBandOptions(config?: AgentWorkflowUiConfig | null) {
  return config?.inputOptions?.priceBands || defaultAgentWorkflowUiConfig.inputOptions?.priceBands || [];
}

export function parseAgentWorkflowSelectionPath(value?: string | null) {
  return String(value || "")
    .split(">")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, AGENT_WORKFLOW_MAX_OPTION_DEPTH);
}

export function serializeAgentWorkflowSelectionPath(optionKeys: string[]) {
  return optionKeys.filter(Boolean).slice(0, AGENT_WORKFLOW_MAX_OPTION_DEPTH).join(">");
}

export function getAgentWorkflowSelectedOptionPath(params: {
  step: AgentWorkflowStepUiConfig;
  selectionValue?: string | null;
}) {
  const keys = parseAgentWorkflowSelectionPath(params.selectionValue);
  const selectedOptions: AgentWorkflowOptionUiConfig[] = [];
  let currentOptions = params.step.options || [];

  for (const key of keys) {
    const matchedOption = getWorkflowOptionLookup(currentOptions).get(key);
    if (matchedOption?.enabled === false) {
      break;
    }
    if (!matchedOption) break;
    selectedOptions.push(matchedOption);
    currentOptions = matchedOption.children || [];
  }

  return selectedOptions;
}

export function sanitizeAgentWorkflowSelections(params: {
  config?: AgentWorkflowUiConfig | null;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}) {
  const hasSelection = Object.values(params.selections || {}).some((value) =>
    Boolean(String(value || "").trim())
  );
  if (!hasSelection) {
    return {};
  }

  const config = params.config || defaultAgentWorkflowUiConfig;
  const enabledSteps = flattenAgentWorkflowSteps(
    getEnabledAgentWorkflowStepTree(Array.isArray(config.steps) ? config.steps : [])
  ).map(({ step }) => step);

  const sanitized: Partial<Record<AgentWorkflowStepKey, string>> = {};

  enabledSteps.forEach((step) => {
    const rawSelectionValue = String(params.selections[step.key] || "").trim();
    if (!rawSelectionValue) {
      return;
    }

    const selectedOptions = getAgentWorkflowSelectedOptionPath({
      step,
      selectionValue: rawSelectionValue,
    });
    if (selectedOptions.length === 0) {
      return;
    }

    const serialized = serializeAgentWorkflowSelectionPath(
      selectedOptions.map((option) => option.key)
    );
    if (serialized) {
      sanitized[step.key] = serialized;
    }
  });

  return sanitized;
}

export function getAgentWorkflowBlockedOptionKeys(params: {
  step: AgentWorkflowStepUiConfig;
  selectionValue?: string | null;
  allowCrossLevel?: boolean;
  optionDepthLookup?: Map<string, number>;
  specialModuleRootOptions?: AgentWorkflowOptionUiConfig[];
}) {
  const selectedOptions = getAgentWorkflowSelectedOptionPath(params);
  const selectedOptionKeys = new Set(selectedOptions.map((option) => option.key));
  const optionDepthLookup =
    params.optionDepthLookup ||
    new Map(
      flattenAgentWorkflowOptionTree(params.step.options || []).map(({ option, depth }) => [
        option.key,
        depth,
      ] as const)
    );
  return Array.from(
    new Set(
      selectedOptions.flatMap((option) => {
        const currentDepth = optionDepthLookup.get(option.key);
        const explicitBlockedKeys = (option.blockedOptionKeys || []).filter((blockedKey) => {
          if (!blockedKey) {
            return false;
          }
          if (params.allowCrossLevel) {
            return true;
          }
          if (typeof currentDepth !== "number") {
            return false;
          }
          return optionDepthLookup.get(blockedKey) === currentDepth;
        });
        const specialModuleBlockedKeys = option.specialModuleExclusionEnabled
          ? getSpecialModuleBlockedOptionKeys({
              allowedOptionKeys: option.specialModuleAllowedOptionKeys || [],
              selectedOptionKeys,
              sourceOptionKey: option.key,
              specialModuleRootOptions: params.specialModuleRootOptions || [],
            })
          : [];

        return [...explicitBlockedKeys, ...specialModuleBlockedKeys];
      })
    )
  );
}

function collectAllowedSpecialModulePathKeys(
  option: AgentWorkflowOptionUiConfig,
  allowedOptionKeys: Set<string>,
  ancestors: string[] = []
): string[] {
  const currentAncestors = [...ancestors, option.key];
  const descendantKeys = (option.children || []).flatMap((child) =>
    collectAllowedSpecialModulePathKeys(child, allowedOptionKeys, currentAncestors)
  );

  if (allowedOptionKeys.has(option.key)) {
    return [
      ...currentAncestors,
      ...flattenAgentWorkflowOptionTree(option.children || []).map(
        ({ option: childOption }) => childOption.key
      ),
    ];
  }

  return descendantKeys;
}

function getSpecialModuleBlockedOptionKeys(params: {
  allowedOptionKeys: string[];
  selectedOptionKeys: Set<string>;
  sourceOptionKey: string;
  specialModuleRootOptions: AgentWorkflowOptionUiConfig[];
}) {
  const allowedOptionKeys = new Set(params.allowedOptionKeys.filter(Boolean));
  const allowedPathKeys = new Set<string>();

  for (const rootOption of params.specialModuleRootOptions) {
    if (rootOption.key === params.sourceOptionKey) {
      continue;
    }

    collectAllowedSpecialModulePathKeys(rootOption, allowedOptionKeys).forEach((key) =>
      allowedPathKeys.add(key)
    );
  }

  return params.specialModuleRootOptions.flatMap((rootOption) => {
    if (rootOption.key === params.sourceOptionKey) {
      return [];
    }

    return flattenAgentWorkflowOptionTree(rootOption.children || [])
      .map(({ option }) => option.key)
      .filter(
        (key) =>
          key &&
          !allowedOptionKeys.has(key) &&
          !allowedPathKeys.has(key) &&
          !params.selectedOptionKeys.has(key)
      );
  });
}

function collectAgentWorkflowOptionBranchKeys(
  options: AgentWorkflowOptionUiConfig[],
  targetKey: string
): string[] {
  for (const option of options) {
    if (option.key === targetKey) {
      return flattenAgentWorkflowOptionTree([option]).map(({ option: currentOption }) => currentOption.key);
    }

    const childKeys = collectAgentWorkflowOptionBranchKeys(option.children || [], targetKey);
    if (childKeys.length > 0) {
      return childKeys;
    }
  }

  return [];
}

export function getAgentWorkflowBlockedOptionKeysForSelections(params: {
  config?: AgentWorkflowUiConfig | null;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}) {
  const hasSelection = Object.values(params.selections || {}).some((value) =>
    Boolean(String(value || "").trim())
  );
  if (!hasSelection) {
    return [];
  }

  const config = params.config || defaultAgentWorkflowUiConfig;
  const constraintSettings = getAgentWorkflowConstraintSettings(config);
  const visibleSteps = flattenVisibleAgentWorkflowSteps(
    getEnabledAgentWorkflowStepTree(Array.isArray(config.steps) ? config.steps : []),
    params.selections
  ).map(({ step }) => step);
  const visibleOptionDepthLookup = new Map(
    visibleSteps.flatMap((step) =>
      flattenAgentWorkflowOptionTree(step.options || []).map(({ option, depth }) => [
        option.key,
        depth,
      ] as const)
    )
  );
  const specialModuleRootOptions = getAgentWorkflowSpecialModuleRootOptions(visibleSteps);

  const directlyBlockedKeys = Array.from(
    new Set(
      visibleSteps.flatMap((step) =>
        getAgentWorkflowBlockedOptionKeys({
          step,
          selectionValue: params.selections[step.key],
          allowCrossLevel: constraintSettings.crossLevelMutualExclusionEnabled,
          optionDepthLookup: visibleOptionDepthLookup,
          specialModuleRootOptions,
        })
      )
    )
  );

  return Array.from(
    new Set(
      directlyBlockedKeys.flatMap((blockedKey) => {
        const branchKeys = collectAgentWorkflowOptionBranchKeys(
          visibleSteps.flatMap((step) => step.options || []),
          blockedKey
        );
        return branchKeys.length > 0 ? branchKeys : [blockedKey];
      })
    )
  );
}

export function sanitizeAgentWorkflowSelectionsForBlockedOptions(params: {
  config?: AgentWorkflowUiConfig | null;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}) {
  const config = params.config || defaultAgentWorkflowUiConfig;
  const enabledSteps = flattenAgentWorkflowSteps(
    getEnabledAgentWorkflowStepTree(Array.isArray(config.steps) ? config.steps : [])
  ).map(({ step }) => step);
  let sanitizedSelections = sanitizeAgentWorkflowSelections({
    config,
    selections: params.selections,
  });

  for (let iteration = 0; iteration < enabledSteps.length; iteration += 1) {
    const blockedOptionKeys = new Set(
      getAgentWorkflowBlockedOptionKeysForSelections({
        config,
        selections: sanitizedSelections,
      })
    );
    let changed = false;
    const nextSelections = { ...sanitizedSelections };

    for (const step of enabledSteps) {
      const selectedOptions = getAgentWorkflowSelectedOptionPath({
        step,
        selectionValue: sanitizedSelections[step.key],
      });
      const firstBlockedIndex = selectedOptions.findIndex((option) =>
        blockedOptionKeys.has(option.key)
      );

      if (firstBlockedIndex < 0) {
        continue;
      }

      const keptOptionKeys = selectedOptions
        .slice(0, firstBlockedIndex)
        .map((option) => option.key);
      const serialized = serializeAgentWorkflowSelectionPath(keptOptionKeys);
      if (serialized) {
        nextSelections[step.key] = serialized;
      } else {
        delete nextSelections[step.key];
      }
      changed = true;
    }

    if (!changed) {
      return sanitizedSelections;
    }

    sanitizedSelections = sanitizeAgentWorkflowSelections({
      config,
      selections: nextSelections,
    });
  }

  return sanitizedSelections;
}

export function isAgentWorkflowStepSelectionComplete(params: {
  step: AgentWorkflowStepUiConfig;
  selectionValue?: string | null;
}) {
  const selectedPath = getAgentWorkflowSelectedOptionPath(params);
  if (selectedPath.length === 0) return false;
  const lastOption = selectedPath[selectedPath.length - 1];
  return getEnabledAgentWorkflowOptionTree(lastOption.children || []).length === 0;
}
