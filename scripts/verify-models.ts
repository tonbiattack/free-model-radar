import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import type { Model, Provider, Verification } from "../src/lib/schema";

/**
 * API キーがある場合だけ、実際に接続して挙動を確認する。
 *
 * 守っている制約:
 * - 費用が発生する検証は自動実行しない（無料枠の範囲だけで試す）
 * - キーがない場合はスキップし、「未実施」のままにする
 * - 結果にはモデル ID・プロバイダー・OpenCode バージョン・検証日時を残す
 * - 単発の成功を「長時間使える」保証として扱わない
 *
 * 使い方:
 *   GROQ_API_KEY=... npm run verify:models -- --provider groq
 *   npm run verify:models -- --provider groq --dry-run
 *
 * 既定は dry-run で、--write を付けたときだけデータを更新する。
 */

interface Target {
  provider: Provider;
  model: Model;
  envVar: string;
}

const args = process.argv.slice(2);

function argValue(name: string): string | null {
  const index = args.indexOf(`--${name}`);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

const providerFilter = argValue("provider");
const modelFilter = argValue("model");
const shouldWrite = args.includes("--write");
const isDryRun = !shouldWrite;

const dataset = assembleDataset() as { providers: Provider[]; models: Model[] };

const envVarFor: Record<string, string> = {
  google: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  "cloudflare-workers-ai": "CLOUDFLARE_API_KEY",
  "opencode-zen": "OPENCODE_API_KEY",
  logfare: "LOGFARE_API_KEY",
};

function targets(): Target[] {
  const out: Target[] = [];
  for (const model of dataset.models) {
    if (model.free_tier.availability === "ended") continue;
    if (providerFilter && model.provider_id !== providerFilter) continue;
    if (modelFilter && model.id !== modelFilter) continue;
    const provider = dataset.providers.find((entry) => entry.id === model.provider_id);
    if (!provider) continue;
    const envVar = envVarFor[provider.id];
    if (!envVar) continue;
    out.push({ provider, model, envVar });
  }
  return out;
}

interface CheckResult {
  method: Verification["method"];
  status: Verification["status"];
  notes: string;
}

const TIMEOUT_MS = 30_000;

/**
 * レート制限・混雑は「能力の失敗」ではない。
 * これらは unknown（判定不能）として扱い、failed と混同しない。
 * 429 を failed にすると「使えないモデル」と誤って読まれてしまう。
 */
function isInconclusive(status: number): boolean {
  return status === 429 || status === 503 || status === 0;
}

function statusNote(status: number, text: string): string {
  if (status === 429) return "レート制限に達したため判定できず（能力の失敗ではない）";
  if (status === 503) return "提供元が混雑していたため判定できず";
  if (status === 0) return "ネットワーク到達不可のため判定できず";
  return `HTTP ${status}: ${text.slice(0, 200)}`;
}

/** レート制限や一時的な混雑は、待ってから再試行する。Retry-After を尊重する。 */
async function chatRequestWithRetry(
  provider: Provider,
  model: Model,
  apiKey: string,
  body: Record<string, unknown>,
  maxAttempts = 3,
): Promise<{ ok: boolean; status: number; json: unknown; text: string; attempts: number }> {
  let last = await chatRequest(provider, model, apiKey, body);
  let attempts = 1;

  while (!last.ok && isInconclusive(last.status) && attempts < maxAttempts) {
    // 429/503 は指数的に待つ。無料枠を守るため、長めに取る。
    const waitMs = 8_000 * attempts;
    console.log(`      retry ${attempts} after ${waitMs / 1000}s (status ${last.status})`);
    await new Promise((resolve) => setTimeout(resolve, waitMs));
    last = await chatRequest(provider, model, apiKey, body);
    attempts += 1;
  }

  return { ...last, attempts };
}

async function chatRequest(
  provider: Provider,
  _model: Model,
  apiKey: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; json: unknown; text: string }> {
  if (!provider.base_url) {
    return { ok: false, status: 0, json: null, text: "ベース URL が不明" };
  }
  const base = provider.base_url.replace(
    /\{[a-z_]+\}/gi,
    process.env.CLOUDFLARE_ACCOUNT_ID ?? "unknown",
  );
  const url = `${base.replace(/\/$/, "")}/chat/completions`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await response.text();
    let json: unknown = null;
    try {
      json = JSON.parse(text);
    } catch {
      // ストリーミング応答や非 JSON のエラーは生テキストで判断する
    }
    return { ok: response.ok, status: response.status, json, text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, status: 0, json: null, text: message };
  } finally {
    clearTimeout(timer);
  }
}

