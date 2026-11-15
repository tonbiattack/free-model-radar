import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { RouteMeta } from "./RouteMeta";
import { dataset } from "@/lib/dataset";
import { groupModels } from "@/lib/groups";

const groups = groupModels(dataset);

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/:locale/*" element={<RouteMeta />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("RouteMeta", () => {
  it("英語の一覧ページのタイトルを設定する", async () => {
    renderAt("/en");
    await waitFor(() => {
      expect(document.title).toContain("Free LLM APIs");
      expect(document.documentElement.lang).toBe("en");
    });
  });

  it("日本語の一覧ページは日本語のタイトルになる", async () => {
    renderAt("/ja");
    await waitFor(() => {
      expect(document.title).toContain("無料 LLM API");
      expect(document.documentElement.lang).toBe("ja");
    });
  });

  it("モデル詳細ではモデル名を含むタイトルにする", async () => {
    const group = groups.find((entry) => entry.offers.length > 1)!;
    renderAt(`/en/models/${group.canonical.id}`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
      expect(document.title).toContain("free providers");
    });
  });

  it("提供元別では提供元名もタイトルに入れる", async () => {
    const group = groups.find((entry) => entry.offers.length > 0)!;
    const offer = group.offers[0]!;
    renderAt(`/en/models/${group.canonical.id}/${offer.provider.id}`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
      expect(document.title).toContain(offer.provider.name);
    });
  });

  it("存在しないモデルでは見つからない旨のタイトルにする", async () => {
    renderAt("/en/models/does-not-exist");
    await waitFor(() => {
      expect(document.title).toContain("Page not found");
    });
  });

  it("扱っていない提供元の組み合わせでも見つからない旨にする", async () => {
    const group = groups.find((entry) => entry.offers.length === 1)!;
    renderAt(`/en/models/${group.canonical.id}/not-a-real-provider`);
    await waitFor(() => {
      expect(document.title).toContain("Page not found");
    });
  });

  it("canonical と hreflang をロケール単位で設定する", async () => {
    const group = groups[0]!;
    renderAt(`/ja/models/${group.canonical.id}`);
    await waitFor(() => {
      const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href");
      expect(canonical).toContain(`/ja/models/${group.canonical.id}`);
      const alternates = [...document.querySelectorAll('link[rel="alternate"][data-hreflang]')];
      const langs = alternates.map((link) => link.getAttribute("hreflang"));
      expect(langs).toContain("en");
      expect(langs).toContain("ja");
      expect(langs).toContain("x-default");
    });
  });

  it("説明メタも更新する", async () => {
    const group = groups[0]!;
    renderAt(`/en/models/${group.canonical.id}`);
    await waitFor(() => {
      const content = document.querySelector('meta[name="description"]')?.getAttribute("content");
      expect(content).toBeTruthy();
      expect(content).toContain(group.canonical.name);
    });
  });

  it("末尾スラッシュがあってもタイトルが外れない", async () => {
    const group = groups[0]!;
    renderAt(`/en/models/${group.canonical.id}/`);
    await waitFor(() => {
      expect(document.title).toContain(group.canonical.name);
    });
  });
});
