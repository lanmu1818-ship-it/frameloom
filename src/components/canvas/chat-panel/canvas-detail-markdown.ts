// Modified for standalone community distribution; see NOTICE.
import type { UiScreenDocument } from "@/src/lib/ui-screen/schema";
import {
  type DetailBriefForm,
  type DetailGenerationMode,
  DETAIL_REVIEW_COUNT,
  type DetailReviewGroup,
  DETAIL_REVIEW_IMAGE_COUNT,
  type DetailReviewPlan,
  splitDetailKeywords,
} from "@/src/components/canvas/chat-panel/canvas-detail-config";

export function buildDetailReviewPlans(params: {
  brief: DetailBriefForm;
  summary?: string;
  language: "zh" | "en";
  count?: number;
}): DetailReviewPlan[] {
  const count = Math.max(1, Math.min(5, Math.round(params.count || DETAIL_REVIEW_COUNT)));
  const audience = params.brief.targetAudience || (params.language === "en" ? "target users" : "目标用户");
  const scenario = params.brief.usageScenario || (params.language === "en" ? "daily life scenario" : "日常场景");
  const coreNeed = params.brief.coreNeed || (params.language === "en" ? "core need" : "核心需求");
  const productName = params.brief.productName || (params.language === "en" ? "the product" : "该产品");
  const expectedResult =
    params.brief.expectedResult || (params.language === "en" ? "clear and reliable improvement" : "效果明显且稳定");
  const riskConcern =
    params.brief.riskConcern || (params.language === "en" ? "quality and usability concerns" : "担心效果不稳定");
  const keywords = splitDetailKeywords(params.brief.coreSellingPoint, 3);
  const firstKeyword = keywords[0] || (params.language === "en" ? "stable performance" : "稳定好用");
  const secondKeyword = keywords[1] || (params.language === "en" ? "easy operation" : "上手简单");
  const thirdKeyword = keywords[2] || (params.language === "en" ? "value for money" : "性价比高");
  const summaryHint = String(params.summary || "").replace(/\s+/g, " ").trim();

  if (params.language === "en") {
    const templates = [
      {
        title: "Real Need Solved",
        reviewText: `I am part of ${audience}. In ${scenario}, my biggest issue was ${coreNeed}. After using ${productName}, the result is ${expectedResult}. It feels ${firstKeyword} and I am willing to repurchase.`,
        imagePrompt: `UGC buyer photo set for ${productName}, scenario: ${scenario}, highlight ${coreNeed} solved, realistic lifestyle composition, clear product details, natural lighting, authentic user-generated look`,
      },
      {
        title: "From Concern to Trust",
        reviewText: `Before purchase I worried about ${riskConcern}. After using it for a while, ${productName} stays ${secondKeyword} and reliable. The overall user experience is much better than expected.`,
        imagePrompt: `UGC buyer experience photo set for ${productName}, before-after feeling in ${scenario}, close-up and handheld usage moments, realistic texture, social proof style, commercial clarity`,
      },
      {
        title: "Conversion Testimonial",
        reviewText: `For users like ${audience}, ${productName} is a practical choice. It balances ${firstKeyword}, ${secondKeyword}, and ${thirdKeyword}. The final outcome is ${expectedResult}.`,
        imagePrompt: `UGC testimonial photo set for ${productName}, mixed angles including scene shot, detail shot and usage shot, trust-driven ecommerce style, clean but real, high conversion mood`,
      },
    ];
    const fallback = templates[templates.length - 1]!;
    return Array.from({ length: count }, (_, index) => {
      const template = templates[index] || fallback;
      const summaryText = summaryHint ? ` ${summaryHint}` : "";
      return {
        index: index + 1,
        title: `${template.title} ${index + 1}`,
        reviewText: `${template.reviewText}${summaryText}`.trim(),
        imagePrompt: template.imagePrompt,
      };
    });
  }

  const templates = [
    {
      title: "真实需求反馈",
      reviewText: `我属于${audience}，在${scenario}里最头疼的是${coreNeed}。用了${productName}后，明显感受到${expectedResult}，整体体验${firstKeyword}，确实值得回购。`,
      imagePrompt: `${productName}买家真实晒单，场景：${scenario}，突出“${coreNeed}被解决”的使用结果，生活化拍摄，真实自然光，产品细节清晰，电商高转化氛围`,
    },
    {
      title: "顾虑消除反馈",
      reviewText: `下单前我最担心${riskConcern}，实际使用后发现${productName}${secondKeyword}，稳定性也不错。连续使用一段时间后效果依旧在线。`,
      imagePrompt: `${productName}买家体验晒单，表达“从担心到放心”的转变，含近景细节、手持使用、场景实拍，真实用户视角，质感干净`,
    },
    {
      title: "转化口碑反馈",
      reviewText: `如果你也是${audience}，并且在${scenario}下有${coreNeed}，这款${productName}真的很合适。它兼顾了${firstKeyword}、${secondKeyword}和${thirdKeyword}，结果就是${expectedResult}。`,
      imagePrompt: `${productName}买家口碑晒单，三张图分别体现场景图、细节图、结果图，构图统一，真实可信，强化转化购买意愿`,
    },
  ];
  const fallback = templates[templates.length - 1]!;
  return Array.from({ length: count }, (_, index) => {
    const template = templates[index] || fallback;
    const summaryText = summaryHint ? ` ${summaryHint}` : "";
    return {
      index: index + 1,
      title: `${template.title}${index + 1}`,
      reviewText: `${template.reviewText}${summaryText}`.trim(),
      imagePrompt: template.imagePrompt,
    };
  });
}

