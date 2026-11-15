import { Link } from "react-router-dom";
import { dataset } from "@/lib/dataset";

export function SiteFooter() {
  const ended = dataset.models.filter((model) => model.free_tier.availability === "ended").length;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__block">
          <h2>この数字は保証ではない</h2>
          <p>
            掲載している無料枠・レート制限は、記載の確認日時点で公式ドキュメントに書かれていた内容です。
            プロバイダーは予告なく条件を変更します。実際に使う前に、各モデルの詳細ページから公式の出典を開いて確認してください。
          </p>
          <p>
            当サイトは API
            キーを入力・送信・保存しません。設定例に含まれるのは環境変数の名前だけで、キーの値は入りません。
          </p>
        </div>

        <div className="site-footer__block">
          <h2>データの状態</h2>
          <dl className="footer-stats">
            <div>
              <dt>プロバイダー</dt>
              <dd>{dataset.providers.length}</dd>
            </div>
            <div>
              <dt>モデル</dt>
              <dd>{dataset.models.length}</dd>
            </div>
            <div>
              <dt>終了済み</dt>
              <dd>{ended}</dd>
            </div>
            <div>
              <dt>変更履歴</dt>
              <dd>{dataset.changelog.length}</dd>
            </div>
          </dl>
          <p className="site-footer__links">
            <Link to="/method">調査と検証の方法</Link>
            <Link to="/changes">変更履歴</Link>
            <a href="https://github.com/tonbiattack/free-model-radar">GitHub</a>
            <a href="https://github.com/tonbiattack/ai-plan-radar">
              ai-plan-radar（料金プラン比較）
            </a>
          </p>
        </div>
      </div>
      <p className="site-footer__note">
        掲載内容は情報提供のみを目的とし、各プロバイダーの利用規約に従う責任は利用者にあります。
        無料枠の範囲を超えた利用や、複数アカウントによる上限の回避を助長するものではありません。
      </p>
    </footer>
  );
}
