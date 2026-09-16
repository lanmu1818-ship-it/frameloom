// Modified for standalone community distribution; see NOTICE.
export type AgentPresetType = "image" | "video" | "text";
export type AgentPresetVisibility = "public" | "private";
export type AgentCategoryScope = "public" | "private" | "global";
export type AgentPresetStatus = "active" | "disabled" | "hidden" | "blocked";
export type AgentPresetModeType =
  | "legacy"
  | "scene_generation"
  | "detail_replacement"
  | "sku_replacement";

export type AgentTaskDetailReferenceSource = "main" | "sku" | "detail";
export type AgentDetailMethod = "reference_replace" | "ai_detail_generate";
export type AgentDetailGenerationMode = "classic" | "agent_layout";
export type AgentDetailGenerationSlotRole = "product" | "model" | "bundle";

export interface AgentSceneGenerationModeConfig {
  productImageSlotCount: number;
  includeModelSlot: boolean;
  allowTemplateReferenceImages: boolean;
  allowModelOverride: boolean;
}

export interface AgentDetailReplacementModeConfig {
  enableTextEditing: boolean;
  productImageSlotCount: number;
  includeModelSlot: boolean;
  referenceImageSource: AgentTaskDetailReferenceSource;
}

export interface AgentSkuReplacementModeConfig {
  enableTextEditing: boolean;
  productImageSlotCount: number;
  includeModelSlot: boolean;
  referenceImageSource: AgentTaskDetailReferenceSource;
}

export interface AgentPresetModeConfig {
  modeType: AgentPresetModeType;
  scene: AgentSceneGenerationModeConfig;
  detail: AgentDetailReplacementModeConfig;
  sku: AgentSkuReplacementModeConfig;
}

export interface AgentCategoryPath {
  sectionId?: string | null;
  sectionName?: string | null;
  level1Id?: string | null;
  level1Name?: string | null;
  level2Id?: string | null;
  level2Name?: string | null;
  level3Id?: string | null;
  level3Name?: string | null;
  productCategory?: string | null;
  audienceTag?: string | null;
  usageScenario?: string | null;
  brand?: string | null;
}

export interface AgentPresetLibraryCategoryNode {
  id: string;
  name: string;
  enabled: boolean;
  sortOrder: number;
  children: AgentPresetLibraryCategoryNode[];
}

export interface AgentPresetLibrarySection {
  id: string;
  label: string;
  description?: string | null;
  enabled: boolean;
  sortOrder: number;
  categories: AgentPresetLibraryCategoryNode[];
}

export interface AgentPresetLibraryConfig {
  sections: AgentPresetLibrarySection[];
}

export type AgentWorkflowStepKey = string;

export interface AgentWorkflowOptionUiConfig {
  key: string;
  buttonName: string;
  description?: string | null;
  previewImageUrl?: string | null;
  previewImageSourceUrl?: string | null;
  enabled: boolean;
  sortOrder: number;
  promptFragment?: string | null;
  availableOfficialCategoryKeys?: string[];
  blockedOptionKeys?: string[];
  specialModuleEnabled?: boolean;
  specialModuleExclusionEnabled?: boolean;
  specialModuleAllowedOptionKeys?: string[];
  children?: AgentWorkflowOptionUiConfig[];
}

export interface AgentWorkflowStepUiConfig {
  key: AgentWorkflowStepKey;
  title: string;
  description?: string | null;
  enabled: boolean;
  sortOrder: number;
  specialModuleEnabled?: boolean;
  options: AgentWorkflowOptionUiConfig[];
  children?: AgentWorkflowStepUiConfig[];
}

export interface AgentWorkflowConstraintSettings {
  crossLevelMutualExclusionEnabled: boolean;
}

export interface AgentWorkflowPageFeatureSettings {
  presetStepEnabled: boolean;
  materialStepEnabled: boolean;
}

export type AgentWorkflowBusinessModeKey = "main_sku" | "detail" | "buyer_show";
export type AgentWorkflowBusinessModeIconKey =
  | "main-sku"
  | "detail"
  | "buyer-show";

