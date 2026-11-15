import changelogFile from "../../data/changelog.json";
import modelsFile from "../../data/models.json";
import watchFile from "../../data/watch-sources.json";
import type {
  CanonicalModel,
  ChangeLogEntry,
  Dataset,
  Model,
  Provider,
  WatchSource,
} from "./schema";
import { validateDataset } from "./validate";

interface ProviderFile {
  provider: Provider;
  models: Model[];
}

/**
 * テスト専用。data/ 配下の生ファイルを集約して検証する。
 * 本番のクライアントはビルド時に生成した src/generated/dataset.json を読むため、
 * この経路では Zod がブラウザのバンドルに入らない。
 */
const files = import.meta.glob("/data/providers/*.json", { eager: true }) as Record<
  string,
  { default: ProviderFile }
>;

export function assembleDataset(): unknown {
  const providers: Provider[] = [];
  const models: Model[] = [];

  for (const path of Object.keys(files).sort()) {
    const file = files[path]?.default;
    if (!file) continue;
    providers.push(file.provider);
    models.push(...file.models);
  }

  const latest = providers
    .flatMap((provider) => provider.sources.map((source) => source.checked_at))
    .sort()
    .at(-1);

  return {
    meta: { last_updated: latest ?? "1970-01-01", spec_version: "1.0.0" },
    canonical_models: (modelsFile as { models: CanonicalModel[] }).models,
    providers,
    models,
    changelog: (changelogFile as { entries: ChangeLogEntry[] }).entries,
    watch_sources: (watchFile as { sources: WatchSource[] }).sources,
  };
}

/** 生成済みファイルと生データが一致しているかを確かめるための比較用。 */
export function loadAndValidate(): {
  ok: boolean;
  dataset: Dataset | null;
  errors: { path: string; message: string }[];
  warnings: { path: string; message: string }[];
} {
  return validateDataset(assembleDataset());
}
