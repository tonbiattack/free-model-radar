import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { RouteMeta } from "./RouteMeta";
import { dataset } from "@/lib/dataset";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <RouteMeta />
    </MemoryRouter>,
  );
}

describe("RouteMeta", () => {
  it("一覧ページのタイトルを設定する", async () => {
    renderAt("/");
    await waitFor(() => {
      expect(document.title).toContain("Free Model Radar");
    });
  });

  it("モデル詳細ではモデル名と無料枠種別をタイトルに入れる", async () => {
    const model = dataset.models.find((entry) => entry.free_tier.type === "permanent")!;
    renderAt(`/models/${model.id}`);
    await waitFor(() => {
      expect(document.title).toContain(model.display_name);
      expect(document.title).toContain("恒久無料");
    });
  });

  it("終了したモデルでもタイトルは生成できる", async () => {
    const ended = dataset.models.find((entry) => entry.free_tier.availability === "ended")!;
    renderAt(`/models/${ended.id}`);
    await waitFor(() => {
      expect(document.title).toContain(ended.display_name);
    });
  });

  it("存在しないモデルでは見つからない旨のタイトルにする", async () => {
    renderAt("/models/does-not-exist");
    await waitFor(() => {
      expect(document.title).toContain("見つかりません");
    });
  });

  it("説明メタも更新する", async () => {
    const model = dataset.models[0]!;
    renderAt(`/models/${model.id}`);
    await waitFor(() => {
      const content = document.querySelector('meta[name="description"]')?.getAttribute("content");
      expect(content).toBeTruthy();
      expect(content).toContain(model.display_name);
    });
  });
});
