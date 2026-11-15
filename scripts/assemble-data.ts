import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import type {
  CanonicalModel,
  ChangeLogEntry,
  Model,
  Provider,
  WatchSource,
} from "../src/lib/schema";

/**
 * data/ 配下のファイルを 1 つに集約する。
 * プロバイダー単位でファイルを分けておくと、追加 PR が衝突しにくい。
 */
export function assembleDataset(dataDir = join(import.meta.dirname, "..", "data")): unknown {
  const providersDir = join(dataDir, "providers");
  const providers: Provider[] = [];
  const models: Model[] = [];

  for (const file of readdirSync(providersDir)
    .filter((name) => name.endsWith(".json"))
    .sort()) {
    const parsed = JSON.parse(readFileSync(join(providersDir, file), "utf8")) as {
      provider: Provider;
      models: Model[];
    };
    providers.push(parsed.provider);
    models.push(...parsed.models);
  }

  const latest = providers
    .flatMap((provider) => provider.sources.map((source) => source.checked_at))
    .sort()
    .at(-1);

  const canonical = JSON.parse(readFileSync(join(dataDir, "models.json"), "utf8")) as {
    models: CanonicalModel[];
  };
  const changelog = JSON.parse(readFileSync(join(dataDir, "changelog.json"), "utf8")) as {
    entries: ChangeLogEntry[];
  };
  const watch = JSON.parse(readFileSync(join(dataDir, "watch-sources.json"), "utf8")) as {
    sources: WatchSource[];
  };

  return {
    meta: { last_updated: latest ?? "1970-01-01", spec_version: "1.0.0" },
    canonical_models: canonical.models,
    providers,
    models,
    changelog: changelog.entries,
    watch_sources: watch.sources,
  };
}
