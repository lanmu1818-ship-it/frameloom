import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, lstatSync, readdirSync } from "node:fs";
import { resolve, relative, dirname } from "node:path";
import ts from "typescript";

const root = process.cwd();
const issues = [];
// Include untracked publishable files too; never print a matched credential.
let files;
try {
  files = execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean);
} catch {
  const walk = (dir = "") => readdirSync(resolve(root, dir), { withFileTypes: true }).flatMap(entry => {
    if ([".git", "node_modules", "dist"].includes(entry.name)) return [];
    const p = dir ? `${dir}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(p) : [p];
  });
  files = walk();
}
const patterns = [
  [/sk-(?:proj-)?[A-Za-z0-9_-]{24,}/, "API token"],
  [/gh[pousr]_[A-Za-z0-9_]{36,}/, "GitHub token"],
  [/github_pat_[A-Za-z0-9_]{30,}/, "GitHub fine-grained token"],
  [/AKIA[0-9A-Z]{16}/, "AWS credential"],
  [/xox[baprs]-[A-Za-z0-9-]{24,}/, "Slack credential"],
  [/-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/, "Private key"],
  [/\b(?:postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/[^\s]+/i, "Database connection string"],
  [/\b(?:apiKey|secret|password|accessToken)\s*[:=]\s*["'][A-Za-z0-9_./+=-]{20,}["']/i, "Hardcoded credential"],
  [/\/Users\/[A-Za-z0-9_-]+\//, "Personal filesystem path"],
];
const allowedHosts = new Set(["www.w3.org", "api.krea.ai", "developers.openai.com", "vercel.com", "localhost", "127.0.0.1", "local.invalid", "image-proxy.local"]);
const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const deps = new Set(Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }));
for (const file of files) {
  if (!existsSync(file)) { issues.push(`${file}: staged file missing`); continue; }
  const stat = lstatSync(file);
  if (stat.isSymbolicLink()) { issues.push(`${file}: symlink is not allowed`); continue; }
  if (/(^|\/)(node_modules|dist|backend|\.next|artifacts|release)(\/|$)/.test(file) || /(^|\/)\.env(?:\..+)?$/.test(file) && file !== ".env.example" || /\.(pem|key|p12|log|sqlite|db|map)$/.test(file)) issues.push(`${file}: private or generated file`);
  if (stat.size > 5 * 1024 * 1024) issues.push(`${file}: oversized file`);
  const text = readFileSync(file, "utf8");
  text.split(/\r?\n/).forEach((line, index) => {
    for (const [pattern, reason] of patterns) if (pattern.test(line)) issues.push(`${file}:${index + 1}: ${reason}`);
  });
  if (!/^(src|types)\//.test(file) || !/\.[jt]sx?$/.test(file)) continue;
  for (const match of text.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
    const host = match[1].toLowerCase();
    if (!allowedHosts.has(host) && host !== "example.com" && !host.endsWith(".example.com")) issues.push(`${file}: unreviewed network host`);
  }
  const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true);
  const checkImport = spec => {
    if (spec.startsWith("@/") || spec.startsWith(".")) {
      const target = spec.startsWith("@/") ? resolve(root, spec.slice(2)) : resolve(dirname(resolve(file)), spec);
      if (relative(root, target).startsWith("..")) { issues.push(`${file}: import escapes repository`); return; }
      if (!["", ".ts", ".tsx", ".js", ".json", "/index.ts", "/index.tsx"].some(ext => existsSync(target + ext))) issues.push(`${file}: unresolved local import ${spec}`);
    } else {
      const name = spec.startsWith("@") ? spec.split("/").slice(0, 2).join("/") : spec.split("/")[0];
      if (!deps.has(name)) issues.push(`${file}: undeclared dependency ${name}`);
      if (["next", "next-auth", "server-only", "pg", "postgres", "mysql2", "drizzle-orm"].includes(name) || name.startsWith("node:")) issues.push(`${file}: server dependency ${name}`);
    }
  };
  const visit = node => {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteralLike(node.moduleSpecifier)) checkImport(node.moduleSpecifier.text);
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteralLike(node.arguments[0])) checkImport(node.arguments[0].text);
    ts.forEachChild(node, visit);
  };
  visit(source);
}
if (issues.length) { console.error(issues.join("\n")); process.exit(1); }
console.log(`Public source check passed (${files.length} files). Heuristic scan; not a security audit.`);
