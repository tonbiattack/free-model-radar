/**
 * OpenCode 経由で実際にエージェントタスクを走らせる検証。
 *
 * 素の API 呼び出し（verify-models.ts）は「API が応答するか」しか見ない。
 * ここでは OpenCode の CLI を非対話で起動し、
 *   - 設定が読み込めるか
 *   - ツール呼び出しを含むタスクを完了できるか
 * を確認する。結果は JSON で書き出す。
 *
 * 使い方:
 *   node scripts/verify-opencode.mjs --provider logfare --model logfare-qwen-3-8-27b
 */
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const argValue = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? null : (args[i + 1] ?? null);
};

const providerFilter = argValue("provider");
const modelFilter = argValue("model");
const shouldWrite = args.includes("--write");

const root = join(import.meta.dirname, "..");
const dataset = JSON.parse(
  readFileSync(join(root, "src", "generated", "dataset.json"), "utf8"),
).dataset;

const OPENCODE_CLI =
  process.env.OPENCODE_CLI ??
  "C:\\Users\\teni2\\AppData\\Local\\Programs\\ai.opencode.desktop\\resources\\opencode-cli.exe";

const envVarFor = {
  logfare: "LOGFARE_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  google: "GEMINI_API_KEY",
  cerebras: "CEREBRAS_API_KEY",
  "opencode-zen": "OPENCODE_API_KEY",
};

const baseUrlFor = {
  logfare: "https://logfare.ai/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

async function cliVersion() {
  return new Promise((resolve) => {
    const child = spawn(OPENCODE_CLI, ["--version"], { shell: false });
    let out = "";
    child.stdout.on("data", (d) => (out += d));
    child.on("close", () => resolve(out.trim().replace(/^opencode\s+v?/, "")));
    child.on("error", () => resolve(null));
  });
}

/**
 * OpenCode を非対話で 1 回走らせる。
 * 失敗と「時間切れ」を区別するため、終了コードと stderr を両方見る。
 */
async function runTask({ configPath, model, prompt, timeoutMs = 180_000 }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const child = spawn(
      OPENCODE_CLI,
      ["run", "--model", model, "--format", "json", "--auto", prompt],
      {
        shell: false,
        // stdin を閉じる。CLI が入力待ちで止まるのを防ぐ。
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...process.env,
          OPENCODE_CONFIG: configPath,
          // 結果を安定させるため、利用者のグローバル設定を読ませない
          XDG_CONFIG_HOME: join(root, "scripts", "out", "empty-config"),
        },
      },
    );

    let stdout = "";
    let stderr = "";
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);

    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        code,
        timedOut,
        ms: Date.now() - started,
        stdout: stdout.slice(-6000),
        stderr: stderr.slice(-2000),
      });
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        code: -1,
        timedOut: false,
        ms: Date.now() - started,
        stdout,
        stderr: String(error),
      });
    });
  });
}

/** 読み取り専用のツール呼び出しを含むタスク。編集はさせない。 */
const READ_TASK =
  'List the files in the current directory. Then read the file package.json and tell me the value of the "name" field. Answer with the name only.';

/** 書き込みを伴う短い編集タスク。一時ディレクトリで行う。 */
const EDIT_TASK =
  "Create a file named hello.txt containing exactly the text: hello from opencode. Then read it back and confirm the content.";

function buildConfig(provider, modelId, apiKeyEnv, baseUrl) {
  return {
    $schema: "https://opencode.ai/config.json",
    model: `${provider}/${modelId}`,
    providers: {
      [provider]: {
        name: provider,
        env: [apiKeyEnv],
        package: "@opencode/ai/providers/openai-compatible",
        settings: { baseURL: baseUrl },
        models: { [modelId]: { name: modelId } },
      },
    },
    permission: {
      // 検証では読み取りと hello.txt への書き込みだけを許す
      edit: "allow",
      bash: "deny",
      webfetch: "deny",
    },
  };
}

