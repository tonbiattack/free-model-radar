import { assembleDataset } from "./assemble-data";
import { validateDataset, type ValidationIssue } from "../src/lib/validate";
import type { Dataset } from "../src/lib/schema";

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
  console.error("\nデータ検証に失敗しました。CI ではこの状態で公開しません。");
  process.exit(1);
}

const dataset = result.dataset as Dataset;
const permanent = dataset.models.filter((model) => model.free_tier.type === "permanent").length;
const ended = dataset.models.filter((model) => model.free_tier.availability === "ended").length;
const official = dataset.models.filter((model) =>
  model.sources.some((source) => source.source_type === "official"),
).length;

console.log(
  `データ検証 OK: プロバイダー ${dataset.providers.length} 件 / モデル ${dataset.models.length} 件 ` +
    `(恒久無料 ${permanent}, 終了 ${ended}, 公式出典あり ${official}) / 最終更新 ${dataset.meta.last_updated}`,
);
