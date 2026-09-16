// Modified for standalone community distribution; see NOTICE.
import {
  defaultAgentWorkflowUiConfig,
  flattenVisibleAgentWorkflowSteps,
  getAgentWorkflowSelectedOptionPath,
  getEnabledAgentWorkflowStepTree,
  isAgentWorkflowStepSelectionComplete,
} from "@/src/lib/agents/workflow-ui-config";
import type {
  AgentWorkflowComposerContext,
  AgentWorkflowComposerSelection,
  AgentWorkflowMaterialSelections,
  AgentWorkflowReferenceImage,
  AgentWorkflowSelectedBrandModel,
  AgentWorkflowStepKey,
  AgentWorkflowUiConfig,
} from "@/types/agent";

export interface AgentWorkflowInputsValue {
  primarySku: string;
  secondarySku: string;
  brand: string;
  store: string;
  officialSecondCategory: string;
  officialThirdCategory: string;
  thirdCategory: string;
  fourthCategory: string;
  fifthCategory: string;
  priceBand: string;
}

const WORKFLOW_FRAGMENT_INLINE_LABELS = [
  "角色",
  "技能",
  "目标",
  "约束条件",
  "流程",
  "输出",
  "前景",
  "中景",
  "背景",
  "主产品",
  "台面摆件",
  "模特",
];

const BUSINESS_METADATA_NOISE_PATTERNS = [
  /官方旗舰店/gi,
  /旗舰店/gi,
  /专卖店/gi,
  /专营店/gi,
  /企业店/gi,
  /品牌馆/gi,
  /拼多多/gi,
  /天猫/gi,
  /淘宝/gi,
  /京东/gi,
];