export function buildDetailResultMarkdown(params: {
  generationMode?: DetailGenerationMode;
  summary?: string;
  images: Array<{ originalUrl: string; thumbnailUrl: string }>;
  prompts: string[];
  skillFlow?: {
    name?: string;
    version?: string;
    steps?: string[];
  };
  designSkill?: {
    version?: string;
    name?: string;
    source?: string;
    visualDirection?: string[];
    reviewChecklist?: string[];
  };
  qualityChecks?: {
    passed?: boolean;
    issues?: string[];
  };
  uiValidation?: {
    passed?: boolean;
    issues?: string[];
  };
  brandStyleBoard?: UiScreenDocument | null;
  globalStyle?: {
    designLanguage?: string;
    typography?: {
      fontFamily?: string;
      title?: string;
      subtitle?: string;
      body?: string;
    };
    layout?: {
      grid?: string;
      safeArea?: string;
      rhythm?: string;
    };
    palette?: string;
  };
  screens?: Array<{
    screenType?: "A" | "B" | "C";
    visualPrompt?: string;
    title?: string;
    subtitle?: string;
    copy?: string;
    layoutNote?: string;
    useModel?: boolean;
    modelReason?: string;
    bundleShowcase?: boolean;
    bundleReason?: string;
    fabe?: {
      b?: string;
      f?: string;
      a?: string;
      e?: string;
    };
  }>;
  reviewGroups?: DetailReviewGroup[];
}): string {
  const lines: string[] = [];
  lines.push("### AI详情生成完成");
  if (params.generationMode) {
    lines.push(
      `生成路线：${params.generationMode === "agent_layout" ? "AGENT排版（画面+可编辑文字层）" : "传统生图（整页生图）"}`
    );
  }
  if (params.summary) {
    lines.push(params.summary);
  }
  if (params.brandStyleBoard) {
    lines.push(`品牌 UI 配色板：已先生成「${params.brandStyleBoard.title || "品牌 UI 配色板"}」，后续详情页将沿用这套视觉基准。`);
  }
  if (params.skillFlow?.steps?.length) {
    lines.push(
      `技能流程：${params.skillFlow.name || "AI详情生成"} ${params.skillFlow.version ? `(v${params.skillFlow.version})` : ""}`
    );
    params.skillFlow.steps.forEach((step, index) => {
      lines.push(`${index + 1}. ${step}`);
    });
  }
  if (params.designSkill?.name) {
    lines.push(
      `设计技能：${params.designSkill.name}${params.designSkill.version ? ` (${params.designSkill.version})` : ""}`
    );
    params.designSkill.reviewChecklist?.slice(0, 3).forEach((item) => {
      lines.push(`- ${item}`);
    });
  }
  if (params.qualityChecks) {
    if (params.qualityChecks.passed) {
      lines.push("质检结果：通过");
    } else if (params.qualityChecks.issues?.length) {
      lines.push("质检结果：未通过，已使用回退方案");
      params.qualityChecks.issues.forEach((issue) => lines.push(`- ${issue}`));
    }
  }
  if (params.uiValidation) {
    if (params.uiValidation.passed) {
      lines.push("协议排版校验：通过");
    } else if (params.uiValidation.issues?.length) {
      lines.push("协议排版校验：存在待优化项");
      params.uiValidation.issues.slice(0, 3).forEach((issue) => lines.push(`- ${issue}`));
    }
  }
  lines.push(`共生成 ${params.images.length} 张详情图。`);
  if (params.globalStyle) {
    const typography = params.globalStyle.typography;
    lines.push(`全局风格：${params.globalStyle.designLanguage || "统一电商详情风格"}`);
    lines.push(
      `字体规范：${typography?.fontFamily || "统一字体"} / ${typography?.title || "标题规范一致"} / ${typography?.subtitle || "副标题规范一致"}`
    );
  }
  lines.push("");
  params.images.forEach((image, index) => {
    const screen = params.screens?.[index];
    const prompt = params.prompts[index] || screen?.visualPrompt || "";
    lines.push(`#### 分镜 ${index + 1}`);
    if (screen?.screenType) {
      lines.push(`分镜类型：${screen.screenType}`);
    }
    if (screen?.title) {
      lines.push(`标题：${screen.title}`);
    }
    if (screen?.subtitle) {
      lines.push(`副标题：${screen.subtitle}`);
    }
    if (screen?.copy) {
      lines.push(`文案：${screen.copy}`);
    }
    if (screen?.layoutNote) {
      lines.push(`排版：${screen.layoutNote}`);
    }
    if (screen?.useModel !== undefined) {
      lines.push(screen.useModel ? "人物：使用固定模特图" : "人物：不使用模特图");
    }
    if (screen?.modelReason) {
      lines.push(`人物策略：${screen.modelReason}`);
    }
    if (screen?.bundleShowcase !== undefined) {
      lines.push(screen.bundleShowcase ? "搭配展示：是" : "搭配展示：否");
    }
    if (screen?.bundleReason) {
      lines.push(`搭配策略：${screen.bundleReason}`);
    }
    if (screen?.fabe) {
      const fabeParts = [
        screen.fabe.b ? `B ${screen.fabe.b}` : "",
        screen.fabe.f ? `F ${screen.fabe.f}` : "",
        screen.fabe.a ? `A ${screen.fabe.a}` : "",
        screen.fabe.e ? `E ${screen.fabe.e}` : "",
      ].filter(Boolean);
      if (fabeParts.length > 0) {
        lines.push(`FABE：${fabeParts.join(" | ")}`);
      }
    }
    if (prompt) {
      lines.push(prompt);
    }
    lines.push(
      `![thumb|||${image.originalUrl}|||2K](${image.thumbnailUrl || image.originalUrl})`
    );
    lines.push("");
  });
  if (params.reviewGroups?.length) {
    lines.push("### 买家评价与晒图");
    params.reviewGroups.forEach((group, index) => {
      lines.push(`评价 ${index + 1}：${group.reviewText}`);
      group.images.forEach((image) => {
        lines.push(
          `![thumb|||${image.originalUrl}|||2K](${image.thumbnailUrl || image.originalUrl})`
        );
      });
      lines.push("");
    });
  }
  return lines.join("\n").trim();
}

export function buildDetailReviewAppendMarkdown(params: {
  groups: DetailReviewGroup[];
  failedCount?: number;
}): string {
  const lines: string[] = [];
  lines.push("### 买家评价与晒图已追加");
  lines.push(`本次新增 ${params.groups.length} 条评价，每条 ${DETAIL_REVIEW_IMAGE_COUNT} 张晒图。`);
  if (params.failedCount && params.failedCount > 0) {
    lines.push(`失败 ${params.failedCount} 条，已跳过。`);
  }
  lines.push("");
  params.groups.forEach((group, index) => {
    lines.push(`评价 ${index + 1}：${group.reviewText}`);
    group.images.forEach((image) => {
      lines.push(
        `![thumb|||${image.originalUrl}|||2K](${image.thumbnailUrl || image.originalUrl})`
      );
    });
    lines.push("");
  });
  return lines.join("\n").trim();
}
