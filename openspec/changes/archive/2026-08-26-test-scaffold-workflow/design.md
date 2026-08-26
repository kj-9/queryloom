## Context

CLI単体テストはあるが、`init`後の空プロジェクトをAgentが編集してから実ブラウザで使う経路を連続して保証していない。Svelte HMRとTailwindの仮想sourceはVite統合に依存するため、browser testが必要である。

## Goals / Non-Goals

**Goals:**

- 一時scaffoldプロジェクトのCLI・browser開発フローを再現可能に検証する。
- フィルタ、HMR、Tailwind再生成、build済み成果物を確認する。
- CIでも同一のheadless browser suiteを実行する。

**Non-Goals:**

- 任意のAgent生成Dashboardを自動評価すること、外部URLのCORS検査、性能測定。
- dashboard契約、runtime API、chart実装の変更。

## Decisions

### PlaywrightをCLI packageの統合テストに使う

PlaywrightのChromiumをCIで明示的にinstallし、Node testとは分けた`e2e` scriptから実行する。一時プロジェクトに小さなCSVとフィルタ付きSvelte dashboardを書き、CLIを子プロセスとして起動する。

既存のunit testだけでVite APIを呼ぶ案は、HMRとブラウザ上のTailwind適用を確認できないため採用しない。

### HMRは画面の事実で確認する

dev server表示後に`dashboard.svelte`の表示文言とTailwind classを変更し、full reload操作ではなく、ブラウザが更新されたDOMとcomputed styleを受け取ることを待つ。フィルタはQueryloom runtimeの依存を避け、Svelte stateの切替ができる最小Dashboardで確認する。

### CIとローカルの起動経路を揃える

テストはCLI sourceを使い、ポート・終了処理・一時ディレクトリを自ら管理する。CIはBun install後にPlaywright browser依存をinstallして同じscriptを実行する。

## Risks / Trade-offs

- [browser downloadでCI時間が増える] → browser suiteを専用scriptにし、失敗ログ・screenshotをartifactに残す。
- [HMR待機が不安定] → DOMとstyleの明示的な待機条件、固定テストデータ、確実なserver cleanupを使う。
