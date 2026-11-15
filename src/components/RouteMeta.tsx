import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { groupModels } from "@/lib/groups";
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
  const group = groupModels(dataset).find((entry) => entry.canonical.id === modelId);
  if (!group) {
    return {
      title: "ページが見つかりません — Free Model Radar",
      description: "指定されたページは存在しないか、掲載を終了しました。",
    };
  }

  const providers = group.offers.map((offer) => offer.provider.name).join("、");
  const primary = group.offers[0]?.model;
  const limits = primary?.free_tier.limits
    .slice(0, 3)
    .map((limit) => `${limit.metric.toUpperCase()} ${limit.value.toLocaleString("ja-JP")}`)
    .join(", ");

  return {
    title: `${group.canonical.name} を無料で使える提供元 — Free Model Radar`,
    description:
      `${group.canonical.developer} の ${group.canonical.name}。${providers} が無料枠で提供しています。` +
      (primary ? freeTierTypeLabel[primary.free_tier.type] : "") +
      (limits ? `。主な制限: ${limits}` : "") +
      "。出典と確認日つきで掲載しています。",
  };
}

function describeOffer(
  modelId: string,
  providerId: string,
): { title: string; description: string } {
  const group = groupModels(dataset).find((entry) => entry.canonical.id === modelId);
  const offer = group?.offers.find((entry) => entry.provider.id === providerId);
  if (!group || !offer) {
    return {
      title: "ページが見つかりません — Free Model Radar",
      description: "指定されたページは存在しないか、掲載を終了しました。",
    };
  }

  return {
    title: `${group.canonical.name}（${offer.provider.name}）— Free Model Radar`,
    description: `${offer.provider.name} で ${group.canonical.name} を無料で使う条件と、OpenCode の設定例。API のモデル ID は ${offer.model.model_id}。`,
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
    const segments = path.split("/").filter(Boolean);

    let meta: { title: string; description: string };
    if (segments[0] === "models" && segments.length >= 2) {
      const modelId = segments[1] ?? "";
      const providerId = segments[2];
      meta = providerId ? describeOffer(modelId, providerId) : describe(modelId);
    } else {
      meta = staticTitles[path] ?? {
        title: "ページが見つかりません — Free Model Radar",
        description: "指定されたページは存在しないか、掲載を終了しました。",
      };
    }

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