async function runChecks(target: Target, apiKey: string): Promise<CheckResult[]> {
  const { provider, model } = target;
  const results: CheckResult[] = [];

  // 1. 接続と最小の生成
  const connection = await chatRequestWithRetry(provider, model, apiKey, {
    model: model.model_id,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 16,
    stream: false,
  });

  if (!connection.ok) {
    results.push({
      method: "connection",
      status: isInconclusive(connection.status) ? "unknown" : "failed",
      notes: statusNote(connection.status, connection.text),
    });
    // 接続できないなら以降の検証は意味がない
    return results;
  }

  results.push({ method: "connection", status: "passed", notes: "chat/completions が応答した" });

  // 2. ストリーミング（最初のチャンクが届くかだけを見る）
  const stream = await chatRequestWithRetry(provider, model, apiKey, {
    model: model.model_id,
    messages: [{ role: "user", content: "Count from 1 to 3." }],
    max_tokens: 32,
    stream: true,
  });
  results.push({
    method: "streaming",
    status: stream.ok
      ? stream.text.includes("data:")
        ? "passed"
        : "failed"
      : isInconclusive(stream.status)
        ? "unknown"
        : "failed",
    notes: stream.ok
      ? stream.text.includes("data:")
        ? "SSE の data チャンクを確認"
        : "応答は返ったが SSE 形式ではなかった"
      : statusNote(stream.status, stream.text),
  });

  // 3. ツール呼び出し（関数を 1 つ提示し、呼び出しを要求するか）
  const tools = await chatRequestWithRetry(provider, model, apiKey, {
    model: model.model_id,
    messages: [
      {
        role: "user",
        content: "What is the weather in Osaka? Use the provided tool. Do not answer in prose.",
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "get_weather",
          description: "Get the current weather for a city",
          parameters: {
            type: "object",
            properties: { city: { type: "string" } },
            required: ["city"],
          },
        },
      },
    ],
    tool_choice: "auto",
    max_tokens: 256,
  });

  const toolCalls = extractToolCalls(tools.json);
  results.push({
    method: "tool-calling",
    status: tools.ok
      ? toolCalls > 0
        ? "passed"
        : "failed"
      : isInconclusive(tools.status)
        ? "unknown"
        : "failed",
    notes: tools.ok
      ? toolCalls > 0
        ? `tool_calls を ${toolCalls} 件返した`
        : "tool_calls を返さなかった（モデルまたは互換レイヤーの制約）"
      : statusNote(tools.status, tools.text),
  });

  // 4. JSON モード（response_format を解釈して JSON だけを返せるか）
  const json = await chatRequestWithRetry(provider, model, apiKey, {
    model: model.model_id,
    messages: [
      {
        role: "user",
        content:
          'Return only a JSON object with the keys "language" and "line_count" for this code:\nconst a = 1;\nconsole.log(a);',
      },
    ],
    response_format: { type: "json_object" },
    max_tokens: 256,
  });
  const parsedJson = parseJsonContent(json.json);
  results.push({
    method: "json-mode",
    status: json.ok
      ? parsedJson
        ? "passed"
        : "failed"
      : isInconclusive(json.status)
        ? "unknown"
        : "failed",
    notes: json.ok
      ? parsedJson
        ? `response_format を指定して JSON を取得（keys: ${Object.keys(parsedJson).join(", ")}）`
        : "JSON として解釈できる応答ではなかった"
      : statusNote(json.status, json.text),
  });

  // 5. 短い編集タスク（エージェントの 1 ステップ相当）
  const edit = await chatRequestWithRetry(provider, model, apiKey, {
    model: model.model_id,
    messages: [
      {
        role: "system",
        content:
          "You are a coding agent. Reply with only the corrected code, no explanation, no markdown fences.",
      },
      {
        role: "user",
        content:
          "This function should return the sum of an array. Fix the bug.\n\nfunction sum(values) {\n  let total = 0;\n  for (const value of values) {\n    total = value;\n  }\n  return total;\n}",
      },
    ],
    max_tokens: 400,
  });
  const edited = extractText(edit.json);
  // 修正版は `+=` を含み、`total = value;` を含まないはず
  const fixed = edited.includes("+=") && !/total\s*=\s*value\s*;/.test(edited);
  results.push({
    method: "agent-task",
    status: edit.ok
      ? fixed
        ? "passed"
        : "failed"
      : isInconclusive(edit.status)
        ? "unknown"
        : "failed",
    notes: edit.ok
      ? fixed
        ? "合計を求めるバグを修正する応答を返した（total += value）"
        : `期待する修正ではなかった: ${edited.replace(/\s+/g, " ").slice(0, 120)}`
      : statusNote(edit.status, edit.text),
  });

  return results;
}

