# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Knowva（ノヴァ）は、AIによる読書体験支援アプリケーション。ユーザーが読んだ本の感想や学びを対話的に言語化し、読書傾向（プロファイル）を蓄積・可視化し、次に読むべき本を推薦する。

**コアバリュー:** 読書体験を「時間とともに変化する思想の履歴」として長期保存する。完全な対話履歴をFirestoreに保存し、将来のAIモデルによる再解釈を可能にする。

## 詳細ドキュメント

- [要件定義](docs/requirements.md) - 機能要件、MVPゴール、ユーザージャーニー
- [技術アーキテクチャ](docs/architecture.md) - データモデル、API設計、技術スタック
- [エージェント設計](docs/agents.md) - 各エージェントの詳細仕様、対話フロー
- [開発タスク](docs/tasks.md) - タスクチェックリスト、実装ファイル参照
- [技術スタック](docs/tech-stack.md) - バージョン一覧、依存関係

## プロジェクト状態

**本番環境デプロイ済み。** 主な動作機能：
- Firebase Auth（メール/パスワード、Google、ゲスト）によるユーザー認証
- 読書記録のCRUD、書籍検索（Google Books API + openBD）
- 読書振り返りエージェントとの対話（ADK + Gemini）、SSEストリーミング
- 対話からのInsight抽出・保存、読書レポート・アクションプラン生成
- プロファイル管理、音声入力対応（Web Speech API）
- 読書前後の心境変化の可視化、振り返りメンター
- 公開Insight/レポート（POPタイムライン）、バッジ機能

Phase 2の機能（推薦エージェント等）はコード内に`# TODO(phase2):` コメントで記録されている。

**本番環境構成:**
- フロントエンド: Firebase App Hosting（`/frontend`）
- バックエンド: Cloud Run（`/backend/Dockerfile`）
- データベース: Firestore
- CI/CD: GitHub pushトリガーで自動デプロイ

## ローカル開発環境の起動

### 前提条件
- Node.js 18+
- Python 3.11+
- uv（Pythonパッケージマネージャ）
- Firebase CLI (`npm install -g firebase-tools`)

### 1. Firebase Emulator起動
```bash
# データを永続化する場合（推奨）
firebase emulators:start --export-on-exit=./emulator-data --import=./emulator-data

# データを永続化しない場合（エミュレーター停止時にデータ消失）
firebase emulators:start
```
Auth(9099)、Firestore(8080)、Emulator UI(4000) が起動する。

**注意:** デフォルトではエミュレーター停止時にデータが消える。`--export-on-exit` と `--import` オプションでデータを永続化できる。初回起動時は `emulator-data/` ディレクトリが自動作成される。

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

## 開発コマンド

### バックエンド
```bash
cd backend
uv run uvicorn knowva.main:app --reload --port 8000  # 起動
uv run ruff check src/                                # lint
uv run ruff format src/                               # format
uv run pytest                                         # テスト
uv run pytest tests/test_specific.py -k test_name    # 単一テスト
```

### フロントエンド
```bash
cd frontend
npm run dev      # 起動
npm run build    # ビルド
npm run lint     # lint
```

### Gitブランチ運用
- 変更を加える際は、最新のmainを取得し、そこから新規ブランチを作成して作業する
- 完成したらPRを作成し、GitHub上でmainへマージする（直接mainにpushしない）

### 環境変数（backend/.env）
- `GOOGLE_API_KEY` - Gemini APIキー（必須）
- `GOOGLE_GENAI_USE_VERTEXAI=FALSE` - Vertex AIを使わない設定
- `USE_EMULATOR=true` - エミュレータ使用フラグ
- `FIRESTORE_EMULATOR_HOST=localhost:8080`
- `FIREBASE_AUTH_EMULATOR_HOST=localhost:9099`

## 技術スタック

- **Agent Framework:** Agent Development Kit (ADK) + google-genai SDK
- **LLM:** Gemini（現在 `gemini-3-flash-preview`）、本番はVertex AI経由
- **ストレージ:** Firestore（対話履歴 + 構造化データを統合管理）
- **フロントエンド:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **バックエンド:** Python 3.12+ (FastAPI) + uv
- **認証:** Firebase Auth（メール/パスワード、Google、匿名）
- **インフラ（ローカル）:** Firebase Emulator Suite
- **インフラ（本番）:** Firebase App Hosting + Cloud Run + Firestore
- **Firebase Project ID:** `knowva-reading`

バージョン詳細は [docs/tech-stack.md](docs/tech-stack.md) を参照。

## AIエージェント

### 実装済み
1. **Reading Agent** (`agents/reading/`) - 読書対話全体を担当。読書前・中・後の対話、Insight/プロファイル自動保存
   - **BookGuide Agent** (`agents/reading/book_guide/`) - 専門的な質問に対応（AgentToolとして登録、結果はReading Agentに戻る）
2. **Onboarding Agent** (`agents/onboarding/`) - 初回プロファイル作成、ユーザーの目標・興味をヒアリング
3. **Mentor Agent** (`agents/mentor/`) - 週次・月次の読書活動振り返り、励ましとアドバイス
4. **Report Agent** (`agents/report/`) - 対話履歴・Insightから読書レポート生成、アクションプラン提案
5. **Root Orchestrator** (`agents/orchestrator/`) - 複数エージェントを統括（現在は枠組みのみ）

