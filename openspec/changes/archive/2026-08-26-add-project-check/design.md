## Context

`loadProject`はYAML、必須ファイル、resourceの形式を検証し、`buildProject`はSvelte、Tailwind、Viteの静的buildを実行する。これらは既に`dev`と`build`から使われるが、利用者は失敗を再現・切り分けするために複数のコマンドを実行する必要がある。

`check`はCLIパッケージだけに追加し、Dashboardの二ファイル契約とbrowser-localのresource配信方式を維持する。

## Goals / Non-Goals

**Goals:**

- 単一の`queryloom check [--root <directory>]`で、Agentが作成したプロジェクトを検証する。
- 各検査を名前付きの段階として表示し、失敗には対象と修正方法を添える。
- 静的buildを実行してSvelteとTailwindの実際のコンパイルを検証し、通常の`dist/`を変更しない。
- scaffoldが`bun run check`を提供し、guideが`queryloom check`を成果物の最終検証として案内する。

**Non-Goals:**

- 外部resourceの取得、CORS、到達性、Parquet内容の検証。これはP1のruntime診断で扱う。
- データの変換、Connector、Dashboard DSL、runtime APIの変更。
- アプリ画面の操作や視覚的なE2E。これはP0のscaffold回帰テスト変更で扱う。

## Decisions

### 段階的なCLI診断にする

`check`は次の順に実行し、最初の失敗で非ゼロ終了する。

1. `queryloom.yaml`と`dashboard.svelte`を読み込み、既存の設定正規化を実行する。
2. 各local `path` resourceについて、通常ファイルとして存在し読み取り可能かを確認する。外部`url`は設定正規化済みのHTTP(S)形式だけを確認する。
3. `buildProject`を一時出力先で実行する。一時出力先は成功・失敗のいずれでも削除する。

各段階は人間向けの成功表示を出す。失敗はCLIのトップレベルで診断型エラーとして整形し、config/resource/buildの区分、対象、対処を提示する。既存の`build`はそのままViteエラーを出し、`check`だけが診断体験を担う。

代替案として`build --out-dir`を`check`の代替にする方法があるが、失敗種別と対処が得られず、通常の配布出力を汚す可能性があるため採用しない。

### 既存の検証ロジックを共有する

resourceのpath/url契約は`normalizeConfig`と`loadProject`を唯一の定義とする。local resource存在検査と一時buildを小さなCLIモジュールに集約し、サブコマンドとテストから直接呼べる形にする。

`init`が生成する`package.json`には`"check": "queryloom check"`を追加する。guideとscaffoldのresource説明をpath/url双方に揃えるが、仕様の重複は増やさない。

### buildを一時出力へ限定する

`check`のbuildはプロジェクト配下の一意な一時ディレクトリへ出力する。`dist/`を利用・削除しないため、開発者の既存成果物を安全に保つ。Viteがresourceの静的コピーまで完了することで、ローカルresourceの読込とTailwind/Svelteの結合を検証できる。

代替案の`dist/`へのbuildは速いが、検証コマンドが配布成果物を意図せず置換するため採用しない。

## Risks / Trade-offs

- [Vite buildは大きなresourceを一時コピーし、`check`が重くなる] → v0では実際の配布buildを検証する正確さを優先する。サイズ計測と最適化はP3で判断する。
- [URLは形式だけ通り、CORSやHTTP障害は残る] → 出力で明示し、P1で実行時の取得診断を追加する。
- [Viteエラーの表現が多様] → `check`は段階・対象・一般的な修正を必ず補い、元エラーも保持する。
