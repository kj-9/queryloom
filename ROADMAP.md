# Queryloom roadmap

Queryloomは、Agentがデータを確認し、複数の設計案を人に提示して承認を得た後、自由なSvelteで静的Data Appを作るための制作・検証レールである。Dashboardの契約は`dashboard.svelte`と`queryloom.yaml`だけに保つ。`path` resourceは`dist/`へ静的アセットとしてコピーし、HTTP(S)の`url` resourceはCORSを前提にブラウザが実行時取得する。

```text
data → inspect → design options → human approval → dashboard.svelte + queryloom.yaml → check → build → static Data App
```

Svelte、SQL、LayerChartはDashboard作者が直接使う。QueryloomはDSL、ドメイン固有コンポーネント、コネクタ基盤を作らず、Agentに必要な観測・制約・検証・配布を提供する。

## P0 — Agentが最後まで完走できる

### `queryloom check` を追加する

- 背景: `guide`は規約を示せるが、Agentが作ったプロジェクトを一括診断するCLI機能がない。
- 完了条件: YAML形式、resource定義、ローカルパスの存在、外部URL形式、`dashboard.svelte`のコンパイル、Tailwind生成、静的buildの失敗を対象と対処とともに表示できる。

### Scaffoldと開発環境を回帰テストする

- 背景: `init`で作る空プロジェクトと、リポジトリ内の参照例では実行経路が異なる。仮想エントリ、Tailwind、Svelte HMRも組み合わせている。
- 完了条件: 新規scaffoldに対して`inspect`、`guide`、`dev`、`build`が通る。Dashboard更新、Tailwindクラス更新、フィルタ操作を確認するブラウザE2Eテストがある。

### Agent向け契約を一本化する

- 背景: `url` resourceを実装済みにもかかわらず、guideとscaffoldの一部にはローカル限定の説明が残る。
- 完了条件: README、`init`、`guide`、設定バリデータ、参照例が、ローカル`path`と外部HTTP(S) `url`の同じ契約を説明・検証する。

## P1 — 配布後も原因が分かる

### Resourceの取得・登録を観測可能にする

- 背景: 現在はすべてのresourceを順にfetchしてDuckDB-Wasmへメモリ登録してから、全クエリが実行可能になる。
- 完了条件: resourceごとのサイズ、fetch時間、登録時間、失敗種別を開発時に確認できる。独立resourceの並列fetchを行う。

### 外部データの失敗を診断しやすくする

- 背景: CORS拒否、HTTPエラー、HTML誤配信、Parquet破損は利用者には似た失敗に見える。
- 完了条件: 実行時と`check`で原因・対象URL・対処を区別して表示する。versioned immutable URL、CDN cache、データ更新時の互換性をドキュメント化する。

### 静的ホストの公式レシピを提供する

- 背景: `dist/`は任意の静的ホストへ配置できるが、最初の利用者が配布設定を組み立てる負担はまだ残る。
- 完了条件: GitHub Pagesを最初の公式レシピとして、`dist/`をGitHub Actions artifactから公開する最小workflowと手順を提供する。Queryloomはportableなbuildと配布前診断を担い、ホストの認証・独自ドメイン・デプロイ操作は各プロジェクトが管理する。`queryloom deploy`は導入しない。

## P2 — 根拠あるDashboardをレビューできる

### Inspectから設計までの根拠を固定する

- 背景: Agentがもっとも間違えやすいのは、列名から業務意味や指標を推測してしまうこと。
- 完了条件: design出力が機械可読な形でも、各方向性の問い、KPI、SQL集計、フィルタ範囲、データ品質上の注意を表せる。実装前後にその根拠を確認できる。

### 生成品質の検証を段階的に追加する

- 背景: 自由なSvelteを守りながら、壊れた画面・過剰なmotion・アクセシビリティ低下を減らしたい。
- 完了条件: `check`またはE2Eでresource契約、主要なLoading/Error表示、reduced-motion、代表的な表示崩れを検査できる。独自のDashboard DSLは導入しない。

## P3 — ブラウザ分析の境界を実測する

### データ規模の対応範囲を定める

- 背景: 大きなCSVを全量fetchしてメモリ登録する方式には、通信量・起動時間・ブラウザメモリの限界がある。
- 完了条件: CSV/Parquet、`path`/`url`、端末条件ごとの起動時間とメモリを計測する。推奨データ規模、Parquet変換の指針、既知の上限を公開する。

### 必要性を確認してから最適化する

- 背景: 遅延ロード、永続キャッシュ、OPFS、Range読込は有用だが、早期に一般化すると契約を複雑にする。
- 完了条件: 実測を根拠に、遅延ロード・キャッシュ・OPFSの採否をOpenSpecで決める。

### Dashboard向けデータ圧縮の責務を定める

- 背景: 大きなCSVは配布サイズ、通信量、型推論、ブラウザメモリのすべてで不利になりやすい。一方で、一般的なETLや業務データの意味変換までQueryloomが担うべきではない。
- 完了条件: `inspect`の実測をもとにCSVからParquetへの変換を推奨できる。安全な需要が確認できた場合のみ、入力を変更せず別ファイルへ出力し、行数・スキーマ・サイズ差を報告するopt-inのローカル変換コマンドを設計する。build時の暗黙変換、リモートETL、データ意味の自動変更は行わない。

## Non-goals — 現在の静的モードでは扱わないこと

- リモートデータベース、認証、Connector抽象化、サーバーサイドクエリ
- Semantic Layer、Dashboard DSL、Agent MCP
- Dashboard専用のチャートコンポーネント。可視化はLayerChartを直接合成する。
- ホスト固有の認証・独自ドメイン・デプロイ操作を扱う`queryloom deploy`
- 業務意味を変える自動データ変換、リモートETL、build時の暗黙データ圧縮

## Deferred — いまは予定を置かないこと

- URL共有可能なフィルタ状態
- 複数Dashboard、ルーティング、公開・埋め込み管理
