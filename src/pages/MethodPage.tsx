import { dataset } from "@/lib/dataset";
import { formatDate } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

export function MethodPage() {
  const { locale, t } = useI18n();

  return (
    <>
      <header className="page-head">
        <h1>{t.method.title}</h1>
        <p>{t.method.intro}</p>
      </header>

      <div className="prose">
        <section>
          <h2>{t.method.signupTitle}</h2>
          <p>{t.method.signupIntro}</p>
          <dl className="def-list">
            <div>
              <dt>{t.signup.instant}</dt>
              <dd>{t.method.signupInstant}</dd>
            </div>
            <div>
              <dt>{t.signup.discord}</dt>
              <dd>{t.method.signupDiscord}</dd>
            </div>
            <div>
              <dt>{t.signup.waitlist}</dt>
              <dd>{t.method.signupWaitlist}</dd>
            </div>
            <div>
              <dt>{t.signup.paid}</dt>
              <dd>{t.method.signupPaid}</dd>
            </div>
          </dl>
          <p>{t.method.signupNote}</p>
        </section>

        <section>
          <h2>{t.method.perfTitle}</h2>
          <p>{t.method.perfIntro}</p>
          <p>{t.method.perfNote}</p>
        </section>

        <section>
          <h2>{t.method.triTitle}</h2>
          <p>{t.method.triIntro}</p>
        </section>

        <section>
          <h2>{t.method.numbersTitle}</h2>
          <p>{t.method.numbersIntro}</p>
          <p>{t.method.numbersMissing}</p>
        </section>

        <section>
          <h2>{t.method.freshnessTitle}</h2>
          <p>{t.method.freshnessIntro}</p>
        </section>

        <section>
          <h2>{t.method.testedTitle}</h2>
          <p>{t.method.testedIntro}</p>
          <ul>
            <li>{t.method.testedKeySkip}</li>
            <li>{t.method.testedNoCost}</li>
            <li>{t.method.testedOnce}</li>
            <li>{t.method.testedNoKeys}</li>
          </ul>
        </section>

        <section>
          <h2>{t.method.configTitle}</h2>
          <p>{t.method.configIntro}</p>
          <p>{t.method.configKeys}</p>
        </section>

        <section>
          <h2>{t.method.autoTitle}</h2>
          <p>{t.method.autoIntro}</p>
          <ul>
            <li>{t.method.autoFail}</li>
            <li>{t.method.autoReview}</li>
            <li>{t.method.autoKeep}</li>
          </ul>
        </section>

        <section>
          <h2>{t.method.scopeTitle}</h2>
          <ul>
            <li>{t.method.scopeKeys}</li>
            <li>{t.method.scopeAccounts}</li>
            <li>{t.method.scopeRealtime}</li>
            <li>{t.method.scopeBench}</li>
          </ul>
        </section>

        <section>
          <h2>{t.method.dataTitle}</h2>
          <dl className="facts">
            <div>
              <dt>{t.method.dataProviders}</dt>
              <dd>{dataset.providers.length}</dd>
            </div>
            <div>
              <dt>{t.method.dataModels}</dt>
              <dd>{dataset.models.length}</dd>
            </div>
            <div>
              <dt>{t.method.dataWatch}</dt>
              <dd>{dataset.watch_sources.length}</dd>
            </div>
            <div>
              <dt>{t.method.dataUpdated}</dt>
              <dd>{formatDate(dataset.meta.last_updated, locale)}</dd>
            </div>
            <div>
              <dt>{t.method.dataVerified}</dt>
              <dd>
                {
                  dataset.models.filter((m) => m.verification.some((v) => v.status === "passed"))
                    .length
                }
              </dd>
            </div>
          </dl>
          <p className="muted small">{t.method.dataVerifiedNote}</p>
        </section>
      </div>
    </>
  );
}
