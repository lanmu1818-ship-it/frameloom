// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/src/components/ui/popover";
import { cn } from "@/src/lib/utils";

interface SearchableSelectProps {
  value: string;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  onValueChange: (value: string) => void;
  theme?: "light" | "dark";
  disabled?: boolean;
}

export function SearchableSelect({
  value,
  options,
  placeholder,
  searchPlaceholder = "输入关键字搜索",
  emptyText = "暂无可选项",
  onValueChange,
  theme = "light",
  disabled = false,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const isDark = theme === "dark";

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return options;
    return options.filter((item) => item.toLowerCase().includes(normalizedQuery));
  }, [options, query]);

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-10 w-full justify-between px-3 text-left font-normal",
            disabled && "cursor-not-allowed opacity-60",
            !isDark &&
              "border-slate-200 bg-white text-slate-900 shadow-sm hover:bg-slate-50 hover:text-slate-900",
            isDark &&
              "h-12 rounded-2xl border-white/14 bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:bg-white/[0.08] hover:text-white"
          )}
          disabled={disabled}
        >
          <span
            className={cn(
              "truncate",
              value
                ? isDark
                  ? "text-white"
                  : "text-foreground"
                : isDark
                  ? "text-white/42"
                  : "text-muted-foreground"
            )}
          >
            {value || placeholder}
          </span>
          <ChevronsUpDown
            className={cn("h-4 w-4", isDark ? "text-white/38" : "text-muted-foreground")}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={cn(
          "w-[var(--radix-popover-trigger-width)] p-3",
          !isDark && "border-slate-200 bg-white text-slate-900 shadow-xl",
          isDark && "border-white/12 bg-[#0c0f11]/98 text-white backdrop-blur-xl"
        )}
      >
        <div className="space-y-3">
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={searchPlaceholder}
            disabled={disabled}
            className={cn(
              !isDark &&
                "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-slate-300/80 focus-visible:ring-offset-0",
              isDark &&
                "border-white/12 bg-white/[0.04] text-white placeholder:text-white/28 focus-visible:ring-emerald-400/30 focus-visible:ring-offset-0"
            )}
          />
          <div
            className={cn(
              "max-h-64 overflow-y-auto overscroll-contain pr-1",
              isDark && "agent-dark-scrollbar"
            )}
          >
            <div className="space-y-1">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((item) => {
                  const selected = item === value;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        onValueChange(item);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors",
                        selected
                          ? isDark
                            ? "bg-emerald-500/15 text-emerald-300"
                            : "bg-primary/10 text-primary"
                          : isDark
                            ? "text-white/72 hover:bg-white/8 hover:text-white"
                            : "hover:bg-muted"
                      )}
                    >
                      <span className="truncate">{item}</span>
                      {selected ? <Check className="h-4 w-4" /> : null}
                    </button>
                  );
                })
              ) : (
                <div
                  className={cn(
                    "px-3 py-6 text-center text-sm",
                    isDark ? "text-white/35" : "text-muted-foreground"
                  )}
                >
                  {emptyText}
                </div>
              )}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
