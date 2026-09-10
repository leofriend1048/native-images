// Head-to-head image model eval.
//
// Sends the SAME prompt to each model so the only variable is the model itself
// (the app's Claude prompt-enhancement layer is deliberately bypassed — it
// rewrites prompts non-deterministically, which would poison the comparison).
//
// Usage:
//   node scripts/model-eval.mjs
//   node scripts/model-eval.mjs --models google/nano-banana-pro,openai/gpt-image-2.5-sunburst
//   node scripts/model-eval.mjs --ratio 3:4 --out eval-out
//
// Outputs images + an index.html side-by-side grid into the output directory.

import fs from "node:fs/promises";
import path from "node:path";
import Replicate from "replicate";

// ── Load .env.local ──────────────────────────────────────────────────────────
const envRaw = await fs.readFile(new URL("../.env.local", import.meta.url), "utf8");
for (const line of envRaw.split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

// ── Args ─────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : fallback;
};

const MODELS = arg("models", "google/nano-banana-pro,openai/gpt-image-2.5-sunburst").split(",");
const RATIO = arg("ratio", "3:4"); // 3:4 — the only portrait ratio both families support
const OUT_DIR = path.resolve(process.cwd(), arg("out", "eval-out"));

// ── The two test prompts ─────────────────────────────────────────────────────
// Written in the app's house "iPhone snapshot" format so the eval measures the
// thing this product actually cares about: can the model fake a real casual
// photo rather than produce a polished stock shot.
const NEGATIVE =
  "NOT professional photography, NOT stock photo, NOT DSLR, NOT studio lighting, " +
  "NOT editorial, NOT lifestyle brand shoot, NOT cinematic, NOT color graded, NOT retouched skin";

const PROMPTS = [
  {
    id: "01-flash-bathroom-selfie",
    label: "Human subject · flash realism (hardest test)",
    text:
      "A photograph taken on an iPhone front-facing camera — arm's length selfie of an early-40s woman " +
      "in a faded grey cotton t-shirt, standing in a small clean bathroom with white subway tile and a " +
      "builder-grade white vanity. She is pressing two fingers to her jawline, chin tilted up, eyes " +
      "slightly squinted, looking at her phone screen rather than the lens. Direct camera flash — stark " +
      "hard shadow on the wall behind her, blown-out highlights on her forehead and cheekbones, flat " +
      "frontal light. Real skin texture: visible pores, natural sheen, slight redness along the jaw, " +
      "peach fuzz. Edge of a towel rack blurred in the foreground. Slightly tilted casual framing, " +
      "slight digital noise in the shadows, straight-out-of-iPhone JPEG. " +
      NEGATIVE,
  },
  {
    id: "02-product-counter-closeup",
    label: "Product close-up · surface + light realism",
    text:
      "A photograph taken on an iPhone 24mm wide-angle main camera — close-up of a small white and " +
      "rose-gold handheld skincare device lying on a clean grey marble bathroom counter, next to a " +
      "half-folded white washcloth and a set of car keys. Natural side window light from the left, one " +
      "edge of the device bright and slightly clipped, the other side in soft shadow. Fine dust of " +
      "everyday detail: a single water droplet on the marble, faint fingerprint smudge on the device " +
      "casing. Shot handheld from slightly above at an angle, imperfect framing, corner of a phone " +
      "face-down blurred in the foreground. Punchy vibrant Apple Smart HDR colors, slight digital " +
      "sharpening, unedited straight-out-of-iPhone JPEG. " +
      NEGATIVE,
  },
];