export interface AgentWorkflowBusinessModeConfig {
  key: AgentWorkflowBusinessModeKey;
  title: string;
  description?: string | null;
  enabled: boolean;
  iconKey: AgentWorkflowBusinessModeIconKey;
  customSvgUrl?: string | null;
  sortOrder: number;
  defaultModelId?: string | null;
  referenceReplaceEnabled?: boolean;
  aiDetailGenerateEnabled?: boolean;
}

export interface AgentWorkflowBusinessModeSettings {
  modes: AgentWorkflowBusinessModeConfig[];
}

export interface AgentWorkflowUiConfig {
  inputOptions?: {
    brands: string[];
    stores: string[];
    categoryLabels?: AgentWorkflowCategoryLabels;
    officialCategoryEntries?: AgentWorkflowOfficialSecondCategoryEntry[];
    thirdCategories?: string[];
    fourthCategories?: string[];
    fifthCategories?: string[];
    priceBands?: string[];
    brandStoreEntries?: AgentWorkflowBrandStoreEntry[];
  };
  constraintSettings?: AgentWorkflowConstraintSettings;
  pageFeatureSettings?: AgentWorkflowPageFeatureSettings;
  businessModeSettings?: AgentWorkflowBusinessModeSettings;
  steps: AgentWorkflowStepUiConfig[];
}

export interface AgentWorkflowCategoryLabels {
  firstCategory: string;
  secondCategory: string;
  thirdCategory: string;
  fourthCategory: string;
  fifthCategory: string;
}

export interface AgentWorkflowOfficialThirdCategoryEntry {
  categoryName: string;
  sortOrder?: number;
}

export interface AgentWorkflowOfficialSecondCategoryEntry {
  categoryName: string;
  thirdCategories: string[];
  thirdCategoryEntries?: AgentWorkflowOfficialThirdCategoryEntry[];
  sortOrder?: number;
}

export interface AgentWorkflowFourthCategoryEntry {
  categoryName: string;
  fifthCategories: string[];
  sortOrder?: number;
}

export interface AgentWorkflowThirdCategoryEntry {
  categoryName: string;
  fourthCategories: string[];
  fourthCategoryEntries?: AgentWorkflowFourthCategoryEntry[];
  sortOrder?: number;
}

export interface AgentWorkflowStoreEntry {
  storeName: string;
  thirdCategories: string[];
  thirdCategoryEntries?: AgentWorkflowThirdCategoryEntry[];
  sortOrder?: number;
}

export interface AgentWorkflowBrandStoreEntry {
  brandName: string;
  stores: string[];
  storeEntries?: AgentWorkflowStoreEntry[];
  sortOrder?: number;
}

export interface AgentWorkflowMaterialApiConfig {
  enabled: boolean;
  baseUrl: string;
  apiKey: string;
  productDetailEnabled?: boolean;
  productDetailBaseUrl?: string;
  productDetailApiKey?: string;
  productDetailPath?: string;
  productDetailMethod?: "GET" | "POST";
  productDetailDefaultChannel?: AgentWorkflowProductDetailChannel;
  productDetailSyncAnalysis?: boolean;
  productDetailForceReanalyze?: boolean;
}

export interface AgentWorkflowGoodsInfoApiConfig {
  enabled: boolean;
  baseUrl: string;
  clientKey: string;
  secret: string;
}

export type AgentWorkflowMaterialQueryType = "sku" | "spu";
export type AgentWorkflowReferenceQueryType = AgentWorkflowMaterialQueryType | "productId";
export type AgentWorkflowProductDetailChannel = "taobao" | "1688" | "douyin" | "jd";

export interface AgentWorkflowBrandModelImage {
  id: string;
  assetId?: string | null;
  imageUrl: string;
  displayName?: string | null;
  mimeType?: string | null;
  sortOrder: number;
}

export interface AgentWorkflowBrandModelEntry {
  brandName: string;
  images: AgentWorkflowBrandModelImage[];
}

export interface AgentWorkflowBrandModelConfig {
  entries: AgentWorkflowBrandModelEntry[];
}

export interface AgentWorkflowShowcaseConfig {
  enabled: boolean;
  title: string;
  subtitle: string;
  actionText: string;
  videoUrl: string;
  posterUrl?: string | null;
  overlayText?: string | null;
  footerText?: string | null;
}

