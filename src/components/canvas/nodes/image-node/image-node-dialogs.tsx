// Modified for standalone community distribution; see NOTICE.
"use client";

import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";

interface PromptRegenerateDialogProps {
  isProcessing: boolean;
  nodeId: string;
  onConfirm: () => void;
  onOpenChange: (open: boolean) => void;
  onPromptChange: (value: string) => void;
  open: boolean;
  prompt: string;
}

export function PromptRegenerateDialog({
  isProcessing,
  nodeId,
  onConfirm,
  onOpenChange,
  onPromptChange,
  open,
  prompt,
}: PromptRegenerateDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent
        className="border-slate-200 bg-white opacity-100 shadow-2xl backdrop-blur-none sm:max-w-[560px] dark:border-slate-700 dark:bg-slate-950"
        overlayClassName="bg-black"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            提示词重绘
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-muted-foreground text-sm">
            在保留当前图片主体的基础上，用新提示词生成一张新图。原图不会被覆盖。
          </p>
          <div className="space-y-2">
            <Label htmlFor={`prompt-regenerate-${nodeId}`}>新提示词</Label>
            <Textarea
              className="resize-y border-slate-300 bg-white opacity-100 dark:border-slate-700 dark:bg-slate-950"
              id={`prompt-regenerate-${nodeId}`}
              onChange={(event) => onPromptChange(event.target.value)}
              placeholder="例如：保持主体不变，把背景改成黄昏海边，氛围光影更柔和，细节更丰富"
              rows={6}
              value={prompt}
            />
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)} variant="outline">
            取消
          </Button>
          <Button disabled={isProcessing || !prompt.trim()} onClick={onConfirm}>
            {isProcessing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            开始重绘
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
