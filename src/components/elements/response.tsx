// Modified for standalone community distribution; see NOTICE.
"use client";

import { ChevronDownIcon } from "lucide-react";
import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { useState } from "react";
import { Streamdown } from "streamdown";
import { ImagePreview } from "@/src/components/image-preview";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/src/components/ui/collapsible";
import { VideoPreview } from "@/src/components/video-preview";
import { cn } from "@/src/lib/utils";

type ResponseProps = ComponentProps<typeof Streamdown> & {
  collapsibleImageAnalysis?: boolean;
  onImageEdit?: (imageUrl: string) => void;
  onDrawingComplete?: (annotatedImageUrl: string) => void;
  onImageEnhance?: (imageUrl: string) => void;
  onImageRmbg?: (imageUrl: string) => void;
  onImageExtend?: (imageUrl: string) => void;
  onImageAngleEdit?: (imageUrl: string) => void;
  onImageWatermarkRemove?: (imageUrl: string) => void;
  isProcessingEnhance?: boolean;
  isProcessingRmbg?: boolean;
  isProcessingExtend?: boolean;
  isProcessingAngleEdit?: boolean;
  isProcessingWatermarkRemove?: boolean;
};

const IMAGE_ANALYSIS_TITLE = "图片分析";
const AGENT_SECTION_TITLES = new Set([
  "意图分析",
  "任务规划",
  "需求理解",
  IMAGE_ANALYSIS_TITLE,
  "执行计划",
  "优化后提示词",
  "输出设置",
]);

const responseHeadingClassNames = {
  h1: "mt-3.5 mb-1.5 text-[16px] font-semibold leading-6 tracking-[0] text-inherit",
  h2: "mt-3 mb-1.5 text-[15px] font-semibold leading-[22px] tracking-[0] text-inherit",
  h3: "mt-2.5 mb-1 text-[14px] font-semibold leading-[22px] tracking-[0] text-inherit",
  h4: "mt-2 mb-1 text-[13px] font-semibold leading-5 tracking-[0] text-inherit",
} as const;

type AnalysisSection = {
  before: string;
  analysis: string;
  after: string;
};

function splitMarkdownImages(content: string) {
  const segments: Array<
    | { type: "text"; value: string }
    | { type: "image"; alt?: string; src: string }
  > = [];

  const imageRegex = /!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = imageRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex, match.index),
      });
    }

    segments.push({
      type: "image",
      alt: match[1],
      src: match[2],
    });

    lastIndex = imageRegex.lastIndex;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: "text",
      value: content.slice(lastIndex),
    });
  }

  return segments;
}

function normalizeSectionTitle(line: string) {
  let normalized = line.trim();
  if (!normalized) return "";

  normalized = normalized
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*]\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/[▼▽▾]\s*$/, "")
    .trim();

  const colonIndex = normalized.indexOf("：");
  const asciiColonIndex = normalized.indexOf(":");
  const splitIndex =
    colonIndex >= 0 && asciiColonIndex >= 0
      ? Math.min(colonIndex, asciiColonIndex)
      : Math.max(colonIndex, asciiColonIndex);

  if (splitIndex > 0 && splitIndex <= 12) {
    normalized = normalized.slice(0, splitIndex).trim();
  }

  return normalized.replace(/[：:]+$/, "").trim();
}

