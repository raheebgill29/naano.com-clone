#!/usr/bin/env node
/**
 * 8x agent capture — Cursor project hook (Windows-safe via node + stdin).
 * Events: beforeSubmitPrompt, afterAgentResponse
 * Records only prompt text and final response text.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTHOR = "raheeb-gill";
const TOOL = "cursor";
const PROJECT = "naano-rebuild";
const ERROR_LOG = path.join(__dirname, "capture-errors.log");
const INDEX_FILE = path.join(__dirname, ".session-index.json");

function utcNow() {
  return new Date().toISOString();
}

function logError(err, context = {}) {
  try {
    const line = JSON.stringify({
      ts: utcNow(),
      error: err && err.stack ? err.stack : String(err),
      ...context,
    });
    fs.appendFileSync(ERROR_LOG, line + "\n", "utf8");
  } catch {
    // never throw from error logger
  }
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.on("data", (c) => chunks.push(Buffer.from(c)));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks)));
    process.stdin.on("error", reject);
  });
}

/** Cursor on Windows may pipe UTF-8 BOM or UTF-16 JSON on stdin. */
function decodeHookPayload(buf) {
  if (!buf || buf.length === 0) return "";

  // UTF-16 LE BOM
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) {
    return buf.toString("utf16le");
  }
  // UTF-16 BE BOM
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.alloc(buf.length - 2);
    for (let i = 2; i + 1 < buf.length; i += 2) {
      swapped[i - 2] = buf[i + 1];
      swapped[i - 1] = buf[i];
    }
    return swapped.toString("utf16le");
  }
  // UTF-8 BOM
  if (buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf) {
    return buf.slice(3).toString("utf8");
  }
  // UTF-16 LE without BOM (null bytes on odd indices of ASCII JSON)
  if (
    buf.length >= 4 &&
    buf[0] === 0x7b /* { */ &&
    buf[1] === 0x00 &&
    buf[2] !== 0x00
  ) {
    return buf.toString("utf16le");
  }

  let text = buf.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }
  return text;
}

function respond(event, obj) {
  process.stdout.write(JSON.stringify(obj));
}

