// Modified for standalone community distribution; see NOTICE.
const REDACTED = "[REDACTED]";
const MAX_STRING_LENGTH = 240;

const SENSITIVE_KEY_PATTERN =
  /(authorization|cookie|password|secret|token|apikey|api_key|accesskey|access_key|clientsecret|client_secret|credential|prompt|session|csrf|code)/i;
const URL_KEY_PATTERN = /(url|uri|endpoint|origin|href|src|thumbnail|avatar|file)/i;
const DATA_URL_PATTERN = /^data:[^;]+;base64,/i;
const EMBEDDED_DATA_URL_PATTERN = /data:[^;,\s]+;base64,[A-Za-z0-9+/=_-]+/gi;
const EMBEDDED_URL_PATTERN = /https?:\/\/[^\s"'<>),]+/gi;
const EMBEDDED_SECRET_PATTERN =
  /\b(token|api[_-]?key|secret|password|authorization|cookie|csrf|code)\s*[:=]\s*([^\s,;]+)/gi;
const LONG_BASE64_PATTERN = /^[A-Za-z0-9+/=_-]{120,}$/;

export type RedactedValue =
  | null
  | boolean
  | number
  | string
  | RedactedValue[]
  | { [key: string]: RedactedValue };

function hashString(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

export function redactUrl(value: string) {
  try {
    const parsed = new URL(value);
    return `${parsed.origin}${parsed.pathname ? "/..." : ""}#${hashString(value)}`;
  } catch {
    return `[url#${hashString(value)}]`;
  }
}

function redactString(value: string, key?: string) {
  if (!value) return value;
  if (key && SENSITIVE_KEY_PATTERN.test(key)) return REDACTED;
  if (DATA_URL_PATTERN.test(value)) return `[base64:${value.length}]`;
  if (LONG_BASE64_PATTERN.test(value)) return `[base64:${value.length}]`;
  if (/^https?:\/\//i.test(value)) return redactUrl(value);
  if (key && URL_KEY_PATTERN.test(key)) return redactUrl(value);
  const redacted = value
    .replace(EMBEDDED_DATA_URL_PATTERN, (match) => `[base64:${match.length}]`)
    .replace(EMBEDDED_URL_PATTERN, (match) => redactUrl(match))
    .replace(EMBEDDED_SECRET_PATTERN, "$1: [REDACTED]");
  if (redacted.length > MAX_STRING_LENGTH) {
    return `${redacted.slice(0, MAX_STRING_LENGTH)}...[${redacted.length}]`;
  }
  return redacted;
}

export function redactValue(value: unknown, key?: string, depth = 0): RedactedValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return redactString(value, key);
  if (typeof value === "number" || typeof value === "boolean") return value;
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "symbol" || typeof value === "function") {
    return `[${typeof value}]`;
  }
  if (value instanceof Error) {
    return {
      name: value.name,
      message: redactString(value.message),
    };
  }
  if (value instanceof URL) return redactUrl(value.toString());
  if (value instanceof Date) return value.toISOString();
  if (depth > 5) return "[MaxDepth]";
  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redactValue(item, key, depth + 1));
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 60);
    return Object.fromEntries(
      entries.map(([entryKey, entryValue]) => [
        entryKey,
        SENSITIVE_KEY_PATTERN.test(entryKey)
          ? REDACTED
          : redactValue(entryValue, entryKey, depth + 1),
      ])
    );
  }
  return String(value);
}

export function redactLogArgs(args: unknown[]) {
  if (args.length === 0) return undefined;
  if (args.length === 1) return redactValue(args[0]);
  return args.map((arg) => redactValue(arg));
}
