import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ModelDetailPage } from "./ModelDetailPage";
import { dataset } from "@/lib/dataset";

function renderDetail(modelId: string) {
  return render(
    <MemoryRouter initialEntries={[`/models/${modelId}`]}>
      <Routes>
        <Route path="/models/:modelId" element={<ModelDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ModelDetailPage", () => {
  it("各モデルの詳細が表示される", () => {
    const model = dataset.models.find((entry) => entry.free_tier.type === "permanent")!;
    renderDetail(model.id);
    expect(screen.getByRole("heading", { level: 1, name: model.display_name })).toBeInTheDocument();
    expect(screen.getAllByText(model.model_id).length).toBeGreaterThan(0);
  });

  it("出典 URL が外部リンクとして並ぶ", () => {
    const model = dataset.models[0]!;
    renderDetail(model.id);
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("http"));
    expect(links.length).toBeGreaterThan(0);
  });

  it("レート制限の表に単位と適用範囲が出る", () => {
    const model = dataset.models.find((entry) => entry.free_tier.limits.length > 0)!;
    renderDetail(model.id);
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("適用範囲")).toBeInTheDocument();
  });

  it("数値の記載がない場合は 0 と表示しない", () => {
    const model = dataset.models.find((entry) => entry.free_tier.limits.length === 0)!;
    renderDetail(model.id);
    expect(screen.getByText(/公式に数値の記載がありません/)).toBeInTheDocument();
    expect(screen.queryByText("0 RPM")).not.toBeInTheDocument();
  });

  it("終了したモデルには設定例を出さない", () => {
    const ended = dataset.models.find((entry) => entry.free_tier.availability === "ended")!;
    renderDetail(ended.id);
    expect(
      screen.getByText(/終了したサービスのため、設定例は提供していません/),
    ).toBeInTheDocument();
  });

  it("設定例に API キーの値が含まれない", () => {
    const model = dataset.models.find(
      (entry) => entry.provider_id === "groq" && entry.free_tier.availability === "available",
    )!;
    renderDetail(model.id);
    const code = screen.getByLabelText(/opencode\.json 設定例/);
    expect(code.textContent).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(code.textContent).toContain("GROQ_API_KEY");
  });

  it("存在しないモデルでは見つからない旨を出す", () => {
    renderDetail("does-not-exist");
    expect(screen.getByRole("heading", { name: "ページが見つかりません" })).toBeInTheDocument();
  });

  it("不明な機能は「不明」と表示する", () => {
    const model = dataset.models.find((entry) => entry.capabilities.json_mode === "unknown");
    if (!model) return;
    renderDetail(model.id);
    expect(screen.getAllByText("不明").length).toBeGreaterThan(0);
  });
});
