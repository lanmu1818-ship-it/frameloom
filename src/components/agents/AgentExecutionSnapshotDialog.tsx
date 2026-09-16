// Modified for standalone community distribution; see NOTICE.
"use client";

import useSWR from "swr";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { ScrollArea } from "@/src/components/ui/scroll-area";
import { fetcher } from "@/src/lib/utils";
import type { AgentExecutionSnapshot } from "@/types/agent";

interface AgentExecutionSnapshotDialogProps {
  snapshotId?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentExecutionSnapshotDialog({
  snapshotId,
  open,
  onOpenChange,
}: AgentExecutionSnapshotDialogProps) {
  const { data, isLoading } = useSWR<{ success?: boolean; data?: AgentExecutionSnapshot }>(
    open && snapshotId ? `/api/agent-execution-snapshots/${snapshotId}` : null,
    fetcher
  );

  const snapshot = data?.success ? data.data : null;
  const uploadedImageUrls = Array.isArray(snapshot?.requestPayload?.uploadedImageUrls)
    ? snapshot?.requestPayload?.uploadedImageUrls
        .map((item) => String(item || "").trim())
        .filter(Boolean)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background">
        <DialogHeader>
          <DialogTitle>执行快照</DialogTitle>
          <DialogDescription>
            查看本次 Agent 执行时使用的素材图、槽位提示词、参考图与模型。
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !snapshot ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-muted-foreground">
              暂无快照详情
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">Agent</div>
                  <div className="mt-1 font-medium">{snapshot.presetName}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    类型：{snapshot.presetType === "video" ? "视频" : "生图"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    分类：{snapshot.categoryName || "未分类"}
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <div className="text-xs text-muted-foreground">模型</div>
                  <div className="mt-1 font-medium">
                    {snapshot.resolvedModel?.displayName ||
                      snapshot.defaultModel?.displayName ||
                      "未记录"}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    槽位：{snapshot.slotCount} 个
                  </div>
                  <div className="text-sm text-muted-foreground">
                    素材图：{snapshot.requiredUploadCount} 张
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-3">
                <div className="mb-2 text-sm font-medium">本次使用的 3 张素材图</div>
                {uploadedImageUrls.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {uploadedImageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="space-y-1">
                        <img
                          src={url}
                          alt={`素材图 ${index + 1}`}
                          className="h-24 w-24 rounded-lg border object-cover"
                        />
                        <div className="text-center text-xs text-muted-foreground">
                          {index === 0 ? "产品图1" : index === 1 ? "产品图2" : "模特图"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">未记录素材图</div>
                )}
              </div>

              {snapshot.userInputText ? (
                <div className="rounded-xl border p-3">
                  <div className="mb-2 text-sm font-medium">用户补充提示</div>
                  <div className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {snapshot.userInputText}
                  </div>
                </div>
              ) : null}

              <div className="space-y-3">
                <div className="text-sm font-medium">槽位详情</div>
                {snapshot.slots.map((slot, index) => (
                  <div key={`snapshot-slot-${slot.slotIndex}-${index}`} className="rounded-xl border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="font-medium">
                        {slot.title || slot.uploadLabel || `槽位 ${slot.slotIndex + 1}`}
                      </div>
                      <div className="text-xs text-muted-foreground">序号 {slot.slotIndex + 1}</div>
                    </div>
                    <div className="rounded-lg bg-muted/40 p-3 text-sm whitespace-pre-wrap">
                      {slot.promptTemplate}
                    </div>
                    {slot.referenceImageUrls.length > 0 ? (
                      <div className="mt-3">
                        <div className="mb-2 text-xs text-muted-foreground">参考图</div>
                        <div className="flex flex-wrap gap-2">
                          {slot.referenceImageUrls.map((url, imageIndex) => (
                            <img
                              key={`${url}-${imageIndex}`}
                              src={url}
                              alt={`参考图 ${imageIndex + 1}`}
                              className="h-16 w-16 rounded-lg border object-cover"
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
