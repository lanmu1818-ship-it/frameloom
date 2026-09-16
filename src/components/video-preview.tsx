// Modified for standalone community distribution; see NOTICE.
"use client";

import React, { useState } from "react";
import { Download, X } from "lucide-react";

export function VideoPreview({ src, alt }: { src: string; alt?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDownload = async () => {
    try {
      const response = await fetch(src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `generated-video-${Date.now()}.mp4`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("下载失败:", error);
    }
  };

  return (
    <>
      {/* 视频预览 */}
      <div className="group relative inline-block max-w-full">
        <video
          src={src}
          controls
          className="cursor-pointer rounded-lg"
          style={{
            maxWidth: "600px",
            height: "auto",
            width: "100%",
            objectFit: "contain",
          }}
          onClick={() => setIsOpen(true)}
        />

        {/* 底部提示 */}
        <div className="absolute bottom-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
          点击全屏播放
        </div>
      </div>

      {/* 全屏弹窗 */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* 按钮组 */}
          <div className="absolute right-4 top-4 flex gap-2">
            {/* 下载按钮 */}
            <button
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={handleDownload}
              type="button"
              aria-label="下载视频"
            >
              <Download size={24} />
            </button>

            {/* 关闭按钮 */}
            <button
              className="rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
              onClick={() => setIsOpen(false)}
              type="button"
              aria-label="关闭"
            >
              <X size={24} />
            </button>
          </div>

          {/* 全屏视频 */}
          <div
            className="relative max-h-[90vh] max-w-[90vw]"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <video
              src={src}
              controls
              autoPlay
              className="max-h-[90vh] max-w-full rounded-lg"
              style={{ maxWidth: "90vw" }}
            />
          </div>
        </div>
      )}
    </>
  );
}
