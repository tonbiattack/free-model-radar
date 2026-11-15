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
  const connection = await chatRequest(provider, model, apiKey, {
    model: model.model_id,
    messages: [{ role: "user", content: "Reply with the single word: ok" }],
    max_tokens: 16,
    stream: false,
  });

  if (!connection.ok) {
    const hint =
      connection.status === 429
        ? "レート制限（無料枠の上限に達した可能性）"
        : connection.status === 401 || connection.status === 403
          ? "認証エラー（キーまたは権限）"
          : connection.status === 404
            ? "モデル ID またはベース URL が違う"
            : connection.status === 0
              ? "ネットワーク到達不可"
              : `HTTP ${connection.status}`;
    results.push({
      method: "connection",
      status: "failed",
      notes: `${hint}: ${connection.text.slice(0, 240)}`,
    });
    // 接続できないなら以降の検証は意味がない
    return results;
  }

  results.push({ method: "connection", status: "passed", notes: "chat/completions が応答した" });

  // 2. ストリーミング（最初のチャンクが届くかだけを見る）
  const stream = await chatRequest(provider, model, apiKey, {
    model: model.model_id,
    messages: [{ role: "user", content: "Count from 1 to 3." }],
    max_tokens: 32,
    stream: true,
  });
  results.push({
    method: "streaming",
    status: stream.ok && stream.text.includes("data:") ? "passed" : "failed",
    notes: stream.ok
      ? stream.text.includes("data:")
        ? "SSE の data チャンクを確認"
        : "応答は返ったが SSE 形式ではなかった"
      : `HTTP ${stream.status}`,
  });

  // 3. ツール呼び出し（関数を 1 つ提示し、呼び出しを要求するか）
  const tools = await chatRequest(provider, model, apiKey, {
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
    status: tools.ok ? (toolCalls > 0 ? "passed" : "failed") : "failed",
    notes: tools.ok
      ? toolCalls > 0
        ? `tool_calls を ${toolCalls} 件返した`
        : "tool_calls を返さなかった（モデルまたは互換レイヤーの制約）"
      : `HTTP ${tools.status}`,
  });

  return results;
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
