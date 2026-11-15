import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { freeTierTypeLabel } from "@/lib/labels";

const staticTitles: Record<string, { title: string; description: string }> = {
  "/changes": {
    title: "変更履歴 — Free Model Radar",
    description:
      "無料枠・モデル・レート制限の変更履歴。検出日時・変更前後・出典つきで記録し、人手で確認したものだけを確定しています。",
  },
  "/method": {
    title: "調査と検証の方法 — Free Model Radar",
    description:
      "無料枠の 6 分類、3 値の機能情報、数値の適用範囲、鮮度の扱い、実機検証の条件と限界を公開しています。",
  },
  "/": {
    title: "Free Model Radar — OpenCode で使える無料 LLM API を根拠つきで探す",
    description:
      "OpenCode などのコーディングエージェントから課金なしで使える LLM API を、公式の出典・確認日・実機検証の状態つきで比較できます。",
  },
};

function describe(modelId: string): { title: string; description: string } {
  const model = dataset.models.find((entry) => entry.id === modelId);
  if (!model) {
    return {
      title: "ページが見つかりません — Free Model Radar",
      description: "指定されたページは存在しないか、掲載を終了しました。",
    };
  }
  const provider = dataset.providers.find((entry) => entry.id === model.provider_id);
  const limits = model.free_tier.limits
    .slice(0, 3)
    .map((limit) => `${limit.metric.toUpperCase()} ${limit.value.toLocaleString("ja-JP")}`)
    .join(", ");

  return {
    title: `${model.display_name}（${freeTierTypeLabel[model.free_tier.type]}）— Free Model Radar`,
    description:
      `${provider?.name ?? model.provider_id} の ${model.display_name}。` +
      `${freeTierTypeLabel[model.free_tier.type]}` +
      (model.context_tokens ? `、コンテキスト ${Math.round(model.context_tokens / 1000)}K` : "") +
      (limits ? `。主な制限: ${limits}` : "") +
      "。出典と確認日つきで掲載しています。",
  };
}

/**
 * ルートごとにタイトルと説明を更新する。
 * 直リンクはビルド時にルート別 HTML を書き出して対応済みだが、
 * クライアント側の遷移ではここで更新しないと最初のタイトルのまま残る。
 */
export function RouteMeta() {
  const { pathname } = useLocation();

  useEffect(() => {
    // 末尾スラッシュ（/models/x/ や /）を落として正規化する。
    // GitHub Pages はどちらの形でも返すため、ここで揃えないと一致しない。
    const path = pathname.replace(/\/+$/, "") || "/";
    const modelId = path.startsWith("/models/") ? path.slice("/models/".length) : null;

    const meta = modelId
      ? describe(modelId)
      : (staticTitles[path] ?? {
          title: "ページが見つかりません — Free Model Radar",
          description: "指定されたページは存在しないか、掲載を終了しました。",
        });

    document.title = meta.title;

    // 説明タグが無い場合も黙って諦めず、作ってから設定する
    let tag = document.querySelector('meta[name="description"]');
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
    tag.setAttribute("content", meta.description);
  }, [pathname]);
  return null;
}