export interface AgentWorkflowSelectedBrandModel extends AgentWorkflowBrandModelImage {
  brandName: string;
}

export type AgentWorkflowMaterialSource = "primary" | "secondary" | "brandModel";

export interface AgentWorkflowMaterialImage {
  id: string;
  key: string;
  label: string;
  fileName: string;
  imageUrl: string;
  previewUrl?: string | null;
  assetId?: string | null;
  mimeType?: string | null;
  appearanceSummary?: string | null;
  sourceType?: "search" | "upload";
  group: "fixed" | "other";
  sortOrder: number;
}

export interface AgentWorkflowMaterialSkuOption {
  skuName: string;
  skuId?: string | null;
  hasWhiteBackground: boolean;
  whiteBackgroundCount: number;
  previewImageUrl?: string | null;
  previewFileName?: string | null;
}

export interface AgentWorkflowMaterialSearchResult {
  query: string;
  queryType?: AgentWorkflowMaterialQueryType;
  matchedSku: string;
  matchedSpu?: string | null;
  materialId?: string | null;
  productModel?: string | null;
  zipUrl?: string | null;
  fixedCount: number;
  otherCount: number;
  totalCount: number;
  images: AgentWorkflowMaterialImage[];
  recommendedImageIds?: string[];
  skuOptions?: AgentWorkflowMaterialSkuOption[];
  goodsInfo?: {
    productName?: string | null;
    sizeInfo?: string | null;
    materialInfo?: string | null;
    designer?: string | null;
    buyer?: string | null;
    boardType?: string | null;
    appearanceSummary?: string | null;
  } | null;
}

export interface AgentWorkflowMaterialSelectionState {
  result?: AgentWorkflowMaterialSearchResult | null;
  selectedImageIds: string[];
}

export interface AgentWorkflowMaterialSelections {
  primary: AgentWorkflowMaterialSelectionState;
  secondary: AgentWorkflowMaterialSelectionState;
}

export interface AgentWorkflowReferenceImage {
  id: string;
  source: AgentWorkflowMaterialSource;
  sourceLabel: string;
  sku?: string;
  productModel?: string | null;
  label: string;
  name: string;
  url: string;
  assetId?: string | null;
  mimeType?: string | null;
}

export interface AgentWorkflowComposerSelection {
  stepKey: AgentWorkflowStepKey;
  stepTitle: string;
  optionKey: string;
  optionName: string;
  promptFragment?: string | null;
}

export interface AgentWorkflowComposerContext {
  primarySku?: string;
  primarySpu?: string;
  secondarySku?: string;
  secondarySpu?: string;
  brand?: string;
  store?: string;
  officialSecondCategory?: string;
  officialThirdCategory?: string;
  thirdCategory?: string;
  fourthCategory?: string;
  fifthCategory?: string;
  priceBand?: string;
  selections: AgentWorkflowComposerSelection[];
  referenceImages: AgentWorkflowReferenceImage[];
  summaryText: string;
  promptText: string;
}

export interface AgentDetailBriefForm {
  productSpu: string;
  demandType: string;
  productName: string;
  targetAudience: string;
  mainUser: string;
  usageScenario: string;
  triggerMoment: string;
  coreNeed: string;
  riskConcern: string;
  expectedResult: string;
  coreSellingPoint: string;
  positioningStatement: string;
  userVoice: string;
  competitorReference: string;
  priceBand: string;
  brandTone: string;
  bannedWords: string;
}

export interface AgentDetailGenerationSlot {
  url: string;
  name?: string | null;
  contentType?: string | null;
  assetId?: string | null;
}

export interface AgentDetailGenerationProgressState {
  status: "idle" | "running" | "done" | "error";
  stage: string;
  current: number;
  total: number;
  startedAt?: string | null;
  finishedAt?: string | null;
}

export interface AgentDetailReplacementReferenceItem {
  id: string;
  label: string;
  imageUrl?: string | null;
  previewUrl?: string | null;
  width?: number | null;
  height?: number | null;
  candidateId?: string | null;
  sortOrder?: number;
  assignedProductIndex?: number | null;
  passthrough?: boolean | null;
}

