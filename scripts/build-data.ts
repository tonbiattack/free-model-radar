import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { assembleDataset } from "./assemble-data";
import { validateDataset } from "../src/lib/validate";
import type { ValidationIssue } from "../src/lib/validate";

/**
 * データはビルド時に検証し、通ったものだけを JSON として書き出す。
 * クライアント側で Zod を再実行しないため、初回表示のバンドルが軽くなる。
 * 検証に失敗したら書き出さずに終了コード 1 を返し、CI で公開を止める。
 */
const root = join(import.meta.dirname, "..");
const outDir = join(root, "src", "generated");
const outFile = join(outDir, "dataset.json");

const result = validateDataset(assembleDataset());

function print(label: string, issues: ValidationIssue[]) {
  if (issues.length === 0) return;
  const stream = label === "エラー" ? console.error : console.warn;
  stream(`${label} (${issues.length})`);
  for (const issue of issues) {
    stream(`  - ${issue.path}: ${issue.message}`);
  }
}

print("エラー", result.errors);
print("警告", result.warnings);

if (!result.ok || !result.dataset) {
  console.error("\nデータ検証に失敗しました。生成を中止します。");
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });
writeFileSync(
  outFile,
  `${JSON.stringify({ dataset: result.dataset, warnings: result.warnings }, null, 2)}\n`,
  "utf8",
);

const { dataset } = result;
console.log(
  `データを書き出しました: ${outFile}\n` +
    `  プロバイダー ${dataset.providers.length} 件 / モデル ${dataset.models.length} 件` +
    ` / 監視対象 ${dataset.watch_sources.length} 件 / 最終更新 ${dataset.meta.last_updated}`,
);
