// Modified for standalone community distribution; see NOTICE.
export type MembershipPlanId = string;

export interface MembershipPlanConfig {
  id: MembershipPlanId;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  monthlyCredits: number;
  dailyFreeCredits: number;
  badge?: string;
  highlighted?: boolean;
  features: string[];
}

export interface MembershipFaqItem {
  question: string;
  answer: string;
}

export interface MembershipModelRow {
  category: string;
  model: string;
  unit: string;
  values: Record<string, string>;
}

export interface MembershipConfig {
  enabled: boolean;
  currency: string;
  defaultPlanId: MembershipPlanId;
  annualDiscountLabel: string;
  plans: MembershipPlanConfig[];
  faqs: MembershipFaqItem[];
  modelRows: MembershipModelRow[];
}

export interface MembershipUserOverrides {
  userPlansById: Record<string, MembershipPlanId>;
  userPlansByEmail: Record<string, MembershipPlanId>;
}

export const defaultMembershipConfig: MembershipConfig = {
  enabled: true,
  currency: "$",
  defaultPlanId: "free",
  annualDiscountLabel: "限时 5 折优惠",
  plans: [
    {
      id: "free",
      name: "Free",
      monthlyPrice: 0,
      annualPrice: 0,
      monthlyCredits: 0,
      dailyFreeCredits: 0,
      features: ["基础模型可用", "社区体验", "可商用"],
    },
    {
      id: "starter",
      name: "Starter",
      monthlyPrice: 19,
      annualPrice: 190,
      monthlyCredits: 2000,
      dailyFreeCredits: 100,
      features: ["访问所有图片模型", "2 个并发任务", "基础充值折扣"],
    },
    {
      id: "basic",
      name: "Basic",
      monthlyPrice: 32,
      annualPrice: 320,
      monthlyCredits: 3500,
      dailyFreeCredits: 100,
      features: ["访问所有图片模型", "4 个并发任务", "充值更优折扣"],
    },
    {
      id: "pro",
      name: "Pro",
      monthlyPrice: 69,
      annualPrice: 690,
      monthlyCredits: 11000,
      dailyFreeCredits: 100,
      badge: "热门",
      features: ["访问所有图片模型", "8 个并发任务", "优先队列与高级折扣"],
    },
    {
      id: "ultimate",
      name: "Ultimate",
      monthlyPrice: 149,
      annualPrice: 1490,
      monthlyCredits: 27000,
      dailyFreeCredits: 100,
      badge: "旗舰版",
      highlighted: true,
      features: ["访问所有图片模型", "10 个并发任务", "最高折扣与极速队列"],
    },
  ],
  faqs: [
    {
      question: "积分是如何使用的？",
      answer: "每次调用模型会按模型单价扣除积分，扣费规则可在下方模型消耗表查看。",
    },
    {
      question: "积分会过期吗？",
      answer: "订阅周期内发放的月度积分随周期重置，充值积分默认长期有效。",
    },
    {
      question: "我的订阅会自动续费吗？",
      answer: "是的，订阅默认自动续费。后续可在支付中心关闭自动续费。",
    },
    {
      question: "可以给团队统一开通吗？",
      answer: "支持团队版，后续会在支付页面开放团队席位配置与发票能力。",
    },
  ],
  modelRows: [
    {
      category: "图片模型",
      model: "Nano Banana Pro 1k",
      unit: "张",
      values: { free: "-", starter: "200", basic: "350", pro: "1100", ultimate: "2700" },
    },
    {
      category: "图片模型",
      model: "Nano Banana Pro 2k",
      unit: "张",
      values: { free: "-", starter: "200", basic: "350", pro: "1100", ultimate: "2700" },
    },
    {
      category: "图片模型",
      model: "Seedream 4.0",
      unit: "张",
      values: { free: "-", starter: "1000", basic: "1750", pro: "5500", ultimate: "13500" },
    },
    {
      category: "视频模型",
      model: "Kling 3.0 Pro",
      unit: "个",
      values: { free: "-", starter: "40", basic: "70", pro: "220", ultimate: "540" },
    },
    {
      category: "视频模型",
      model: "Kling 2.5 Turbo",
      unit: "个",
      values: { free: "-", starter: "200", basic: "350", pro: "1100", ultimate: "2700" },
    },
  ],
};

export const defaultMembershipUserOverrides: MembershipUserOverrides = {
  userPlansById: {},
  userPlansByEmail: {},
};

function toNonEmptyString(value: unknown, fallback = ""): string {
  const normalized = String(value ?? "").trim();
  return normalized || fallback;
}

function toNumber(value: unknown, fallback = 0): number {
  const num = Number(value);
  if (Number.isNaN(num) || num < 0) return fallback;
  return num;
}

