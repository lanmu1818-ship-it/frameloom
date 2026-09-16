// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/src/desktop/next-navigation-shim";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { Trash2, FileImage, Loader2, Plus, X } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { canvasService } from "@/src/services/canvas/index";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import type { CanvasProjectListItem, CanvasWorkspaceType } from "@/types/canvas/index";

const PROJECT_LIST_PAGE_SIZE = 24;

interface CanvasFileListPanelProps {
  currentId: string;
  onClose: () => void;
  workspaceType?: CanvasWorkspaceType;
  workspaceLabel?: string;
  createUrl?: string;
  buildProjectUrl?: (id: string) => string;
}

export function CanvasFileListPanel({
  currentId,
  onClose,
  workspaceType = "canvas",
  workspaceLabel = "画布",
  createUrl = "/canvas?new=1",
  buildProjectUrl = (id) => `/canvas/${id}`,
}: CanvasFileListPanelProps) {
  const router = useRouter();
  const isVideoWorkspace = workspaceType === "video";
  const [projects, setProjects] = useState<CanvasProjectListItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // 加载项目列表
  const loadProjects = async (nextPage = 1, append = false) => {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setIsLoading(true);
    }
    const result = await canvasService.getProjects(workspaceType, {
      page: nextPage,
      limit: PROJECT_LIST_PAGE_SIZE,
    });
    if (result.success && result.data) {
      // 按更新时间降序排序
      const sorted = result.data.sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setProjects((prev) => {
        if (!append) return sorted;
        const seen = new Set(prev.map((project) => project.id));
        return [
          ...prev,
          ...sorted.filter((project) => !seen.has(project.id)),
        ];
      });
      setPage(nextPage);
      setHasMore(Boolean(result.pagination?.hasMore));
    }
    if (append) {
      setIsLoadingMore(false);
    } else {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setProjects([]);
    setPage(1);
    setHasMore(false);
    loadProjects(1, false);
  }, [workspaceType]);

  // 创建新画布
  const handleCreateNew = async () => {
    router.push(createUrl);
  };

  // 切换画布
  const handleSwitch = (id: string) => {
    if (id === currentId) {
      onClose();
      return;
    }
    const targetUrl = buildProjectUrl(id);
    onClose(); // 关闭文件列表面板
    // 强制整页跳转，避免仅更新 URL 不刷新
    setTimeout(() => {
      window.location.assign(targetUrl);
    }, 100);
  };

  // 删除画布
  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("确定要删除这个画布吗？")) return;

    const result = await canvasService.deleteProject(id);
    if (result.success) {
      setProjects(prev => prev.filter(p => p.id !== id));
      toast.success("删除成功");

      // 如果删除的是当前画布，跳转到列表第一个或创建新的
      if (id === currentId) {
        const next = projects.find(p => p.id !== id);
        if (next) {
          router.push(buildProjectUrl(next.id));
        } else {
          handleCreateNew();
        }
      }
    } else {
      toast.error("删除失败");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent">
      {/* Header */}
      <div
        className={cn(
          "flex shrink-0 items-center justify-between p-4",
          isVideoWorkspace ? "border-b border-border/60" : "border-b"
        )}
      >
        <h2 className="font-semibold text-lg">{workspaceLabel}项目列表</h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="h-8 w-8 rounded-lg"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : projects.length === 0 ? (
            <div
              className={cn(
                "py-12 text-center text-muted-foreground",
                isVideoWorkspace &&
                  "rounded-[24px] border border-dashed border-border/60 bg-background/68 px-4"
              )}
            >
              <FileImage className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>暂无{workspaceLabel}历史</p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCreateNew}
                className="mt-4"
              >
                <Plus className="h-4 w-4 mr-1" />
                新建{workspaceLabel}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => handleSwitch(project.id)}
                  className={cn(
                    "group flex cursor-pointer items-center gap-3 rounded-2xl p-3 transition-all",
                    isVideoWorkspace
                      ? "border border-border/60 bg-background/72 shadow-sm hover:-translate-y-0.5 hover:border-primary/30 hover:bg-background/88 hover:shadow-md"
                      : "hover:bg-muted/50",
                    project.id === currentId
                      ? isVideoWorkspace
                        ? "border-primary/35 bg-background ring-1 ring-primary/10"
                        : "bg-primary/5 ring-1 ring-primary/20"
                      : isVideoWorkspace
                        ? ""
                        : "bg-card"
                  )}
                >
                  {/* 列表只展示轻量占位，不拉取未打开项目的云端图片 */}
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden border",
                      isVideoWorkspace
                        ? "rounded-xl border-border/60 bg-background/80"
                        : "rounded-lg bg-muted/50"
                    )}
                  >
                    <FileImage className="h-6 w-6 text-muted-foreground/40" />
                  </div>

                  {/* 信息 */}
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm truncate",
                      project.id === currentId && "text-primary"
                    )}>
                      {project.title || `未命名${workspaceLabel}`}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(project.updatedAt), {
                        addSuffix: true,
                        locale: zhCN
                      })}
                    </p>
                  </div>

                  {/* 删除按钮 */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 text-muted-foreground hover:text-destructive transition-opacity",
                      isVideoWorkspace
                        ? "opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )}
                    onClick={(e) => handleDelete(e, project.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}

              {hasMore ? (
                <Button
                  className="mt-3 w-full"
                  disabled={isLoadingMore}
                  onClick={() => loadProjects(page + 1, true)}
                  size="sm"
                  variant="outline"
                >
                  {isLoadingMore ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  加载更多
                </Button>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground/50">
                  到底了
                </div>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
