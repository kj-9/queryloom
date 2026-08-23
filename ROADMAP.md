# Queryloom roadmap

v0の核は、`dashboard.svelte` と `queryloom.yaml` だけで、ローカルCSV/Parquetをブラウザ内のDuckDB-Wasmで可視化できること。以下のタスクはこの二ファイル契約を増やさずに進める。

## P0 — 利用開始前に固めること

### `queryloom check` を追加する

- 背景: `queryloom guide` は規約を示せるが、プロジェクトを診断するCLI機能がまだない。
- 完了条件: YAMLの形式・リソースパスと存在・`dashboard.svelte` のコンパイル・Tailwind生成を診断し、失敗箇所を利用者向けに表示できる。

### 開発サーバーの信頼性を検証する

- 背景: 仮想エントリ、Tailwind、Svelte HMRを組み合わせている。Dashboard更新時に常に再描画・再生成されることをE2Eで保証したい。
- 完了条件: `dev` 起動、DashboardのSvelte更新、Tailwindクラス更新、フィルタ更新を確認するブラウザテストがある。

### ドキュメントと設定スキーマを一本化する

- 背景: READMEの`table`属性と実装の`name` / YAMLマップキーの扱いが一致していない。
- 完了条件: ひとつの正しいYAML形式をREADME・`queryloom guide`・設定バリデータで共有し、サンプルも同じ形式を使う。

## P1 — Agentが安全に実装できるRuntime

### SQLパラメータを渡せるようにする

- 背景: `query<T>(sql)` だけではフィルタを文字列連結で実装しがちになる。
- 完了条件: 値をバインドできる`query<T>(sql, params)`相当のAPIと、引用符を含むフィルタのテストがある。

### DuckDB値の正規化ヘルパーを提供する

- 背景: BIGINT・DECIMAL・日付などを各Dashboardが個別に`Number()` / `String()`へ変換している。
- 完了条件: 数値・文字列・日付の表示用変換をRuntimeから利用でき、ガイドとサンプルがそれを使う。

### セクション単位のクエリ状態を支援する

- 背景: Dive同様、ページ全体ではなくKPI・チャート・表を個別にLoading/Errorにするべき。
- 完了条件: Svelte 5ルーンと自然に使える`data` / `loading` / `error`のヘルパー、または同等の推奨パターンがある。

### 標準チャートを汎用化する

- 背景: 現在の`RevenueTrend`は`month` / `revenue`固定で、サンプル専用に近い。
- 完了条件: 任意のx/yフィールド、軸ラベル、値フォーマットを指定できるLine ChartをRuntimeから使える。特殊な可視化はD3で実装する。

## P2 — 大きめのローカルデータに備える

### リソース初期化を最適化する

- 背景: 現在はすべてのCSV/Parquetを順番にfetch・登録してからクエリ可能になる。
- 完了条件: 少なくともfetchを並列化し、データ量・初期化時間を計測できる。必要性が確認できた場合に遅延ロードを設計する。

## 明示的に後回しにすること

- URL共有可能なフィルタ状態
- リモートコネクタ、認証、サーバーサイドクエリ
- 複数Dashboard、ルーティング、公開・埋め込み管理
