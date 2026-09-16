// Modified for standalone community distribution; see NOTICE.
export function buildAgentSceneImageRolePrompt(params: {
  primaryProductImageCount: number;
  bundleProductImageCount: number;
  includeModelImage: boolean;
}) {
  const primaryProductImageCount = Math.max(
    0,
    Math.floor(Number(params.primaryProductImageCount) || 0)
  );
  const bundleProductImageCount = Math.max(
    0,
    Math.floor(Number(params.bundleProductImageCount) || 0)
  );
  const uploadedImageCount =
    primaryProductImageCount +
    bundleProductImageCount +
    (params.includeModelImage ? 1 : 0);
  if (uploadedImageCount <= 0) {
    return "";
  }

  const lines = ["【输入图片角色说明】"];
  const hasPrimaryProductImage = primaryProductImageCount > 0;
  const hasBundleProductImage = bundleProductImageCount > 0;
  const hasModelImage = params.includeModelImage;
  const bundleStartIndex = primaryProductImageCount;
  const modelImageIndex = primaryProductImageCount + bundleProductImageCount;

  const formatRangeLabel = (startIndex: number, count: number) => {
    if (count <= 0) {
      return "";
    }

    if (count === 1) {
      return `图片${startIndex + 1}`;
    }

    return `图片${startIndex + 1}到图片${startIndex + count}`;
  };

  if (hasPrimaryProductImage) {
    lines.push(
      `${formatRangeLabel(0, primaryProductImageCount)}：主SKU白底参考图，用于锁定主产品身份、外观、比例、材质、颜色、结构和细节。`
    );
  }

  if (hasBundleProductImage) {
    lines.push(
      `${formatRangeLabel(bundleStartIndex, bundleProductImageCount)}：搭配SKU白底参考图，用于锁定搭配产品本身的外观与结构。搭配SKU是独立第二产品，只能用于组合展示，不能替代或融合主SKU。`
    );
  }

  if (hasModelImage) {
    lines.push(
      `图片${modelImageIndex + 1}：固定模特图。若画面需要人物，必须复用同一模特，不得替换成其他人物。`
    );
  }

  if (hasPrimaryProductImage) {
    lines.push(
      "主SKU白底图优先级最高。只能换场景，不可换产品本体；必须保持同一产品身份、结构、比例、材质与主色。"
    );
  }
  if (hasBundleProductImage) {
    lines.push(
      "如需展示搭配SKU，结果中必须同时保留主SKU与搭配SKU的独立身份，不得把搭配SKU当成主SKU的另一视角或替代品。"
    );
  }
  lines.push(
    hasModelImage
      ? `如当前场景需要人物，只允许使用图片${modelImageIndex + 1}里的模特；如果不需要人物，则不要强行加入人物。`
      : "如当前请求未附带固定模特图，仅在工作流明确要求人物时再安排辅助人物，且人物不能喧宾夺主。"
  );
  if (hasModelImage) {
    lines.push(
      "固定模特图是人物身份锁定图。允许根据构图调整姿态与视线，但不得换人、换脸或改变人物主体辨识度。"
    );
  }

  return lines.join("\n");
}
