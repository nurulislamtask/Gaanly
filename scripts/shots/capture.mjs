// Takes the README screenshots of the real, built web app (web/dist) with made-up music.
//   node capture.mjs <out-dir>        (run from scripts/shots after `pnpm build`)
import { createServer } from "node:http";
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { chromium } from "playwright";
import { api, allTracks, coverSvg, silentWav } from "./mock.mjs";

const out = resolve(process.argv[2] ?? "../../docs/screenshots");
const dist = resolve("../../web/dist");
mkdirSync(out, { recursive: true });

const types = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".ico": "image/x-icon" };
const wav = silentWav();

const server = createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  const p = url.pathname;
  let m;
  if ((m = p.match(/^\/mock\/cover\/(\d+)\.svg$/))) {
    res.writeHead(200, { "content-type": "image/svg+xml", "cache-control": "max-age=3600" });
    return res.end(coverSvg(Number(m[1])));
  }
  if (p.startsWith("/api/stream/")) {
    const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? "");
    const start = range?.[1] ? Number(range[1]) : 0;
    const end = range?.[2] ? Math.min(Number(range[2]), wav.length - 1) : wav.length - 1;
    const headers = { "content-type": "audio/wav", "accept-ranges": "bytes" };
    if (range) {
      res.writeHead(206, { ...headers, "content-range": `bytes ${start}-${end}/${wav.length}`, "content-length": end - start + 1 });
      return res.end(wav.subarray(start, end + 1));
    }
    res.writeHead(200, { ...headers, "content-length": wav.length });
    return res.end(wav);
  }
  if (p.startsWith("/api/")) {
    const body = api(req.method, req.url);
    res.writeHead(body ? 200 : 404, { "content-type": "application/json" });
    return res.end(JSON.stringify(body ?? { error: "not mocked" }));
  }
  let file = join(dist, p);
  if (!file.startsWith(dist) || !existsSync(file) || statSync(file).isDirectory()) file = join(dist, "index.html");
  res.writeHead(200, { "content-type": types[extname(file)] ?? "application/octet-stream" });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const settle = (page, ms = 900) => page.waitForTimeout(ms);
const failures = [];
async function shot(name, fn) {
  try {
    await fn();
    console.log("ok   ", name);
  } catch (e) {
    failures.push(name);
    console.log("FAIL ", name, String(e).split("\n")[0]);
  }
}

async function newPage(opts = {}) {
  const ctx = await browser.newContext({ locale: "en-US", colorScheme: "dark", deviceScaleFactor: 2, ...opts });
  await ctx.addInitScript(() => {
    try {
      localStorage.setItem("gaanly:update-dismissed", "999.0.0");
    } catch {}
  });
  const page = await ctx.newPage();
  return { ctx, page };
}
const jpg = (page, name, opts = {}) => page.screenshot({ path: join(out, name), type: "jpeg", quality: 90, ...opts });

// ---- Desktop
{
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } });

  await shot("home", async () => {
    await page.goto(base + "/");
    await page.getByText("Late night drive").first().waitFor();
    await settle(page);
    await page.getByRole("button", { name: allTracks[8].title }).first().click();
    await page.waitForTimeout(4500);
    await jpg(page, "home.jpg");
  });

  await shot("album", async () => {
    await page.goto(base + "/search/album/MPREmidnighttransit1");
    await page.getByText("Last Train Home").first().waitFor();
    await settle(page, 1200);
    await jpg(page, "album.jpg");
  });

  await shot("genre", async () => {
    await page.goto(base + "/search/genre/genre-0");
    await page.getByText("Neon Harbor").first().waitFor();
    await settle(page, 1200);
    await jpg(page, "genre.jpg");
  });

  await shot("search", async () => {
    await page.goto(base + "/search?q=midnight");
    await page.getByText("Glass Avenue").first().waitFor();
    await settle(page, 1200);
    await jpg(page, "search.jpg");
  });

  await shot("customize", async () => {
    await page.goto(base + "/");
    await page.getByRole("button", { name: /^Settings/ }).first().click();
    await page.getByText("Accent color").first().waitFor();
    await settle(page, 700);
    await jpg(page, "customize.jpg");
  });
  await ctx.close();
}

// ---- Phones, side by side
const phone = [];
{
  const { ctx, page } = await newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await shot("phone-home", async () => {
    await page.goto(base + "/");
    const card = page.getByRole("button", { name: allTracks[8].title }).first();
    await card.waitFor();
    await settle(page, 800);
    await card.click();
    await page.waitForTimeout(3500);
    const f = join(out, "_p1.png");
    await page.screenshot({ path: f });
    phone.push(f);
  });
  await shot("phone-search", async () => {
    await page.goto(base + "/search?q=midnight");
    await page.getByText("Glass Avenue").first().waitFor();
    await settle(page, 1200);
    const f = join(out, "_p2.png");
    await page.screenshot({ path: f });
    phone.push(f);
  });
  await shot("phone-now-playing", async () => {
    await page.goto(base + "/");
    await page.getByRole("button", { name: allTracks[3].title }).first().click();
    await page.waitForTimeout(2500);
    await page.getByRole("button", { name: /Open .* Now Playing|now playing/i }).first().click();
    await settle(page, 1500);
    const f = join(out, "_p3.png");
    await page.screenshot({ path: f });
    phone.push(f);
  });
  await ctx.close();
}

if (phone.length) {
  const { ctx, page } = await newPage({ viewport: { width: 1280, height: 720 } });
  const img = (f) => `data:image/png;base64,${readFileSync(f).toString("base64")}`;
  await page.setContent(`<body style="margin:0;background:#07162e;display:flex;gap:36px;justify-content:center;align-items:center;height:720px">${phone
    .map((f) => `<img src="${img(f)}" style="height:640px;border-radius:38px;border:3px solid #1f3a66;box-shadow:0 24px 60px #0008">`)
    .join("")}</body>`);
  await page.waitForTimeout(400);
  await jpg(page, "mobile.jpg");
  await ctx.close();
}

await browser.close();
server.close();
if (failures.length) {
  console.log("Failed:", failures.join(", "));
  process.exitCode = 1;
}
