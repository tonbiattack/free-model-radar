import { Link } from "react-router-dom";
import { dataset } from "@/lib/dataset";
import { useI18n } from "@/lib/i18n";
import { withLocale } from "@/lib/locale";

export function SiteFooter() {
  const { locale, t } = useI18n();
  const ended = dataset.models.filter((model) => model.free_tier.availability === "ended").length;

  return (
    <footer className="site-footer">
      <div className="site-footer__inner">
        <div className="site-footer__block">
          <h2>
            {locale === "ja" ? "この数字は保証ではない" : "These numbers are not a guarantee"}
          </h2>
          <p>
            {locale === "ja"
              ? "掲載している無料枠・レート制限は、記載の確認日時点で公式ドキュメントに書かれていた内容です。プロバイダーは予告なく条件を変更します。実際に使う前に、各モデルの詳細ページから公式の出典を開いて確認してください。"
              : "The free tiers and rate limits shown are what the official documentation said on the stated check date. Providers change terms without notice. Before you rely on a number, open the source from the model page and confirm it."}
          </p>
          <p>
            {locale === "ja"
              ? "当サイトは API キーを入力・送信・保存しません。設定例に含まれるのは環境変数の名前だけで、キーの値は入りません。"
              : "This site never asks for, sends, or stores your API key. Configuration examples contain only environment variable names, never key values."}
          </p>
        </div>

        <div className="site-footer__block">
          <h2>{locale === "ja" ? "データの状態" : "Data status"}</h2>
          <dl className="footer-stats">
            <div>
              <dt>{t.meta.providers}</dt>
              <dd>{dataset.providers.length}</dd>
            </div>
            <div>
              <dt>{t.meta.models}</dt>
              <dd>{dataset.models.length}</dd>
            </div>
            <div>
              <dt>{locale === "ja" ? "終了済み" : "Retired"}</dt>
              <dd>{ended}</dd>
            </div>
            <div>
              <dt>{t.nav.changes}</dt>
              <dd>{dataset.changelog.length}</dd>
            </div>
          </dl>
          <p className="site-footer__links">
            <Link to={withLocale("/method", locale)}>{t.nav.method}</Link>
            <Link to={withLocale("/changes", locale)}>{t.nav.changes}</Link>
            <a href="https://github.com/tonbiattack/free-model-radar">GitHub</a>
            <a href="https://tonbiattack.github.io/ai-plan-radar/">
              {locale === "ja"
                ? "AI Plan Radar（AIコーディングサービスの料金・利用枠を比較）"
                : "AI Plan Radar (compare AI coding service plans and limits, in Japanese)"}
            </a>
          </p>
        </div>
      </div>
      <p className="site-footer__note">
        {locale === "ja"
          ? "掲載内容は情報提供のみを目的とし、各プロバイダーの利用規約に従う責任は利用者にあります。無料枠の範囲を超えた利用や、複数アカウントによる上限の回避を助長するものではありません。"
          : "This site is for information only. Following each provider's terms is your responsibility. Nothing here encourages use beyond a free tier or bypassing limits with multiple accounts."}
      </p>
    </footer>
  );
}
