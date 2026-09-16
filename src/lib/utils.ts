// Modified for standalone community distribution; see NOTICE.
import type {
  CoreAssistantMessage,
  CoreToolMessage,
  UIMessage,
} from "ai";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { apiFetch } from "@/src/client/api";
import {
  dispatchProviderApiKeyPrompt,
  getProviderApiKeyPromptPayload,
} from "@/src/client/provider-api-key-prompt";
import { ChatSDKError, type ErrorCode } from "@/src/lib/errors";
import {
  getFriendlyRateLimitMessage,
  getUserFacingRequestErrorMessage,
} from "@/src/lib/request-error";
import type { ChatMessage } from "@/src/lib/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeExternalHttpUrl(
  input?: string | null,
  fallback = "https://api.example.com/api/v1/auth/oauth/oidc/start"
) {
  const rawValue = String(input || "").trim();
  const normalizedFallback = String(
    fallback || "https://api.example.com/api/v1/auth/oauth/oidc/start"
  ).trim();
  const candidate =
    rawValue && /^[a-z][a-z\d+\-.]*:\/\//i.test(rawValue)
      ? rawValue
      : rawValue && /^[\w.-]+\.[a-z]{2,}(?:[/:?#].*)?$/i.test(rawValue)
        ? `https://${rawValue.replace(/^\/+/, "")}`
        : normalizedFallback;

  try {
    const url = new URL(candidate);
    if (url.protocol === "https:" || url.protocol === "http:") {
      return url.toString();
    }
  } catch {
    // Fall back below.
  }

  try {
    return new URL(normalizedFallback).toString();
  } catch {
    return "https://api.example.com/api/v1/auth/oauth/oidc/start";
  }
}

export const fetcher = async (url: string) => {
  const response = await apiFetch(url);

  if (!response.ok) {
    const { code, cause, message } = await response.json();
    const error = new ChatSDKError(code as ErrorCode, cause);
    if (typeof message === "string" && message.trim()) {
      error.message = message;
    }
    throw error;
  }

  return response.json();
};

export async function fetchWithErrorHandlers(
  input: RequestInfo | URL,
  init?: RequestInit
) {
  try {
    const response = await apiFetch(input, init);

    if (!response.ok) {
      let payload: any = null;
      let responseText = "";
      try {
        payload = await response.clone().json();
      } catch {
        payload = null;
      }

      if (payload == null) {
        try {
          responseText = (await response.text()).trim();
        } catch {
          responseText = "";
        }
      }

      const code =
        typeof payload?.code === "string" && payload.code.includes(":")
          ? (payload.code as ErrorCode)
          : null;
      const cause = typeof payload?.cause === "string" ? payload.cause : undefined;
      const providerApiKeyPrompt = getProviderApiKeyPromptPayload(
        payload ?? responseText
      );

      if (providerApiKeyPrompt) {
        dispatchProviderApiKeyPrompt(providerApiKeyPrompt);
        const requestError = new Error(
          providerApiKeyPrompt.error || "请先配置 API Key 后再生成。"
        ) as Error & {
          status?: number;
          data?: any;
        };
        requestError.name = "ProviderApiKeyRequiredError";
        requestError.status = response.status;
        requestError.data = {
          ...providerApiKeyPrompt,
          code: providerApiKeyPrompt.code || "provider_api_key_required",
        };
        throw requestError;
      }

      if (code) {
        const error = new ChatSDKError(code, cause);
        if (typeof payload?.message === "string" && payload.message.trim()) {
          error.message = payload.message;
        }
        throw error;
      }

      const fallbackMessage = getUserFacingRequestErrorMessage(
        {
          status: response.status,
          data: payload,
          message: responseText,
        },
        `Request failed with status ${response.status}`,
        {
          rateLimitMessage: getFriendlyRateLimitMessage(),
        }
      );
      const requestError = new Error(fallbackMessage) as Error & {
        status?: number;
        data?: any;
      };
      requestError.name = "RequestError";
      requestError.status = response.status;
      requestError.data =
        payload ??
        (responseText
          ? {
              message: responseText,
            }
          : null);
      throw requestError;
    }

    return response;
  } catch (error: unknown) {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      throw new ChatSDKError("offline:chat");
    }

    throw error;
  }
}

export function getLocalStorage(key: string) {
  if (typeof window !== "undefined") {
    return JSON.parse(localStorage.getItem(key) || "[]");
  }
  return [];
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

type ResponseMessageWithoutId = CoreToolMessage | CoreAssistantMessage;
type ResponseMessage = ResponseMessageWithoutId & { id: string };

export function getMostRecentUserMessage(messages: UIMessage[]) {
  const userMessages = messages.filter((message) => message.role === "user");
  return userMessages.at(-1);
}

export function getDocumentTimestampByIndex(
  documents: Array<{ createdAt: Date | string }>,
  index: number
) {
  if (!documents) {
    return new Date();
  }
  if (index > documents.length) {
    return new Date();
  }

  return documents[index].createdAt;
}

export function getTrailingMessageId({
  messages,
}: {
  messages: ResponseMessage[];
}): string | null {
  const trailingMessage = messages.at(-1);

  if (!trailingMessage) {
    return null;
  }

  return trailingMessage.id;
}

export function sanitizeText(text: string) {
  return text.replace("<has_function_call>", "");
}

export function getTextFromMessage(message: ChatMessage | UIMessage): string {
  return message.parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("");
}

export function toBeijingTime(date: Date | string): Date {
  const d = typeof date === "string" ? new Date(date) : date;
  const utcTime = d.getTime() + d.getTimezoneOffset() * 60 * 1000;
  return new Date(utcTime + 8 * 60 * 60 * 1000);
}

export function formatBeijingTime(
  date: Date | string,
  options?: Intl.DateTimeFormatOptions
): string {
  const beijingTime = toBeijingTime(date);
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Shanghai",
    ...options,
  };
  return beijingTime.toLocaleString("zh-CN", defaultOptions);
}
