# Queryloom

`dashboard.svelte` と `queryloom.yaml` から、ローカルデータをブラウザ内で SQL 集計する静的ダッシュボードを生成する CLI。

Queryloom は、ダッシュボードの UI を DSL や特定のデザインシステムに閉じ込めない。画面は通常の Svelte コンポーネントとして書き、データ処理だけを DuckDB-Wasm に委ねる。

## v0 の契約

Dashboard を作る人（または Agent）が管理するのは次の二ファイルである。

```text
dashboard.svelte   # UI、SQL、状態、インタラクション
queryloom.yaml     # ローカルデータ資源の宣言
```

加えて、`queryloom.yaml` が参照する CSV または Parquet ファイルをプロジェクト内に置く。

```text
revenue-dashboard/
├── dashboard.svelte
├── queryloom.yaml
└── data/
    └── sales.csv
```

`queryloom build` は Svelte、DuckDB-Wasm、データファイルを bundle し、任意の静的ホスティングへ配置できる `dist/` を出力する。クエリはサーバーではなく閲覧者のブラウザで実行される。

## 使い方

```bash
bunx @queryloom/cli init sales-dashboard
cd sales-dashboard
bun install

# Agent が dashboard.svelte と queryloom.yaml を実装した後に実行する
bun run dev

# Scaffold済みプロジェクト以外でも実行できる
bunx @queryloom/cli dev
bunx @queryloom/cli build
bunx @queryloom/cli preview
bunx @queryloom/cli guide
```

Node.js 環境では `npx @queryloom/cli` でも同じ CLI を実行できることを配布要件とする。

### リポジトリ内でCLIを試す

公開前のCLIは、リポジトリ直下からそのまま実行できる。

```bash
bun run queryloom -- guide
bun run queryloom -- dev --root examples/revenue-dashboard
bun run queryloom -- build --root examples/revenue-dashboard
```

グローバルコマンドとして試す場合は、`bun run cli:link` を一度実行する。これはCLIをコンパイルしてローカルにリンクするため、その後は `queryloom guide` のように任意のディレクトリから実行できる。

`queryloom guide --format json` は、Agent がダッシュボードを実装する際の実行契約・利用可能なAPI・SQL・Loading・Tailwindの規約を返す。加えて、コンパクトなData Appの構成と標準カラーパレットを示す。これはUIを強制するデザインシステムではなく、最初の一画面を一貫して作るための指針である。ガイドはCLIに内蔵され、Dashboard作成者が管理するファイルを増やさない。

`queryloom init <directory>` はAgent用の空プロジェクトを作る。生成するのは実行用の`package.json`、空の`data/`、そしてAgentが埋める`dashboard.svelte`・`queryloom.yaml`だけであり、完成済みDashboardのテンプレートは配らない。

## データ定義

`queryloom.yaml` では、テーブル名とローカルファイルの対応だけを宣言する。

```yaml
resources:
  sales:
    path: ./data/sales.parquet
```

CSV と Parquet を扱う。ファイル形式は拡張子で判定し、`resources` のキー（上例では `sales`）を Svelte 側の SQL テーブル名として参照する。配列形式を使う場合は `name` を指定する。

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
└── revenue-dashboard/
```

開発は Bun workspace で行う。公開する CLI は Node.js 互換 ESM とし、Bun 固有 API には依存しない。

次の実装タスクは [ROADMAP.md](ROADMAP.md) で管理する。

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
- リモートデータ、認証、Connector 抽象化
- MotherDuck、Postgres、HTTP / Arrow
- Semantic Layer、Dashboard DSL、Agent MCP
- 公開・埋め込み管理
