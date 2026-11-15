import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ModelListPage } from "./ModelListPage";
import { groupModels } from "@/lib/groups";
import { dataset } from "@/lib/dataset";
import { I18nProvider } from "@/lib/i18n";
import { messages } from "@/lib/messages";

function renderPage(initialUrl = "/en", locale: "en" | "ja" = "en") {
  return render(
    <MemoryRouter initialEntries={[initialUrl]}>
      <I18nProvider value={{ locale, t: messages[locale] }}>
        <Routes>
          <Route path="/:locale" element={<ModelListPage />} />
        </Routes>
      </I18nProvider>
    </MemoryRouter>,
  );
}

const groups = groupModels(dataset);

describe("ModelListPage", () => {
  it("見出しと件数が出る", () => {
    renderPage();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /model/ })).toBeInTheDocument();
  });

  it("モデル名で検索すると結果が絞られる", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = screen.getByLabelText("Model or provider name");

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
    await user.type(screen.getByLabelText("Model or provider name"), "Groq");
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
    await user.click(screen.getByLabelText("Supports tool calling"));
    expect(screen.getByRole("button", { name: "Clear all filters" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear all filters" }));
    expect(screen.queryByRole("button", { name: "Clear all filters" })).not.toBeInTheDocument();
  });

  it("終了したモデルは既定で表示しないが、指定すると出る", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByText(/GPT-4o/)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Show retired models"));
    expect(screen.getAllByText(/GPT-4o/).length).toBeGreaterThan(0);
  });

  it("無料枠タイプで絞り込める", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByLabelText("Initial credit"));
    const table = screen.getAllByRole("table")[0]!;
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

    await user.click(screen.getByLabelText("Has multiple providers"));
    const table = screen.getAllByRole("table")[0]!;
    for (const name of expected) {
      expect(within(table).getAllByText(name).length, name).toBeGreaterThan(0);
    }
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

  it("URL の条件を初期状態として読み込む", () => {
    renderPage("/en?free=credit");
    expect(screen.getByLabelText("Initial credit")).toBeChecked();
  });

  it("日本語では日本語のラベルになる", () => {
    renderPage("/ja", "ja");
    expect(screen.getByLabelText("ツール呼び出しに対応")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: /モデル/ })).toBeInTheDocument();
  });
});