export interface AgentModeReferenceCandidate {
  id: string;
  materialId?: string | null;
  taskNo?: string | null;
  productModel?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  shopName?: string | null;
  sceneName?: string | null;
  uploadedAt?: string | null;
  isFullSet: boolean;
  mainImageUrls: string[];
  skuImageUrls: string[];
  detailImageUrls: string[];
  allImageUrls: string[];
}

export type AgentDetailReplacementStrategy = "scene_replace" | "product_only";

export interface AgentDetailReplacementState {
  method: AgentDetailMethod;
  query: string;
  queryType: AgentWorkflowReferenceQueryType;
  productDetailChannel?: AgentWorkflowProductDetailChannel;
  replacementStrategy?: AgentDetailReplacementStrategy;
  candidates: AgentModeReferenceCandidate[];
  selectedCandidateId?: string | null;
  references: AgentDetailReplacementReferenceItem[];
  generationMode?: AgentDetailGenerationMode;
  brief?: AgentDetailBriefForm;
  slots?: Array<AgentDetailGenerationSlot | null>;
  progress?: AgentDetailGenerationProgressState | null;
}

export interface AgentSkuReplacementState {
  query: string;
  queryType: AgentWorkflowMaterialQueryType;
  candidates: AgentModeReferenceCandidate[];
  selectedCandidateId?: string | null;
  references: AgentDetailReplacementReferenceItem[];
}

export interface AgentModeWorkspaceState {
  detailReplacement: AgentDetailReplacementState;
  skuReplacement: AgentSkuReplacementState;
}

export interface AgentGenerationProjectWorkspaceAttachment {
  url: string;
  name?: string | null;
  contentType?: string | null;
  assetId?: string | null;
}

export interface AgentGenerationProjectImageParams {
  aspectRatio?: string;
  imageSize?: string;
  imageCount?: number;
}

export type AgentGenerationResultModeType =
  | "scene_generation"
  | "detail_generation"
  | "detail_replacement"
  | "sku_replacement";

export interface AgentGenerationProjectResultCollections {
  scene_generation?: string[];
  detail_generation?: string[];
  detail_replacement?: string[];
  sku_replacement?: string[];
}

export interface AgentGenerationProjectWorkspaceState {
  input: string;
  attachments: Array<AgentGenerationProjectWorkspaceAttachment | null>;
  selectedModelId?: string | null;
  imageParams?: AgentGenerationProjectImageParams;
}

export interface AgentWorkflowPersistedState {
  inputs: {
    primarySku: string;
    secondarySku: string;
    brand: string;
    store: string;
    officialSecondCategory?: string;
    officialThirdCategory?: string;
    thirdCategory: string;
    fourthCategory: string;
    fifthCategory: string;
    priceBand: string;
  };
  materials?: AgentWorkflowMaterialSelections;
  appearanceRecognitionEnabled?: boolean;
  selections: Partial<Record<AgentWorkflowStepKey, string>>;
  selectedBrandModel?: AgentWorkflowSelectedBrandModel | null;
  selectedAgentPresetId?: string | null;
  currentStage?: "workflow" | "mode";
  agentModeState?: AgentModeWorkspaceState;
}

export interface AgentGenerationProjectPersistedState {
  workflowState: AgentWorkflowPersistedState;
  workspaceState?: AgentGenerationProjectWorkspaceState;
  resultImageUrls?: string[];
  resultCollections?: AgentGenerationProjectResultCollections;
  deletedResultCollections?: AgentGenerationProjectResultCollections;
}