export function normalizeMembershipConfig(value: unknown): MembershipConfig {
  if (!value || typeof value !== "object") {
    return defaultMembershipConfig;
  }

  const raw = value as Partial<MembershipConfig>;
  const fallbackPlans = defaultMembershipConfig.plans;

  const plans = Array.isArray(raw.plans)
    ? raw.plans
        .map((plan) => {
          if (!plan || typeof plan !== "object") return null;
          const typed = plan as Partial<MembershipPlanConfig>;
          const id = toNonEmptyString(typed.id);
          if (!id) return null;
          return {
            id,
            name: toNonEmptyString(typed.name, id.toUpperCase()),
            monthlyPrice: toNumber(typed.monthlyPrice, 0),
            annualPrice: toNumber(typed.annualPrice, 0),
            monthlyCredits: toNumber(typed.monthlyCredits, 0),
            dailyFreeCredits: toNumber(typed.dailyFreeCredits, 0),
            badge: toNonEmptyString(typed.badge, ""),
            highlighted: Boolean(typed.highlighted),
            features: Array.isArray(typed.features)
              ? typed.features.map((item) => toNonEmptyString(item)).filter(Boolean)
              : [],
          } satisfies MembershipPlanConfig;
        })
        .filter(Boolean) as MembershipPlanConfig[]
    : [];

  const normalizedPlans = plans.length > 0 ? plans : fallbackPlans;
  const availablePlanIds = new Set(normalizedPlans.map((plan) => plan.id));

  const faqs = Array.isArray(raw.faqs)
    ? raw.faqs
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const typed = item as Partial<MembershipFaqItem>;
          const question = toNonEmptyString(typed.question);
          const answer = toNonEmptyString(typed.answer);
          if (!question || !answer) return null;
          return { question, answer };
        })
        .filter(Boolean) as MembershipFaqItem[]
    : defaultMembershipConfig.faqs;

  const modelRows = Array.isArray(raw.modelRows)
    ? raw.modelRows
        .map((row) => {
          if (!row || typeof row !== "object") return null;
          const typed = row as Partial<MembershipModelRow>;
          const model = toNonEmptyString(typed.model);
          if (!model) return null;
          const values: Record<string, string> = {};
          if (typed.values && typeof typed.values === "object") {
            Object.entries(typed.values).forEach(([key, val]) => {
              values[key] = toNonEmptyString(val);
            });
          }
          return {
            category: toNonEmptyString(typed.category, "图片模型"),
            model,
            unit: toNonEmptyString(typed.unit, "张"),
            values,
          };
        })
        .filter(Boolean) as MembershipModelRow[]
    : defaultMembershipConfig.modelRows;

  const defaultPlanId = toNonEmptyString(raw.defaultPlanId, defaultMembershipConfig.defaultPlanId);

  return {
    enabled: raw.enabled !== false,
    currency: toNonEmptyString(raw.currency, defaultMembershipConfig.currency),
    defaultPlanId: availablePlanIds.has(defaultPlanId)
      ? defaultPlanId
      : defaultMembershipConfig.defaultPlanId,
    annualDiscountLabel: toNonEmptyString(
      raw.annualDiscountLabel,
      defaultMembershipConfig.annualDiscountLabel
    ),
    plans: normalizedPlans,
    faqs: faqs.length > 0 ? faqs : defaultMembershipConfig.faqs,
    modelRows: modelRows.length > 0 ? modelRows : defaultMembershipConfig.modelRows,
  };
}

export function normalizeMembershipUserOverrides(value: unknown): MembershipUserOverrides {
  if (!value || typeof value !== "object") {
    return defaultMembershipUserOverrides;
  }

  const raw = value as Partial<MembershipUserOverrides>;
  const userPlansById: Record<string, MembershipPlanId> = {};
  const userPlansByEmail: Record<string, MembershipPlanId> = {};

  if (raw.userPlansById && typeof raw.userPlansById === "object") {
    Object.entries(raw.userPlansById).forEach(([key, val]) => {
      const id = toNonEmptyString(key);
      const planId = toNonEmptyString(val);
      if (id && planId) userPlansById[id] = planId;
    });
  }

  if (raw.userPlansByEmail && typeof raw.userPlansByEmail === "object") {
    Object.entries(raw.userPlansByEmail).forEach(([key, val]) => {
      const email = toNonEmptyString(key).toLowerCase();
      const planId = toNonEmptyString(val);
      if (email && planId) userPlansByEmail[email] = planId;
    });
  }

  return {
    userPlansById,
    userPlansByEmail,
  };
}

export function getMembershipPlanById(config: MembershipConfig, planId: string): MembershipPlanConfig {
  return (
    config.plans.find((plan) => plan.id === planId) ||
    config.plans.find((plan) => plan.id === config.defaultPlanId) ||
    config.plans[0] ||
    defaultMembershipConfig.plans[0]
  );
}

export function resolveMembershipPlanIdForUser(
  userId: string,
  email: string | null | undefined,
  config: MembershipConfig,
  overrides: MembershipUserOverrides
): MembershipPlanId {
  const normalizedEmail = toNonEmptyString(email).toLowerCase();
  const byUserId = overrides.userPlansById[userId];
  const byEmail = normalizedEmail ? overrides.userPlansByEmail[normalizedEmail] : "";
  const availablePlanIds = new Set(config.plans.map((plan) => plan.id));
  const resolved = byUserId || byEmail || config.defaultPlanId;
  return availablePlanIds.has(resolved) ? resolved : config.defaultPlanId;
}
