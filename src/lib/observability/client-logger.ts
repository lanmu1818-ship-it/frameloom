// Modified for standalone community distribution; see NOTICE.
import { redactLogArgs, redactValue } from "@/src/lib/observability/redaction";

function isClientLoggingEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.NEXT_PUBLIC_ENABLE_CLIENT_LOGS === "true"
  );
}

function normalizeEvent(event: string) {
  return event
    .trim()
    .replace(/^\[[^\]]+\]\s*/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase()
    .slice(0, 80) || "event";
}

const SENSITIVE_EVENT_PATTERN =
  /(authorization|body|cookie|header|image url|messages received|password|prompt|request body|session|token)/i;

function writeClientLog(
  level: "debug" | "info" | "warn" | "error",
  scope: string,
  event: string,
  args: unknown[]
) {
  if (!isClientLoggingEnabled()) return;
  const payload = redactValue({
    level,
    scope,
    event: normalizeEvent(event),
    message: event,
    ...(args.length > 0
      ? {
          meta: SENSITIVE_EVENT_PATTERN.test(event)
            ? { omitted: true, argCount: args.length }
            : redactLogArgs(args),
        }
      : {}),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }
  if (level === "warn") {
    console.warn(payload);
    return;
  }
  console.log(payload);
}

export function createClientLogger(scope: string) {
  return {
    debug(event: string, ...args: unknown[]) {
      writeClientLog("debug", scope, event, args);
    },
    info(event: string, ...args: unknown[]) {
      writeClientLog("info", scope, event, args);
    },
    warn(event: string, ...args: unknown[]) {
      writeClientLog("warn", scope, event, args);
    },
    error(event: string, ...args: unknown[]) {
      writeClientLog("error", scope, event, args);
    },
  };
}
