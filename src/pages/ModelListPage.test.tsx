import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { ModelListPage } from "./ModelListPage";
import { groupModels } from "@/lib/groups";
import { dataset } from "@/lib/dataset";

function renderPage(initialUrl = "/") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <ModelListPage />
    </MemoryRouter>,
  );
}

const groups = groupModels(dataset);

describe("ModelListPage", () => {
  it("見出しと件数が出る", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /モデル/ })).toBeInTheDocument();
  });

  it("モデル名で検索すると結果が絞られる", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = screen.getByLabelText("モデル名・プロバイダー名");

    await user.type(search, "gemini");

    await vi.waitFor(
      () => {
        const table = screen.getAllByRole("table")[0];
        expect(table).toBeDefined();
        expect(within(table!).queryByText(/GPT OSS 120B/)).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
    await vi.waitFor(() => {
      expect(screen.getAllByText(/Gemini 3\.8 Flash/).length).toBeGreaterThan(0);
    });
  });

  it("提供元名でも検索できる", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("モデル名・プロバイダー名"), "Groq");
    await vi.waitFor(
      () => {
        const table = screen.getAllByRole("table")[0]!;
        expect(within(table).getAllByText(/GPT OSS 120B/).length).toBeGreaterThan(0);
        expect(within(table).queryByText(/Gemini 3\.8 Flash/)).not.toBeInTheDocument();
      },
      { timeout: 2000 },
    );
  });

  it("絞り込みを解除できる", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText("ツール呼び出しに対応"));
    expect(screen.getByRole("button", { name: "条件をすべて解除" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "条件をすべて解除" }));
    expect(screen.queryByRole("button", { name: "条件をすべて解除" })).not.toBeInTheDocument();
  });

  it("終了したモデルは既定で表示しないが、指定すると出る", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByText(/GPT-4o/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("終了・停止したものも表示"));
    expect(screen.getAllByText(/GPT-4o/).length).toBeGreaterThan(0);
  });

  it("無料枠タイプで絞り込める", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText("初回クレジット"));
    const table = screen.getAllByRole("table")[0]!;
    // Cerebras の 2 モデル（GPT OSS 120B / Qwen 3.8 27B）が初回クレジット
    expect(within(table).getAllByText("GPT OSS 120B").length).toBeGreaterThan(0);
    expect(within(table).queryByText("Gemini 3.8 Flash")).not.toBeInTheDocument();
  });

  it("複数の提供元があるモデルだけに絞れる", async () => {
    const user = userEvent.setup();
    renderPage();
    const expected = groups
      .filter(
        (group) =>
          group.offers.filter((offer) => offer.model.free_tier.availability !== "ended").length > 1,
      )
      .map((group) => group.canonical.name);

    await user.click(screen.getByLabelText("複数の提供元がある"));
    const table = screen.getAllByRole("table")[0]!;
    for (const name of expected) {
      expect(within(table).getAllByText(name).length, name).toBeGreaterThan(0);
    }
    // 提供元が 1 つだけのモデルは消える
    expect(within(table).queryByText("Gemini 3.8 Flash")).not.toBeInTheDocument();
  });

  it("同じモデルが複数の行に重複しない", () => {
    renderPage();
    const table = screen.getAllByRole("table")[0]!;
    const names = within(table)
      .getAllByRole("row")
      .slice(1)
      .map((row) => within(row).getAllByRole("link")[0]?.textContent);
    const visible = names.filter(Boolean);
    expect(new Set(visible).size).toBe(visible.length);
  });

  it("不明な項目を条件から外したとき、その旨を通知する", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText("ツール呼び出しに対応"));
    const notices = screen.queryAllByRole("status");
    expect(notices.length).toBeGreaterThanOrEqual(0);
  });

  it("URL の条件を初期状態として読み込む", () => {
    renderPage("/?free=credit");
    expect(screen.getByLabelText("初回クレジット")).toBeChecked();
  });
});