export interface AgentGenerationProject {
  id: string;
  userId: string;
  title: string;
  description?: string | null;
  thumbnail?: string | null;
  projectState: AgentGenerationProjectPersistedState;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface AgentPsdTextColorBrandConfig {
  brandName: string;
  enabled: boolean;
  colors: [string, string];
}

export interface AgentPsdTextColorConfig {
  enabled: boolean;
  colors: [string, string];
  brandConfigs?: AgentPsdTextColorBrandConfig[];
}

export interface AgentCategoryTreeConfig {
  productCategories: string[];
  audienceTags: string[];
  usageScenarios: string[];
  brands: string[];
}

export interface AgentCategory {
  id: string;
  name: string;
  slug: string;
  scope: AgentCategoryScope;
  createdBy?: string | null;
  sortOrder: number;
  isEnabled: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AgentReferenceAsset {
  id: string;
  assetId: string;
  sortOrder: number;
  originalUrl: string;
  previewUrl?: string | null;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  displayName?: string | null;
}

export interface AgentPresetSlot {
  id?: string;
  slotIndex: number;
  title?: string | null;
  promptTemplate: string;
  defaultParams?: Record<string, any> | null;
  requireUpload?: boolean;
  uploadLabel?: string | null;
  referenceAssets?: AgentReferenceAsset[];
  referenceAssetIds?: string[];
}

export interface AgentModelSummary {
  id: string;
  modelId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface AgentOwnerSummary {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface AgentPreset {
  id: string;
  ownerUserId: string;
  name: string;
  type: AgentPresetType;
  secondaryType?: string | null;
  visibility: AgentPresetVisibility;
  categoryId?: string | null;
  categoryPath?: AgentCategoryPath | null;
  promptTemplate: string;
  description?: string | null;
  defaultModelId?: string | null;
  defaultParams?: Record<string, any> | null;
  slotCount: number;
  requiredUploadCount: number;
  avatarAssetId?: string | null;
  avatarUrl?: string | null;
  coverAssetId?: string | null;
  status: AgentPresetStatus;
  sortOrder: number;
  usageCount: number;
  lastUsedAt?: string | Date | null;
  forkedFromPresetId?: string | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  owner?: AgentOwnerSummary | null;
  category?: AgentCategory | null;
  defaultModel?: AgentModelSummary | null;
  slots?: AgentPresetSlot[];
  referenceAssets?: AgentReferenceAsset[];
  referenceAssetIds?: string[];
  referenceAssetCount?: number;
}

export interface AgentPresetListResponse {
  categories: AgentCategory[];
  public: AgentPreset[];
  private: AgentPreset[];
}

export interface AgentExecutionSnapshot {
  id: string;
  presetId: string;
  projectId?: string | null;
  chatId?: string | null;
  messageId?: string | null;
  userId: string;
  presetName: string;
  presetType: AgentPresetType;
  visibility: AgentPresetVisibility;
  categoryId?: string | null;
  categoryName?: string | null;
  promptTemplate: string;
  defaultModelId?: string | null;
  resolvedModelId?: string | null;
  defaultParams?: Record<string, any> | null;
  slotCount: number;
  requiredUploadCount: number;
  slots: Array<{
    slotIndex: number;
    title?: string | null;
    promptTemplate: string;
    defaultParams?: Record<string, any> | null;
    requireUpload?: boolean;
    uploadLabel?: string | null;
    referenceAssetIds: string[];
    referenceImageUrls: string[];
  }>;
  referenceAssetIds: string[];
  referenceImageUrls: string[];
  userInputText?: string | null;
  requestPayload?: Record<string, any> | null;
  createdAt: string | Date;
  defaultModel?: AgentModelSummary | null;
  resolvedModel?: AgentModelSummary | null;
}

export interface AgentCreatePayload {
  name: string;
  type: AgentPresetType;
  secondaryType?: string | null;
  visibility: AgentPresetVisibility;
  categoryPath?: AgentCategoryPath | null;
  description?: string;
  defaultModelId: string;
  defaultParams?: Record<string, any>;
  avatarAssetId?: string;
  slots: AgentPresetSlot[];
}

export interface AgentUpdatePayload {
  name?: string;
  type?: AgentPresetType;
  secondaryType?: string | null;
  visibility?: AgentPresetVisibility;
  categoryPath?: AgentCategoryPath | null;
  description?: string | null;
  defaultModelId?: string;
  defaultParams?: Record<string, any> | null;
  avatarAssetId?: string | null;
  slots?: AgentPresetSlot[];
  status?: AgentPresetStatus;
}

export interface AgentCategoryCreatePayload {
  name: string;
  scope?: "public" | "private";
}
