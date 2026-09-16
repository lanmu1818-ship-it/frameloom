// Modified for standalone community distribution; see NOTICE.
"use client";

import { RotateCcw } from "lucide-react";
import { useEffect, useId, useMemo, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  formatHexColor,
  normalizeOptionalHexColor,
  TEXT_EDIT_COLOR_SWATCHES,
} from "@/src/lib/canvas/text-edit-colors";
import { cn } from "@/src/lib/utils";

interface TextEditColorFieldProps {
  value?: string;
  onChange: (value?: string) => void;
  className?: string;
}

const COLOR_RING_BACKGROUND =
  "conic-gradient(from 180deg, #ef4444, #f59e0b, #84cc16, #22c55e, #14b8a6, #3b82f6, #8b5cf6, #ec4899, #ef4444)";

export function TextEditColorField({
  value,
  onChange,
  className,
}: TextEditColorFieldProps) {
  const inputId = useId();
  const normalizedValue = useMemo(
    () => normalizeOptionalHexColor(value),
    [value]
  );
  const [draftHex, setDraftHex] = useState(() => formatHexColor(value));

  useEffect(() => {
    setDraftHex(formatHexColor(value));
  }, [value]);

  const handleHexCommit = () => {
    const normalized = normalizeOptionalHexColor(draftHex);
    if (!draftHex.trim()) {
      onChange(undefined);
      setDraftHex("");
      return;
    }
    if (normalized) {
      onChange(normalized);
      setDraftHex(normalized.toUpperCase());
      return;
    }
    setDraftHex(formatHexColor(normalizedValue));
  };

  return (
    <div
      className={cn(
        "space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-zinc-800 dark:bg-zinc-900/80",
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <label
            htmlFor={inputId}
            className="font-medium text-[12px] text-slate-700 dark:text-zinc-200"
          >
            文字颜色
          </label>
          <p className="text-[11px] leading-5 text-slate-500 dark:text-zinc-400">
            不选则保持原图文字颜色；选了色号后，后端会明确要求只改这段文字的颜色。
          </p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-[11px] text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          disabled={!normalizedValue}
          onClick={() => onChange(undefined)}
        >
          <RotateCcw className="mr-1 h-3.5 w-3.5" />
          保持原色
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <label
          htmlFor={inputId}
          className="relative block h-11 w-11 shrink-0 cursor-pointer rounded-full shadow-sm"
          title="点击选择文字颜色"
        >
          <span
            className="absolute inset-0 rounded-full"
            style={{ background: COLOR_RING_BACKGROUND }}
          />
          <span
            className="absolute inset-[4px] rounded-full border border-white/90 shadow-inner"
            style={{
              backgroundColor: normalizedValue || "#ffffff",
            }}
          />
          <input
            id={inputId}
            type="color"
            value={normalizedValue || "#22c55e"}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>

        <Input
          value={draftHex}
          onChange={(event) => setDraftHex(event.target.value)}
          onBlur={handleHexCommit}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              handleHexCommit();
            }
          }}
          placeholder="#22C55E"
          maxLength={7}
          className="h-10"
        />
      </div>

      <div className="grid grid-cols-7 gap-2">
        {TEXT_EDIT_COLOR_SWATCHES.map((color) => {
          const isActive = normalizedValue === color;
          return (
            <button
              key={color}
              type="button"
              aria-label={`选择 ${color.toUpperCase()}`}
              className={cn(
                "h-7 rounded-full border transition-transform hover:scale-[1.04]",
                isActive
                  ? "border-slate-900 ring-2 ring-slate-300 dark:border-white dark:ring-zinc-700"
                  : "border-slate-200 dark:border-zinc-700"
              )}
              style={{ backgroundColor: color }}
              onClick={() => onChange(color)}
            />
          );
        })}
      </div>
    </div>
  );
}