/** 応答から JSON オブジェクトを取り出す。コードフェンスが混ざる場合も許容する。 */
function parseJsonContent(json: unknown): Record<string, unknown> | null {
  const text = extractText(json);
  if (!text) return null;
  const candidates = [text.trim()];
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const braced = /\{[\s\S]*\}/.exec(text);
  if (braced?.[0]) candidates.push(braced[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // 次の候補を試す
    }
  }
  return null;
}

/** choices[0].message.content を取り出す。 */
function extractText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return "";
  const message = (choices[0] as { message?: { content?: unknown } }).message;
  return typeof message?.content === "string" ? message.content : "";
}

function extractToolCalls(json: unknown): number {
  if (!json || typeof json !== "object") return 0;
  const choices = (json as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return 0;
  let count = 0;
  for (const choice of choices) {
    const message = (choice as { message?: { tool_calls?: unknown } }).message;
    if (Array.isArray(message?.tool_calls)) count += message.tool_calls.length;
  }
  return count;
}

async function main() {
  const list = targets();
  if (list.length === 0) {
    console.error(
      "対象がありません。--provider か --model で絞り込むか、データを確認してください。",
    );
    process.exit(2);
  }

  const opencodeVersion = process.env.OPENCODE_VERSION ?? null;
  const testedAt = new Date().toISOString();
  const updates: { modelId: string; verification: Verification[] }[] = [];
  let ran = 0;
  let skipped = 0;

  for (const target of list) {
    const apiKey = process.env[target.envVar];
    if (!apiKey) {
      console.log(
        `skip  ${target.provider.id}/${target.model.model_id} — ${target.envVar} が未設定`,
      );
      skipped += 1;
      continue;
    }
    if (target.provider.credit_card_required === "yes" && process.env.ALLOW_PAID_TIER !== "1") {
      console.log(
        `skip  ${target.provider.id}/${target.model.model_id} — 支払い方法の登録が必要な枠のため、ALLOW_PAID_TIER=1 がない限り実行しません`,
      );
      skipped += 1;
      continue;
    }

    console.log(`run   ${target.provider.id}/${target.model.model_id}`);
    const checks = await runChecks(target, apiKey);
    ran += 1;
    for (const check of checks) {
      console.log(`      ${check.method}: ${check.status} — ${check.notes}`);
    }

    // 既存の検証記録のうち、同じ method を置き換える。未実施の他の項目は残す。
    const next: Verification[] = target.model.verification.map((entry) => {
      const found = checks.find((check) => check.method === entry.method);
      return found
        ? {
            method: found.method,
            status: found.status,
            tested_at: testedAt,
            opencode_version: opencodeVersion,
            notes: found.notes,
          }
        : entry;
    });
    for (const check of checks) {
      if (!next.some((entry) => entry.method === check.method)) {
        next.push({
          method: check.method,
          status: check.status,
          tested_at: testedAt,
          opencode_version: opencodeVersion,
          notes: check.notes,
        });
      }
    }
    updates.push({ modelId: target.model.id, verification: next });

    // 無料枠を消費しすぎないよう、モデル間で間隔を空ける
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  console.log(
    `\n実行 ${ran} 件 / スキップ ${skipped} 件${isDryRun ? "（dry-run。--write でデータを更新します）" : ""}`,
  );

  if (ran === 0) {
    console.log("有効なキーがなかったため、検証は行っていません。データは変更しません。");
    return;
  }

  if (!shouldWrite) return;

  for (const update of updates) {
    const path = join(import.meta.dirname, "..", "data", "providers");
    // モデルが属するプロバイダーのファイルを探して書き換える
    const model = dataset.models.find((entry) => entry.id === update.modelId);
    if (!model) continue;
    const file = join(path, `${model.provider_id}.json`);
    const parsed = JSON.parse(readFileSync(file, "utf8")) as {
      provider: Provider;
      models: Model[];
    };
    const target = parsed.models.find((entry) => entry.id === update.modelId);
    if (!target) continue;
    target.verification = update.verification;
    writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
    console.log(`write ${file}`);
  }
  console.log("\nデータを更新しました。`npm run build:data` で生成物を更新してください。");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
