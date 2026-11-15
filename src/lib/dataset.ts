import type { Dataset } from "./schema";
import generated from "../generated/dataset.json";

/**
 * データは `npm run build:data` がビルド時に検証して書き出す。
 * ブラウザ側でスキーマ検証をやり直さないため、Zod はバンドルに含まれない。
 * 生成物はコミットし、CI では「生成し直して差分が出ないこと」も確認する。
 */
export const dataset: Dataset = generated.dataset as Dataset;
export const validationWarnings = generated.warnings as {
  path: string;
  message: string;
}[];

export const providersById = new Map(dataset.providers.map((provider) => [provider.id, provider]));

export function providerOf(model: Dataset["models"][number]) {
  return providersById.get(model.provider_id);
}

export function modelPath(model: Dataset["models"][number]): string {
  return `/models/${model.id}`;
}
