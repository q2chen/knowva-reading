# Knowva - MVP開発タスク

## MVP開発のアクションプラン（タスクリスト）

1.  **設計フェーズ**
    *   [ ] 画面ワイヤーフレーム（主要画面のモックアップ）を作成する。
    *   [x] データ構造を設計する（Firestoreコレクション構造 + GCSパス構造）。
    *   [x] 技術スタック（言語、フレームワーク、DB、LLM API）を選定する。
        * バックエンド: Python (FastAPI)
        * フロントエンド: Next.js (App Router)
        * インフラ: Google Cloud Agent Engine
        * Agent Framework: ADK
        * DB: Firestore + Google Cloud Storage
    *   [x] AIエージェント設計（役割・責務・出力形式・ADK構成）を行う。
    *   [x] API設計（エンドポイント一覧・データフロー）を行う。
    *   [x] フロントエンド構成（ルーティング・コンポーネント構造）を設計する。
    *   [x] AIエージェントのプロンプト詳細設計を行う。
    *   [x] 認証設計（Firebase Auth、メール/パスワード認証）を行う。
2.  **開発フェーズ**
    *   [x] ユーザー認証機能（Firebase Auth メール/パスワード）とDBのセットアップを行う。
    *   [x] 読書記録・対話履歴のデータ保存・表示機能（基本的なCRUD）を実装する。
    *   [x] LLM API（Gemini）と連携し、「対話的振り返り」「学びの抽出」のプロンプトを設計・実装する。
    *   [x] 対話UI（テキスト入力のチャット形式）を実装する。
    *   [x] Insightの保存機能（対話中のツール呼び出しによる自動保存）を実装する。
    *   [x] プロファイル表示画面（読み取り専用）を実装する。
3.  **テスト・デプロイフェーズ**
    *   [ ] 全体の動作確認とバグ修正を行う。
    *   [ ] テスト環境にデプロイし、関係者で実際に使ってみる。

---

## Phase 2 タスク（`# TODO(phase2):` でコード内にも記録済み）

### データ保存
- [ ] GCS生ログ保存 - セッション終了時に対話ログをGCSに永続保存する（`sessions.py`）
- [ ] 生ログからのInsight再生成機能

### AIエージェント
- [ ] プロファイル抽出エージェント - 対話ログからユーザー属性・価値観を抽出しプロファイル更新（`sessions.py`）
- [ ] 推薦エージェント - プロファイルに基づく書籍推薦
- [ ] ルートオーケストレーター - 複数エージェントの切り替え・統括

### API・通信
- [ ] SSEストリーミング対応 - エージェント応答をリアルタイムにフロントへ配信（`sessions.py`）
- [ ] 推薦APIルーター追加（`main.py`）

### フロントエンド
- [ ] SSEストリーミング対応のチャットUI
- [ ] プロファイル画面の動的データ表示（プロファイル抽出エージェント連携後）
- [ ] 推薦画面の実装

### インフラ
- [ ] Agent Engineデプロイ対応 - `adk deploy agent_engine` でデプロイ。SessionServiceをAgent Engine管理に切り替え、`GOOGLE_GENAI_USE_VERTEXAI=TRUE`（APIキー不要、サービスアカウント認証）
- [ ] 本番Firebase Auth設定（Googleログイン等追加）
- [ ] CI/CDパイプライン構築 - GitHub Actions + `adk deploy agent_engine`。Workload Identity Federationでサービスアカウント認証。トリガーは `push: branches: [main]` のみ（パブリックリポジトリのためfork PRからのデプロイを防止）。Pool条件で `attribute.repository` と `attribute.ref` を制限すること

### 機能拡張
- [ ] 音声入力対応（Speech to Text）
- [ ] 読書履歴の可視化・分析機能
- [ ] 書籍検索API連携（Google Books等）
- [ ] ベクトル検索・全文検索基盤
