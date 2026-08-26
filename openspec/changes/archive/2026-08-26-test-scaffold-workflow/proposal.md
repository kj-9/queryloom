## Why

`queryloom init`が生成する空プロジェクトと、リポジトリ内の参照Dashboardでは実行経路が異なる。Agentが実際にたどる`inspect → guide → dev → check → build`をブラウザまで含めて回帰テストし、CLI更新でscaffold体験を壊さないようにする。

## What Changes

- scaffold済みの一時プロジェクトを使う統合テスト基盤を追加する。
- `inspect`、両方の`guide`、`dev`、`check`、`build`、`preview`のCLI経路を検証する。
- ブラウザでDashboardの初期表示、フィルタ操作、Svelte HMR、Tailwindクラス更新を検証する。
- CIで再現可能なheadless browser実行を追加する。

## Capabilities

### New Capabilities

- `scaffold-workflow-testing`: 新規QueryloomプロジェクトのAgent向け開発フローをエンドツーエンドで回帰検証する。

### Modified Capabilities

- なし。

## Impact

- `packages/cli`のテスト基盤と開発依存関係、CI workflowを更新する。
- Dashboardの公開契約、runtime API、resource形式は変更しない。実ブラウザでの外部URL取得・Connector・ホスティングは対象外である。
