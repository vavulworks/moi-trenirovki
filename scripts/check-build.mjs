import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import assert from "node:assert/strict";
const dir = resolve(process.argv[2] || "dist"),
  base = process.argv[3] || "/";
const html = readFileSync(join(dir, "index.html"), "utf8"),
  sw = readFileSync(join(dir, "sw.js"), "utf8"),
  manifest = JSON.parse(
    readFileSync(join(dir, "manifest.webmanifest"), "utf8"),
  );
assert.equal(manifest.scope, ".");
assert.equal(manifest.start_url, ".");
assert.equal(manifest.lang, "ru");
const cached = new Set([...sw.matchAll(/url:"([^"]+)"/g)].map((m) => m[1]));
for (const f of readdirSync(join(dir, "assets")))
  assert(cached.has("assets/" + f), "Asset missing from precache: " + f);
for (const f of [
  "index.html",
  "manifest.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png",
])
  assert(cached.has(f), "Not cached: " + f);
for (const f of cached) {
  assert(
    !f.startsWith("/") && !f.startsWith("http"),
    "Cache path must be relative: " + f,
  );
  assert(existsSync(join(dir, f)), "Cached file missing: " + f);
}
for (const [, url] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
  assert(url.startsWith(base), "Wrong base: " + url);
  assert(
    existsSync(join(dir, url.slice(base.length))),
    "HTML reference missing: " + url,
  );
}
assert(
  sw.includes('createHandlerBoundToURL("index.html")'),
  "No offline navigation fallback",
);
assert(
  !sw.includes("indexedDB.deleteDatabase"),
  "Must not delete user data on update",
);
const js = readdirSync(join(dir, "assets"))
  .filter((f) => f.endsWith(".js"))
  .map((f) => readFileSync(join(dir, "assets", f), "utf8"))
  .join("\n");
assert(js.includes(base + "sw.js"), "Wrong registration path");
console.log(
  `OK: ${base} — manifest, ${cached.size} precache resources, asset paths and SW registration.`,
);
console.log(
  "Static verification only; an offline browser launch requires a real browser.",
);
