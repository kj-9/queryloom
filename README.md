# Queryloom

`dashboard.svelte` と `queryloom.yaml` から、ブラウザ内で SQL 集計する静的ダッシュボードを生成する CLI。

Queryloom は、ダッシュボードの UI を DSL や特定のデザインシステムに閉じ込めない。画面は通常の Svelte コンポーネントとして書き、データ処理だけを DuckDB-Wasm に委ねる。

## v0 の契約

Dashboard を作る人（または Agent）が管理するのは次の二ファイルである。

```text
dashboard.svelte   # UI、SQL、状態、インタラクション
queryloom.yaml     # データ資源の宣言
```

標準では、`queryloom.yaml` が参照する CSV または Parquet ファイルをプロジェクト内に置く。

```text
revenue-dashboard/
├── dashboard.svelte
├── queryloom.yaml
└── data/
    └── sales.csv
```

`queryloom build` は Svelte と DuckDB-Wasm、そしてプロジェクト内データを bundle し、任意の静的ホスティングへ配置できる `dist/` を出力する。外部URLのデータはbundleせず、閲覧者のブラウザで取得する。クエリはサーバーではなく閲覧者のブラウザで実行される。

## 使い方

```bash
bunx @queryloom/cli init sales-dashboard
cd sales-dashboard
bun install

# Agentが最初に与えられたデータを把握・設計する
bun run inspect -- data/<source> --format json
bun run guide -- --phase design

# Agent が dashboard.svelte と queryloom.yaml を実装した後に実行する
bun run dev

# Scaffold済みプロジェクト以外でも実行できる
bunx @queryloom/cli dev
bunx @queryloom/cli build
bunx @queryloom/cli preview
bunx @queryloom/cli guide
bunx @queryloom/cli inspect data/sales.csv --format json
```

Node.js 環境では `npx @queryloom/cli` でも同じ CLI を実行できることを配布要件とする。

`queryloom inspect <file-or-url> --format json` は、ローカルCSV / Parquet / `.duckdb`、またはHTTP(S)上のCSV / ParquetをDuckDB-Wasmに読み込み、テーブル・列型・行数・NULL数・概算distinct数・数値/時系列の範囲・先頭5行を返す。Agentはこの出力を根拠に設計する。外部URLのinspectにもCORSが必要である。`queryloom inspect --root .` は、`queryloom.yaml`で宣言済みの全リソースを同じ形式で確認する。

`queryloom guide --phase design` は、Agentが「このデータを可視化して」と依頼されたときに、入力を確認し、データの粒度・指標・フィルタ・品質上の注意を根拠に2〜3の方向性を提案して、ユーザーの選択を待つためのガイドである。承認後は`queryloom guide --format json`が、Dashboard実装時の実行契約・利用可能なAPI・SQL・Loading・Tailwind・transitionの規約を返す。加えて、コンパクトなData Appの構成と標準カラーパレットを示す。いずれもCLIに内蔵され、Dashboard作成者が管理するファイルを増やさない。

### リポジトリ内でCLIを試す

公開前のCLIは、リポジトリ直下からそのまま実行できる。

```bash
bun run queryloom -- guide
bun run queryloom -- dev --root examples/revenue-dashboard
bun run queryloom -- build --root examples/revenue-dashboard
```

グローバルコマンドとして試す場合は、`bun run cli:link` を一度実行する。これはCLIをコンパイルしてローカルにリンクするため、その後は `queryloom guide` のように任意のディレクトリから実行できる。

`queryloom init <directory>` はAgent用の空プロジェクトを作る。生成するのは実行用の`package.json`、空の`data/`、そしてAgentが埋める`dashboard.svelte`・`queryloom.yaml`だけであり、完成済みDashboardのテンプレートは配らない。

## データ定義

`queryloom.yaml` では、テーブル名とローカルファイルの対応だけを宣言する。

```yaml
resources:
  sales:
    path: ./data/sales.parquet
```

Dashboardが扱うのはCSVとParquetである。ファイル形式は拡張子で判定し、`resources` のキー（上例では `sales`）を Svelte 側の SQL テーブル名として参照する。配列形式を使う場合は `name` を指定する。`.duckdb` は設計時のinspect対象にはできるが、v0のブラウザDashboardのresourceにはまだ宣言しない。

`path` はプロジェクト内のデータを指し、build時に`dist/`へそのままコピーする。これは標準の静的配布方式である。データを別デプロイ・CDNで管理したい場合は、HTTP(S)の`url`を指定できる。この場合、データはbuild成果物へ含めず、閲覧者のブラウザが実行時に取得する。外部URLはCORSを許可し、内容変更時はURLをバージョニングすること。

```yaml
resources:
  sales:
    url: https://cdn.example.com/sales-2026-08.parquet
```

## Dashboard

`dashboard.svelte` は通常の Svelte コンポーネントである。Queryloom Runtime が提供する `query()` を使って、定義済みのテーブルを SQL で問い合わせる。Tailwind CSS は CLI にビルトインされているため、設定ファイルや CSS エントリなしでユーティリティクラスを使える。必要な局所的なスタイルは Svelte の `<style>` に併記できる。

```svelte
<script lang="ts">
  import { query } from '@queryloom/library';

  const revenue = query<{ revenue: number }>(`
    SELECT SUM(revenue) AS revenue
    FROM sales
  `);
</script>
```

v0 のサンプルは Region filter、Revenue KPI、月次 Revenue line chart と更新アニメーションを含む。

## リポジトリ

```text
packages/
├── cli/       # 公開パッケージ: @queryloom/cli
└── runtime/   # 実装ディレクトリ。公開パッケージ: @queryloom/library

examples/
├── revenue-dashboard/  # 維持する参照実装
└── address-data/       # Agent生成の実験例
```

開発は Bun workspace で行う。公開する CLI は Node.js 互換 ESM とし、Bun 固有 API には依存しない。

振る舞いやアーキテクチャを変える開発は [OpenSpec](openspec/) で提案・実装・検証する。次の優先課題は [ROADMAP.md](ROADMAP.md) で管理する。

## 採用技術

- Bun: 開発、依存管理、workspace、テスト
- TypeScript
- Svelte 5
- Vite と `@sveltejs/vite-plugin-svelte`: 開発サーバーと静的 build
- Tailwind CSS: CLI が自動注入する設定不要のユーティリティCSS
- DuckDB-Wasm: ブラウザ内 SQL と CSV / Parquet 読み込み
- LayerChart 2: Svelte 5で直接組む汎用チャート。CLIが同梱し、Dashboardから直接importする
- YAML: データ資源の定義

## v0 の対象外

- 複数 Dashboard
- リモートデータベース、認証、Connector 抽象化
- MotherDuck、Postgres、Arrow、サーバーサイドクエリ
- Semantic Layer、Dashboard DSL、Agent MCP
- 公開・埋め込み管理
