// Modified for standalone community distribution; see NOTICE.
import { ArrowRight } from "lucide-react";
import { cn } from "@/src/lib/utils";
import {
  DEFAULT_HOME_QUICK_START_ITEMS,
  type HomeQuickStartItem,
} from "@/src/lib/home/home-quick-start-config";

type HomeQuickStartSectionProps = {
  items?: HomeQuickStartItem[];
  onStart: (prompt: string) => void;
  tone?: "light" | "dark";
};

export function HomeQuickStartSection({
  items,
  onStart,
  tone = "dark",
}: HomeQuickStartSectionProps) {
  const isDark = tone !== "light";
  const visibleItems = (items?.length ? items : DEFAULT_HOME_QUICK_START_ITEMS)
    .filter((item) => item.enabled !== false)
    .slice(0, 5);

  return (
    <section className="mt-[90px]">
      <h2
        className={cn(
          "mb-[16px] text-[18px] font-semibold leading-none",
          isDark ? "text-white" : "text-[#171a22]"
        )}
      >
        快速开始
      </h2>

      <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-5">
        {visibleItems.map((item) => (
          <button
            key={item.id || item.title}
            type="button"
            className={cn(
              "group relative h-[108px] w-full overflow-hidden rounded-[10px] bg-[#191b20] text-left outline-none transition duration-200 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-brand-accent/70",
              isDark
                ? "shadow-[0_10px_22px_rgba(0,0,0,0.24)] hover:shadow-[0_16px_30px_rgba(0,0,0,0.3)]"
                : "shadow-none hover:shadow-none"
            )}
            onClick={() => onStart(item.prompt)}
            aria-label={item.title}
          >
            <img
              src={item.imageUrl}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.045] group-hover:brightness-110"
              style={{ objectPosition: item.position }}
            />
            <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.03)_0%,rgba(0,0,0,0.05)_42%,rgba(0,0,0,0.62)_100%)] transition duration-200 group-hover:bg-[linear-gradient(180deg,rgba(0,0,0,0)_0%,rgba(0,0,0,0.02)_38%,rgba(0,0,0,0.54)_100%)]" />
            <span className="absolute bottom-[12px] left-[14px] right-[12px] flex items-center text-[14px] font-semibold leading-none text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.46)]">
              <span className="min-w-0 truncate">{item.title}</span>
              <ArrowRight className="ml-1.5 h-[14px] w-[14px] shrink-0 transition-transform duration-200 group-hover:translate-x-1" strokeWidth={2.1} />
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