/** Cursor may send /c:/Users/... which Node treats as C:\c:\Users\... */
function normalizeWorkspaceRoot(raw) {
  let p = String(raw).trim();
  if (!p) return p;

  if (/^file:\/\//i.test(p)) {
    try {
      p = fileURLToPath(p);
    } catch {
      p = p.replace(/^file:\/\//i, "");
    }
  }

  // /c:/Users/... or \c:\Users\...
  let m = p.match(/^[/\\]([A-Za-z]):[/\\](.*)$/);
  if (m) {
    p = `${m[1]}:\\${m[2]}`;
  }

  // c:/Users/... → c:\Users\...
  if (/^[A-Za-z]:\//.test(p)) {
    p = p.replace(/\//g, "\\");
  }

  return path.normalize(p);
}

function repoRootFromPayload(payload) {
  const fallback = path.resolve(__dirname, "..", "..");
  const roots = payload.workspace_roots;
  if (Array.isArray(roots) && roots.length > 0 && roots[0]) {
    const candidate = normalizeWorkspaceRoot(roots[0]);
    try {
      if (candidate && fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (err) {
      logError(err, { phase: "repoRootExists", raw: roots[0], candidate });
    }
    logError(new Error(`Unusable workspace_roots[0]; using hook script root`), {
      phase: "repoRoot",
      raw: roots[0],
      candidate,
      fallback,
    });
  }
  return fallback;
}

function modelName(payload) {
  if (payload.model_id != null && String(payload.model_id).trim() !== "") {
    return String(payload.model_id);
  }
  if (payload.model != null && String(payload.model).trim() !== "") {
    return String(payload.model);
  }
  return "unknown";
}

function shortSession(conversationId) {
  const cleaned = String(conversationId).replace(/[^a-zA-Z0-9-]/g, "");
  return cleaned.slice(0, 8) || "unknown";
}

/** Safe for Windows filenames; keep conversation_id recognizable. */
function safeConversationIdForFilename(conversationId) {
  return String(conversationId)
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 180) || "unknown-session";
}

function fileStamp(iso) {
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`
  );
}

function loadIndex() {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8"));
    }
  } catch (err) {
    logError(err, { phase: "loadIndex" });
  }
  return {};
}

function saveIndex(index) {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2) + "\n", "utf8");
}

function writeSessionHeader(logPath, conversationId, sid, model, nowIso, totalExchanges) {
  const date = nowIso.slice(0, 10);
  const header = `---
session_id: ${conversationId}
date: ${date}
author: ${AUTHOR}
model: ${model}
tool: ${TOOL}
project: ${PROJECT}
total_exchanges: ${totalExchanges}
first_prompt_time: ${nowIso}
last_prompt_time: ${nowIso}
---

# Session Log - ${date}

Session: \`${sid}\` | Project: \`${PROJECT}\` | Author: \`${AUTHOR}\`

---
`;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(logPath, header, "utf8");
}

function ensureSession(root, conversationId, model, nowIso) {
  const index = loadIndex();
  let meta = index[conversationId];

  if (!meta) {
    const safeId = safeConversationIdForFilename(conversationId);
    const filename = `${fileStamp(nowIso)}_${safeId}.md`;
    const sid = shortSession(conversationId);
    meta = {
      conversation_id: conversationId,
      session_short: sid,
      filename,
      first_prompt_time: nowIso,
      last_prompt_time: nowIso,
      total_exchanges: 0,
      model,
    };
    index[conversationId] = meta;
    saveIndex(index);
  }

  const logsDir = path.join(root, ".agent-logs");
  fs.mkdirSync(logsDir, { recursive: true });
  const logPath = path.join(logsDir, meta.filename);
  if (!fs.existsSync(logPath)) {
    writeSessionHeader(
      logPath,
      conversationId,
      meta.session_short,
      model,
      meta.first_prompt_time || nowIso,
      meta.total_exchanges || 0
    );
  }

  return { meta, index };
}

function updateFrontMatter(logPath, meta) {
  const raw = fs.readFileSync(logPath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return;

  let fm = match[1];
  fm = fm.replace(/^model:.*$/m, `model: ${meta.model}`);
  fm = fm.replace(
    /^total_exchanges:.*$/m,
    `total_exchanges: ${meta.total_exchanges}`
  );
  fm = fm.replace(
    /^first_prompt_time:.*$/m,
    `first_prompt_time: ${meta.first_prompt_time}`
  );
  fm = fm.replace(
    /^last_prompt_time:.*$/m,
    `last_prompt_time: ${meta.last_prompt_time}`
  );

  const rest = raw.slice(match[0].length);
  fs.writeFileSync(logPath, `---\n${fm}\n---\n${rest}`, "utf8");
}

function appendEntry(logPath, type, num, sessionShort, timestamp, model, body) {
  const block = `
[LOG_ENTRY type=${type} num=${num} session=${sessionShort}]
timestamp: ${timestamp}
model: ${model}

${String(body).trimEnd()}

`;
  fs.appendFileSync(logPath, block, "utf8");
}

async function main() {
  let payload = {};
  let event = "";

  try {
    const buf = await readStdin();
    const raw = decodeHookPayload(buf).replace(/^\uFEFF/, "").trim();
    if (!raw) {
      logError(new Error("Empty stdin — no hook payload received"), {
        phase: "readStdin",
        bytes: buf ? buf.length : 0,
      });
      respond("beforeSubmitPrompt", { continue: true });
      return;
    }
    payload = JSON.parse(raw);
  } catch (err) {
    logError(err, { phase: "parseStdin" });
    respond("beforeSubmitPrompt", { continue: true });
    return;
  }

  event = payload.hook_event_name || "";
  const root = repoRootFromPayload(payload);
  const nowIso = utcNow();
  const model = modelName(payload);
  const conversationId =
    payload.conversation_id != null && String(payload.conversation_id).trim() !== ""
      ? String(payload.conversation_id)
      : "unknown-session";

  try {
    const { meta, index } = ensureSession(root, conversationId, model, nowIso);
    const logPath = path.join(root, ".agent-logs", meta.filename);
    meta.model = model;

    if (event === "beforeSubmitPrompt") {
      const prompt = payload.prompt != null ? String(payload.prompt) : "";
      meta.total_exchanges += 1;
      meta.last_prompt_time = nowIso;
      if (!meta.first_prompt_time) meta.first_prompt_time = nowIso;
      index[conversationId] = meta;
      saveIndex(index);
      updateFrontMatter(logPath, meta);
      appendEntry(
        logPath,
        "PROMPT",
        meta.total_exchanges,
        meta.session_short,
        nowIso,
        model,
        prompt
      );
      respond(event, { continue: true });
      return;
    }

    if (event === "afterAgentResponse") {
      const text = payload.text != null ? String(payload.text) : "";
      // Skip unpaired responses (e.g. prompt capture failed earlier this turn).
      if (!meta.total_exchanges || meta.total_exchanges < 1) {
        respond(event, {});
        return;
      }
      const num = meta.total_exchanges;
      meta.last_prompt_time = nowIso;
      index[conversationId] = meta;
      saveIndex(index);
      updateFrontMatter(logPath, meta);
      appendEntry(
        logPath,
        "RESPONSE",
        num,
        meta.session_short,
        nowIso,
        model,
        text
      );
      respond(event, {});
      return;
    }

    // Unknown / unrelated event — fail open, do not write logs
    if (event === "beforeSubmitPrompt") {
      respond(event, { continue: true });
    } else {
      respond(event, {});
    }
  } catch (err) {
    logError(err, {
      phase: "handle",
      event,
      conversation_id: conversationId,
    });
    if (event === "beforeSubmitPrompt") {
      respond(event, { continue: true });
    } else {
      respond(event, {});
    }
  }
}

main().catch((err) => {
  logError(err, { phase: "main" });
  try {
    process.stdout.write(JSON.stringify({ continue: true }));
  } catch {
    // ignore
  }
});
