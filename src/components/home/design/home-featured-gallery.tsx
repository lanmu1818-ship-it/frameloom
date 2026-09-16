// Modified for standalone community distribution; see NOTICE.
import { Gem, Heart, Loader2, PlayCircle } from "lucide-react";
import type { Ref } from "react";
import type { FeaturedImage } from "@/src/components/home/design/types";

type HomeFeaturedGalleryProps = {
  activeCategory: string;
  categories: string[];
  featuredItems: FeaturedImage[];
  featuredLoadMoreRef: Ref<HTMLDivElement>;
  featuredSectionRef: Ref<HTMLElement>;
  isLoadingFeatured: boolean;
  isLoadingMoreFeatured: boolean;
  setActiveCategory: (category: string) => void;
};

export function HomeFeaturedGallery({
  activeCategory,
  categories,
  featuredItems,
  featuredLoadMoreRef,
  featuredSectionRef,
  isLoadingFeatured,
  isLoadingMoreFeatured,
  setActiveCategory,
}: HomeFeaturedGalleryProps) {
  return (
    <section ref={featuredSectionRef} className="mt-[70px]">
      <h2 className="text-[18px] font-semibold leading-none tracking-[-0.01em] text-[#1f1f1f] dark:text-white">
        灵感发现
      </h2>

      <div className="mt-[18px] flex flex-wrap items-center gap-x-[24px] gap-y-2">
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setActiveCategory(category)}
            className={`h-[30px] rounded-[8px] px-[13px] text-[13px] font-normal leading-none transition ${
              activeCategory === category
                ? "bg-[#f2f2f2] text-[#202020] dark:bg-[#24242a] dark:text-white"
                : "text-[#5f5f5f] hover:bg-[#f7f7f7] hover:text-[#202020] dark:text-white/55 dark:hover:bg-[#17171b]"
            }`}
          >
            {category}
          </button>
        ))}
      </div>

      {featuredItems.length === 0 ? (
        <div className="mt-[22px] rounded-[10px] border border-dashed border-black/15 bg-[#f7f7f7] p-10 text-center text-[14px] text-black/35 dark:border-white/12 dark:bg-[#141416] dark:text-white/35">
          {isLoadingFeatured ? "灵感内容加载中..." : "当前没有可展示的灵感数据。"}
        </div>
      ) : (
        <div className="mt-[14px] columns-1 gap-[10px] md:columns-2 lg:columns-5">
          {featuredItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => window.open(item.originalUrl || item.thumbnailUrl, "_blank")}
              className="group mb-[24px] block w-full cursor-pointer break-inside-avoid text-left"
            >
              <img
                src={item.thumbnailUrl || item.originalUrl}
                alt={item.prompt || "灵感图"}
                loading="lazy"
                decoding="async"
                className="block h-auto w-full rounded-[6px] bg-[#e8e8e8] object-cover transition-transform duration-300 ease-out will-change-transform group-hover:scale-[1.01] dark:bg-[#1b1c20]"
              />
              <div className="mt-[8px] flex h-[22px] items-center justify-between text-[11px] font-normal leading-none text-[#b8b8b8] dark:text-white/45">
                <div className="flex min-w-0 items-center gap-[6px] pr-2">
                  <span className="flex h-[16px] w-[16px] shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#d8d8d8] text-[8px] font-medium text-white">
                    {(item.user?.name || "C").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="line-clamp-1 text-[13px] font-normal leading-none text-[#4b4b4b] dark:text-white/80">
                    {item.user?.name || "创作者"}
                  </span>
                </div>
                <div className="inline-flex shrink-0 items-center gap-[7px] text-[11px] leading-none">
                  <span className="inline-flex items-center gap-[4px]">
                    <PlayCircle className="h-[11px] w-[11px]" strokeWidth={2} />
                    {(1200 + index * 37).toLocaleString()}
                  </span>
                  <span className="inline-flex items-center gap-[4px]">
                    <Heart className="h-[11px] w-[11px]" strokeWidth={2} />
                    {(20 + (index % 9) * 11).toLocaleString()}
                  </span>
                  <Gem className="h-[11px] w-[11px]" strokeWidth={2} />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      <div ref={featuredLoadMoreRef} className="mt-3 flex h-10 items-center justify-center">
        {isLoadingMoreFeatured ? (
          <div className="inline-flex items-center gap-2 text-sm text-black/45 dark:text-white/45">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            正在加载更多灵感...
          </div>
        ) : null}
      </div>
    </section>
  );
}
