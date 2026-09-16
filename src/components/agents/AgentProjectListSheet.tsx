// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { FolderOpen, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { agentProjectService } from "@/src/services/agent-projects/index";
import { Button } from "@/src/components/ui/button";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/src/components/ui/sheet";
import { cn } from "@/src/lib/utils";
import { buildImageProxyUrl } from "@/src/lib/image-delivery";
import type {
  AgentGenerationProject,
  AgentWorkflowMaterialImage,
  AgentWorkflowMaterialSelectionState,
} from "@/types/agent";

function normalizePreviewUrl(value?: string | null) {
  const normalizedValue = String(value || "").trim();
  return normalizedValue || null;
}

function sortMaterialImages(images: AgentWorkflowMaterialImage[]) {
  return [...images].sort((left, right) => {
    const sortOrderDiff = (left.sortOrder || 0) - (right.sortOrder || 0);
    if (sortOrderDiff !== 0) {
      return sortOrderDiff;
    }
    return left.id.localeCompare(right.id);
  });
}

function getImageUrlFromCandidates(images: AgentWorkflowMaterialImage[]) {
  for (const image of images) {
    const imageUrl = normalizePreviewUrl(image.imageUrl);
    if (imageUrl) {
      return imageUrl;
    }
  }
  return null;
}

function getMaterialSelectionPreviewUrl(selection?: AgentWorkflowMaterialSelectionState | null) {
  const images = selection?.result?.images ?? [];
  if (!images.length) {
    return null;
  }

  const sortedImages = sortMaterialImages(images);
  const selectedImageIds = new Set(selection?.selectedImageIds ?? []);

  const selectedImages = sortedImages.filter((image) => selectedImageIds.has(image.id));
  const selectedUploadedImages = selectedImages.filter((image) => image.sourceType === "upload");
  const uploadedImages = sortedImages.filter((image) => image.sourceType === "upload");
  const searchImages = sortedImages.filter((image) => image.sourceType !== "upload");

  return (
    getImageUrlFromCandidates(selectedUploadedImages) ||
    getImageUrlFromCandidates(selectedImages) ||
    getImageUrlFromCandidates(uploadedImages) ||
    getImageUrlFromCandidates(searchImages) ||
    getImageUrlFromCandidates(sortedImages)
  );
}

function getProjectPreviewUrl(project: AgentGenerationProject) {
  const explicitThumbnail = normalizePreviewUrl(project.thumbnail);
  if (explicitThumbnail) {
    return explicitThumbnail;
  }

  const resultCollections = project.projectState?.resultCollections;
  const resultPreviewUrl =
    resultCollections?.scene_generation?.[0] ||
    resultCollections?.detail_generation?.[0] ||
    resultCollections?.detail_replacement?.[0] ||
    resultCollections?.sku_replacement?.[0] ||
    "";
  const normalizedResultPreviewUrl = normalizePreviewUrl(resultPreviewUrl);
  if (normalizedResultPreviewUrl) {
    return normalizedResultPreviewUrl;
  }

  const materials = project.projectState?.workflowState?.materials;

  return (
    getMaterialSelectionPreviewUrl(materials?.primary) ||
    getMaterialSelectionPreviewUrl(materials?.secondary) ||
    null
  );
}

interface AgentProjectListSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentProjectId?: string | null;
  onCreateProject: () => Promise<void> | void;
  onSelectProject: (projectId: string) => Promise<void> | void;
  onDeleteProject: (projectId: string) => Promise<void> | void;
  onRenameProject: (projectId: string, currentTitle?: string | null) => Promise<void> | void;
}

export function AgentProjectListSheet({
  open,
  onOpenChange,
  currentProjectId,
  onCreateProject,
  onSelectProject,
  onDeleteProject,
  onRenameProject,
}: AgentProjectListSheetProps) {
  const [projects, setProjects] = useState<AgentGenerationProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingRenameId, setPendingRenameId] = useState<string | null>(null);

  const loadProjects = async () => {
    setIsLoading(true);
    try {
      const result = await agentProjectService.getProjects();
      if (!result.success || !result.data) {
        throw new Error(result.error || "加载失败");
      }
      setProjects(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加载生图项目失败");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    void loadProjects();
  }, [open, currentProjectId]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[380px] border-white/10 bg-[#0b0d0f] p-0 text-white sm:max-w-[380px]"
      >
        <SheetHeader className="border-b border-white/10 px-5 py-4 text-left">
          <SheetTitle className="text-white">生图项目列表</SheetTitle>
          <SheetDescription className="text-white/45">
            当前工作台会自动保存到项目中，这里可以随时切换、重命名或继续生成。
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-white/10 px-5 py-4">
          <Button
            type="button"
            onClick={async () => {
              await onCreateProject();
              await loadProjects();
              onOpenChange(false);
            }}
            className="h-10 w-full gap-2 bg-emerald-500 text-white hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            新建空白项目
          </Button>
        </div>

        <ScrollArea className="h-[calc(100vh-150px)]">
          <div className="space-y-2 p-4">
            {isLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-white/50" />
              </div>
            ) : projects.length > 0 ? (
              projects.map((project) => {
                const previewUrl = getProjectPreviewUrl(project);

                return (
                <button
                  key={project.id}
                  type="button"
                  onClick={async () => {
                    await onSelectProject(project.id);
                    onOpenChange(false);
                  }}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors",
                    project.id === currentProjectId
                      ? "border-emerald-400/30 bg-emerald-500/[0.08]"
                      : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
                  )}
                >
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
                    {previewUrl ? (
                      <img
                        src={buildImageProxyUrl(previewUrl, {
                          width: 160,
                          quality: 82,
                          format: "webp",
                        })}
                        alt={project.title}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-white/25" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        "truncate text-sm font-medium",
                        project.id === currentProjectId ? "text-emerald-200" : "text-white"
                      )}
                    >
                      {project.title || "未命名生图项目"}
                    </div>
                    <div className="mt-1 text-xs text-white/45">
                      {formatDistanceToNow(new Date(project.updatedAt), {
                        addSuffix: true,
                        locale: zhCN,
                      })}
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-white/45 opacity-0 transition-opacity hover:text-sky-300 group-hover:opacity-100"
                    disabled={pendingRenameId === project.id}
                    onClick={async (event) => {
                      event.stopPropagation();
                      setPendingRenameId(project.id);
                      try {
                        await onRenameProject(project.id, project.title || "");
                        await loadProjects();
                      } finally {
                        setPendingRenameId(null);
                      }
                    }}
                  >
                    {pendingRenameId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-white/45 opacity-0 transition-opacity hover:text-rose-300 group-hover:opacity-100"
                    disabled={pendingDeleteId === project.id || pendingRenameId === project.id}
                    onClick={async (event) => {
                      event.stopPropagation();
                      if (!window.confirm("确定删除这个生图项目吗？")) return;
                      setPendingDeleteId(project.id);
                      try {
                        await onDeleteProject(project.id);
                        await loadProjects();
                      } finally {
                        setPendingDeleteId(null);
                      }
                    }}
                  >
                    {pendingDeleteId === project.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </button>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-12 text-center">
                <div className="text-sm text-white/70">还没有生图项目</div>
                <div className="mt-2 text-xs text-white/40">点击上方按钮创建一个空白项目开始工作。</div>
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