function extractImageAnalysisSection(content: string): AnalysisSection | null {
  const lines = content.split(/\r?\n/);
  let startIndex = -1;
  let inlineAnalysis = "";

  for (let i = 0; i < lines.length; i += 1) {
    const title = normalizeSectionTitle(lines[i]);
    if (!title || !title.startsWith(IMAGE_ANALYSIS_TITLE)) continue;

    startIndex = i;

    const headingText = lines[i]
      .trim()
      .replace(/^#{1,6}\s*/, "")
      .replace(/^[-*]\s*/, "")
      .replace(/^\*\*(.+)\*\*$/, "$1")
      .trim();

    const inlineMatch = headingText.match(/^图片分析[：:]\s*(.+)$/);
    if (inlineMatch?.[1]) {
      inlineAnalysis = inlineMatch[1].trim();
    }
    break;
  }

  if (startIndex < 0) return null;

  let endIndex = lines.length;
  for (let i = startIndex + 1; i < lines.length; i += 1) {
    const title = normalizeSectionTitle(lines[i]);
    if (!title || title.startsWith(IMAGE_ANALYSIS_TITLE)) continue;
    if (AGENT_SECTION_TITLES.has(title)) {
      endIndex = i;
      break;
    }
  }

  const analysisLines = lines.slice(startIndex + 1, endIndex);
  if (inlineAnalysis) {
    analysisLines.unshift(inlineAnalysis);
  }

  const analysis = analysisLines.join("\n").trim();
  if (!analysis) return null;

  return {
    before: lines.slice(0, startIndex).join("\n").trim(),
    analysis,
    after: lines.slice(endIndex).join("\n").trim(),
  };
}

type ImageAnalysisCollapsibleProps = {
  content: string;
  streamdownClassName: string;
  streamdownComponents: ComponentProps<typeof Streamdown>["components"];
};

function ImageAnalysisCollapsible({
  content,
  streamdownClassName,
  streamdownComponents,
}: ImageAnalysisCollapsibleProps) {
  const [open, setOpen] = useState(true);

  return (
    <Collapsible
      className="my-3 rounded-[20px] bg-[#f4f5f7] px-5 py-4"
      onOpenChange={setOpen}
      open={open}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 text-left">
        <span className="inline-flex items-center gap-2">
          <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-white text-[11px] font-semibold text-[#98a2b3] shadow-[inset_0_0_0_1px_rgba(148,163,184,0.45)]">
            Q.
          </span>
          <span className="text-[12px] font-semibold leading-[18px] tracking-[0] text-[#9aa1ad]">图片分析</span>
        </span>
        <ChevronDownIcon
          className={cn(
            "size-4 shrink-0 text-[#9aa1ad] transition-transform",
            open ? "rotate-180" : "rotate-0"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          "px-0 pb-0 pt-3",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-1 data-[state=open]:slide-in-from-top-1",
          "outline-hidden data-[state=closed]:animate-out data-[state=open]:animate-in"
        )}
      >
        <Streamdown
          className={cn(
            streamdownClassName,
            "text-[12px] font-medium leading-[18px] text-[#2f3640] [&_p]:my-0 [&_ul]:my-0 [&_li]:my-0"
          )}
          components={streamdownComponents}
        >
          {content}
        </Streamdown>
      </CollapsibleContent>
    </Collapsible>
  );
}

// 注意：移除了 memo 的自定义比较函数，确保 isProcessing* 状态变化时组件能正确重新渲染
// 之前的 memo 比较函数可能导致 Streamdown 内部的 ImagePreview 组件没有正确更新
export const Response = ({
  className,
  collapsibleImageAnalysis = false,
  onImageEdit,
  onDrawingComplete,
  onImageEnhance,
  onImageRmbg,
  onImageExtend,
  onImageAngleEdit,
  onImageWatermarkRemove,
  isProcessingEnhance,
  isProcessingRmbg,
  isProcessingExtend,
  isProcessingAngleEdit,
  isProcessingWatermarkRemove,
  ...props
}: ResponseProps) => {
  const streamdownClassName = cn(
    "w-full min-w-0 text-[12px] leading-[18px] tracking-[0] [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_code]:whitespace-pre-wrap [&_code]:break-words [&_pre]:max-w-full [&_pre]:overflow-x-auto",
    className
  );
  const processingKey = `${isProcessingEnhance}-${isProcessingRmbg}-${isProcessingExtend}-${isProcessingAngleEdit}-${isProcessingWatermarkRemove}`;

  const streamdownComponents = {
    h1: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h1 className={cn(responseHeadingClassNames.h1, className)} {...props} />
    ),
    h2: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h2 className={cn(responseHeadingClassNames.h2, className)} {...props} />
    ),
    h3: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h3 className={cn(responseHeadingClassNames.h3, className)} {...props} />
    ),
    h4: ({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) => (
      <h4 className={cn(responseHeadingClassNames.h4, className)} {...props} />
    ),
    p: ({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) => (
      <p className={cn("my-1.5 text-[12px] leading-[18px] tracking-[0]", className)} {...props} />
    ),
    ul: ({ className, ...props }: HTMLAttributes<HTMLUListElement>) => (
      <ul className={cn("my-2 space-y-1 pl-4 text-[12px] leading-[18px]", className)} {...props} />
    ),
    ol: ({ className, ...props }: HTMLAttributes<HTMLOListElement>) => (
      <ol className={cn("my-2 space-y-1 pl-4 text-[12px] leading-[18px]", className)} {...props} />
    ),
    li: ({ className, ...props }: HTMLAttributes<HTMLLIElement>) => (
      <li className={cn("pl-0.5 text-[12px] leading-[18px]", className)} {...props} />
    ),
    blockquote: ({ className, ...props }: HTMLAttributes<HTMLQuoteElement>) => (
      <blockquote
        className={cn(
          "my-2 border-l-2 border-current/18 pl-3 text-[12px] leading-[18px] text-current/82",
          className
        )}
        {...props}
      />
    ),
    img: ({ src, alt }: { src?: string; alt?: string }) => {
      if (!src) {
        return null;
      }

      return (
        <ImagePreview
          key={`${src}-${processingKey}`}
          src={src}
          alt={alt}
          onImageEdit={onImageEdit}
          onDrawingComplete={onDrawingComplete}
          onImageEnhance={onImageEnhance}
          onImageRmbg={onImageRmbg}
          onImageExtend={onImageExtend}
          onImageAngleEdit={onImageAngleEdit}
          onImageWatermarkRemove={onImageWatermarkRemove}
          isProcessingEnhance={isProcessingEnhance}
          isProcessingRmbg={isProcessingRmbg}
          isProcessingExtend={isProcessingExtend}
          isProcessingAngleEdit={isProcessingAngleEdit}
          isProcessingWatermarkRemove={isProcessingWatermarkRemove}
        />
      );
    },
    video: ({ src, alt }: { src?: string; alt?: string }) => {
      if (!src) {
        return null;
      }
      return <VideoPreview src={src} alt={alt} />;
    },
  };

  const renderImagePreview = (
    src: string,
    alt: string | undefined,
    key: string,
    compactGrid = false
  ) => (
    <ImagePreview
      key={key}
      src={src}
      alt={alt}
      compactGrid={compactGrid}
      onImageEdit={onImageEdit}
      onDrawingComplete={onDrawingComplete}
      onImageEnhance={onImageEnhance}
      onImageRmbg={onImageRmbg}
      onImageExtend={onImageExtend}
      onImageAngleEdit={onImageAngleEdit}
      onImageWatermarkRemove={onImageWatermarkRemove}
      isProcessingEnhance={isProcessingEnhance}
      isProcessingRmbg={isProcessingRmbg}
      isProcessingExtend={isProcessingExtend}
      isProcessingAngleEdit={isProcessingAngleEdit}
      isProcessingWatermarkRemove={isProcessingWatermarkRemove}
    />
  );

  const renderImageGrid = (
    images: Array<{ alt?: string; src: string }>,
    keyPrefix: string
  ) => {
    if (images.length === 0) return null;
    if (images.length === 1) {
      const image = images[0];
      return renderImagePreview(
        image.src,
        image.alt,
        `${image.src}-${processingKey}-${keyPrefix}-single`
      );
    }

    const gridClassName =
      images.length === 2
        ? "grid-cols-2 sm:max-w-[640px]"
        : images.length === 3
          ? "grid-cols-2 sm:grid-cols-3 sm:max-w-[780px]"
          : "grid-cols-2 sm:grid-cols-4 sm:max-w-[920px]";

    return (
      <div
        className={cn(
          "not-prose my-3 grid w-full gap-1.5 overflow-hidden rounded-lg",
          gridClassName
        )}
        key={`${keyPrefix}-image-grid`}
      >
        {images.map((image, index) => (
          <div className="min-w-0" key={`${image.src}-${index}`}>
            {renderImagePreview(
              image.src,
              image.alt,
              `${image.src}-${processingKey}-${keyPrefix}-grid-${index}`,
              true
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderTextWithImages = (text: string, keyPrefix: string): ReactNode => {
    if (!text.trim()) return null;

    if (text.includes("![") && text.includes("](")) {
      const segments = splitMarkdownImages(text);
      const hasImageSegments = segments.some((segment) => segment.type === "image");

      if (hasImageSegments) {
        const nodes: ReactNode[] = [];
        let pendingImages: Array<{ alt?: string; src: string }> = [];
        const flushImages = (index: number) => {
          if (pendingImages.length === 0) return;
          nodes.push(renderImageGrid(pendingImages, `${keyPrefix}-images-${index}`));
          pendingImages = [];
        };

        segments.forEach((segment, index) => {
          if (segment.type === "image") {
            pendingImages.push({
              alt: segment.alt,
              src: segment.src,
            });
            return;
          }

          if (!segment.value.trim()) {
            return;
          }

          flushImages(index);
          nodes.push(
            <Streamdown
              className={streamdownClassName}
              components={streamdownComponents}
              key={`${keyPrefix}-text-${index}`}
            >
              {segment.value}
            </Streamdown>
          );
        });
        flushImages(segments.length);
        return nodes;
      }
    }

    return (
      <Streamdown
        className={streamdownClassName}
        components={streamdownComponents}
        key={`${keyPrefix}-single`}
      >
        {text}
      </Streamdown>
    );
  };

  const rawText = typeof props.children === "string" ? props.children : null;
  if (rawText) {
    const analysisSection = collapsibleImageAnalysis
      ? extractImageAnalysisSection(rawText)
      : null;

    if (analysisSection) {
      return (
        <div className={streamdownClassName}>
          {renderTextWithImages(analysisSection.before, "analysis-before")}
          <ImageAnalysisCollapsible
            content={analysisSection.analysis}
            streamdownClassName={streamdownClassName}
            streamdownComponents={streamdownComponents}
          />
          {renderTextWithImages(analysisSection.after, "analysis-after")}
        </div>
      );
    }

    return <div className={streamdownClassName}>{renderTextWithImages(rawText, "raw")}</div>;
  }

  return (
    <Streamdown
      className={streamdownClassName}
      components={streamdownComponents}
      {...props}
    />
  );
};

Response.displayName = "Response";