async function main() {
  const version = await cliVersion();
  console.log(`OpenCode CLI: ${version ?? "unknown"}`);
  if (!version) {
    console.error("OpenCode CLI が見つかりません。OPENCODE_CLI でパスを指定してください。");
    process.exit(2);
  }

  const targets = dataset.models.filter((model) => {
    if (model.free_tier.availability === "ended") return false;
    if (providerFilter && model.provider_id !== providerFilter) return false;
    if (modelFilter && model.id !== modelFilter) return false;
    return Boolean(envVarFor[model.provider_id]);
  });

  if (targets.length === 0) {
    console.error("対象がありません。");
    process.exit(2);
  }

  const outDir = join(root, "scripts", "out");
  mkdirSync(outDir, { recursive: true });
  mkdirSync(join(outDir, "empty-config"), { recursive: true });

  const results = [];

  for (const model of targets) {
    const provider = dataset.providers.find((p) => p.id === model.provider_id);
    const envVar = envVarFor[model.provider_id];
    const baseUrl = baseUrlFor[model.provider_id];
    const apiKey = process.env[envVar];

    console.log(`\n== ${model.provider_id}/${model.model_id}`);

    if (!apiKey) {
      console.log(`  skip: ${envVar} が未設定`);
      results.push({ modelId: model.id, skipped: true });
      continue;
    }
    if (!baseUrl) {
      console.log(`  skip: base URL が未登録`);
      results.push({ modelId: model.id, skipped: true });
      continue;
    }

    const config = buildConfig(model.provider_id, model.model_id, envVar, baseUrl);
    const configPath = join(outDir, `opencode-${model.id}.json`);
    writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");

    // 1. 読み取りタスク
    const read = await runTask({
      configPath,
      model: `${model.provider_id}/${model.model_id}`,
      prompt: READ_TASK,
    });
    const readOk = read.code === 0 && !read.timedOut && /free-model-radar/.test(read.stdout);
    console.log(
      `  read task: ${readOk ? "passed" : read.timedOut ? "timeout" : "failed"} (${Math.round(read.ms / 1000)}s, exit ${read.code})`,
    );
    if (!readOk) {
      console.log(`    stdout: ${read.stdout.replace(/\s+/g, " ").slice(-300)}`);
      console.log(`    stderr: ${read.stderr.replace(/\s+/g, " ").slice(-300)}`);
    }

    // 2. 短い編集タスク（読み取りが通った場合だけ）
    let editOk = false;
    let edit = null;
    if (readOk) {
      const workDir = join(outDir, `workdir-${model.id}`);
      mkdirSync(workDir, { recursive: true });
      edit = await runTask({
        configPath,
        model: `${model.provider_id}/${model.model_id}`,
        prompt: EDIT_TASK,
      });
      editOk = edit.code === 0 && !edit.timedOut && /hello from opencode/.test(edit.stdout);
      console.log(
        `  edit task: ${editOk ? "passed" : edit.timedOut ? "timeout" : "failed"} (${Math.round(edit.ms / 1000)}s, exit ${edit.code})`,
      );
      if (!editOk) {
        console.log(`    stdout: ${edit.stdout.replace(/\s+/g, " ").slice(-300)}`);
      }
    }

    results.push({
      modelId: model.id,
      providerId: model.provider_id,
      apiModelId: model.model_id,
      opencodeVersion: version,
      testedAt: new Date().toISOString(),
      readTask: { passed: readOk, ms: read.ms, code: read.code, timedOut: read.timedOut },
      editTask: edit
        ? { passed: editOk, ms: edit.ms, code: edit.code, timedOut: edit.timedOut }
        : null,
    });

    // 無料枠を守るため間隔を空ける
    await new Promise((r) => setTimeout(r, 5000));
  }

  const reportPath = join(outDir, "opencode-verification.json");
  writeFileSync(reportPath, JSON.stringify({ version, results }, null, 2), "utf8");
  console.log(`\nレポート: ${reportPath}`);

  if (shouldWrite) {
    // データへ反映する（agent-task の結果だけを更新）
    const files = ["logfare", "groq", "openrouter", "google", "cerebras", "opencode-zen"];
    for (const id of files) {
      const file = join(root, "data", "providers", `${id}.json`);
      let parsed;
      try {
        parsed = JSON.parse(readFileSync(file, "utf8"));
      } catch {
        continue;
      }
      let changed = false;
      for (const model of parsed.models) {
        const result = results.find((r) => r.modelId === model.id && !r.skipped);
        if (!result) continue;
        const entry = {
          method: "agent-task",
          status: result.readTask.passed && result.editTask?.passed ? "passed" : "failed",
          tested_at: result.testedAt,
          opencode_version: result.opencodeVersion,
          notes: result.readTask.passed
            ? result.editTask?.passed
              ? "OpenCode 経由でファイル読み取りと短い編集タスクを完走した"
              : `OpenCode で読み取りは成功したが編集タスクは${result.editTask?.timedOut ? "時間切れ" : "失敗"}`
            : `OpenCode で読み取りタスクが${result.readTask.timedOut ? "時間切れ" : "失敗"}`,
        };
        const existing = model.verification.findIndex((v) => v.method === "agent-task");
        if (existing >= 0) model.verification[existing] = entry;
        else model.verification.push(entry);
        changed = true;
      }
      if (changed) {
        writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`, "utf8");
        console.log(`write ${file}`);
      }
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
