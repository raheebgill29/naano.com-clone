#!/usr/bin/env node
/**
 * Automatic agent capture for 8x assignment.
 * Fires on beforeSubmitPrompt and afterAgentResponse.
 * Writes only prompt + final response into .agent-logs/.
 */

const fs = require("fs");
const path = require("path");

const AUTHOR = "raheeb-gill";
const TOOL = "cursor";
const PROJECT = "naano-rebuild";

function utcNow() {
  return new Date().toISOString();
}

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (c) => chunks.push(c));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

function repoRootFromPayload(payload) {
  const roots = payload.workspace_roots;
  if (Array.isArray(roots) && roots.length > 0 && roots[0]) {
    return roots[0];
  }
  // Fallback: walk up from this script (.cursor/hooks/agent-capture.js)
  return path.resolve(__dirname, "..", "..");
}

function shortId(id) {
  if (!id || typeof id !== "string") return "unknown";
  return id.replace(/[^a-zA-Z0-9-]/g, "").slice(0, 8) || "unknown";
}

function modelName(payload) {
  return (
    payload.model_id ||
    payload.model ||
    "unknown"
  );
}

function sessionIndexPath(root) {
  return path.join(root, ".agent-logs", ".session-index.json");
}

function loadIndex(root) {
  const p = sessionIndexPath(root);
  try {
    if (fs.existsSync(p)) {
      return JSON.parse(fs.readFileSync(p, "utf8"));
    }
  } catch {
    // ignore corrupt index; rebuild from scratch
  }
  return {};
}

function saveIndex(root, index) {
  const p = sessionIndexPath(root);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(index, null, 2) + "\n", "utf8");
}

function fileStamp(iso) {
  // 2026-08-28T09:14:02.118Z -> 2026-08-28_09-14-02
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}` +
    `_${pad(d.getUTCHours())}-${pad(d.getUTCMinutes())}-${pad(d.getUTCSeconds())}`
  );
}

function ensureSession(root, payload, nowIso) {
  const conversationId =
    payload.conversation_id || payload.session_id || "unknown-session";
  const index = loadIndex(root);
  let meta = index[conversationId];

  if (!meta) {
    const sid = shortId(conversationId);
    const filename = `${fileStamp(nowIso)}_${sid}.md`;
    meta = {
      conversation_id: conversationId,
      session_id: sid,
      filename,
      first_prompt_time: nowIso,
      last_prompt_time: nowIso,
      total_exchanges: 0,
      model: modelName(payload),
    };
    index[conversationId] = meta;
    saveIndex(root, index);

    const logPath = path.join(root, ".agent-logs", filename);
    const date = nowIso.slice(0, 10);
    const header = `---
session_id: ${conversationId}
date: ${date}
author: ${AUTHOR}
model: ${meta.model}
tool: ${TOOL}
project: ${PROJECT}
total_exchanges: 0
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

  return { conversationId, meta, index };
}

function updateFrontMatter(logPath, meta) {
  const raw = fs.readFileSync(logPath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return;

  let fm = match[1];
  fm = fm.replace(/^model:.*$/m, `model: ${meta.model}`);
  fm = fm.replace(/^total_exchanges:.*$/m, `total_exchanges: ${meta.total_exchanges}`);
  fm = fm.replace(/^first_prompt_time:.*$/m, `first_prompt_time: ${meta.first_prompt_time}`);
  fm = fm.replace(/^last_prompt_time:.*$/m, `last_prompt_time: ${meta.last_prompt_time}`);

  const rest = raw.slice(match[0].length);
  fs.writeFileSync(logPath, `---\n${fm}\n---\n${rest}`, "utf8");
}

function appendEntry(logPath, type, num, sessionShort, timestamp, model, body) {
  const block = `
[LOG_ENTRY type=${type} num=${num} session=${sessionShort}]
timestamp: ${timestamp}
model: ${model}

${body.trimEnd()}

`;
  fs.appendFileSync(logPath, block, "utf8");
}

function debugLog(root, line) {
  try {
    const p = path.join(root, ".agent-logs", ".hook-debug.log");
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.appendFileSync(p, `${utcNow()} ${line}\n`, "utf8");
  } catch {
    // never fail the hook for debug logging
  }
}

async function main() {
  let payload = {};
  try {
    const raw = await readStdin();
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    // Fail open: still allow the prompt
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  }

  const event = payload.hook_event_name || "";
  const root = repoRootFromPayload(payload);
  const nowIso = utcNow();
  const model = modelName(payload);

  try {
    debugLog(
      root,
      `event=${event} conversation=${payload.conversation_id || "none"} model=${model}`
    );

    const { conversationId, meta, index } = ensureSession(root, payload, nowIso);
    const logPath = path.join(root, ".agent-logs", meta.filename);
    meta.model = model;

    if (event === "beforeSubmitPrompt") {
      const prompt = payload.prompt != null ? String(payload.prompt) : "";
      meta.total_exchanges += 1;
      meta.last_prompt_time = nowIso;
      if (!meta.first_prompt_time) meta.first_prompt_time = nowIso;
      index[conversationId] = meta;
      saveIndex(root, index);
      updateFrontMatter(logPath, meta);
      appendEntry(
        logPath,
        "PROMPT",
        meta.total_exchanges,
        meta.session_id,
        nowIso,
        model,
        prompt
      );
      process.stdout.write(JSON.stringify({ continue: true }));
      process.exit(0);
    }

    if (event === "afterAgentResponse") {
      const text = payload.text != null ? String(payload.text) : "";
      // Pair with current exchange count (prompt already incremented).
      const num = Math.max(1, meta.total_exchanges);
      meta.last_prompt_time = nowIso;
      index[conversationId] = meta;
      saveIndex(root, index);
      updateFrontMatter(logPath, meta);
      appendEntry(logPath, "RESPONSE", num, meta.session_id, nowIso, model, text);
      process.stdout.write(JSON.stringify({}));
      process.exit(0);
    }

    // Unknown event — no-op
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  } catch (err) {
    debugLog(root, `ERROR ${err && err.stack ? err.stack : String(err)}`);
    // Fail open
    if (event === "beforeSubmitPrompt") {
      process.stdout.write(JSON.stringify({ continue: true }));
    } else {
      process.stdout.write(JSON.stringify({}));
    }
    process.exit(0);
  }
}

main();
