// Modified for standalone community distribution; see NOTICE.
import {
  ArrowUp,
  ChevronDown,
  Check,
  Clapperboard,
  Gem,
  Loader2,
  Mic,
  Orbit,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/src/components/ui/popover";
import { apiFetch } from "@/src/client/api";
import { cn } from "@/src/lib/utils";
import type { ModelOption, UploadFileItem } from "@/src/components/home/design/types";

export type HomeComposerToolMode =
  | "agent"
  | "auto"
  | "video"
  | "inspiration"
  | "creative";

export type InspirationImageResult = {
  id: string;
  title: string;
  thumbnailUrl: string;
  imageUrl: string;
  source: "openverse" | "pexels" | "pixabay" | "unsplash";
  sourceUrl: string | null;
  creator: string | null;
  license: string | null;
  contentType: string;
};

type HomeComposerImageParams = {
  enableWebSearch?: boolean;
  promptExtend?: boolean;
};

type HomeHeroComposerProps = {
  composerToolMode: HomeComposerToolMode;
  composerPlaceholder: string;
  displayLogo: string;
  files: UploadFileItem[];
  handleAddFiles: (files: FileList | null) => void | Promise<void>;
  heroPromoActionText?: string | null;
  heroPromoText?: string | null;
  heroSubtitleText?: string | null;
  heroTitleText?: string | null;
  homeAnimationData?: {
    enabled?: boolean;
    htmlContent?: string;
    fileName?: string;
  };
  isAgentModeActive: boolean;
  isSubmitting: boolean;
  imageParams?: HomeComposerImageParams;
  onComposerToolModeChange: (mode: HomeComposerToolMode) => void;
  onAddRemoteImage?: (image: InspirationImageResult) => void;
  onApplyCreativeScene?: () => void;
  onImageParamsChange?: (params: Partial<HomeComposerImageParams>) => void;
  onSubmit: () => void;
  prompt: string;
  removeFile: (id: string) => void;
  setPrompt: (value: string) => void;
  shouldInvertLogo: boolean;
  siteName: string;
  modelOptions: ModelOption[];
  onModelChange: (modelId: string) => void;
  selectedModelId: string;
  tone?: "light" | "dark";
};

function getModelTypeFromCapabilities(capabilities: unknown) {
  if (!capabilities || typeof capabilities !== "object") return "";
  return String(
    (capabilities as Record<string, unknown>).modelType ||
      (capabilities as Record<string, unknown>).modelCategory ||
      (capabilities as Record<string, unknown>).providerModelType ||
      ""
  )
    .trim()
    .toLowerCase();
}

function isVideoModelOption(model?: ModelOption | null) {
  if (!model || model.id === "auto") return false;
  const providerType = String(model.providerType || "").toLowerCase();
  const modelId = String(model.modelId || model.id || "").toLowerCase();
  const displayName = String(model.displayName || "").toLowerCase();
  const capabilities = model.capabilities || {};
  const modelType = getModelTypeFromCapabilities(capabilities);
  const supportedModes = Array.isArray(
    (capabilities as { supportedModes?: unknown }).supportedModes
  )
    ? ((capabilities as { supportedModes?: unknown[] }).supportedModes || [])
    : [];

  if (modelType === "video-generation") return true;
  if (
    modelType === "image-generation" ||
    modelType === "audio" ||
    modelType === "chat" ||
    modelType === "multimodal-chat"
  ) {
    return false;
  }

  return Boolean(
    model.videoToolCapability ||
      providerType.includes("video") ||
      providerType.includes("kling") ||
      providerType.includes("seedance") ||
      providerType.includes("omni") ||
      model.imageGenConfig?.creditCostPerVideo ||
      supportedModes.some((mode) =>
        ["text-to-video", "first-frame", "first-last-frame", "reference-images"].includes(
          String(mode || "").trim()
        )
      ) ||
      /\b(veo|sora|kling|seedance|grok video|omni flash)\b/.test(
        `${modelId} ${displayName}`
      )
  );
}

export function HomeHeroComposer({
  composerToolMode,
  files,
  handleAddFiles,
  imageParams,
  isAgentModeActive,
  isSubmitting,
  modelOptions,
  onComposerToolModeChange,
  onAddRemoteImage,
  onApplyCreativeScene,
  onImageParamsChange,
  onModelChange,
  onSubmit,
  prompt,
  removeFile,
  selectedModelId,
  setPrompt,
  tone = "dark",
}: HomeHeroComposerProps) {
  const isSubmitDisabled = isSubmitting || (!prompt.trim() && files.length === 0);
  const isDark = tone !== "light";
  const selectedModel = modelOptions.find((model) => model.id === selectedModelId);
  const directModelOptions = modelOptions.filter((model) => model.id !== "auto");
  const imageModelOptions = directModelOptions.filter(
    (model) => model.supportsImageGen !== false && !isVideoModelOption(model)
  );
  const videoModelOptions = directModelOptions.filter(isVideoModelOption);
  const isAgentToolActive = composerToolMode === "agent" || isAgentModeActive;
  const isAutoToolActive = composerToolMode === "auto";
  const isVideoToolActive = composerToolMode === "video";
  const activeDirectModelOptions = isVideoToolActive
    ? videoModelOptions
    : imageModelOptions;
  const defaultDirectModel =
    activeDirectModelOptions[0] || directModelOptions[0];
  const isWebSearchEnabled = imageParams?.enableWebSearch === true;
  const isPromptExtendEnabled = imageParams?.promptExtend === true;
  const modelMenuValue =
    selectedModelId !== "auto"
      ? selectedModelId
      : defaultDirectModel?.id || "auto";
  const selectedDirectModel =
    activeDirectModelOptions.find((model) => model.id === modelMenuValue) ||
    defaultDirectModel;
  const defaultImageModel = imageModelOptions[0] || defaultDirectModel;
  const defaultVideoModel = videoModelOptions[0];
  const generationModeLabel = isAgentToolActive
    ? "Agent 模式"
    : isVideoToolActive
      ? "视频生成"
      : "图片生成";
  const GenerationModeIcon = isAgentToolActive
    ? Orbit
    : isVideoToolActive
      ? Clapperboard
      : SlidersHorizontal;
  const [isInspirationOpen, setIsInspirationOpen] = useState(false);
  const [inspirationQuery, setInspirationQuery] = useState("");
  const [inspirationResults, setInspirationResults] = useState<
    InspirationImageResult[]
  >([]);
  const [isSearchingInspiration, setIsSearchingInspiration] = useState(false);
  const [inspirationError, setInspirationError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const defaultInspirationQuery = useMemo(
    () => prompt.trim().slice(0, 80) || "创意视觉场景",
    [prompt]
  );

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "auto";
    const minHeight = prompt.trim() ? 44 : 70;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), 190);
    textarea.style.height = `${nextHeight}px`;
  }, [files.length, prompt]);

  useEffect(() => {
    if (!isInspirationOpen || inspirationQuery.trim()) return;
    setInspirationQuery(defaultInspirationQuery);
  }, [defaultInspirationQuery, inspirationQuery, isInspirationOpen]);

  const selectAgentMode = () => {
    onComposerToolModeChange("agent");
    onModelChange("auto");
  };

  const selectAutoMode = (modelId = defaultImageModel?.id) => {
    onComposerToolModeChange("auto");
    if (modelId) {
      onModelChange(modelId);
    }
  };

  const selectVideoMode = (modelId = defaultVideoModel?.id) => {
    onComposerToolModeChange("video");
    if (modelId) {
      onModelChange(modelId);
    }
  };

  const togglePromptExtend = () => {
    const nextEnabled = !isPromptExtendEnabled;
    onImageParamsChange?.({ promptExtend: nextEnabled });
    if (nextEnabled) {
      onApplyCreativeScene?.();
    }
    onComposerToolModeChange(
      nextEnabled ? "creative" : isWebSearchEnabled ? "inspiration" : "auto"
    );
  };

  const runInspirationSearch = async (value = inspirationQuery) => {
    const query = value.trim() || defaultInspirationQuery;
    setInspirationQuery(query);
    setIsSearchingInspiration(true);
    setInspirationError("");
    onImageParamsChange?.({ enableWebSearch: true });
    onComposerToolModeChange("inspiration");

    try {
      const response = await apiFetch(
        `/api/inspiration/search?query=${encodeURIComponent(query)}&perPage=12`
      );
      const payload = await response.json();
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.error || "图片搜索失败");
      }
      const images = Array.isArray(payload?.data?.images)
        ? payload.data.images
        : [];
      setInspirationResults(images);
    } catch (error) {
      setInspirationResults([]);
      setInspirationError(error instanceof Error ? error.message : "图片搜索失败");
    } finally {
      setIsSearchingInspiration(false);
    }
  };

  const toolButtonClassName = (isActive: boolean) =>
    cn(
      "inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border px-[12px] text-[13px] font-semibold transition duration-200 hover:-translate-y-0.5 max-sm:h-[36px] max-sm:px-[10px] max-sm:text-[12px]",
      isDark
        ? cn(
            "border-white/[0.075] bg-[#1a1c22] text-white/86 hover:border-white/[0.16] hover:bg-[#24262e] hover:text-white",
            isActive &&
              "border-brand-accent bg-brand-accent text-brand-accent-foreground shadow-[0_10px_22px_rgb(var(--brand-accent-rgb)/0.22)] hover:border-brand-accent-hover hover:bg-brand-accent-hover hover:text-brand-accent-foreground"
          )
        : cn(
            "border-black/[0.08] bg-transparent text-[#171a22] hover:border-black/[0.13] hover:bg-black/[0.035]",
            isActive &&
              "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:border-brand-accent-hover hover:bg-brand-accent-hover hover:text-brand-accent-foreground"
          )
    );

  const menuContentClassName = cn(
    "w-[248px] rounded-[12px] p-1.5",
    isDark
      ? "border-white/10 bg-[#17191f] text-white shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
      : "border-[#e3e7ee] bg-white text-[#171a22] shadow-[0_16px_34px_rgba(18,24,33,0.12)]"
  );
  const menuItemClassName = cn(
    "min-h-9 rounded-[8px] px-2.5 text-[13px] font-medium",
    isDark
      ? "focus:bg-white/[0.07] focus:text-white"
      : "focus:bg-[#f3f5f8] focus:text-[#171a22]"
  );
  const menuLabelClassName = cn(
    "px-2.5 py-1.5 text-[11px] font-semibold",
    isDark ? "text-white/42" : "text-[#8b95a3]"
  );
  const menuSeparatorClassName = isDark ? "bg-white/8" : "bg-[#edf0f4]";
  const toolItems: Array<{
    label: string;
    icon: typeof SlidersHorizontal;
    mode: Exclude<HomeComposerToolMode, "agent">;
    title: string;
    active: boolean;
    onClick: () => void;
  }> = [
    {
      label: "自动",
      icon: SlidersHorizontal,
      mode: "auto",
      title: selectedModel?.displayName
        ? `当前模型：${selectedModel.displayName}`
        : isVideoToolActive
          ? "使用默认视频模型"
          : "使用默认图像模型",
      active: isAutoToolActive || isVideoToolActive,
      onClick: () =>
        isVideoToolActive
          ? selectVideoMode(selectedDirectModel?.id)
          : selectAutoMode(selectedDirectModel?.id),
    },
    {
      label: "灵感搜索",
      icon: Search,
      mode: "inspiration",
      title: "启用联网灵感搜索参数后进入画布",
      active: isWebSearchEnabled,
      onClick: () => {
        onImageParamsChange?.({ enableWebSearch: true });
        onComposerToolModeChange("inspiration");
      },
    },
    {
      label: "创意设计",
      icon: Gem,
      mode: "creative",
      title: "启用提示词智能优化后进入画布",
      active: isPromptExtendEnabled,
      onClick: togglePromptExtend,
    },
  ];

  return (
    <section className="relative w-full pt-[72px] text-center sm:pt-[82px] lg:pt-[96px] xl:pt-[110px]">
      <h1
        className={cn(
          "mx-auto max-w-[min(680px,100%)] px-2 text-[clamp(20px,2.2vw,28px)] font-semibold leading-[1.18] tracking-normal",
          isDark ? "text-white" : "text-[#171a22]"
        )}
      >
        今天想在无限画布创作什么？
      </h1>

      <div
        className={cn(
          "mx-auto mt-[30px] min-h-[180px] w-full max-w-[1372px] overflow-visible rounded-[24px] border p-[20px] text-left transition-colors duration-200 max-lg:min-h-[300px] max-lg:rounded-[20px] max-lg:p-[22px] max-sm:mt-[24px] max-sm:p-4 xl:mt-[42px]",
          isDark
            ? "border-white/[0.055] bg-[#1b1c21] shadow-[0_24px_52px_rgba(0,0,0,0.3)] hover:border-white/[0.09]"
            : "border-[#e8ebf0] bg-white shadow-none hover:border-[#dfe3ea]"
        )}
      >
        <div className="grid h-full w-full grid-cols-[64px_minmax(0,1fr)] grid-rows-[auto_auto_auto] gap-x-[20px] gap-y-[14px] max-lg:flex max-lg:flex-col">
          <label
            className={cn(
              "astra-upload-heartbeat group/upload z-10 flex h-[66px] w-[52px] -rotate-[8deg] cursor-pointer items-center justify-center self-start rounded-[4px] border transition-colors duration-200 max-lg:static max-lg:h-[64px] max-lg:w-[52px] max-lg:rotate-0",
              isDark
                ? "border-white/[0.035] bg-[#282b35] text-[#777d8c] shadow-[0_12px_22px_rgba(0,0,0,0.16)] hover:border-brand-accent/20 hover:bg-brand-accent/8 hover:text-brand-accent"
                : "border-[#e6e9ef] bg-[#f4f5f7] text-[#8d96a5] shadow-none hover:border-brand-accent/45 hover:bg-white hover:text-brand-accent-deep"
            )}
            title="添加参考图片"
          >
            <Plus className="h-5 w-5 transition-transform duration-200 group-hover/upload:scale-110" strokeWidth={1.65} />
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event: ChangeEvent<HTMLInputElement>) => {
                void handleAddFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </label>

          <textarea
            aria-label="输入创意"
            ref={textareaRef}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="Seedance 2.0全能参考，上传参考、输入文字，创意无限可能"
            className={cn(
              "col-start-2 row-start-1 min-h-[44px] w-full resize-none overflow-y-auto border-0 bg-transparent p-0 text-[15px] font-normal leading-[1.55] caret-brand-accent outline-none focus:ring-0 max-lg:mt-4 max-lg:min-h-[58px] max-lg:w-full max-lg:text-[13px] max-sm:min-h-[64px]",
              isDark
                ? "text-white placeholder:text-[#737887]"
                : "text-[#171a22] placeholder:text-[#9aa3af]"
            )}
          />

          {files.length > 0 ? (
            <div className="col-start-2 row-start-2 z-20 flex max-w-full flex-wrap gap-2">
              {files.map((item) => (
                <div
                  key={item.id}
                  className="group/file relative h-10 w-10 overflow-hidden rounded-[8px] border border-white/10 bg-black/30"
                >
	                  <img
	                    src={item.previewUrl}
	                    alt={item.name || item.file?.name || "参考图"}
	                    className="h-full w-full object-cover"
	                  />
                  <button
                    type="button"
                    className="absolute inset-0 hidden items-center justify-center bg-black/55 text-[16px] text-white group-hover/file:flex"
                    onClick={() => removeFile(item.id)}
                    title="移除图片"
                  >
                    x
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          <div className="col-span-2 row-start-3 flex items-center justify-between gap-3 max-lg:mt-4 max-lg:flex-wrap">
            <div className="flex min-w-0 flex-wrap items-center gap-[5px]">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-pressed={isAgentToolActive || isVideoToolActive || isAutoToolActive}
                        className={cn(
                    "group/tool inline-flex h-[38px] items-center gap-1.5 rounded-[8px] border px-[12px] text-[13px] font-semibold transition duration-200 hover:-translate-y-0.5 max-sm:h-[36px] max-sm:px-[10px] max-sm:text-[12px]",
                    isAgentToolActive || isVideoToolActive || isAutoToolActive
                      ? isDark
                        ? "border-brand-accent bg-brand-accent text-brand-accent-foreground shadow-[0_10px_22px_rgb(var(--brand-accent-rgb)/0.22)] hover:border-brand-accent-hover hover:bg-brand-accent-hover hover:text-brand-accent-foreground"
                        : "border-brand-accent bg-brand-accent text-brand-accent-foreground hover:border-brand-accent-hover hover:bg-brand-accent-hover hover:text-brand-accent-foreground"
                      : isDark
                        ? "border-white/[0.075] bg-[#1a1c22] text-white/86 hover:border-white/[0.16] hover:bg-[#24262e] hover:text-white"
                        : "border-black/[0.08] bg-transparent text-[#171a22] hover:border-black/[0.13] hover:bg-black/[0.035]"
                  )}
                  title={`当前生成模式：${generationModeLabel}`}
                >
                  <GenerationModeIcon className="h-[18px] w-[18px]" strokeWidth={1.85} />
                  <span>{generationModeLabel}</span>
                  <ChevronDown className="h-[14px] w-[14px] transition-transform group-hover/tool:translate-y-0.5" strokeWidth={2.1} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className={menuContentClassName}
                sideOffset={8}
              >
                <DropdownMenuLabel className={menuLabelClassName}>
                  生成模式
                </DropdownMenuLabel>
                <div className="space-y-1">
                  <DropdownMenuItem
                    className={cn(menuItemClassName, "justify-between gap-3")}
                    onClick={selectAgentMode}
                  >
                    <span className="truncate">Agent 模式</span>
                    {isAgentToolActive ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(menuItemClassName, "justify-between gap-3")}
                    disabled={!defaultImageModel}
                    onClick={() => selectAutoMode(defaultImageModel?.id)}
                  >
                    <span className="truncate">图片生成</span>
                    {!isAgentToolActive && !isVideoToolActive ? (
                      <Check className="h-4 w-4" />
                    ) : null}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className={cn(menuItemClassName, "justify-between gap-3")}
                    disabled={!defaultVideoModel}
                    onClick={() => selectVideoMode(defaultVideoModel?.id)}
                  >
                    <span className="truncate">视频生成</span>
                    {isVideoToolActive ? <Check className="h-4 w-4" /> : null}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            {toolItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.active || item.mode === composerToolMode;
              if (item.mode === "auto") {
                return (
                  <DropdownMenu key={item.label}>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        onClick={item.onClick}
                        title={
                          selectedDirectModel?.displayName
                            ? `当前模型：${selectedDirectModel.displayName}`
                            : item.title
                        }
                        className={toolButtonClassName(isActive)}
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                        {item.label}
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className={menuContentClassName}
                      sideOffset={8}
                    >
                      <DropdownMenuLabel className={menuLabelClassName}>
                        {isVideoToolActive ? "视频模型" : "图像模型"}
                      </DropdownMenuLabel>
                      {selectedDirectModel ? (
                        <DropdownMenuItem
                          className={menuItemClassName}
                          onClick={() =>
                            isVideoToolActive
                              ? selectVideoMode(selectedDirectModel.id)
                              : selectAutoMode(selectedDirectModel.id)
                          }
                        >
                          <Check className="h-4 w-4" />
                          <span className="truncate">自动</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem className={menuItemClassName} disabled>
                          暂无可用模型
                        </DropdownMenuItem>
                      )}
                      {activeDirectModelOptions.length > 0 ? (
                        <>
                          <DropdownMenuSeparator
                            className={menuSeparatorClassName}
                          />
                          <div className="space-y-1">
                            {activeDirectModelOptions.map((model) => (
                              <DropdownMenuItem
                                className={cn(
                                  menuItemClassName,
                                  "justify-between gap-3"
                                )}
                                key={model.id}
                                onClick={() =>
                                  isVideoToolActive
                                    ? selectVideoMode(model.id)
                                    : selectAutoMode(model.id)
                                }
                              >
                                <span className="truncate">
                                  {model.displayName || model.modelId || "未命名模型"}
                                </span>
                                {modelMenuValue === model.id ? (
                                  <Check className="h-4 w-4" />
                                ) : null}
                              </DropdownMenuItem>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                );
              }

              if (item.mode === "inspiration") {
                return (
                  <Popover
                    key={item.label}
                    onOpenChange={(open) => {
                      setIsInspirationOpen(open);
                      if (!open) return;
                      onImageParamsChange?.({ enableWebSearch: true });
                      onComposerToolModeChange("inspiration");
                      const query = inspirationQuery.trim() || defaultInspirationQuery;
                      if (inspirationResults.length === 0) {
                        void runInspirationSearch(query);
                      }
                    }}
                    open={isInspirationOpen}
                  >
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        aria-pressed={isActive}
                        title={item.title}
                        className={toolButtonClassName(isActive)}
                      >
                        <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                        {item.label}
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      className={cn(
                        "w-[min(640px,calc(100vw-24px))] rounded-[14px] p-3",
                        isDark
                          ? "border-white/10 bg-[#17191f] text-white shadow-[0_18px_48px_rgba(0,0,0,0.42)]"
                          : "border-[#e3e7ee] bg-white text-[#171a22] shadow-[0_16px_34px_rgba(18,24,33,0.12)]"
                      )}
                      side="top"
                      sideOffset={10}
                    >
                      <form
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void runInspirationSearch();
                        }}
                      >
                        <div
                          className={cn(
                            "flex h-9 min-w-0 items-center gap-2 rounded-[9px] border px-2.5",
                            isDark
                              ? "border-white/10 bg-white/[0.04]"
                              : "border-[#e3e7ee] bg-[#f8f9fb]"
                          )}
                        >
                          <Search
                            className={cn(
                              "h-4 w-4",
                              isDark ? "text-white/45" : "text-[#8b95a3]"
                            )}
                            strokeWidth={2}
                          />
                          <input
                            className={cn(
                              "h-full min-w-0 flex-1 bg-transparent text-[12px] outline-none",
                              isDark
                                ? "text-white placeholder:text-white/32"
                                : "text-[#171a22] placeholder:text-[#98a1af]"
                            )}
                            onChange={(event) => setInspirationQuery(event.target.value)}
                            placeholder="搜索图片素材"
                            value={inspirationQuery}
                          />
                        </div>
                        <button
                          className="h-9 shrink-0 rounded-[9px] bg-brand-accent px-3 text-[12px] font-semibold text-brand-accent-foreground transition hover:bg-brand-accent-hover disabled:opacity-70"
                          disabled={isSearchingInspiration}
                          type="submit"
                        >
                          {isSearchingInspiration ? "搜索中" : "搜索"}
                        </button>
                      </form>

                      <div className="mt-3 grid max-h-[260px] grid-cols-3 gap-2 overflow-y-auto pr-1">
                        {inspirationResults.map((image) => (
                          <button
                            className={cn(
                              "group/result relative aspect-[4/3] overflow-hidden rounded-[8px] border text-left",
                              isDark
                                ? "border-white/10 bg-white/[0.04]"
                                : "border-[#e5e9ef] bg-[#f4f6f8]"
                            )}
                            key={image.id}
                            onClick={() => {
                              onAddRemoteImage?.(image);
                              onImageParamsChange?.({ enableWebSearch: true });
                              onComposerToolModeChange("inspiration");
                            }}
                            title={image.title}
                            type="button"
                          >
                            <img
                              alt={image.title}
                              className="h-full w-full object-cover transition duration-200 group-hover/result:scale-[1.04]"
                              loading="lazy"
                              decoding="async"
                              src={image.thumbnailUrl}
                            />
                            <span className="absolute bottom-1 left-1 rounded-[6px] bg-black/58 px-1.5 py-0.5 text-[10px] font-medium capitalize text-white">
                              {image.source}
                            </span>
                          </button>
                        ))}
                      </div>
                      {inspirationError ? (
                        <div
                          className={cn(
                            "mt-2 text-[12px]",
                            isDark ? "text-red-300" : "text-red-600"
                          )}
                        >
                          {inspirationError}
                        </div>
                      ) : null}
                      {!isSearchingInspiration &&
                      inspirationResults.length === 0 &&
                      !inspirationError ? (
                        <div
                          className={cn(
                            "mt-3 text-[12px]",
                            isDark ? "text-white/45" : "text-[#87909f]"
                          )}
                        >
                          暂无图片
                        </div>
                      ) : null}
                    </PopoverContent>
                  </Popover>
                );
              }

              return (
                <button
                  type="button"
                  key={item.label}
                  aria-pressed={isActive}
                  onClick={item.onClick}
                  title={item.title}
                  className={toolButtonClassName(isActive)}
                >
                  <Icon className="h-[17px] w-[17px]" strokeWidth={1.9} />
                  {item.label}
                </button>
              );
            })}
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-[10px] max-lg:justify-end max-lg:gap-2">
            <button
              type="button"
              className={cn(
                "flex h-[38px] w-[32px] items-center justify-center rounded-[10px] transition duration-200 hover:-translate-y-0.5 max-lg:h-[38px] max-lg:w-[38px]",
                isDark
                  ? "text-[#777d8a] hover:bg-white/[0.055] hover:text-white"
                  : "text-[#858d9d] hover:bg-black/[0.055] hover:text-[#202633]"
              )}
              title="语音输入"
            >
              <Mic className="h-[20px] w-[20px]" strokeWidth={2.2} />
            </button>
            <button
              onClick={onSubmit}
              disabled={isSubmitDisabled}
              type="button"
              className={cn(
                "flex h-[40px] w-[40px] items-center justify-center rounded-full transition duration-200 max-lg:h-[42px] max-lg:w-[42px]",
                isSubmitDisabled
                  ? "cursor-not-allowed bg-brand-accent text-brand-accent-foreground opacity-100"
                  : isDark
                    ? "bg-brand-accent text-brand-accent-foreground shadow-[0_14px_28px_rgb(var(--brand-accent-rgb)/0.3)] hover:-translate-y-0.5 hover:bg-brand-accent-hover"
                    : "bg-brand-accent text-brand-accent-foreground shadow-none hover:-translate-y-0.5 hover:bg-brand-accent-hover"
              )}
              title="发送并进入画布"
            >
              {isSubmitting ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <ArrowUp className="h-[21px] w-[21px]" strokeWidth={2.25} />
              )}
            </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
