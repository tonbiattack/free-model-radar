import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ModelDetailPage } from "./ModelDetailPage";
import { groupModels } from "@/lib/groups";
import { dataset } from "@/lib/dataset";

const groups = groupModels(dataset);

function renderModel(modelId: string) {
  return render(
    <MemoryRouter initialEntries={[`/models/${modelId}`]}>
      <Routes>
        <Route path="/models/:modelId" element={<ModelDetailPage />} />
        <Route path="/models/:modelId/:providerId" element={<ModelDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderOffer(modelId: string, providerId: string) {
  return render(
    <MemoryRouter initialEntries={[`/models/${modelId}/${providerId}`]}>
      <Routes>
        <Route path="/models/:modelId" element={<ModelDetailPage />} />
        <Route path="/models/:modelId/:providerId" element={<ModelDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ModelDetailPage（モデル概要）", () => {
  it("モデル名を h1 に出し、提供元の比較表を出す", () => {
    const group = groups.find((entry) => entry.canonical.id === "gpt-oss-120b")!;
    renderModel(group.canonical.id);
    expect(
      screen.getByRole("heading", { level: 1, name: group.canonical.name }),
    ).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("複数提供元のモデルでは、提供元ごとの行が出る", () => {
    const group = groups.find((entry) => entry.offers.length > 1)!;
    renderModel(group.canonical.id);
    const table = screen.getByRole("table");
    for (const offer of group.offers) {
      expect(
        within(table).getAllByText(offer.provider.name).length,
        offer.provider.name,
      ).toBeGreaterThan(0);
    }
  });

  it("提供元ごとにレート制限が違うことを別々の行で示す", () => {
    // GPT OSS 120B は Groq と Cerebras で制限が違う
    renderModel("gpt-oss-120b");
    const table = screen.getByRole("table");
    expect(within(table).getAllByText("Groq").length).toBeGreaterThan(0);
    expect(within(table).getAllByText("Cerebras Inference").length).toBeGreaterThan(0);
  });

  it("提供元が 1 つだけのモデルでも比較表が出る", () => {
    const group = groups.find((entry) => entry.offers.length === 1)!;
    renderModel(group.canonical.id);
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("性能は外部リンクとして示す", () => {
    renderModel("gpt-oss-120b");
    const links = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("ai-plan-radar"));
    expect(links.length).toBeGreaterThan(0);
  });

  it("存在しないモデルでは見つからない旨を出す", () => {
    renderModel("does-not-exist");
    expect(screen.getByRole("heading", { name: "ページが見つかりません" })).toBeInTheDocument();
  });
});

describe("ModelDetailPage（提供元別）", () => {
  it("選んだ提供元の条件と設定例を出す", () => {
    const group = groups.find((entry) => entry.canonical.id === "gpt-oss-120b")!;
    const offer = group.offers.find((entry) => entry.provider.id === "groq")!;
    renderOffer(group.canonical.id, offer.provider.id);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(group.canonical.name);
    expect(screen.getByText(/Groq で使う/)).toBeInTheDocument();
    const code = screen.getByLabelText(/opencode\.json 設定例/);
    expect(code.textContent).toContain("GROQ_API_KEY");
  });

  it("提供元ごとに API のモデル ID が変わる", () => {
    const group = groups.find((entry) => entry.canonical.id === "qwen3-8-27b")!;
    const groq = group.offers.find((entry) => entry.provider.id === "groq");
    const logfare = group.offers.find((entry) => entry.provider.id === "logfare");

    if (groq) {
      const { unmount } = renderOffer(group.canonical.id, groq.provider.id);
      expect(screen.getAllByText(groq.model.model_id).length).toBeGreaterThan(0);
      unmount();
    }
    if (logfare) {
      renderOffer(group.canonical.id, logfare.provider.id);
      expect(screen.getAllByText(logfare.model.model_id).length).toBeGreaterThan(0);
    }
  });

  it("同じモデルの他の提供元へ移動する導線がある", () => {
    const group = groups.find((entry) => entry.offers.length > 1)!;
    const first = group.offers[0]!;
    renderOffer(group.canonical.id, first.provider.id);
    const compareLink = screen.getByRole("link", { name: "提供元を比較する" });
    expect(compareLink).toHaveAttribute("href", `/models/${group.canonical.id}`);
  });

  it("扱っていない提供元を指定すると見つからない旨を出す", () => {
    renderOffer("gpt-oss-120b", "openrouter");
    expect(screen.getByRole("heading", { name: "ページが見つかりません" })).toBeInTheDocument();
  });

  it("終了した提供元では設定例を出さない", () => {
    const group = groups.find((entry) =>
      entry.offers.some((offer) => offer.model.free_tier.availability === "ended"),
    )!;
    const ended = group.offers.find((offer) => offer.model.free_tier.availability === "ended")!;
    renderOffer(group.canonical.id, ended.provider.id);
    expect(
      screen.getByText(/終了したサービスのため、設定例は提供していません/),
    ).toBeInTheDocument();
  });

  it("数値の記載がない提供元では 0 と表示しない", () => {
    const group = groups.find((entry) =>
      entry.offers.some((offer) => offer.model.free_tier.limits.length === 0),
    )!;
    const offer = group.offers.find((entry) => entry.model.free_tier.limits.length === 0)!;
    renderOffer(group.canonical.id, offer.provider.id);
    expect(screen.getByText(/公式に数値の記載がありません/)).toBeInTheDocument();
    expect(screen.queryByText("0 RPM")).not.toBeInTheDocument();
  });

  it("設定例に API キーの値が含まれない", () => {
    const group = groups.find((entry) => entry.canonical.id === "gpt-oss-120b")!;
    const offer = group.offers.find((entry) => entry.provider.id === "cerebras")!;
    renderOffer(group.canonical.id, offer.provider.id);
    const code = screen.getByLabelText(/opencode\.json 設定例/);
    expect(code.textContent).not.toMatch(/sk-[A-Za-z0-9]{8,}/);
    expect(code.textContent).toContain("CEREBRAS_API_KEY");
  });
});