// ── Per-model input builders (mirrors app/api/generate/route.ts) ──────────────
function buildInput(modelId, prompt) {
  if (modelId.startsWith("openai/")) {
    return {
      prompt,
      aspect_ratio: RATIO,
      quality: "high",
      output_format: "png",
      number_of_images: 1,
      moderation: "low",
    };
  }
  if (modelId.startsWith("bytedance/")) {
    return { prompt, aspect_ratio: RATIO, size: "2K", max_images: 1, sequential_image_generation: "disabled" };
  }
  // Google Nano Banana family
  const isNB2 = modelId === "google/nano-banana-2";
  const inp = { prompt, aspect_ratio: RATIO, resolution: "2K", output_format: "png" };
  if (!isNB2) inp.safety_filter_level = "block_only_high";
  return inp;
}

// ── Run ──────────────────────────────────────────────────────────────────────
const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
await fs.mkdir(OUT_DIR, { recursive: true });

const results = [];

for (const prompt of PROMPTS) {
  for (const modelId of MODELS) {
    const slug = `${prompt.id}__${modelId.replace(/[/.]/g, "-")}`;
    process.stdout.write(`→ ${modelId}  ${prompt.id} ... `);
    const started = Date.now();
    try {
      const input = buildInput(modelId, prompt.text);
      const output = await replicate.run(modelId, { input });
      const url = Array.isArray(output) ? String(output[0]) : String(output);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`download failed: HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      const file = `${slug}.png`;
      await fs.writeFile(path.join(OUT_DIR, file), buf);
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      results.push({ promptId: prompt.id, promptLabel: prompt.label, modelId, file, secs, bytes: buf.length });
      console.log(`ok  ${secs}s  ${(buf.length / 1024).toFixed(0)}KB`);
    } catch (err) {
      const secs = ((Date.now() - started) / 1000).toFixed(1);
      results.push({ promptId: prompt.id, promptLabel: prompt.label, modelId, error: String(err?.message ?? err), secs });
      console.log(`FAILED  ${err?.message ?? err}`);
    }
  }
}

// ── Comparison page ──────────────────────────────────────────────────────────
const cell = (r) =>
  r.error
    ? `<div class="cell err"><div class="model">${r.modelId}</div><p>${r.error}</p></div>`
    : `<div class="cell"><div class="model">${r.modelId}</div>
         <img src="${r.file}" alt="${r.modelId}">
         <div class="meta">${r.secs}s · ${(r.bytes / 1024).toFixed(0)} KB</div></div>`;

const html = `<!doctype html><meta charset="utf-8"><title>Image model eval</title>
<style>
  body{font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;margin:0;padding:32px;background:#0d0d0f;color:#eee}
  h1{font-size:20px;margin:0 0 4px} .sub{color:#888;margin:0 0 32px}
  section{margin-bottom:48px}
  h2{font-size:15px;font-weight:600;margin:0 0 4px}
  .p{color:#777;font-size:12px;margin:0 0 16px;max-width:900px}
  .row{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:20px}
  .cell{background:#17171a;border:1px solid #262629;border-radius:10px;overflow:hidden}
  .model{font:12px ui-monospace,SFMono-Regular,Menlo,monospace;padding:10px 12px;border-bottom:1px solid #262629;color:#bbb}
  img{display:block;width:100%;height:auto}
  .meta{padding:8px 12px;font-size:11px;color:#777}
  .err{padding:0 12px 16px;color:#f87171}
</style>
<h1>Image model eval — same prompt, different models</h1>
<p class="sub">Aspect ratio ${RATIO} · generated ${new Date().toLocaleString()} · prompt-enhancement layer bypassed</p>
${PROMPTS.map(
  (p) => `<section>
    <h2>${p.label}</h2>
    <p class="p">${p.text}</p>
    <div class="row">${results.filter((r) => r.promptId === p.id).map(cell).join("")}</div>
  </section>`
).join("")}`;

await fs.writeFile(path.join(OUT_DIR, "index.html"), html);
await fs.writeFile(path.join(OUT_DIR, "results.json"), JSON.stringify({ ratio: RATIO, models: MODELS, results }, null, 2));

console.log(`\nDone — ${results.filter((r) => !r.error).length}/${results.length} succeeded`);
console.log(`Open: ${path.join(OUT_DIR, "index.html")}`);
