# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Knowva（ノヴァ）は、AIによる読書体験支援アプリケーション。ユーザーが読んだ本の感想や学びを対話的に言語化し、読書傾向（プロファイル）を蓄積・可視化し、次に読むべき本を推薦する。

**コアバリュー:** 読書体験を「時間とともに変化する思想の履歴」として長期保存する。完全な対話ログを不変データとして保存し、将来のAIモデルによる再解釈を可能にする。

## プロジェクト状態

MVP実装済み。以下の機能が動作する：
- Firebase Auth（メール/パスワード）によるユーザー認証
- 読書記録のCRUD
- 読書振り返りエージェントとの対話（ADK + Gemini）
- 対話からのInsight抽出・保存
- プロファイル表示（読み取り専用、静的）

Phase 2の機能（GCS生ログ保存、プロファイル抽出エージェント、推薦エージェント、SSEストリーミング等）はコード内に`# TODO(phase2):` コメントで記録されている。

## ローカル開発環境の起動

### 前提条件
- Node.js 18+
- Python 3.11+
- uv（Pythonパッケージマネージャ）
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Firebase Emulator起動
```bash
firebase emulators:start
```
Auth(9099)、Firestore(8080)、Emulator UI(4000) が起動する。

### 2. バックエンド起動
```bash
cd backend
cp .env.example .env  # 初回のみ。GOOGLE_API_KEYを設定すること
uv run uvicorn knowva.main:app --reload --port 8000
```

### 3. フロントエンド起動
```bash
cd frontend
npm install  # 初回のみ
npm run dev
```

http://localhost:3000 でアクセス可能。

### 環境変数（backend/.env）
- `GOOGLE_API_KEY` - Gemini APIキー（必須）
- `GOOGLE_GENAI_USE_VERTEXAI=FALSE` - Vertex AIを使わない設定
- `USE_EMULATOR=true` - エミュレータ使用フラグ
- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`

## ドキュメント構成

- `docs/requirements.md` - 機能要件、MVPゴール、ユーザージャーニー、エージェント役割
- `docs/architecture.md` - 技術アーキテクチャ、データモデル、技術スタック
- `docs/tasks.md` - MVP開発タスクチェックリスト

## アーキテクチャ

### 三層構成

1. **実行基盤（Agent Engine）** - 会話実行・ツール実行・セッション管理（ADK + LLM API）
2. **長期保存層（本丸）** - 二層データ戦略（下記参照）
3. **検索基盤** - ベクトル検索・全文検索（Phase 2以降）

### データ保存の二層化戦略

- **生ログ層（Google Cloud Storage）:** 対話の完全ログをJSON形式で永続保存。不変・削除なし。将来のAIモデルでの再分析に対応。
- **解釈層（Firestore）:** 構造化された読書記録、AI抽出の気づき、ユーザープロファイル、検索索引。生ログから再生成可能なキャッシュとして位置づけ。

### Firestoreコレクション構造

```
/books/{bookId}
/users/{userId}
  ├── /profileHistory/{historyId}
  ├── /readings/{readingId}
  │   ├── /insights/{insightId}
  │   └── /sessions/{sessionId}
  │       └── /messages/{messageId}
  └── /recommendations/{recommendationId}
```

### GCSパス構造

```
/users/{userId}/sessions/{readingId}/{sessionId}/full_log.json
/users/{userId}/profile_snapshots/{historyId}.json
```

## 技術スタック

- **Agent Framework:** Agent Development Kit (ADK) + google-genai SDK
- **LLM:** Gemini（現在 `gemini-3-flash-preview`）
- **ストレージ:** Firestore（構造化データ）。GCS生ログ保存はPhase 2
- **フロントエンド:** Next.js (App Router) + TypeScript + Tailwind CSS
- **バックエンド:** Python (FastAPI) + uv
- **認証:** Firebase Auth（メール/パスワード）
- **インフラ（ローカル）:** Firebase Emulator Suite

## AIエージェント

### 実装済み（MVP）
1. **読書振り返りエージェント** - 対話を通じて読書体験を深掘りし、感想・学びの言語化を支援。Insightの自動保存機能付き。

### Phase 2
2. **プロファイル抽出エージェント** - 対話ログからユーザーの属性・価値観・状況を抽出・更新
3. **推薦エージェント** - ユーザープロファイルに基づき次に読むべき本を提案

## プロジェクト構成

```
backend/
├── src/knowva/
│   ├── main.py              # FastAPIエントリポイント
│   ├── config.py            # 設定・環境変数
│   ├── dependencies.py      # Firestoreクライアント
│   ├── middleware/
│   │   └── firebase_auth.py # Firebase Auth認証
│   ├── routers/
│   │   ├── readings.py      # 読書記録CRUD API
│   │   └── sessions.py      # 対話セッション・メッセージAPI
│   ├── agents/
│   │   └── reading_reflection/
│   │       ├── agent.py     # ADK LlmAgent定義
│   │       └── tools.py     # save_insight, get_reading_context
│   └── services/
│       └── firestore.py     # Firestore操作
├── pyproject.toml
└── .env.example

frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/          # ログイン・登録
│   │   └── (main)/          # 認証後ページ
│   │       ├── home/        # 読書一覧
│   │       ├── readings/[readingId]/  # 読書詳細・チャット
│   │       └── profile/     # プロファイル表示
│   ├── components/chat/     # ChatInterface
│   ├── lib/                 # firebase, api, types
│   └── providers/           # AuthProvider
├── package.json
└── next.config.ts

firebase.json                # Emulator設定
```