function escapeRegExp(value: string) {
  return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizePromptBusinessMetadata(params: {
  value: string;
  inputs: AgentWorkflowInputsValue;
}) {
  const metadataTerms = [
    params.inputs.brand,
    params.inputs.store,
    params.inputs.officialSecondCategory,
    params.inputs.officialThirdCategory,
    params.inputs.thirdCategory,
    params.inputs.fourthCategory,
    params.inputs.fifthCategory,
    params.inputs.priceBand,
  ]
    .map((item) => normalizeWorkflowText(item || ""))
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);

  let nextValue = normalizeWorkflowText(params.value || "");
  if (!nextValue) {
    return "";
  }

  metadataTerms.forEach((term) => {
    nextValue = nextValue.replace(new RegExp(escapeRegExp(term), "gi"), " ");
  });

  BUSINESS_METADATA_NOISE_PATTERNS.forEach((pattern) => {
    nextValue = nextValue.replace(pattern, " ");
  });

  nextValue = nextValue
    .replace(/[（）()【】[\]「」『』]/g, " ")
    .replace(/[：:]/g, " ")
    .replace(/\s*[/-]\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return nextValue;
}

function buildGoodsInfoPromptLine(params: {
  label: string;
  inputs: AgentWorkflowInputsValue;
  result?: AgentWorkflowMaterialSelections["primary"]["result"] | null;
}) {
  const goodsInfo = params.result?.goodsInfo;
  if (!goodsInfo) {
    return "";
  }

  const cleanedProductName = sanitizePromptBusinessMetadata({
    value: goodsInfo.productName || "",
    inputs: params.inputs,
  });
  const parts = [
    cleanedProductName ? `商品名称：${cleanedProductName}` : "",
    goodsInfo.sizeInfo ? `尺寸信息：${goodsInfo.sizeInfo}` : "",
    goodsInfo.materialInfo ? `材质信息：${goodsInfo.materialInfo}` : "",
    goodsInfo.boardType ? `板材类型：${goodsInfo.boardType}` : "",
  ].filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return `${params.label}：${parts.join("；")}`;
}

function buildGoodsInfoSizeConstraintLine(params: {
  label: string;
  result?: AgentWorkflowMaterialSelections["primary"]["result"] | null;
}) {
  const goodsInfo = params.result?.goodsInfo;
  const sizeInfo = String(goodsInfo?.sizeInfo || "").trim();
  if (!sizeInfo) {
    return "";
  }

  return `${params.label}尺寸比例：${sizeInfo}。场景中必须保持真实体量、长宽高关系与产品结构比例，不得随意拉伸、压缩或失真。`;
}

function buildGoodsInfoAppearanceConstraintLine(params: {
  label: string;
  selection?: AgentWorkflowMaterialSelections["primary"] | null;
  enabled?: boolean;
}) {
  if (params.enabled === false) {
    return "";
  }

  const result = params.selection?.result || null;
  const selectedImageIds = new Set(
    (params.selection?.selectedImageIds || [])
      .map((item) => String(item || "").trim())
      .filter(Boolean)
  );
  const selectedPrimaryImage =
    result?.images?.find((image) => selectedImageIds.has(image.id)) || null;
  const fallbackPrimaryImage = result?.images?.[0] || null;
  const appearanceSummary = String(
    selectedPrimaryImage
      ? selectedPrimaryImage.appearanceSummary || ""
      : fallbackPrimaryImage?.appearanceSummary || result?.goodsInfo?.appearanceSummary || ""
  ).trim();

  if (!appearanceSummary) {
    return "";
  }

  return `${params.label}外观锁定：${appearanceSummary}。必须保持同一产品身份，不得改款、增减结构件、改变开合方式或替换主体颜色。`;
}

function buildGoodsInfoSummaryLine(params: {
  label: string;
  inputs: AgentWorkflowInputsValue;
  result?: AgentWorkflowMaterialSelections["primary"]["result"] | null;
}) {
  const goodsInfo = params.result?.goodsInfo;
  if (!goodsInfo) {
    return "";
  }

  const cleanedProductName = sanitizePromptBusinessMetadata({
    value: goodsInfo.productName || "",
    inputs: params.inputs,
  });
  const parts = [
    cleanedProductName || "",
    goodsInfo.sizeInfo || "",
    goodsInfo.materialInfo || "",
  ].filter(Boolean);

  if (parts.length === 0) {
    return "";
  }

  return `${params.label}：${parts.join(" / ")}`;
}

function buildBundleUsagePromptLine(params: {
  referenceImages: AgentWorkflowReferenceImage[];
}) {
  const primaryCount = params.referenceImages.filter((item) => item.source === "primary").length;
  const secondaryCount = params.referenceImages.filter((item) => item.source === "secondary").length;

  if (primaryCount <= 0 || secondaryCount <= 0) {
    return "";
  }

  return "搭配SKU使用规则：搭配SKU是独立的第二产品，不是主SKU的另一角度或替代图。需要做搭配展示时，必须同场景同时呈现两者，且不得融合、替换或混淆产品身份。";
}

function normalizeWorkflowText(value: string) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeWorkflowProductCode(value: unknown) {
  return String(value || "").trim().toUpperCase();
}

function deriveSpuFromSku(value: unknown) {
  const normalized = normalizeWorkflowProductCode(value);
  if (!/[0-9]{2}$/.test(normalized) || normalized.length <= 2) {
    return "";
  }
  return normalized.slice(0, -2);
}

function resolveWorkflowSpu(params: {
  inputValue: string;
  result?: AgentWorkflowMaterialSelections["primary"]["result"] | null;
}) {
  const result = params.result || null;
  return (
    normalizeWorkflowProductCode(result?.matchedSpu) ||
    normalizeWorkflowProductCode(result?.productModel) ||
    (result?.queryType === "spu" ? normalizeWorkflowProductCode(result?.query) : "") ||
    (result?.queryType === "sku"
      ? deriveSpuFromSku(result?.matchedSku || result?.query || params.inputValue)
      : "")
  );
}

function sanitizeWorkflowPromptFragment(value: string) {
  return normalizeWorkflowText(value)
    .replace(/请按选项[\d一二三四五六七八九十]+执行[。.]?/g, "")
    .replace(/流程\s*严格遵循下列流程/gi, "")
    .replace(
      /输出\s*([0-9]+\s*[kK])\s*([0-9]+\s*[:：]\s*[0-9]+)/g,
      (_, quality: string, ratio: string) =>
        `输出：${String(quality || "").toUpperCase()}，${String(ratio || "")
          .replace(/\s+/g, "")
          .replace("：", ":")}`
    )
    .replace(/\s+/g, " ")
    .replace(/^[；;、，,]+|[；;、，,]+$/g, "")
    .trim();
}

function splitWorkflowPromptFragment(value: string) {
  const sanitized = sanitizeWorkflowPromptFragment(value);
  if (!sanitized) {
    return [] as string[];
  }

  let normalized = sanitized;
  WORKFLOW_FRAGMENT_INLINE_LABELS.forEach((label) => {
    normalized = normalized.replace(
      new RegExp(`(?<!^)(?:${label})[:：]`, "g"),
      `\n${label}：`
    );
  });

  return normalized
    .split(/\n+/)
    .flatMap((line) =>
      line
        .split(/；+/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
    .map((item) => item.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function buildGroupedSelectionLines(params: {
  selections: AgentWorkflowComposerSelection[];
  valueKey: "optionName" | "promptFragment";
  separator: string;
  leafOnly?: boolean;
  dedupeAcrossSteps?: boolean;
}) {
  const grouped = new Map<
    string,
    {
      stepTitle: string;
      values: string[];
      valueSet: Set<string>;
    }
  >();
  const globalValueSet = new Set<string>();

  const sourceSelections = params.leafOnly
    ? params.selections.filter((item, index, items) => {
        const nextItem = items[index + 1];
        return !nextItem || nextItem.stepKey !== item.stepKey;
      })
    : params.selections;

  sourceSelections.forEach((item) => {
    const rawValue =
      params.valueKey === "promptFragment"
        ? item.promptFragment || item.optionName
        : item.optionName;
    const normalizedValue = normalizeWorkflowText(rawValue || "");
    if (!normalizedValue) {
      return;
    }

    const groupKey = item.stepKey;
    const currentGroup = grouped.get(groupKey) || {
      stepTitle: item.stepTitle,
      values: [],
      valueSet: new Set<string>(),
    };

    const dedupeKey = normalizedValue.toLowerCase();
    if (params.dedupeAcrossSteps && globalValueSet.has(dedupeKey)) {
      return;
    }
    if (!currentGroup.valueSet.has(dedupeKey)) {
      currentGroup.valueSet.add(dedupeKey);
      if (params.dedupeAcrossSteps) {
        globalValueSet.add(dedupeKey);
      }
      currentGroup.values.push(normalizedValue);
    }

    grouped.set(groupKey, currentGroup);
  });

  return Array.from(grouped.values())
    .filter((group) => group.values.length > 0)
    .map((group) => `${group.stepTitle}：${group.values.join(params.separator)}`);
}

function buildStructuredSelectionPromptSections(params: {
  selections: AgentWorkflowComposerSelection[];
}) {
  const groups = new Map<
    string,
    {
      title: string;
      values: string[];
      valueSet: Set<string>;
    }
  >();
  const globalValueSet = new Set<string>();

  params.selections.forEach((selection) => {
    const fragments = splitWorkflowPromptFragment(
      selection.promptFragment || selection.optionName || ""
    );
    if (fragments.length === 0) {
      return;
    }

    const currentGroup = groups.get(selection.stepKey) || {
      title: selection.stepTitle,
      values: [],
      valueSet: new Set<string>(),
    };

    fragments.forEach((fragment) => {
      const dedupeKey = fragment.toLowerCase();
      if (currentGroup.valueSet.has(dedupeKey) || globalValueSet.has(dedupeKey)) {
        return;
      }
      currentGroup.valueSet.add(dedupeKey);
      globalValueSet.add(dedupeKey);
      currentGroup.values.push(fragment);
    });

    if (currentGroup.values.length > 0) {
      groups.set(selection.stepKey, currentGroup);
    }
  });

  return Array.from(groups.values())
    .filter((group) => group.values.length > 0)
    .map((group) => `【${group.title}】\n${group.values.map((value) => `- ${value}`).join("\n")}`);
}

function buildPromptSection(title: string, lines: string[]) {
  const normalizedLines = lines
    .map((line) => String(line || "").trim())
    .filter(Boolean);
  if (normalizedLines.length === 0) {
    return "";
  }

  return `【${title}】\n${normalizedLines.join("\n")}`;
}

export function buildAgentWorkflowComposerContext(params: {
  config?: AgentWorkflowUiConfig | null;
  inputs: AgentWorkflowInputsValue;
  materials?: AgentWorkflowMaterialSelections | null;
  selectedBrandModel?: AgentWorkflowSelectedBrandModel | null;
  appearanceRecognitionEnabled?: boolean;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}): AgentWorkflowComposerContext | null {
  const config = params.config || defaultAgentWorkflowUiConfig;
  const steps = flattenVisibleAgentWorkflowSteps(
    getEnabledAgentWorkflowStepTree(Array.isArray(config.steps) ? config.steps : []),
    params.selections
  )
    .map(({ step }) => step)
    .filter((step) => Array.isArray(step.options) && step.options.length > 0);
  const selections = steps
    .map((step) => {
      const selectedOptions = getAgentWorkflowSelectedOptionPath({
        step,
        selectionValue: params.selections[step.key],
      });
      if (selectedOptions.length === 0) return [];
      return selectedOptions.map((option) => ({
        stepKey: step.key,
        stepTitle: step.title,
        optionKey: option.key,
        optionName: option.buttonName,
        promptFragment: option.promptFragment || option.buttonName,
      }));
    })
    .flat() as AgentWorkflowComposerContext["selections"];
  const referenceImages = getSelectedWorkflowReferenceImages({
    inputs: params.inputs,
    materials: params.materials,
    selectedBrandModel: params.selectedBrandModel,
  });
  const primaryWorkflowSpu = resolveWorkflowSpu({
    inputValue: params.inputs.primarySku,
    result: params.materials?.primary?.result || null,
  });
  const secondaryWorkflowSpu = resolveWorkflowSpu({
    inputValue: params.inputs.secondarySku,
    result: params.materials?.secondary?.result || null,
  });

  const summaryParts: string[] = [];
  if (params.inputs.primarySku.trim()) {
    summaryParts.push(`主SKU：${params.inputs.primarySku.trim()}`);
  }
  if (primaryWorkflowSpu && primaryWorkflowSpu !== params.inputs.primarySku.trim().toUpperCase()) {
    summaryParts.push(`主SPU：${primaryWorkflowSpu}`);
  }
  if (params.inputs.secondarySku.trim()) {
    summaryParts.push(`搭配SKU：${params.inputs.secondarySku.trim()}`);
  }
  if (params.inputs.brand.trim()) {
    summaryParts.push(`品牌：${params.inputs.brand.trim()}`);
  }
  if (params.inputs.store.trim()) {
    summaryParts.push(`店铺：${params.inputs.store.trim()}`);
  }
  if (params.inputs.officialSecondCategory.trim()) {
    summaryParts.push(`二级品类：${params.inputs.officialSecondCategory.trim()}`);
  }
  if (params.inputs.officialThirdCategory.trim()) {
    summaryParts.push(`三级品类：${params.inputs.officialThirdCategory.trim()}`);
  }
  if (params.inputs.thirdCategory.trim()) {
    summaryParts.push(`三级分类：${params.inputs.thirdCategory.trim()}`);
  }
  if (params.inputs.fourthCategory.trim()) {
    summaryParts.push(`四级分类：${params.inputs.fourthCategory.trim()}`);
  }
  if (params.inputs.fifthCategory.trim()) {
    summaryParts.push(`五级分类：${params.inputs.fifthCategory.trim()}`);
  }
  if (params.inputs.priceBand.trim()) {
    summaryParts.push(`价格带：${params.inputs.priceBand.trim()}`);
  }
  const primaryGoodsInfoSummary = buildGoodsInfoSummaryLine({
    label: "主SKU商品信息",
    inputs: params.inputs,
    result: params.materials?.primary?.result || null,
  });
  if (primaryGoodsInfoSummary) {
    summaryParts.push(primaryGoodsInfoSummary);
  }
  const secondaryGoodsInfoSummary = buildGoodsInfoSummaryLine({
    label: "搭配SKU商品信息",
    inputs: params.inputs,
    result: params.materials?.secondary?.result || null,
  });
  if (secondaryGoodsInfoSummary) {
    summaryParts.push(secondaryGoodsInfoSummary);
  }
  if (referenceImages.some((item) => item.source === "primary")) {
    summaryParts.push(
      `主SPU图：${referenceImages.filter((item) => item.source === "primary").length}张`
    );
  }
  if (referenceImages.some((item) => item.source === "secondary")) {
    summaryParts.push(
      `搭配SKU图：${referenceImages.filter((item) => item.source === "secondary").length}张`
    );
  }
  if (referenceImages.some((item) => item.source === "brandModel")) {
    summaryParts.push(
      `模特参考图：${referenceImages.filter((item) => item.source === "brandModel").length}张`
    );
  }
  summaryParts.push(
    ...buildGroupedSelectionLines({
      selections,
      valueKey: "optionName",
      separator: " / ",
    })
  );

  if (summaryParts.length === 0) {
    return null;
  }

  const primaryLockLines: string[] = [];
  const primaryGoodsInfoPrompt = buildGoodsInfoPromptLine({
    label: "主SKU商品信息",
    inputs: params.inputs,
    result: params.materials?.primary?.result || null,
  });
  if (primaryGoodsInfoPrompt) {
    primaryLockLines.push(primaryGoodsInfoPrompt);
  }
  const primaryGoodsInfoSizeConstraint = buildGoodsInfoSizeConstraintLine({
    label: "主SKU",
    result: params.materials?.primary?.result || null,
  });
  if (primaryGoodsInfoSizeConstraint) {
    primaryLockLines.push(primaryGoodsInfoSizeConstraint);
  }
  const primaryGoodsInfoAppearanceConstraint = buildGoodsInfoAppearanceConstraintLine({
    label: "主SKU",
    selection: params.materials?.primary || null,
    enabled: params.appearanceRecognitionEnabled !== false,
  });
  if (primaryGoodsInfoAppearanceConstraint) {
    primaryLockLines.push(primaryGoodsInfoAppearanceConstraint);
  }

  const secondaryLockLines: string[] = [];
  const secondaryGoodsInfoPrompt = buildGoodsInfoPromptLine({
    label: "搭配SKU商品信息",
    inputs: params.inputs,
    result: params.materials?.secondary?.result || null,
  });
  if (secondaryGoodsInfoPrompt) {
    secondaryLockLines.push(secondaryGoodsInfoPrompt);
  }
  const secondaryGoodsInfoSizeConstraint = buildGoodsInfoSizeConstraintLine({
    label: "搭配SKU",
    result: params.materials?.secondary?.result || null,
  });
  if (secondaryGoodsInfoSizeConstraint) {
    secondaryLockLines.push(secondaryGoodsInfoSizeConstraint);
  }
  const secondaryGoodsInfoAppearanceConstraint = buildGoodsInfoAppearanceConstraintLine({
    label: "搭配SKU",
    selection: params.materials?.secondary || null,
    enabled: params.appearanceRecognitionEnabled !== false,
  });
  if (secondaryGoodsInfoAppearanceConstraint) {
    secondaryLockLines.push(secondaryGoodsInfoAppearanceConstraint);
  }

  const referenceLines: string[] = [];
  if (referenceImages.some((item) => item.source === "primary")) {
    const labels = referenceImages
      .filter((item) => item.source === "primary")
      .map((item) => item.label)
      .filter(Boolean)
      .slice(0, 8);
    referenceLines.push(
      `主SPU参考图：已选${referenceImages.filter((item) => item.source === "primary").length}张${
        labels.length > 0 ? `（${labels.join("、")}）` : ""
      }`
    );
  }
  if (referenceImages.some((item) => item.source === "secondary")) {
    const labels = referenceImages
      .filter((item) => item.source === "secondary")
      .map((item) => item.label)
      .filter(Boolean)
      .slice(0, 8);
    referenceLines.push(
      `搭配SKU参考图：已选${referenceImages.filter((item) => item.source === "secondary").length}张${
        labels.length > 0 ? `（${labels.join("、")}）` : ""
      }`
    );
  }
  if (referenceImages.some((item) => item.source === "brandModel")) {
    const labels = referenceImages
      .filter((item) => item.source === "brandModel")
      .map((item) => item.label)
      .filter(Boolean)
      .slice(0, 8);
    referenceLines.push(
      `模特参考图：已选${referenceImages.filter((item) => item.source === "brandModel").length}张${
        labels.length > 0 ? `（${labels.join("、")}）` : ""
      }`
    );
  }
  const bundleUsagePrompt = buildBundleUsagePromptLine({ referenceImages });
  if (bundleUsagePrompt) {
    secondaryLockLines.push(bundleUsagePrompt);
  }

  const promptSections = [
    buildPromptSection("主SKU锁定", primaryLockLines),
    buildPromptSection("搭配SKU锁定", secondaryLockLines),
    buildPromptSection("参考图", referenceLines),
    ...buildStructuredSelectionPromptSections({ selections }),
  ].filter(Boolean);

  return {
    primarySku: params.inputs.primarySku.trim() || undefined,
    primarySpu: primaryWorkflowSpu || undefined,
    secondarySku: params.inputs.secondarySku.trim() || undefined,
    secondarySpu: secondaryWorkflowSpu || undefined,
    brand: params.inputs.brand.trim() || undefined,
    store: params.inputs.store.trim() || undefined,
    officialSecondCategory: params.inputs.officialSecondCategory.trim() || undefined,
    officialThirdCategory: params.inputs.officialThirdCategory.trim() || undefined,
    thirdCategory: params.inputs.thirdCategory.trim() || undefined,
    fourthCategory: params.inputs.fourthCategory.trim() || undefined,
    fifthCategory: params.inputs.fifthCategory.trim() || undefined,
    priceBand: params.inputs.priceBand.trim() || undefined,
    selections,
    referenceImages,
    summaryText: summaryParts.join(" / "),
    promptText: promptSections.join("\n\n"),
  };
}

export function getSelectedWorkflowReferenceImages(params: {
  inputs: AgentWorkflowInputsValue;
  materials?: AgentWorkflowMaterialSelections | null;
  selectedBrandModel?: AgentWorkflowSelectedBrandModel | null;
}): AgentWorkflowReferenceImage[] {
  const materials = params.materials;
  if (!materials) return [];

  const collect = (
    source: "primary" | "secondary",
    sourceLabel: string,
    fallbackSku: string
  ) => {
    const state = materials[source];
    const result = state?.result;
    if (!result || !Array.isArray(result.images) || result.images.length === 0) {
      return [] as AgentWorkflowReferenceImage[];
    }

    const selectedIds = new Set(
      (state.selectedImageIds || []).map((item) => String(item || "").trim()).filter(Boolean)
    );
    if (selectedIds.size === 0) {
      return [] as AgentWorkflowReferenceImage[];
    }

    return result.images
      .filter((item) => selectedIds.has(item.id))
      .map((item) => ({
        id: item.id,
        source,
        sourceLabel,
        sku: result.matchedSku || fallbackSku || undefined,
        productModel: result.productModel || result.matchedSpu || null,
        label: item.label,
        name: item.fileName || item.label,
        url: item.imageUrl,
        assetId: item.assetId || null,
        mimeType: item.mimeType || null,
      }));
  };

  return [
    ...collect("primary", "主SPU", params.inputs.primarySku.trim()),
    ...collect("secondary", "搭配SKU", params.inputs.secondarySku.trim()),
    ...(params.selectedBrandModel?.imageUrl
      ? [
          {
            id: params.selectedBrandModel.id,
            source: "brandModel" as const,
            sourceLabel: "品牌模特",
            label: params.selectedBrandModel.displayName || params.selectedBrandModel.brandName,
            name: params.selectedBrandModel.displayName || params.selectedBrandModel.brandName,
            url: params.selectedBrandModel.imageUrl,
            assetId: params.selectedBrandModel.assetId || null,
            mimeType: params.selectedBrandModel.mimeType || null,
          },
        ]
      : []),
  ];
}

export function getAgentWorkflowProgress(params: {
  config?: AgentWorkflowUiConfig | null;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
}) {
  const config = params.config || defaultAgentWorkflowUiConfig;
  const enabledSteps = flattenVisibleAgentWorkflowSteps(
    getEnabledAgentWorkflowStepTree(config.steps || []),
    params.selections
  )
    .map(({ step }) => step)
    .filter((step) => Array.isArray(step.options) && step.options.length > 0);
  const completedSteps = enabledSteps.filter((step) => {
    return isAgentWorkflowStepSelectionComplete({
      step,
      selectionValue: params.selections[step.key],
    });
  });

  return {
    total: enabledSteps.length,
    completed: completedSteps.length,
    isComplete: enabledSteps.length > 0 && completedSteps.length === enabledSteps.length,
  };
}
