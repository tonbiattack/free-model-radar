import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { writePagesFallback } from "./postbuild";

const dirs: string[] = [];

function makeDist(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), "fmr-dist-"));
  dirs.push(dir);
  writeFileSync(join(dir, "index.html"), html, "utf8");
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("writePagesFallback", () => {
  it("index.html を 404.html に複製する", () => {
    const dir = makeDist("<html>app</html>");
    writePagesFallback(dir);
    expect(readFileSync(join(dir, "404.html"), "utf8")).toBe("<html>app</html>");
  });

  it(".nojekyll を作る", () => {
    const dir = makeDist("<html></html>");
    writePagesFallback(dir);
    expect(readFileSync(join(dir, ".nojekyll"), "utf8")).toBe("");
  });

  it("index.html がない場合は理由つきで失敗する", () => {
    const dir = makeDist("");
    rmSync(join(dir, "index.html"));
    expect(() => writePagesFallback(dir)).toThrow(/vite build/);
  });
});