### Phase 2
- **推薦エージェント** - ユーザープロファイルに基づき次に読むべき本を提案

各エージェントの詳細仕様は [docs/agents.md](docs/agents.md) を参照。

## Firestoreコレクション構造

```
/books/{bookId}
/users/{userId}
  ├── /profileEntries/{entryId}
  ├── /readings/{readingId}
  │   ├── /insights/{insightId}
  │   ├── /moods/{moodId}
  │   ├── /reports/{reportId}
  │   ├── /actionPlans/{planId}
  │   └── /sessions/{sessionId}
  │       └── /messages/{messageId}
  ├── /mentorFeedbacks/{feedbackId}
  └── /recommendations/{recommendationId}    # Phase 2
/publicInsights/{publicInsightId}
/publicReports/{publicReportId}
```

詳細なフィールド定義は [docs/architecture.md](docs/architecture.md) を参照。

## プロジェクト構成

```
backend/
├── src/knowva/
│   ├── main.py              # FastAPIエントリポイント
│   ├── config.py            # 設定・環境変数
│   ├── dependencies.py      # Firestoreクライアント
│   ├── middleware/
│   │   └── firebase_auth.py # Firebase Auth認証
│   ├── models/              # Pydanticデータモデル
│   │   ├── reading.py, insight.py, session.py, message.py
│   │   ├── mood.py, report.py, action_plan.py
│   │   ├── profile.py, onboarding.py, book.py, badge.py
│   │   └── ...
│   ├── routers/
│   │   ├── readings.py      # 読書記録CRUD + Insight管理
│   │   ├── sessions.py      # 対話セッション・メッセージ（SSE）
│   │   ├── reports.py       # レポート・アクションプラン
│   │   ├── moods.py         # 心境記録
│   │   ├── mentor.py        # メンター振り返り
│   │   ├── profile.py       # プロファイル・設定
│   │   ├── books.py         # 書籍検索・管理
│   │   ├── timeline.py      # POPタイムライン
│   │   ├── onboarding.py    # オンボーディング
│   │   └── badges.py        # バッジ
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── common/tools.py        # 共通ツール
│   │   ├── reading/
│   │   │   ├── agent.py           # Reading Agent
│   │   │   ├── tools.py
│   │   │   └── book_guide/        # BookGuide Agent (AgentTool)
│   │   ├── onboarding/agent.py    # Onboarding Agent
│   │   ├── mentor/agent.py        # Mentor Agent
│   │   ├── report/agent.py        # Report Agent
│   │   └── orchestrator/agent.py  # Root Orchestrator
│   └── services/
│       ├── firestore.py     # Firestore操作
│       └── book_search.py   # 書籍検索サービス
├── pyproject.toml
└── .env.example

frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/          # ログイン・登録・オンボーディング
│   │   └── (main)/          # 認証後ページ
│   │       ├── home/        # ダッシュボード
│   │       ├── readings/    # 読書一覧・詳細・チャット・レポート
│   │       ├── mentor/      # 振り返り
│   │       ├── pop/         # タイムライン
│   │       ├── quick-voice/ # ワンタップ音声入力
│   │       └── settings/    # ユーザー設定
│   ├── components/          # chat/, mood/, insights/, report/,
│   │                        # action-plan/, mentor/, pop/, quick-voice/,
│   │                        # readings/, onboarding/, auth/, badges/, ui/
│   ├── hooks/               # useStreamingChat, useSpeechRecognition,
│   │                        # useBookSearch, useMentorChat, useAccountLink
│   ├── lib/                 # firebase, api, types
│   └── providers/           # AuthProvider
├── package.json
└── next.config.ts

firebase.json                # Emulator設定（ローカル専用）
.firebaserc                  # Firebaseプロジェクト設定
```

## ローカル環境専用ファイル

以下のファイルはローカル開発環境専用で、本番環境には影響しない:
- `firebase.json` - Firebase Emulatorの設定（ポート番号等）
- `.firebaserc` - ローカルで使用するFirebaseプロジェクトID（`knowva-reading-485401`）

**注意:** ローカル環境ではプロジェクトID `knowva-reading-485401` を使用し、本番環境では `knowva-reading` を使用する。エミュレータ起動時は `.firebaserc` のプロジェクトIDが使われるため、環境変数の `GOOGLE_CLOUD_PROJECT` や `NEXT_PUBLIC_FB_PROJECT_ID` も同じIDに合わせる必要がある。

## 注意事項

### ADKプロンプト内のテンプレート変数
ADK の instruction 内で波括弧 `{}` を使用すると、テンプレート変数として解釈される。プレースホルダーを示す場合は `○○○` などの代替表現を使用すること。

### Gemini API レート制限
無料枠は1日20リクエスト程度。開発時は API キーの使用状況に注意。レート制限エラー（429）が出た場合は数十秒待つか、新しい API キーを使用する。

### 音声入力（Web Speech API）
- Chrome/Edge推奨。Safari/Firefoxは非対応または制限あり
- HTTPSまたはlocalhostでのみ動作（マイクアクセス許可が必要）
