import assert from "node:assert/strict";
import test from "node:test";
import { normalizePublicApiBaseUrl, getPublicApiRuntimeConfig, isPublicApiRuntimeConfigLocked, setPublicApiRuntimeConfig } from "../src/runtime/public-api-config";

test("fresh open-source install has no production service or client credential", () => {
  assert.equal(getPublicApiRuntimeConfig().apiBaseUrl, "");
  assert.equal(getPublicApiRuntimeConfig().desktopApiKey, "");
  assert.equal(isPublicApiRuntimeConfigLocked(), false);
});

test("normalizes API roots and rejects non-HTTP schemes", () => {
  assert.equal(normalizePublicApiBaseUrl(" https://backend.example.com/api/?x=1#fragment "), "https://backend.example.com");
  assert.equal(normalizePublicApiBaseUrl("http://localhost:3000/api"), "http://localhost:3000");
  for (const input of ["", "not a URL", "javascript:alert(1)", "file:///tmp/demo"]) assert.equal(normalizePublicApiBaseUrl(input), "");
});

test("custom backend remains configurable in production builds", () => {
  setPublicApiRuntimeConfig({ apiBaseUrl: "https://backend.example.com", apiClientName: "test-client" });
  assert.equal(getPublicApiRuntimeConfig().apiBaseUrl, "https://backend.example.com");
  assert.equal(getPublicApiRuntimeConfig().apiClientName, "test-client");
  setPublicApiRuntimeConfig({});
});
