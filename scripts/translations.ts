/**
 * 説明文の英語訳。**原文の文字列をキー**にしている。
 * 配列の順序で対応させると、翻訳対象が増えたときに位置がずれて
 * 別の訳が入る事故が起きる（実際に起きた）。順序に依存させない。
 *
 * data/i18n/source.json に新しい原文が増えたら、ここに追記する。
 * `npm run i18n:build` が原文ハッシュへ変換する。
 */
export const translations: Record<string, string> = {
  ":free サフィックスの付いたモデルが無料で利用できる。":
    "Models with the :free suffix can be used at no cost.",
  ":free バリアント": ":free variant",
  "/connect で OpenCode を選び、API キーを貼り付ける。/models で選択する":
    "Run /connect, choose OpenCode, and paste your API key. Then pick a model with /models.",
  "$0.270 / M input, $0.850 / M output": "$0.270 / M input, $0.850 / M output",
  "$0.293 / M input, $2.253 / M output": "$0.293 / M input, $2.253 / M output",
  "$0.350 / M input, $0.750 / M output": "$0.350 / M input, $0.750 / M output",
  "1 リクエストあたり画像 2 枚、リクエスト全体で 10 MiB までの制限がある。":
    "Limits are 2 images per request and 10 MiB per request overall.",
  "1 日 100 リクエストの上限がある。": "Capped at 100 requests per day.",
  "1 日 100 リクエストまで": "Up to 100 requests per day",
  "1 分 40 リクエスト・同時 6 なら、エージェントの反復作業にも実用範囲。":
    "40 requests per minute with 6 concurrent is practical even for iterative agent work.",
  "10,000 Neurons / day": "10,000 Neurons / day",
  "10,000 Neurons / day（全モデル共有、00:00 UTC リセット）":
    "10,000 Neurons / day (shared across all models, resets at 00:00 UTC)",
  "10,000 Neurons は $0.11 相当。このモデルの入力単価 $0.270 / M トークンで計算すると、入力だけで約 40 万トークン分に当たる。":
    "10,000 Neurons is worth about $0.11. At this model's $0.270 / M input price, that covers roughly 400K input tokens.",
  "131,000 tokens, 最大出力 16,384": "131,000 tokens, max output 16,384",
  "131,072 tokens": "131,072 tokens",
  "131,072 tokens, 最大出力 32,768": "131,072 tokens, max output 32,768",
  "1M tokens, 最大出力 64K": "1M tokens, max output 64K",
  "1M tokens, 最大出力 64K / 1M": "1M tokens, max output 64K / 1M",
  "1M コンテキスト・最大出力 512K と公称値が大きい。実際にその長さを安定して扱えるかは未検証。":
    "The advertised 1M context and 512K max output are large. Whether that length works reliably in practice is untested.",
  "1M コンテキスト。地域制限があるため、利用前に自分の所在地を確認する。":
    "1M context. There are regional restrictions, so check your location before use.",
  "1M コンテキストでも RPD 50 が実用上の制約になる。":
    "Even with 1M context, 50 requests per day is the practical constraint.",
  "1M コンテキストの長文デコードが可能。ただし無料枠の TPM が実測上の制約になる。":
    "Long decodes up to 1M context are possible, but the free tier's TPM is the real constraint.",
  "1M コンテキストは大きいが、1 日 100 リクエストでは長いエージェント作業は続かない。":
    "1M context is large, but 100 requests per day will not sustain long agent runs.",
  "200K のコンテキストで、エージェント用途を想定した推論モデルと説明されている。":
    "A 200K-context reasoning model described as built for agent use.",
  "2026 年 7 月 30 日に完全終了した。Playground・モデルカタログ・推論 API・BYOK のいずれも利用できない。":
    "Fully retired on 30 July 2026. The playground, model catalog, inference API, and BYOK are all unavailable.",
  "2026-07-30 に GitHub Models は完全に終了。playground / catalog / inference API / BYOK は全顧客で利用不可":
    "GitHub Models was fully retired on 2026-07-30. Playground / catalog / inference API / BYOK are unavailable to all customers",
  "2026-07-30 に完全終了": "Fully retired on 2026-07-30",
  "24,000 tokens": "24,000 tokens",
  "27B クラスのため、複雑な多段タスクより単発の編集に向く。":
    "At 27B class, it suits single edits more than complex multi-step tasks.",
  "429 では Retry-After 以上待つ。連続で再試行するとキーが自動的に一時停止される。":
    "On 429, wait at least Retry-After. A key that keeps retrying is paused automatically.",
  "access_tier=standard, tools=true, context_length=256000":
    "access_tier=standard, tools=true, context_length=256000",
  "access_tier=standard, tools=true, context_length=262144":
    "access_tier=standard, tools=true, context_length=262144",
  "API のモデル ID にスラッシュが含まれる（economy/deepseek-v4.1-flash）。OpenCode の provider/model 区切りと衝突するため、素の API 呼び出しは成功するが OpenCode からは provider.no-route で解決できなかった（OpenCode 2.3.0 で検証）。":
    "The API model ID contains a slash (economy/deepseek-v4.1-flash), which collides with OpenCode's provider/model separator. A direct API call succeeds, but OpenCode could not resolve it (provider.no-route) as of OpenCode 2.3.0.",
  "base_url を https://generativelanguage.googleapis.com/v1beta/openai/ にすると OpenAI ライブラリから呼べる":
    "Setting base_url to https://generativelanguage.googleapis.com/v1beta/openai/ lets you call it from the OpenAI libraries",
  "Big Pickle は期間限定で無料。無料期間中のデータはモデル改善に使われうる":
    "Big Pickle is free for a limited time. Data collected during the free period may be used to improve the model",
  "Big Pickle、GLM-5.3-Flash Free、DeepSeek V4.1 Flash Free など 12 モデルが入力・出力とも Free":
    "12 models are free for both input and output, including Big Pickle, GLM-5.3-Flash Free, and DeepSeek V4.1 Flash Free",
  "Cerebras に恒久無料ティアはないことを公式 FAQ で確認。$5 クレジット（30 日失効）のみで、無料枠種別を「初回クレジット」に分類した。":
    "Confirmed in the official FAQ that Cerebras has no permanent free tier. Only a $5 credit (expires in 30 days), so the free tier type is classified as initial credit.",
  "Cerebras レート制限（Free Trial）": "Cerebras rate limits (Free Trial)",
  "chat/completions が応答した": "chat/completions responded",
  "chat/completions を提供するモデルのうち Standard ティアで使えるのは qwen-3.8-27b、gemma-4-26b など":
    "Of the models serving chat/completions, the Standard tier includes qwen-3.8-27b and gemma-4-26b",
  "Console のクレジットなしで使える。期間限定で終了することがある":
    "Usable without Console credits. May end at any time as it is time-limited",
  "context 1,000,000 / output 512,000": "context 1,000,000 / output 512,000",
  "context_length 262144, supported_parameters に tools / response_format / reasoning を含む":
    "context_length 262144, and supported_parameters includes tools / response_format / reasoning",
  "DeepSeek V4.1 Flash Free は期間限定で無料。ゼロ保持で学習に使わない":
    "DeepSeek V4.1 Flash Free is free for a limited time. It follows a zero-retention policy and is not used for training",
  "Developer ティアは支払い方法の登録で即時有効。登録だけでは即時課金されない":
    "The Developer tier activates immediately once you add a payment method. Registering alone does not charge you",
  "Discord サーバーへの参加": "Joining the Discord server",
  "Discord サーバーへの参加が必須。1 人 1 アカウントで、上限回避のためのアカウント・キー・IP のローテーションは禁止":
    "Joining the Discord server is required. One account per person; rotating accounts, keys, or IPs to bypass limits is prohibited",
  "Discord サーバーを退会すると推論が止まる。": "Leaving the Discord server stops inference.",
  "economy 版のため、提供元の構成や量子化が通常版と異なる可能性がある。":
    "Because this is the economy variant, its configuration or quantization may differ from the standard version.",
  "economy 版や -free 版は提供元の構成が異なる可能性がある。同一モデルとしてまとめるが、提供元ごとの注意は個別に表示する。":
    "The economy and -free variants may use a different configuration. They are grouped as the same model, but provider-specific caveats are shown individually.",
  "EU を含む一部の国・地域では利用できない。":
    "Not available in some countries and regions, including the EU.",
  "EU・アイスランド・リヒテンシュタイン・ノルウェーなどでは利用できない。":
    "Not available in the EU, Iceland, Liechtenstein, Norway, and some other regions.",
  "Free model variant: 20 RPM, 50 RPD（クレジット 10 未満）":
    "Free model variant: 20 RPM, 50 RPD (under 10 credits)",
  "Free Plan の RPM/RPD/TPM/TPD がモデルごとに表で公開されている":
    "Free Plan RPM/RPD/TPM/TPD are published per model in a table",
  "Free Plan のレート制限表に本モデルの記載がない。空欄を 0 や「不可」と解釈しないこと。":
    'This model has no row in the Free Plan rate limit table. Do not read the gap as 0 or "unavailable".',
  "Free Tier の Input / Output とも Free of charge":
    "Input and Output on the Free Tier are both free of charge",
  "Free Trial 64k / 有料 128k": "Free Trial 64k / paid 128k",
  "Free Trial 65k / 有料 131k": "Free Trial 65k / paid 131k",
  "Free Trial ティアの上限": "Free Trial tier limits",
  "Free Trial のクレジットは付与から 30 日で失効する。":
    "Free Trial credits expire 30 days after they are granted.",
  "Free Trial のコンテキスト長は 65K（有料ティアは 131K）。":
    "Free Trial context is 65K (paid tiers get 131K).",
  "Free Trial のレート制限": "Free Trial rate limits",
  "Free Trial の条件": "Free Trial requirements",
  "Free ティアで一部モデルの入力・出力が無料。データは製品改善に利用される":
    "Input and output are free on the Free tier for some models. Data is used to improve products",
  "Gemini API レート制限": "Gemini API rate limits",
  "Gemini API 料金（無料枠の有無）": "Gemini API pricing (free tier availability)",
  "GitHub Copilot とは別サービスであり、Copilot の提供状況とは関係しない。":
    "This is separate from GitHub Copilot and unrelated to Copilot's availability.",
  "GitHub Models が 2026-07-30 にサービスを完全終了。Playground・モデルカタログ・推論 API・BYOK がすべて利用不可になった。":
    "GitHub Models fully retired on 2026-07-30. The playground, model catalog, inference API, and BYOK all became unavailable.",
  "GitHub Models はサービス終了済み。履歴として保持している。":
    "GitHub Models has been retired. Kept as a historical record.",
  "GitHub Models 提供状況": "GitHub Models availability",
  "GitHub アカウント（終了前）": "GitHub account (before retirement)",
  "GLM-5.3-Flash Free は期間限定で無料。ゼロ保持で学習に使わない":
    "GLM-5.3-Flash Free is free for a limited time. It follows a zero-retention policy and is not used for training",
  "gpt-oss-120b: RPM 5 / Uncached TPM 30K / Total TPM 90K / TPH 1M / TPD 1M":
    "gpt-oss-120b: RPM 5 / Uncached TPM 30K / Total TPM 90K / TPH 1M / TPD 1M",
  "Groq はモデルの提供状況を頻繁に変えるため、利用前に必ず公式の制限画面を確認する。":
    "Groq changes model availability frequently, so always check the official limits page before use.",
  "Groq モデル一覧": "Groq model list",
  "Groq レート制限（Free Plan 表）": "Groq rate limits (Free Plan table)",
  "Groq 公式ドキュメントに OpenCode の設定手順がある":
    "Groq's official documentation includes OpenCode setup instructions",
  "inference/v1/models が context / output / tools / reasoning / structured_output を返す":
    "inference/v1/models returns context / output / tools / reasoning / structured_output",
  "input / output とも price 0": "price 0 for both input and output",
  "JSON モードはモデル一覧に structured_output の記載がないため不明。":
    "JSON mode is unknown because the model list has no structured_output entry.",
  "JSON モードはモデル一覧に記載がないため不明。":
    "JSON mode is unknown because the model list has no entry.",
  "Logfare の Discord サーバーに参加していることが利用条件。退会するとアクセスが止まる。":
    "You must be a member of the Logfare Discord server. Leaving it stops access.",
  "Logfare のモデル一覧（ティアと対応機能）": "Logfare model list (tiers and capabilities)",
  "Logfare のリクエスト上限": "Logfare request limits",
  "Logfare を追加。全ティアが無料で課金なし。Standard は 40/分・1,000/時・5,000/日・同時 6。Discord 参加が条件。":
    "Added Logfare. Every tier is free with no billing. Standard is 40/min, 1,000/h, 5,000/day with 6 concurrent. Discord membership is required.",
  "models フォールバック配列に有料モデルを入れると課金される。無料を保つには :free のみを並べる":
    "Putting a paid model in the models fallback array causes charges. To stay free, list only :free models",
  "MoE 構成。": "MoE architecture.",
  "Neuron 消費は入力・出力のトークン数で変動する。1 日の残量はダッシュボードで確認する。":
    "Neuron consumption varies with input and output tokens. Check the remaining daily allowance in the dashboard.",
  "Neurons は GPU 計算量の単位で、モデルごとの消費レートが異なる。":
    "Neurons measure GPU compute, and consumption per model differs.",
  "Neurons は全モデルで共有される。": "Neurons are shared across all models.",
  "Neurons は全モデルで共有されるため、1 モデルの消費が他モデルの枠を減らす。":
    "Neurons are shared across all models, so one model's usage reduces the others' headroom.",
  "NVIDIA の無料エンドポイントは試用目的とされ、個人情報や機密情報を送ってはいけないと明記されている。":
    "NVIDIA's free endpoints are designated for trial use, and their terms state you must not send personal or confidential information.",
  "NVIDIA 無料エンドポイントは試用のみ。個人情報・機密情報の送信不可。利用はログに残る":
    "NVIDIA free endpoints are for trial use only. Do not send personal or confidential information. Usage is logged",
  "OpenAI 互換 API": "OpenAI-compatible API",
  "OpenAI 互換 API。Anthropic Messages と OpenAI Responses も同じキーで使える。":
    "OpenAI-compatible API. The same key also works with Anthropic Messages and the OpenAI Responses API.",
  "OpenAI 互換エンドポイント https://generativelanguage.googleapis.com/v1beta/openai/ も提供されている。":
    "An OpenAI-compatible endpoint at https://generativelanguage.googleapis.com/v1beta/openai/ is also provided.",
  "OpenAI 互換エンドポイントを提供": "Provides an OpenAI-compatible endpoint",
  "OpenAI 互換レイヤーで tools / stream / response_format に対応":
    "The OpenAI-compatible layer supports tools / stream / response_format",
  "openai/gpt-oss-120b: RPM 30 / RPD 1K / TPM 8K / TPD 200K（Free Plan 表）":
    "openai/gpt-oss-120b: RPM 30 / RPD 1K / TPM 8K / TPD 200K (Free Plan table)",
  "OpenCode Zen に OpenCode から /connect だけで使える無料モデルが 12 件あることを確認。トークン課金は 0 で、クレジット追加は不要。":
    "Confirmed that OpenCode Zen offers 12 free models usable from OpenCode with /connect alone. Token billing is 0 and no credits are needed.",
  "OpenCode Zen のモデル一覧（料金 0 の判定を含む）":
    "OpenCode Zen model list (including the zero-price check)",
  "OpenCode Zen の料金と無料モデル": "OpenCode Zen pricing and free models",
  "OpenCode からは /connect で OpenCode を選ぶだけで接続できる。API キーを手動で設定する必要はない。":
    "From OpenCode you only need to run /connect and pick OpenCode. There is no need to configure an API key manually.",
  "OpenCode での接続方法": "How to connect from OpenCode",
  "OpenCode で読み取りタスクが失敗": "OpenCode failed the read task",
  "OpenCode のドキュメントに Groq 専用のセットアップ手順が用意されている。":
    "The OpenCode documentation provides Groq-specific setup steps.",
  "OpenCode の提供元が運営する推論ゲートウェイ。無料モデルはクレジットを追加せずに使える。":
    "An inference gateway run by the OpenCode maintainers. Free models are usable without adding credits.",
  "OpenCode 経由でファイル読み取りと短い編集タスクを完走した":
    "Completed a file read and a short edit task through OpenCode",
  "OpenCode 連携": "OpenCode integration",
  "OpenRouter の無料モデルは 20 RPM / 50 RPD（累計購入クレジット 10 未満）。10 以上で RPD が 1000 に上がる。":
    "OpenRouter free models are 20 RPM / 50 RPD (under 10 lifetime credits purchased). At 10 or more the daily cap rises to 1000.",
  "OpenRouter モデルカタログ API": "OpenRouter model catalog API",
  "OpenRouter 上限（無料モデル）": "OpenRouter limits (free models)",
  "Priority ティアでも無料枠の範囲は Standard と同じ扱い。":
    "The free tier allowance is treated the same as Standard even on the Priority tier.",
  "prompt / completion とも 0, context_length 1048576":
    "Both prompt and completion are 0, context_length 1048576",
  "prompt / completion とも 0（models API の pricing）":
    "Both prompt and completion are 0 (pricing from the models API)",
  "qwen-3.8-27b: RPM 300 / Uncached TPM 150K / Total TPM 750K":
    "qwen-3.8-27b: RPM 300 / Uncached TPM 150K / Total TPM 750K",
  "qwen/qwen3.8-27b: RPM 30 / RPD 1K / TPM 8K / TPD 200K（Free Plan 表）":
    "qwen/qwen3.8-27b: RPM 30 / RPD 1K / TPM 8K / TPD 200K (Free Plan table)",
  "response_format を指定して JSON を取得（keys: language, line_count）":
    "Requested response_format and received JSON (keys: language, line_count)",
  "RPD 1,000 は 1 日の試行回数の上限として意識する。":
    "Keep in mind that the daily cap of 1,000 requests limits how many attempts you get per day.",
  "RPD 50 は 1 日 50 リクエスト。エージェントの 1 タスクで数十ステップ消費するため、試用向けと考える。":
    "50 requests per day means 50 requests. A single agent task can burn dozens of steps, so treat this as trial use.",
  "RPM 300 と TPM 150K は Free Trial としては比較的寛容だが、クレジットは 30 日で失効する。":
    "RPM 300 and TPM 150K are relatively generous for a Free Trial, but credits expire in 30 days.",
  "RPM 5 はエージェントの反復実行には少なすぎる。":
    "5 requests per minute is far too few for iterative agent runs.",
  "SSE の data チャンクを確認": "Confirmed an SSE data chunk",
  "Standard / Priority の Free Tier 列が Free of charge":
    "The Free Tier column for Standard / Priority is free of charge",
  "Standard ティア": "Standard tier",
  "Standard ティア。最初の 24 時間は 10": "Standard tier. 10 for the first 24 hours",
  "Standard ティア。最初の 24 時間は 200": "Standard tier. 200 for the first 24 hours",
  "Standard ティア。最初の 24 時間は 500": "Standard tier. 500 for the first 24 hours",
  "Standard ティアでの提供": "Offered on the Standard tier",
  "Standard は無料。40/分・1,000/時・5,000/日、同時 6":
    "Standard is free: 40/min, 1,000/h, 5,000/day, 6 concurrent",
  "Standard: 40/分, 1,000/時, 5,000/日、同時 6。新規アカウントは最初の 24 時間 10/分, 200/時, 500/日、同時 2":
    "Standard: 40/min, 1,000/h, 5,000/day, 6 concurrent. New accounts get 10/min, 200/h, 500/day, 2 concurrent for the first 24 hours",
  "supported_parameters に response_format が含まれないため、JSON モードは未確認（非対応とは断定しない）。":
    "supported_parameters does not include response_format, so JSON mode is unverified (not confirmed as unsupported).",
  "Tool Use のドキュメントで tool calling に対応":
    "Tool Use documentation states tool calling is supported",
  "tool_calls を 1 件返した": "Returned one tool_call",
  "tools / tool_choice / reasoning を含み、response_format を含まない":
    "Includes tools / tool_choice / reasoning but not response_format",
  "TPM 8,000 はエージェント用途では厳しめ。1 ターンで長いファイルを読み込むと即座に上限へ達する。":
    "TPM of 8,000 is tight for agent use. Reading a long file in one turn hits the cap immediately.",
  "Workers AI 料金（無料割当）": "Workers AI pricing (free allocation)",
  "Workers Free プランでも 1 日 10,000 Neurons の無料割当が使える。":
    "The Workers Free plan also includes a free allocation of 10,000 Neurons per day.",
  アカウント作成: "Create an account",
  "アカウント作成時に最初の API キーが発行される。キーは作成時のみ表示される。":
    "Your first API key is issued when you sign up. A key is shown only once, at creation.",
  "アカウント全体で 1 日 10,000 Neurons を共有":
    "Shared across the account at 10,000 Neurons per day",
  "アカウント全体で 1 日 10,000 Neurons を共有。モデル単体の回数上限はない":
    "Shared across the account at 10,000 Neurons per day. There is no per-model request cap",
  "アカウント単位の共有枠のため、複数モデルを併用しても枠は増えない。":
    "Because the allowance is shared per account, adding more models does not increase it.",
  "オープンウェイト。提供元によっては A4B 表記が省略される。":
    "Open weights. Some providers omit the A4B suffix.",
  "オープンウェイトの推論モデル。複数の提供元が同じモデルを配信している。":
    "An open-weight reasoning model. Several providers serve the same model.",
  "キャッシュ未ヒット分（uncached）の上限": "Cap on cache misses (uncached tokens)",
  "クレジットを使い切るか失効すると、Pay as You Go を購入するまで API は停止する。":
    "If credits run out or expire, the API stops until you buy Pay as You Go credits.",
  "クレジット購入実績が 10 未満のアカウントの上限":
    "Cap for accounts that have purchased fewer than 10 credits",
  "クレジット購入実績が 10 未満のアカウントの上限。10 以上で 1000 に上がる":
    "Cap for accounts that have purchased fewer than 10 credits. At 10 or more it rises to 1000",
  "クレジット制のため、使い続けられるかは残額次第。":
    "Because it is credit-based, how long you can keep using it depends on the remaining balance.",
  "コーディング特化。": "Specialised for coding.",
  "コンテキスト 24K のため、システムプロンプトとツール定義だけでかなり消費する。":
    "With 24K context, the system prompt and tool definitions alone consume a large share.",
  "コンテキストが 24,000 トークンと小さく、エージェント用途では足りないことが多い。":
    "Context is a small 24,000 tokens, which is often not enough for agent work.",
  コンテキスト長: "Context length",
  "コンテキスト長・対応パラメータ": "Context length and supported parameters",
  "サービス自体が終了しているため、現在は無料枠を利用できない。":
    "The service itself has ended, so the free tier is not available now.",
  サービス終了: "Service ended",
  "ステルスモデルのため開発元が公表されていない。":
    "The developer is undisclosed because this is a stealth model.",
  "ゼロ保持方針のため、無料モデルの中では業務利用の制約が比較的小さい。":
    "The zero-retention policy makes this one of the less restrictive free models for work use.",
  ツール呼び出し: "Tool calling",
  "ツール呼び出しに対応するが、reasoning 機能は持たない。":
    "Supports tool calling but has no reasoning capability.",
  "ツール呼び出しに対応するが、モデル自体の reasoning 制御は不明。":
    "Supports tool calling, but the model's own reasoning controls are unknown.",
  "データが学習に使われうるため、業務コードには向かない。":
    "Data may be used for training, so it is unsuitable for work code.",
  データの扱い: "Data handling",
  データの扱いと地域制限: "Data handling and regional restrictions",
  "データを保持し、性能監視と学習に使う可能性がある。EU など一部地域では利用不可":
    "Retains data and may use it to monitor real-world performance and for training. Not available in the EU and some other regions",
  "トークン課金は 0。リクエスト数の上限は公式に数値の記載がない":
    "Token billing is 0. The official docs state no numeric request cap",
  "フォールバックに有料モデルを入れると、無料枠超過時に課金される。":
    "Putting a paid model in the fallback list means you are billed once you exceed the free allowance.",
  "プロジェクト単位。RPM/TPM/RPD で評価され、RPD は太平洋時間の深夜にリセット":
    "Per project. Evaluated by RPM/TPM/RPD, and RPD resets at midnight Pacific time",
  "プロバイダーはゼロ保持方針で、データを学習に使わないと明記されている。":
    "The provider follows a zero-retention policy and states that data is not used for training.",
  "プロバイダーは中国でホストされている。ゼロ保持で学習には使わないと明記されているが、管轄が異なる点は把握しておく。":
    "The provider hosts in China. It states zero retention and no training use, but note that the jurisdiction differs.",
  "モデル ID に economy/ 接頭辞が付く。通常版とは別の提供枠。":
    "The model ID carries an economy/ prefix. It is a separate offering from the standard version.",
  モデルごとの能力と上限: "Capabilities and limits per model",
  リクエスト上限: "Request limits",
  レート制限: "Rate limits",
  レート制限の適用単位: "Rate limit scope",
  "レート制限はプロジェクト単位で、固定値は公表されず AI Studio の Rate Limit 画面で確認する方式。":
    "Rate limits are per project. Fixed values are not published; check the Rate Limit page in AI Studio.",
  "レート制限は予告なく変動し、保証されないと明記されている。":
    "Rate limits can change without notice and are explicitly not guaranteed.",
  "一部のモデル（Kimi K2.6/K2.7、GLM 5.2/5.3、DeepSeek V4 系など）は有料プランか前払いクレジットが必要。":
    "Some models (Kimi K2.6/K2.7, GLM 5.2/5.3, DeepSeek V4 family, and others) require a paid plan or prepaid credits.",
  "一部モデルは Workers Paid か AI Gateway の前払いクレジットが必要":
    "Some models require Workers Paid or prepaid AI Gateway credits",
  "確認済みの支払い方法の登録が必要。登録しないと Playground / API が有効にならない":
    "A verified payment method is required. Without it, the Playground and API stay inactive",
  "学習には使わない。安全のため 30 日保持。一部地域では利用不可":
    "Not used for training. Retained 30 days for safety. Not available in some regions",
  "関数呼び出し・ストリーミング・構造化出力": "Function calling, streaming, structured output",
  "期間限定の無料提供。": "Free for a limited time.",
  "期間限定の無料提供。ステルスモデルのため、終了後に同じモデルが有料で残るとは限らない。":
    "Free for a limited time. As a stealth model, it may not remain available as a paid model after the free period.",
  "期間限定無料 12 モデル": "12 free models for a limited time",
  "固定値は非公表。AI Studio の Rate Limit 画面で確認する":
    "Fixed values are not published. Check the Rate Limit page in AI Studio",
  "公式に 1 日 100 リクエストまでの記載がある唯一の無料モデル":
    "The only free model whose official docs state a cap of 100 requests per day",
  "恒久無料ティアはない。Free Trial は $5 クレジットで 30 日間":
    "There is no permanent free tier. The Free Trial is a $5 credit valid for 30 days",
  "恒久無料ではない。クレジット失効後は API が停止する。":
    "Not permanently free. The API stops once the credit expires.",
  "恒久無料の枠はなく、Free Trial の $5 クレジットのみ。":
    "There is no permanent free allowance; only the Free Trial's $5 credit.",
  恒久無料枠の有無: "Permanent free tier availability",
  "購入クレジット 10 未満: 20 RPM / 50 RPD。10 以上: 20 RPM / 1000 RPD":
    "Fewer than 10 credits purchased: 20 RPM / 50 RPD. 10 or more: 20 RPM / 1000 RPD",
  "高速だが、Free Trial では RPM 5 とコンテキスト 65K が実用上の足枷になる。":
    "Fast, but on the Free Trial the 5 RPM and 65K context are the practical bottlenecks.",
  "最大出力 16K のため、大きなファイルの一括書き換えより差分編集に向く。":
    "With max output of 16K, it suits diff-style edits rather than rewriting whole large files.",
  支払い方法の登録: "Adding a payment method",
  "試用目的のため、機密コードを含むリポジトリでの利用は避ける。":
    "Because this is trial use, avoid using it on repositories that contain confidential code.",
  "終了済み。新規に設定しないこと。": "Retired. Do not configure it.",
  "終了済みの情報を「現在使える無料枠」として掲載しないために保持している。":
    "Kept so that retired information is not presented as a currently usable free tier.",
  "初回プロモーションクレジット。付与から 30 日で失効":
    "Initial promotional credit. Expires 30 days after it is granted",
  上限: "Limits",
  "上限はアカウントの全モデル・全 API 形式で共有される。モデルごとの枠ではない。":
    "Limits are shared across all models and API formats on the account. They are not per-model quotas.",
  "上限はアカウント単位で全モデル共有。": "Limits are per account and shared across all models.",
  "上限は無料モデル全体で共有される。複数の :free モデルを併用しても枠は増えない。":
    "Limits are shared across all free models. Using several :free models does not increase the allowance.",
  "上限値は予告なく変更されうる。": "Limit values may change without notice.",
  "全ティアが無料。課金なしで使え、支払い方法の登録も不要":
    "Every tier is free. No billing, and no payment method is required",
  "全ティア無料（Standard 40 RPM / 5,000 RPD）": "Free on every tier (Standard 40 RPM / 5,000 RPD)",
  "全リクエストの内容が記録される。": "All request content is recorded.",
  "全リクエストの内容が記録される。Standard は学習・販売には使われないが、ログは残る。":
    "All request content is recorded. Standard is not used for training or sale, but logs remain.",
  "全リクエストの内容は記録される。Premium はモデル学習、Pro は学習とデータ販売への同意が必要。":
    "All request content is recorded. Premium requires consent to model training; Pro requires consent to training and data sale.",
  対応パラメータ: "Supported parameters",
  "代替として Azure AI Foundry への移行が案内されている。":
    "Migration to Azure AI Foundry is suggested as an alternative.",
  "大量のファイル編集を一度に投げる用途より、小さな修正の反復に向く。":
    "Better suited to many small fixes than to submitting large multi-file edits at once.",
  "地域制限がある。": "There are regional restrictions.",
  "長いコンテキストを扱えるが、無料枠の TPM は低いため大きなリポジトリを一括投入すると 429 になりやすい。":
    "It can handle long context, but the free tier's TPM is low, so submitting a large repository at once tends to return 429.",
  "長いコンテキストを持つが、無料枠ではリクエスト数が先に尽きる。":
    "It has long context, but on the free tier the request count runs out first.",
  "低コスト枠のため無料ティアの上限も小さめに設定されやすい。":
    "Because this is a low-cost tier, the free tier limits also tend to be set lower.",
  "提供元がデータを保持し、モデルの実世界性能の監視と学習に使う可能性があると明記されている。":
    "The provider states that it retains data and may use it to monitor real-world model performance and for training.",
  "提供元が中国でホストしている。": "The provider hosts in China.",
  "提供元ごとにコンテキスト長・レート制限・有料区分が異なるため、モデルが同じでも実用性は同じではない。":
    "Context length, rate limits, and paid status differ by provider, so the same model is not equally practical everywhere.",
  "提供元ごとに量子化や最適化の違いがある（fp8 fast など）。":
    "There are differences in quantization and optimisation by provider (fp8 fast, for example).",
  "提供元によってモデル ID の区切り文字が違う（ハイフンとスラッシュ）。ID の文字列一致では同一性を判定できない。":
    "Providers use different separators in model IDs (hyphens vs slashes). String matching on IDs cannot determine identity.",
  "提供元はデータを学習に使わないが、安全のため 30 日間保持すると明記されている。":
    "The provider does not use data for training but states it is retained for 30 days for safety.",
  "入力 $0.350 / M, 出力 $0.750 / M。10,000 Neurons（$0.11 相当）では入力だけで約 31 万トークン分。":
    "Input $0.350 / M, output $0.750 / M. 10,000 Neurons (about $0.11) covers roughly 310K input tokens.",
  "標準（Standard）ティアは学習・販売への同意なしで使えるが、記録自体は残る。":
    "The Standard tier is usable without consenting to training or sale, but records are still kept.",
  "無料ティアのデータは製品改善に利用される。":
    "Data on the free tier is used to improve products.",
  "無料ティアの具体的な RPM/TPM/RPD は公表されず、AI Studio の Rate Limit 画面でプロジェクトごとに表示される":
    "Specific free-tier RPM/TPM/RPD are not published; they are shown per project on the Rate Limit page in AI Studio",
  "無料ティアの入力・出力は無料だが、送信内容が Google の製品改善に利用される。":
    "Input and output are free on the free tier, but what you send is used to improve Google's products.",
  "無料モデルには 1 分・1 日あたりのリクエスト上限があり、過去の購入クレジット額で日次上限が変わる。":
    "Free models have per-minute and per-day request caps, and the daily cap depends on lifetime credits purchased.",
  無料モデルの一覧と料金: "Free model list and pricing",
  無料モデルの上限: "Free model limits",
  無料モデルの利用条件: "Free model usage terms",
  "無料モデルは期間限定で、予告なく終了・差し替えになる。":
    "Free models are time-limited and may end or be swapped without notice.",
  "無料モデルは提供元の都合で停止・差し替えが起きやすい。":
    "Free models are easily paused or swapped at the provider's discretion.",
  "無料モデルをフォールバックに使うと、レート制限時に有料モデルへ流れて課金されることがある。":
    "Using a free model as a fallback can route to a paid model when rate-limited and incur charges.",
  "無料モデルを隠したい場合は OPENCODE_DISABLE_FREE_MODELS=1 を設定する。":
    "To hide free models, set OPENCODE_DISABLE_FREE_MODELS=1.",
  無料モデル共通の上限: "Limit shared across all free models",
  "無料モデル全体で枠を共有する。": "The allowance is shared across all free models.",
  無料割当: "Free allocation",
  "無料期間中は収集したデータがモデル改善に使われると明記されている。業務コードを送らないこと。":
    "Data collected during the free period is stated to be used for model improvement. Do not send work code.",
  無料提供とデータの扱い: "Free offering and data handling",
  無料提供の条件: "Requirements for the free offering",
  "無料版はカタログ上で独立したエントリとして提供され、料金は 0":
    "The free version is provided as a separate catalog entry with a price of 0",
  無料枠: "Free tier",
  "無料枠（Free Plan）はカード登録なしで使える。Developer Plan に上げると上限が増える。":
    "The free tier (Free Plan) works without a card. Upgrading to the Developer Plan raises the limits.",
  "無料枠では入力・出力とも無料だが、送信内容が製品改善に使われると明記されている。業務コードを扱う場合は有料枠との差を確認すること。":
    "Input and output are both free on the free tier, but what you send is stated to be used to improve products. Check how it differs from the paid tier before handling work code.",
  無料枠とレート制限: "Free tier and rate limits",
  無料枠のレート制限: "Free tier rate limits",
  "無料枠のレート制限はモデル単位で公表されている。":
    "Free tier rate limits are published per model.",
  "無料枠のレート制限表（2026-11-15 確認）に本モデルの行がないため、数値は非掲載":
    "This model has no row in the free tier rate limit table (checked 2026-11-15), so no numbers are listed",
  無料枠の種別: "Free tier type",
  "無料枠の上限は予告なく変更されうる。": "Free tier limits may change without notice.",
  無料枠の有無: "Free tier availability",
  "無料枠は 1 日あたり合計 10,000 Neurons。00:00 UTC にリセット":
    "The free allowance is 10,000 Neurons per day in total. Resets at 00:00 UTC",
  "無料枠はモデル単位の制限。": "The free allowance is a per-model limit.",
  "無料枠は恒久ではなく $5 クレジット（30 日失効）":
    "The free allowance is a $5 credit (expires in 30 days), not permanent",
  "無料枠は組織単位ではなくモデル単位の制限。":
    "The free allowance is a per-model limit, not an organisation-wide one.",
  有料プランへの移行条件: "Conditions for moving to a paid plan",
  有料モデル: "Paid models",
  有料モデルへのフォールバック: "Fallback to paid models",
  "有料版はコンテキストがより大きい。無料版は 200K に制限されている。":
    "The paid version has larger context. The free version is capped at 200K.",
  利用モデル: "Models available",
  利用条件: "Usage terms",
  "利用状況はセキュリティと製品改善のために記録される。":
    "Usage is recorded for security and product improvement.",
  料金: "Pricing",
  "料金・コンテキスト長": "Pricing and context length",
};
