// Modified for standalone community distribution; see NOTICE.
export type DetailUiTokenVariant = "hero_left" | "hero_right" | "split_bottom";

export interface DetailUiDesignTokens {
  canvas: {
    sectionGap: number;
    sectionRadius: number;
  };
  typography: {
    title: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
      letterSpacing: number;
      color: string;
    };
    subtitle: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
      color: string;
    };
    body: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
      color: string;
    };
    label: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
      color: string;
    };
  };
  badge: {
    backgroundColor: string;
    color: string;
    borderColor: string;
  };
  heroCard: {
    backgroundColor: string;
    borderColor: string;
    shadow: string;
  };
  subtitleCard: {
    backgroundColor: string;
    borderColor: string;
    shadow: string;
    color: string;
  };
  featureTag: {
    primary: { backgroundColor: string; color: string; borderColor: string };
    secondary: { backgroundColor: string; color: string; borderColor: string };
    neutral: { backgroundColor: string; color: string; borderColor: string };
  };
  featureCard: {
    primary: { backgroundColor: string; borderColor: string; shadow: string };
    secondary: { backgroundColor: string; borderColor: string; shadow: string };
    neutral: { backgroundColor: string; borderColor: string; shadow: string };
  };
  table: {
    labelBackground: string;
    labelBorder: string;
    valueBackground: string;
    valueBorder: string;
    sectionShadow: string;
  };
  compare: {
    beforeBackground: string;
    beforeBorder: string;
    beforeColor: string;
    afterBackground: string;
    afterBorder: string;
    afterColor: string;
  };
  proof: {
    backgroundColor: string;
    borderColor: string;
    color: string;
  };
  cta: {
    supportBackground: string;
    supportBorder: string;
    supportColor: string;
    buttonBackground: string;
    buttonBorder: string;
    buttonColor: string;
    bannerBackground: string;
    bannerBorder: string;
    bannerColor: string;
  };
}

const BASE_TOKENS: DetailUiDesignTokens = {
  canvas: {
    sectionGap: 16,
    sectionRadius: 12,
  },
  typography: {
    title: {
      fontSize: 52,
      fontWeight: "700",
      lineHeight: 1.08,
      letterSpacing: 0,
      color: "#0f172a",
    },
    subtitle: {
      fontSize: 28,
      fontWeight: "700",
      lineHeight: 1.18,
      color: "#f8fafc",
    },
    body: {
      fontSize: 18,
      fontWeight: "600",
      lineHeight: 1.34,
      color: "#111827",
    },
    label: {
      fontSize: 14,
      fontWeight: "700",
      lineHeight: 1.15,
      color: "#334155",
    },
  },
  badge: {
    backgroundColor: "rgba(15,23,42,0.82)",
    color: "#f8fafc",
    borderColor: "rgba(255,255,255,0.18)",
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(255,255,255,0.42)",
    shadow: "0 22px 58px rgba(15,23,42,0.18)",
  },
  subtitleCard: {
    backgroundColor: "rgba(30,41,59,0.78)",
    borderColor: "rgba(255,255,255,0.18)",
    shadow: "0 18px 42px rgba(15,23,42,0.18)",
    color: "#f8fafc",
  },
  featureTag: {
    primary: {
      backgroundColor: "rgba(219,234,254,0.96)",
      color: "#1d4ed8",
      borderColor: "rgba(59,130,246,0.24)",
    },
    secondary: {
      backgroundColor: "rgba(237,233,254,0.96)",
      color: "#7c3aed",
      borderColor: "rgba(124,58,237,0.24)",
    },
    neutral: {
      backgroundColor: "rgba(241,245,249,0.96)",
      color: "#334155",
      borderColor: "rgba(148,163,184,0.24)",
    },
  },
  featureCard: {
    primary: {
      backgroundColor: "rgba(255,255,255,0.94)",
      borderColor: "rgba(59,130,246,0.42)",
      shadow: "0 18px 42px rgba(15,23,42,0.12)",
    },
    secondary: {
      backgroundColor: "rgba(248,250,252,0.92)",
      borderColor: "rgba(124,58,237,0.34)",
      shadow: "0 18px 42px rgba(15,23,42,0.10)",
    },
    neutral: {
      backgroundColor: "rgba(248,250,252,0.82)",
      borderColor: "rgba(148,163,184,0.28)",
      shadow: "0 18px 42px rgba(15,23,42,0.10)",
    },
  },
  table: {
    labelBackground: "rgba(241,245,249,0.96)",
    labelBorder: "rgba(148,163,184,0.22)",
    valueBackground: "rgba(255,255,255,0.94)",
    valueBorder: "rgba(59,130,246,0.16)",
    sectionShadow: "0 18px 42px rgba(15,23,42,0.12)",
  },
  compare: {
    beforeBackground: "rgba(255,255,255,0.92)",
    beforeBorder: "rgba(148,163,184,0.20)",
    beforeColor: "#334155",
    afterBackground: "rgba(37,99,235,0.88)",
    afterBorder: "rgba(255,255,255,0.18)",
    afterColor: "#eff6ff",
  },
  proof: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(15,23,42,0.10)",
    color: "#1e293b",
  },
  cta: {
    supportBackground: "rgba(255,255,255,0.88)",
    supportBorder: "rgba(37,99,235,0.14)",
    supportColor: "#0f172a",
    buttonBackground: "rgba(37,99,235,0.94)",
    buttonBorder: "rgba(255,255,255,0.24)",
    buttonColor: "#f8fafc",
    bannerBackground: "rgba(15,23,42,0.74)",
    bannerBorder: "rgba(255,255,255,0.16)",
    bannerColor: "#eff6ff",
  },
};

export function getDetailUiDesignTokens(params: {
  variant: DetailUiTokenVariant;
  screenType?: string;
  isFirstScreen?: boolean;
}) {
  const tokens: DetailUiDesignTokens = JSON.parse(JSON.stringify(BASE_TOKENS));

  if (params.variant === "hero_right") {
    tokens.subtitleCard.backgroundColor = "rgba(37,99,235,0.82)";
    tokens.heroCard.shadow = "0 24px 60px rgba(15,23,42,0.20)";
  }

  if (params.variant === "split_bottom") {
    tokens.featureCard.primary.backgroundColor = "rgba(255,255,255,0.96)";
    tokens.featureCard.secondary.backgroundColor = "rgba(255,255,255,0.94)";
    tokens.featureCard.neutral.backgroundColor = "rgba(255,255,255,0.92)";
    tokens.canvas.sectionGap = 18;
  }

  if (params.screenType === "A") {
    tokens.badge.backgroundColor = "rgba(15,23,42,0.90)";
    tokens.compare.afterBackground = "rgba(15,23,42,0.92)";
  }

  if (params.screenType === "C") {
    tokens.cta.buttonBackground = "rgba(124,58,237,0.94)";
    tokens.cta.buttonBorder = "rgba(255,255,255,0.28)";
  }

  if (params.isFirstScreen) {
    tokens.typography.title.fontSize = 58;
    tokens.heroCard.shadow = "0 28px 70px rgba(15,23,42,0.22)";
  }

  return tokens;
}
