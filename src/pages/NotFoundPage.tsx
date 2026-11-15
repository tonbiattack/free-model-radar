import { Link } from "react-router-dom";

export function NotFoundPage({ reason }: { reason?: string }) {
  return (
    <div className="empty-page">
      <h1>ページが見つかりません</h1>
      <p>{reason ?? "URL が変わったか、掲載を終了した可能性があります。"}</p>
      <p>
        <Link to="/" className="text-link">
          モデル一覧へ戻る
        </Link>
      </p>
    </div>
  );
}
