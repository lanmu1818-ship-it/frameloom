// Modified for standalone community distribution; see NOTICE.
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Boxes, ExternalLink, KeyRound, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/src/components/ui/dialog";
import { apiFetch } from "@/src/client/api";
import { normalizeExternalHttpUrl } from "@/src/lib/utils";
import {
  subscribeProviderApiKeyPrompt,
  type ProviderApiKeyPromptPayload,
  type ProviderApiKeyPromptScopeType,
} from "@/src/client/provider-api-key-prompt";
import { openApiSystemFromCurrentSession } from "@/src/client/api-system-launch";

type ProviderCredentialOption = {
  type: string;
  label: string;
  category: "image" | "video";
  helpText: string;
  apiKeyUrl?: string | null;
};

function getCredentialsEndpoint(scopeType: ProviderApiKeyPromptScopeType) {
  return scopeType === "team"
    ? "/api/team-admin/provider-credentials"
    : "/api/user/provider-credentials";
}

export function ProviderApiKeyPromptProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] =
    useState<Required<ProviderApiKeyPromptPayload> | null>(null);
  const [providerOptions, setProviderOptions] = useState<
    ProviderCredentialOption[]
  >([]);
  const [providerType, setProviderType] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [isOpeningPortal, setIsOpeningPortal] = useState(false);

  useEffect(() => {
    return subscribeProviderApiKeyPrompt((payload) => {
      setPrompt(payload);
      setProviderType(payload.providerType || "");
      setProviderOptions([]);
      setApiKey("");
      setOpen(true);
    });
  }, []);

  useEffect(() => {
    if (!open || !prompt) return;
    if (
      prompt.code === "provider_model_unavailable" ||
      prompt.code === "provider_api_key_model_unavailable" ||
      prompt.code === "provider_api_key_balance_unavailable"
    ) {
      setIsLoadingOptions(false);
      return;
    }

    const scopeType = prompt.scopeType === "team" ? "team" : "personal";
    let disposed = false;
    setIsLoadingOptions(true);
    void apiFetch(getCredentialsEndpoint(scopeType), {
      cache: "no-store",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok || payload?.success !== true) {
          return;
        }
        if (disposed) return;

        const options = Array.isArray(payload.providerOptions)
          ? payload.providerOptions
          : [];
        setProviderOptions(options);
        setProviderType((current) => current || options[0]?.type || "");
      })
      .finally(() => {
        if (!disposed) {
          setIsLoadingOptions(false);
        }
      });

    return () => {
      disposed = true;
    };
  }, [open, prompt]);

  const selectedOption = useMemo(
    () =>
      providerOptions.find((option) => option.type === providerType) ||
      providerOptions.find((option) => option.type === prompt?.providerType),
    [providerOptions, providerType, prompt?.providerType]
  );

  const apiKeyUrl = normalizeExternalHttpUrl(
    selectedOption?.apiKeyUrl || prompt?.apiKeyUrl
  );
  const isTeamScope = prompt?.scopeType === "team";
  const promptCode = prompt?.code || "provider_api_key_required";
  const isModelUnavailable =
    promptCode === "provider_model_unavailable" ||
    promptCode === "provider_api_key_model_unavailable";
  const isBalanceUnavailable =
    promptCode === "provider_api_key_balance_unavailable";
  const isPortalOnlyPrompt = isModelUnavailable || isBalanceUnavailable;
  const settingsScopeLabel =
    isModelUnavailable
      ? "暂无可用模型"
      : isBalanceUnavailable
        ? "额度校验暂不可用"
      : promptCode === "provider_api_key_balance_blocked"
      ? "需要可用的 API Key"
      : promptCode === "provider_api_key_permission_blocked"
        ? "API Key 权限未开通"
      : promptCode === "provider_api_key_invalid"
        ? "API Key 不可用"
        : isTeamScope
          ? "团队 API Key 配置"
          : "API Key 配置";
  const promptMessage =
    isModelUnavailable
      ? "当前账号暂无可用模型，请前往官网查看已开通模型后重试。"
      : isBalanceUnavailable
        ? prompt?.error ||
          "API Key 已验证有效，但服务商暂未返回可确认的可用额度。为避免产生上传费用，本次操作已停止。"
      : prompt?.error ||
        (promptCode === "provider_api_key_balance_blocked"
      ? "当前 API Key 没有可用余额，请前往官网获取或充值可用 API Key 后重试。"
      : promptCode === "provider_api_key_permission_blocked"
        ? "当前 API Key 未开通这个任务通道，请在官网确认 Key 对应的 Base URL 和任务权限后重试。"
      : promptCode === "provider_api_key_invalid"
        ? "当前 API Key 无效或已失效，请重新保存有效 Key。"
        : "请先配置 API Key 后再上传或生成。");
  const canSave = Boolean(apiKey.trim() && !isSaving);

  async function saveProviderApiKey() {
    if (!prompt) return;
    if (!apiKey.trim()) {
      toast.error("请输入 API Key");
      return;
    }

    setIsSaving(true);
    try {
      const scopeType = prompt.scopeType === "team" ? "team" : "personal";
      const response = await apiFetch(getCredentialsEndpoint(scopeType), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerType: providerType || undefined,
          apiKey: apiKey.trim(),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || payload?.success !== true) {
        throw new Error(payload?.error || "API Key 保存失败");
      }

      if (payload?.usageSync?.blocked) {
        toast.error(
          payload.usageSync.error ||
            "API Key 已保存，但当前余额不足或状态不可用，请处理后再上传或生成"
        );
      } else {
        toast.success(
          `API Key 已保存到${isTeamScope ? "团队配置" : "个人配置"}，请重新发起上传或生成`
        );
      }
      setOpen(false);
      setApiKey("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "API Key 保存失败"
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function openProviderPortal() {
    setIsOpeningPortal(true);
    try {
      await openApiSystemFromCurrentSession(apiKeyUrl);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "暂时无法进入 API 官网"
      );
    } finally {
      setIsOpeningPortal(false);
    }
  }

  return (
    <>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[92vw] max-w-[460px] rounded-[20px] border-black/10 bg-white p-0 dark:border-white/10 dark:bg-[#141416] dark:text-white">
          <DialogHeader className="border-b border-black/10 px-5 py-4 dark:border-white/10">
            <DialogTitle className="flex items-center gap-2 text-[16px] font-semibold text-black dark:text-white">
              {isModelUnavailable ? (
                <Boxes className="h-4 w-4" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {settingsScopeLabel}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 px-5 py-4">
            <p className="rounded-[12px] bg-black/[0.04] px-3 py-2 text-[12px] leading-5 text-black/70 dark:bg-white/[0.06] dark:text-white/70">
              {promptMessage}
            </p>

            {isPortalOnlyPrompt ? (
              <div className="flex justify-end">
                <button
                  className="inline-flex h-9 items-center justify-center gap-2 rounded-[12px] bg-[#2f3542] px-3 text-[12px] font-medium text-white transition hover:bg-[#242a36] disabled:opacity-45 dark:bg-white dark:text-black dark:hover:bg-white/88"
                  disabled={isOpeningPortal}
                  onClick={() => void openProviderPortal()}
                  type="button"
                >
                  {isOpeningPortal ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ExternalLink className="h-3.5 w-3.5" />
                  )}
                  {isModelUnavailable ? "去官网查看模型" : "去官网查看额度"}
                </button>
              </div>
            ) : (
              <>
                <div className="grid gap-2">
                  <label className="text-[12px] font-medium text-black/62 dark:text-white/58">
                    API Key
                  </label>
                  <input
                    autoComplete="off"
                    className="h-10 rounded-[12px] border border-black/10 bg-white px-3 text-[13px] text-black outline-none placeholder:text-black/35 focus:border-[#d4551f] dark:border-white/10 dark:bg-[#111115] dark:text-white dark:placeholder:text-white/35"
                    disabled={isLoadingOptions}
                    onChange={(event) => setApiKey(event.currentTarget.value)}
                    placeholder="粘贴从官网获取的 API Key"
                    type="password"
                    value={apiKey}
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    className={
                      promptCode === "provider_api_key_balance_blocked"
                        ? "inline-flex h-9 items-center justify-center gap-2 rounded-[12px] bg-[#2f3542] px-3 text-[12px] font-medium text-white transition hover:bg-[#242a36] dark:bg-white dark:text-black dark:hover:bg-white/88"
                        : "inline-flex h-9 items-center justify-center gap-2 rounded-[12px] border border-black/10 bg-white px-3 text-[12px] font-medium text-black/72 transition hover:bg-black/[0.04] dark:border-white/12 dark:bg-[#111115] dark:text-white/72 dark:hover:bg-white/[0.06]"
                    }
                    disabled={isOpeningPortal}
                    onClick={() => void openProviderPortal()}
                    type="button"
                  >
                    {isOpeningPortal ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-3.5 w-3.5" />
                    )}
                    {promptCode === "provider_api_key_balance_blocked"
                      ? "去官网获取可用 Key"
                      : "去官网获取 Key"}
                  </button>
                  <Button
                    className="h-9 rounded-[12px] bg-[#2f3542] px-4 text-[12px] text-white hover:bg-[#242a36] hover:text-white disabled:opacity-45"
                    disabled={!canSave}
                    onClick={() => void saveProviderApiKey()}
                    type="button"
                  >
                    {isSaving ? (
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    ) : null}
                    {isTeamScope ? "保存团队 Key" : "保存 Key"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
