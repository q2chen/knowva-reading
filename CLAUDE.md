# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Knowva（ノヴァ）は、AIによる読書体験支援アプリケーション。ユーザーが読んだ本の感想や学びを対話的に言語化し、読書傾向（プロファイル）を蓄積・可視化し、次に読むべき本を推薦する。

**コアバリュー:** 読書体験を「時間とともに変化する思想の履歴」として長期保存する。完全な対話履歴をFirestoreに保存し、将来のAIモデルによる再解釈を可能にする。

## プロジェクト状態

**本番環境デプロイ済み。** 以下の機能が動作する：
- Firebase Auth（メール/パスワード）によるユーザー認証
- 読書記録のCRUD
- 読書振り返りエージェントとの対話（ADK + Gemini）
- 対話からのInsight抽出・保存
- プロファイル表示（読み取り専用、静的）
- 音声入力対応（Web Speech API）
- 読書前後の心境変化の可視化

**本番環境構成:**
- フロントエンド: Firebase App Hosting（`/frontend`）
- バックエンド: Cloud Run（`/backend/Dockerfile`）
- データベース: Firestore
- CI/CD: GitHub pushトリガーで自動デプロイ

Phase 2の機能（プロファイル抽出エージェント、推薦エージェント等）はコード内に`# TODO(phase2):` コメントで記録されている。
※ GCS生ログ保存は廃止（Firestoreのmessagesコレクションで対応）。SSEストリーミングは実装済み。

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
- featureブランチからmainへのマージは `git merge --no-ff` を使用し、マージコミットを残す

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

1. **実行基盤（ADK + Cloud Run）** - 会話実行・ツール実行・セッション管理（ADK + Gemini API）
2. **長期保存層（本丸）** - Firestoreによる統合管理（対話履歴 + 構造化データ）
3. **検索基盤** - ベクトル検索・全文検索（Phase 2以降）

### データ保存戦略

Firestoreによる統合管理:
- **対話履歴（messagesコレクション）:** 完全な対話ログを保持。`get_report_context()`で全メッセージを集約して再分析可能。
- **構造化データ:** 読書記録、AI抽出のInsight、ユーザープロファイル、検索索引。

※ 当初計画していたGCS生ログ保存は、Firestoreで対応可能なため廃止。スケール時のオプションとして将来検討。

### Firestoreコレクション構造

```
/books/{bookId}
/users/{userId}
  ├── /profileHistory/{historyId}
  ├── /readings/{readingId}
  │   ├── /insights/{insightId}
  │   ├── /moods/{moodId}           # 心境記録（before/after）
  │   └── /sessions/{sessionId}
  │       └── /messages/{messageId}
  └── /recommendations/{recommendationId}
```

## 技術スタック

- **Agent Framework:** Agent Development Kit (ADK) + google-genai SDK
- **LLM:** Gemini（現在 `gemini-3-flash-preview`）
- **ストレージ:** Firestore（対話履歴 + 構造化データを統合管理）
- **フロントエンド:** Next.js 16 (App Router) + TypeScript + Tailwind CSS 4
- **バックエンド:** Python 3.12+ (FastAPI) + uv
- **認証:** Firebase Auth（メール/パスワード）
- **インフラ（ローカル）:** Firebase Emulator Suite
- **インフラ（本番）:** Firebase App Hosting + Cloud Run + Firestore
- **Firebase Project ID:** `knowva-reading`

## AIエージェント

### 実装済み
1. **Reading Agent** (`agents/reading/`) - 読書対話全体を担当。読書前・中・後の対話、Insight/プロファイル自動保存
   - **BookGuide SubAgent** (`agents/reading/book_guide/`) - 専門的な質問（概念解説、時代背景等）に対応するサブエージェント
2. **Onboarding Agent** (`agents/onboarding/`) - 初回プロファイル作成、ユーザーの目標・興味をヒアリング
3. **Root Orchestrator** (`agents/orchestrator/`) - 複数エージェントを統括（現在は枠組みのみ）

### Phase 2
4. **推薦エージェント** - ユーザープロファイルに基づき次に読むべき本を提案

## 追加実装済み機能

### 音声入力対応（Speech to Text）
- **技術:** Web Speech API (SpeechRecognition)
- **実装ファイル:**
  - `frontend/src/hooks/useSpeechRecognition.ts` - 音声認識カスタムフック
  - `frontend/src/components/chat/ChatInput.tsx` - 音声対応チャット入力
  - `frontend/src/components/chat/VoiceInput.tsx` - 単体音声入力コンポーネント
- **機能:**
  - リアルタイム文字起こし表示
  - 日本語音声認識（`ja-JP`）
  - 音声入力とテキスト入力の切り替え
  - `input_type: "text" | "voice"` でメッセージに入力方法を記録
- **注意:** Chrome/Edge推奨（Safari/Firefoxは非対応または制限あり）

### 読書前後の心境変化の可視化
- **バックエンド:**
  - `backend/src/knowva/models/mood.py` - 心境データモデル（MoodMetrics, MoodData等）
  - `backend/src/knowva/routers/moods.py` - Mood API（保存・取得・比較）
  - `backend/src/knowva/services/firestore.py` - Firestore操作（moods関連追加）
- **フロントエンド:**
  - `frontend/src/components/mood/MoodForm.tsx` - 5項目のスライダー入力フォーム
  - `frontend/src/components/mood/MoodChart.tsx` - SVGレーダーチャート+バー形式の可視化
  - `frontend/src/app/(main)/readings/[readingId]/page.tsx` - 統合済み
- **心境メトリクス（各1-5スケール）:**
  - energy（活力）
  - positivity（気分）
  - clarity（思考の明晰さ）
  - motivation（モチベーション）
  - openness（開放性）
- **API:**
  - `POST /api/readings/{reading_id}/moods` - 心境記録を保存（before/after）
  - `GET /api/readings/{reading_id}/moods` - 心境記録一覧
  - `GET /api/readings/{reading_id}/moods/comparison` - 比較データ取得

## プロジェクト構成

```
backend/
├── src/knowva/
│   ├── main.py              # FastAPIエントリポイント
│   ├── config.py            # 設定・環境変数
│   ├── dependencies.py      # Firestoreクライアント
│   ├── middleware/
│   │   └── firebase_auth.py # Firebase Auth認証
│   ├── models/
│   │   ├── reading.py       # 読書記録モデル
│   │   ├── mood.py          # 心境データモデル
│   │   └── ...
│   ├── routers/
│   │   ├── readings.py      # 読書記録CRUD API
│   │   ├── sessions.py      # 対話セッション・メッセージAPI
│   │   └── moods.py         # 心境記録API
│   ├── agents/
│   │   ├── __init__.py          # reading_agent, onboarding_agent, root_orchestrator_agent
│   │   ├── common/
│   │   │   └── tools.py         # 共通ツール（save_profile_entry, get_current_entries）
│   │   ├── reading/
│   │   │   ├── agent.py         # Reading Agent定義
│   │   │   ├── tools.py         # save_insight, get_reading_context, save_mood
│   │   │   └── book_guide/      # BookGuide SubAgent
│   │   │       ├── agent.py     # BookGuide Agent定義
│   │   │       └── tools.py     # get_book_info
│   │   ├── onboarding/
│   │   │   └── agent.py         # Onboarding Agent定義
│   │   └── orchestrator/
│   │       └── agent.py         # Root Orchestrator定義
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
│   ├── components/
│   │   ├── chat/            # ChatInterface, VoiceInput
│   │   └── mood/            # MoodForm, MoodChart
│   ├── hooks/
│   │   └── useSpeechRecognition.ts  # 音声認識フック
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
