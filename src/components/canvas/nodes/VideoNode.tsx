// Modified for standalone community distribution; see NOTICE.
"use client";

import React, { useMemo, useRef, useState } from "react";
import { Video, Loader2, AlertCircle, MoreVertical, Download, Trash2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { CanvasToolbarIcon } from "@/src/components/canvas/CanvasToolbarIcon";
import { Button } from "@/src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { Slider } from "@/src/components/ui/slider";
import { AgentExecutionSnapshotDialog } from "@/src/components/agents/AgentExecutionSnapshotDialog";
import { toast } from "sonner";
import {
  getNodeContentScale,
  getScaledNodeContentStyle,
} from "@/src/lib/canvas/node-content-scale";
import {
  getCanvasToolbarItem,
  type CanvasToolbarConfig,
} from "@/src/lib/canvas-toolbar-config";
import { useCanvasStore } from "@/src/store/canvas/index";
import type { CanvasNode, VideoNodeData } from "@/types/canvas/index";
import { apiFetch } from "@/src/client/api";
import { cn } from "@/src/lib/utils";

interface VideoNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  canvasToolbarConfig?: CanvasToolbarConfig;
}

export function VideoNode({
  node,
  isSelected,
  canvasToolbarConfig,
}: VideoNodeProps) {
  const data = node.data as VideoNodeData;
  const videoUploadItem = getCanvasToolbarItem(canvasToolbarConfig, "videoUpload");
  const videoPlayItem = getCanvasToolbarItem(canvasToolbarConfig, "videoPlay");
  const videoPauseItem = getCanvasToolbarItem(canvasToolbarConfig, "videoPause");
  const videoMuteItem = getCanvasToolbarItem(canvasToolbarConfig, "videoMute");
  const videoUnmuteItem = getCanvasToolbarItem(canvasToolbarConfig, "videoUnmute");
  const videoMoreItem = getCanvasToolbarItem(canvasToolbarConfig, "videoMore");
  const videoDownloadItem = getCanvasToolbarItem(canvasToolbarConfig, "videoDownload");
  const videoDeleteItem = getCanvasToolbarItem(canvasToolbarConfig, "videoDelete");
  const contentScale = useMemo(
    () =>
      getNodeContentScale(node.size, {
        width: 240,
        height: 220,
      }),
    [node.size.height, node.size.width]
  );
  const scaledContentStyle = useMemo(
    () => getScaledNodeContentStyle(contentScale),
    [contentScale]
  );
  const agentExecutionSnapshotId =
    typeof data.metadata?.agentExecutionSnapshotId === "string"
      ? data.metadata.agentExecutionSnapshotId.trim()
      : "";
  const shortAgentExecutionSnapshotId = agentExecutionSnapshotId
    ? agentExecutionSnapshotId.slice(0, 8)
    : "";
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const videoPlaybackItem = isPlaying ? videoPauseItem : videoPlayItem;
  const videoAudioItem = isMuted ? videoUnmuteItem : videoMuteItem;
  const [progress, setProgress] = useState(0);
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);

  const updateNode = useCanvasStore((state) => state.updateNode);
  const deleteNode = useCanvasStore((state) => state.deleteNode);

  // 处理视频上传 - 上传到服务器获取 URL
  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件大小（限制 100MB）
    if (file.size > 100 * 1024 * 1024) {
      toast.error("视频文件不能超过 100MB");
      return;
    }

    // 更新状态为上传中
    updateNode(node.id, {
      data: { ...data, status: 'generating' },
    });

    try {
      // 上传视频到服务器
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch('/api/video/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();

      // 使用服务器返回的 URL
      updateNode(node.id, {
        data: { ...data, src: result.url, status: 'completed' },
      });

      toast.success('视频上传成功');
    } catch (error) {
      console.error('视频上传失败:', error);
      toast.error('视频上传失败，请重试');
      updateNode(node.id, {
        data: { ...data, status: 'failed' },
      });
    }
  };

  // 播放/暂停
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // 静音/取消静音
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // 更新进度
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const progress = (videoRef.current.currentTime / videoRef.current.duration) * 100;
      setProgress(progress);
    }
  };

  // 跳转进度
  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      const time = (value[0] / 100) * videoRef.current.duration;
      videoRef.current.currentTime = time;
      setProgress(value[0]);
    }
  };

  // 下载视频
  const handleDownload = () => {
    if (data.src) {
      const link = document.createElement('a');
      link.href = data.src;
      link.download = `video-${node.id}.mp4`;
      link.click();
    }
  };

  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-[24px] border border-[#dbe2ee] bg-white shadow-[0_0_0_1px_rgba(219,226,238,0.34),0_16px_34px_rgba(22,24,29,0.08)] dark:border-zinc-800 dark:bg-zinc-950",
        isSelected
          ? "border-brand-selection ring-2 ring-brand-selection/14 shadow-[0_0_0_1px_rgb(var(--brand-accent-rgb)/0.14),0_20px_38px_rgb(var(--brand-accent-rgb)/0.12)]"
          : "hover:border-[#cfd9ea]"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative h-full w-full" style={scaledContentStyle}>
      {/* 视频内容 */}
      {data.src ? (
        <div className="relative w-full h-full">
          <video
            ref={videoRef}
            src={data.src}
            className="h-full w-full bg-slate-950 object-cover"
            muted={isMuted}
            loop
            onTimeUpdate={handleTimeUpdate}
            onEnded={() => setIsPlaying(false)}
          />

          {/* 播放控制层 */}
          {isHovered && (
            <div className="absolute inset-0 flex flex-col justify-end">
              {/* 中央播放按钮 */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white bg-white text-[#16181d] shadow-[0_12px_26px_rgba(0,0,0,0.28)] hover:bg-white"
                onClick={togglePlay}
                title={videoPlaybackItem.label}
              >
                {isPlaying ? (
                  <CanvasToolbarIcon
                    className="h-6 w-6"
                    fallback={Pause}
                    item={videoPauseItem}
                  />
                ) : (
                  <CanvasToolbarIcon
                    className="ml-1 h-6 w-6"
                    fallback={Play}
                    item={videoPlayItem}
                  />
                )}
              </Button>

              {/* 底部控制栏 */}
              <div className="m-3 space-y-2 rounded-[20px] border border-[#dbe2ee] bg-white p-3 shadow-[0_0_0_1px_rgba(219,226,238,0.26)]">
                {/* 进度条 */}
                <Slider
                  value={[progress]}
                  onValueChange={handleSeek}
                  max={100}
                  step={0.1}
                  className="cursor-pointer"
                />

                {/* 控制按钮 */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#3f4b63] hover:bg-[#f4f7ff]"
                      onClick={togglePlay}
                      title={videoPlaybackItem.label}
                    >
                      {isPlaying ? (
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={Pause}
                          item={videoPauseItem}
                        />
                      ) : (
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={Play}
                          item={videoPlayItem}
                        />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#3f4b63] hover:bg-[#f4f7ff]"
                      onClick={toggleMute}
                      title={videoAudioItem.label}
                    >
                      {isMuted ? (
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={VolumeX}
                          item={videoUnmuteItem}
                        />
                      ) : (
                        <CanvasToolbarIcon
                          className="h-4 w-4"
                          fallback={Volume2}
                          item={videoMuteItem}
                        />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : data.status === 'generating' ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#f7f9fc] px-6 text-center select-none dark:bg-zinc-900">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5f4] bg-white text-[#5b76fe] shadow-[0_0_0_1px_rgba(219,226,238,0.22)]">
            <Loader2 className="h-5 w-5 animate-spin" />
          </span>
          <span className="select-none text-sm font-medium text-[#3f4b63]">生成中...</span>
          {data.progress && (
            <span className="mt-1 text-xs text-[#7a8395] select-none">{data.progress}%</span>
          )}
        </div>
      ) : data.status === 'failed' ? (
        <div className="flex h-full w-full flex-col items-center justify-center bg-[#fff7f8] px-6 text-center select-none dark:bg-red-950/40">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#f2d7dd] bg-white text-[#d24f63] shadow-[0_0_0_1px_rgba(242,215,221,0.22)]">
            <AlertCircle className="h-5 w-5" />
          </span>
          <span className="text-sm font-medium text-[#c84b5e] select-none">生成失败</span>
        </div>
      ) : (
        <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center bg-[#f7f9fc] px-6 text-center transition-colors select-none hover:bg-[#f2f5fb] dark:bg-zinc-900 dark:hover:bg-zinc-800">
          <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-[18px] border border-[#dde5f4] bg-white text-[#5b76fe] shadow-[0_0_0_1px_rgba(219,226,238,0.22)]">
            <CanvasToolbarIcon
              className="h-5 w-5"
              fallback={Video}
              item={videoUploadItem}
            />
          </span>
          <span className="text-sm font-medium text-[#3f4b63] select-none">
            {videoUploadItem.label}
          </span>
          <span className="mt-1 text-xs text-[#7a8395] select-none">添加视频素材、参考视频或结果片段</span>
          <input
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleVideoUpload}
          />
        </label>
      )}

      {/* 悬浮操作栏 */}
      {isHovered && data.src && (
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 rounded-full border border-[#dbe2ee] bg-white text-[#5d687b] shadow-[0_0_0_1px_rgba(219,226,238,0.3)] hover:bg-[#f7f9ff] hover:text-[#16181d]"
                title={videoMoreItem.label}
              >
                <CanvasToolbarIcon
                  className="h-4 w-4"
                  fallback={MoreVertical}
                  item={videoMoreItem}
                />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload}>
                <CanvasToolbarIcon
                  className="mr-2 h-4 w-4"
                  fallback={Download}
                  item={videoDownloadItem}
                />
                {videoDownloadItem.label}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => deleteNode(node.id)}
              >
                <CanvasToolbarIcon
                  className="mr-2 h-4 w-4"
                  fallback={Trash2}
                  item={videoDeleteItem}
                />
                {videoDeleteItem.label}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}

      {shortAgentExecutionSnapshotId ? (
        <button
          type="button"
          onClick={() => setSnapshotDialogOpen(true)}
          className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full border border-[#dbe2ee] bg-white px-2.5 py-1 text-[11px] text-[#556072] shadow-[0_0_0_1px_rgba(219,226,238,0.3)] transition-colors hover:bg-[#f7f9ff] hover:text-[#16181d]"
          title={`执行快照：${agentExecutionSnapshotId}`}
        >
          快照 {shortAgentExecutionSnapshotId}
        </button>
      ) : null}
      <AgentExecutionSnapshotDialog
        snapshotId={agentExecutionSnapshotId || null}
        open={snapshotDialogOpen}
        onOpenChange={setSnapshotDialogOpen}
      />

      {/* 提示词显示 */}
      {data.prompt && isHovered && (
        <div className="absolute bottom-3 left-3 right-3 rounded-[16px] border border-[#dbe2ee] bg-white px-3 py-2 shadow-[0_0_0_1px_rgba(219,226,238,0.26)]">
          <p className="line-clamp-2 text-xs leading-5 text-[#556072]">{data.prompt}</p>
        </div>
      )}
      </div>
    </div>
  );
}
