import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouteMeta } from "./RouteMeta";
import { dataset } from "@/lib/dataset";
import { groupModels } from "@/lib/groups";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMeta />
    </MemoryRouter>,
  );
}

const groups = groupModels(dataset);

describe("RouteMeta", () => {
  it("一覧ページのタイトルを設定する", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(document.title).toContain("Free Model Radar");
    });
  });

  it("モデル詳細ではモデル名を含むタイトルにする", async () => {
    const group = groups.find((entry) => entry.offers.length > 1)!;
    renderAt(`/models/${group.canonical.id}`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
      expect(document.title).toContain("提供元");
    });
  });

  it("提供元別では提供元名もタイトルに入れる", async () => {
    const group = groups.find((entry) => entry.offers.length > 0)!;
    const offer = group.offers[0]!;
    renderAt(`/models/${group.canonical.id}/${offer.provider.id}`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
      expect(document.title).toContain(offer.provider.name);
    });
  });

  it("終了した提供元でもタイトルは生成できる", async () => {
    const group = groups.find((entry) =>
      entry.offers.some((offer) => offer.model.free_tier.availability === "ended"),
    )!;
    const ended = group.offers.find((offer) => offer.model.free_tier.availability === "ended")!;
    renderAt(`/models/${group.canonical.id}/${ended.provider.id}`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
    });
  });

  it("存在しないモデルでは見つからない旨のタイトルにする", async () => {
    renderAt("/models/does-not-exist");
    await waitFor(() => {
      expect(document.title).toContain("見つかりません");
    });
  });

  it("扱っていない提供元の組み合わせでも見つからない旨にする", async () => {
    const group = groups.find((entry) => entry.offers.length === 1)!;
    renderAt(`/models/${group.canonical.id}/not-a-real-provider`);
    await waitFor(() => {
      expect(document.title).toContain("見つかりません");
    });
  });

  it("説明メタも更新する", async () => {
    const group = groups[0]!;
    renderAt(`/models/${group.canonical.id}`);
    await waitFor(() => {
      const content = document.querySelector('meta[name="description"]')?.getAttribute("content");
      expect(content).toBeTruthy();
      expect(content).toContain(group.canonical.name);
    });
  });

  it("末尾スラッシュがあってもタイトルが外れない", async () => {
    const group = groups[0]!;
    renderAt(`/models/${group.canonical.id}/`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
    });
  });
});
