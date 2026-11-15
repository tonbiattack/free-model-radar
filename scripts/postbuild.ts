import { copyFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * GitHub Pages は SPA のルーティングを解決しないため、index.html を 404.html としても
 * 配置し、直リンクや再読み込みで一覧に戻れるようにする。
 * .nojekyll がないと、アンダースコア始まりのファイルが配信されない。
 */
export function writePagesFallback(distDir: string): { copied: boolean; wroteNoJekyll: boolean } {
  const indexPath = join(distDir, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error(`${indexPath} がありません。先に vite build を実行してください。`);
  }
  copyFileSync(indexPath, join(distDir, "404.html"));
  writeFileSync(join(distDir, ".nojekyll"), "", "utf8");
  return { copied: true, wroteNoJekyll: true };
}

if (process.argv[1]?.includes("postbuild")) {
  const dist = join(import.meta.dirname, "..", "dist");
  writePagesFallback(dist);
  console.log("404.html と .nojekyll を dist/ に出力しました。");
}
