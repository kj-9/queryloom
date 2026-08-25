## Why

現在のQueryloomは、`guide`で作法を示し、`build`で成果物を作れる一方、Agentが作成したDashboardプロジェクトを一つのコマンドで診断できない。設定、データresource、Svelte、Tailwind、静的buildのどこで失敗したかを早く特定できる検証レールが必要である。

## What Changes

- `queryloom check` コマンドを追加し、指定プロジェクトを診断する。
- 設定の読み込み、resource宣言、ローカルresourceの存在、外部URL形式、Svelte/Tailwindを含む静的buildを検証する。
- 失敗時に、対象ファイルまたはresourceと次に取るべき対処を表示する。
- `check`の利用方法をscaffoldとAgent guideに記載し、Agentの最終検証手順を統一する。

## Capabilities

### New Capabilities

- `project-validation`: DashboardプロジェクトをCLIから一括検証し、診断可能な結果を返す。

### Modified Capabilities

- なし。

## Impact

- `packages/cli`にpublic CLIサブコマンドとテストを追加する。
- `queryloom init`が生成する`package.json`とAgent guideの最終手順を更新する。
- `@queryloom/library`の公開API、resource契約、静的配布モデルは変更しない。Connector、認証、サーバーサイド実行は対象外である。
