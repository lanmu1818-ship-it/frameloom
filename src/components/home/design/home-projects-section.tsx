// Modified for standalone community distribution; see NOTICE.
import { ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import type { Ref } from "react";
import { cn } from "@/src/lib/utils";
import type { CanvasProject } from "@/src/components/home/design/types";
import { formatRelativeTime } from "@/src/components/home/design/utils";

type HomeProjectsSectionProps = {
  deletingProjectId: string | null;
  hasMoreProjects: boolean;
  isProjectsOnlyView: boolean;
  onCreateProject: () => void;
  onDeleteProject: (projectId: string, projectTitle?: string) => void;
  onOpenProject: (projectId: string) => void;
  onViewAllProjects: () => void;
  projects: CanvasProject[];
  projectSectionRef: Ref<HTMLElement>;
  tone?: "light" | "dark";
};

export function HomeProjectsSection({
  deletingProjectId,
  hasMoreProjects,
  isProjectsOnlyView,
  onCreateProject,
  onDeleteProject,
  onOpenProject,
  onViewAllProjects,
  projects,
  projectSectionRef,
  tone = "dark",
}: HomeProjectsSectionProps) {
  const shouldShowEmptyRecentProject =
    !isProjectsOnlyView && projects.length === 0;
  const isDark = tone !== "light";

  return (
    <section
      ref={projectSectionRef}
      className={isProjectsOnlyView ? "mt-8" : "mt-[58px]"}
    >
      <div className="mb-[19px] flex items-center justify-between">
        <h2
          className={cn(
            "text-[18px] font-semibold leading-none tracking-normal",
            isDark ? "text-white" : "text-[#171a22]"
          )}
        >
          {isProjectsOnlyView ? "所有项目" : "最近项目"}
        </h2>
        {!isProjectsOnlyView && hasMoreProjects ? (
          <button
            type="button"
            className={cn(
              "inline-flex items-center gap-[6px] text-[14px] font-normal leading-none transition",
              isDark
                ? "text-white/42 hover:text-white"
                : "text-[#6b7280] hover:text-[#111827]"
            )}
            onClick={onViewAllProjects}
          >
            查看全部
            <ChevronRight className="h-[16px] w-[16px]" strokeWidth={1.8} />
          </button>
        ) : null}
      </div>

      <div className="grid grid-cols-1 items-start gap-x-[18px] gap-y-[30px] sm:grid-cols-2 lg:grid-cols-5">
        <button
          type="button"
          onClick={onCreateProject}
          className="group block w-full cursor-pointer appearance-none bg-transparent p-0 text-left"
        >
          <div
            className={cn(
              "flex aspect-[16/9] items-center justify-center rounded-[10px] border transition duration-200 group-hover:-translate-y-0.5",
              isDark
                ? "border-white/[0.035] bg-[#17181d] group-hover:border-white/[0.075] group-hover:bg-[#1f2027]"
                : "border-black/[0.055] bg-white/75 group-hover:border-black/[0.1] group-hover:bg-white"
            )}
          >
            <Plus
              className={cn(
                "h-[24px] w-[24px] transition duration-200 group-hover:scale-110",
                isDark
                  ? "text-[#777d8d] group-hover:text-white/75"
                  : "text-[#9aa3b2] group-hover:text-[#4b5563]"
              )}
              strokeWidth={1.9}
            />
          </div>
          <div
            className={cn(
              "mt-[12px] text-[14px] font-semibold leading-none tracking-normal",
              isDark ? "text-white" : "text-[#171a22]"
            )}
          >
            新建项目
          </div>
        </button>

        {projects.map((item) => (
          <div
            key={item.id}
            className="group relative w-full text-left"
          >
            <button
              type="button"
              onClick={() => onOpenProject(item.id)}
              className="block w-full cursor-pointer text-left"
            >
              <div
                className={cn(
                  "aspect-[16/9] overflow-hidden rounded-[10px] border transition duration-200 group-hover:-translate-y-0.5",
                  isDark
                    ? "border-white/[0.035] bg-[#202229] group-hover:border-white/[0.075] group-hover:bg-[#262832]"
                    : "border-black/[0.055] bg-white/80 group-hover:border-black/[0.1] group-hover:bg-white"
                )}
              >
                {item.thumbnail ? (
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.025]"
                  />
                ) : (
                  <div className="h-full w-full" />
                )}
              </div>
              <div
                className={cn(
                  "mt-[12px] truncate text-[14px] font-semibold leading-none tracking-normal",
                  isDark ? "text-white" : "text-[#171a22]"
                )}
              >
                {item.title || "未命名项目"}
              </div>
              <div className="mt-[8px] text-[12px] font-normal leading-none text-[#8e8e8e] dark:text-white/35">
                {formatRelativeTime(item.updatedAt || item.createdAt)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onDeleteProject(item.id, item.title)}
              disabled={deletingProjectId === item.id}
              className="absolute right-2.5 top-2.5 z-20 inline-flex h-7 w-7 items-center justify-center rounded-full border border-black/10 bg-white/90 text-black/45 opacity-0 shadow-sm transition hover:border-[#ffb4b4] hover:text-[#ef4444] group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-80 dark:border-white/10 dark:bg-[#18181c]/90 dark:text-white/45"
              aria-label={`删除${item.title || "未命名画布"}`}
            >
              {deletingProjectId === item.id ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        ))}

        {shouldShowEmptyRecentProject ? (
          <button
            type="button"
            onClick={onCreateProject}
            className="group block w-full cursor-pointer appearance-none bg-transparent p-0 text-left"
          >
            <div
              className={cn(
                "aspect-[16/9] rounded-[10px] border transition duration-200 group-hover:-translate-y-0.5",
                isDark
                  ? "border-white/[0.035] bg-[#202229] group-hover:border-white/[0.075] group-hover:bg-[#262832]"
                  : "border-black/[0.055] bg-white/80 group-hover:border-black/[0.1] group-hover:bg-white"
              )}
            />
            <div
              className={cn(
                "mt-[12px] truncate text-[14px] font-semibold leading-none tracking-normal",
                isDark ? "text-white" : "text-[#171a22]"
              )}
            >
              未命名项目
            </div>
          </button>
        ) : null}
      </div>
    </section>
  );
}
