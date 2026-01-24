# Knowva - 技術アーキテクチャ仕様

## アーキテクチャ思想：曖昧さと再解釈の許容

### システム構成の全体像

Knowvaは**長期保存を本丸**として、以下の3層構成で設計します：

#### 1) 実行基盤（Agent Engine）
- **役割:** 会話の実行・ツール実行・セッション管理
- **技術:** LLM API（OpenAI/Claude等）+ アプリケーションロジック
- **責務:** ユーザーとの対話を「聞き上手」に進行させる

#### 2) 長期保存層（**本丸**）
以下の二層で、数年後の振り返りを可能にします：

**a) Google Cloud Storage（生ログ層）**
- **保存内容:** 会話全文のJSON/テキストログ
- **目的:** 完全な記録の永続化（不変・削除なし）
- **将来性:** 新しいAIモデルでの再分析に備える

**b) Firestore（解釈層）**
- **保存内容:** 読み返し用の「要約」「メモ」「索引」
- **目的:** パフォーマンスの高いクエリと表示
- **位置づけ:** 生ログから再生成可能なキャッシュ

#### 3) 検索基盤（必要になってから）
- **ベクトル検索:** 曖昧検索を強くしたくなったら追加
- **候補:** Pinecone / Weaviate / Firestore Vector Search

---

## データ保存の二層化戦略（詳細）

Knowvaは、将来的なAIモデルの進化やマルチモーダルなアート化（Rhizomatiks的な展開）を見据え、**データを「生ログ層」と「解釈層」の二層で管理する**アーキテクチャを採用します。

### 生ログ層（Raw Data Layer）= Google Cloud Storage
- **目的:** すべての対話・入力データを「その時点の生の記録」として永続化
- **保存先:** Google Cloud Storage (GCS)
- **保存内容:**
  - 対話の完全なJSON/テキストログ（会話全文）
  - ユーザー入力の生データ（タイムスタンプ付き）
- **特徴:**
  - **不変性:** 一度保存したら削除・編集しない
  - **再解釈可能性:** 将来的に新しいAIモデルで再分析できる
  - **数年後の振り返り:** 完全な会話履歴をいつでも読み返せる

### 解釈層（Interpretation Layer）= Firestore
- **目的:** アプリケーションが利用する「その時点でのAIの解釈」を保存
- **保存先:** Firestore（またはPostgreSQL等のアプリケーションDB）
- **保存内容:**
  - 構造化された読書記録
  - AIが抽出した学び・気づき（要約）
  - 検索用の索引・メタデータ
  - ユーザープロファイル
- **特徴:**
  - **可変性:** AIモデルの進化に応じて再解釈・上書き可能
  - **パフォーマンス重視:** クエリ最適化された構造
  - **読み返し用:** UIで高速に表示するための最適化

この二層化により、「今のAIでできる最良の解釈」でアプリを動かしながら、将来的に「あの時の対話を新しいAIで再分析する」といった展開が可能になります。

---

## データ構造（MVP版）

MVPでは、Firestoreのドキュメント指向設計に基づいた構造で開始します。

### Firestore設計の原則

Firestoreは**NoSQLドキュメントデータベース**であり、RDBとは異なる設計思想が必要です：

- **JOINは存在しない**: 関連データは非正規化して埋め込むか、サブコレクションで表現
- **ID体系**: Firestoreが生成する`string`（UUID）を使用
- **読み取り最適化**: 1回のクエリで必要なデータが取得できるよう設計
- **書き込みコストとのトレードオフ**: データの重複は許容し、読み取りパフォーマンスを優先

### Firestoreコレクション構造

```
/books/{bookId}                       // ルートコレクション: 書籍マスタ
│   title, author, isbn?, createdAt, updatedAt

/users/{userId}
│   name, email, createdAt
│   currentProfile: { ... }           // 現在のプロファイル（高速表示用）
│
├── /profileHistory/{historyId}       // プロファイル履歴（思想の変遷）
│       profile: { ... }, changedAt, triggerReadingId?
│
├── /readings/{readingId}             // 読書記録
│   │   bookId, book: { title, author }  // マスタ参照 + 非正規化
│   │   readCount                     // この本の通算読書回数
│   │   status: "reading" | "completed"
│   │   startDate, completedDate?
│   │   readingContext: { ... }       // 読書時の状況・きっかけ等
│   │   latestSummary
│   │
│   ├── /insights/{insightId}         // 気づき・学び（複数）
│   │       content, type, createdAt, sessionRef?
│   │
│   └── /sessions/{sessionId}         // 対話セッション
│       │   sessionType: "during_reading" | "after_completion" | "reflection"
│       │   startedAt, endedAt, summary, gcsLogPath
│       │
│       └── /messages/{messageId}     // 対話メッセージ
│               role, message, inputType, createdAt
│
└── /recommendations/{recommendationId}  // おすすめ
        bookId, book: { ... }, reason, profileFactors[], status, createdAt
```

※ 各フィールドの詳細な型定義は実装時に決定。上記は構造の概要を示す。

### 設計のポイント

| 項目 | RDB設計（旧） | Firestore設計（新） |
|------|--------------|-------------------|
| ID | `int` (auto increment) | `string` (UUID自動生成) |
| 書籍情報 | 正規化 (`BOOKS`テーブル) | `/books` マスタ + 各`readings`に非正規化 |
| ユーザープロファイル | 別テーブル (`USER_PROFILES`) | `users`に埋め込み + `/profileHistory`で履歴管理 |
| 気づき・学び | 別テーブル (`INSIGHTS`) | `readings`のサブコレクション（複数追記可能） |
| 対話履歴 | 別テーブル (`CONVERSATIONS`) | `sessions/messages`の2階層で管理 |
| おすすめ | 別テーブル (`RECOMMENDATIONS`) | `users`のサブコレクション |

### 非正規化の理由

**書籍情報の重複保持について:**
- `/books/{bookId}` でマスタ管理しつつ、各`readings`にも`book`を埋め込み
- 読書一覧を1クエリで取得可能
- `bookId`で同じ本の再読を追跡（`readCount`の算出）
- 書籍情報の更新時は、Cloud Functionsで関連readingsを更新（またはスナップショットとして放置）

**プロファイル履歴について:**
- `currentProfile`: 現在のプロファイル（高速表示用）
- `/profileHistory`: プロファイルの変遷を時系列で保存
- 「過去の自分」との対話、思想の変化の可視化が可能
- プロファイル更新時に自動でhistoryを追加

**セッション構造について:**
- 1つの読書記録（reading）に複数の対話セッション（sessions）
- 「読書中」「読了後」「振り返り」など目的別にセッションを分離
- 各セッションはGCSの生ログへの参照（`gcsLogPath`）を持つ

### Agentが聞き出す情報の保存方法

**保存先の方針:**
- **生ログ層（Google Cloud Storage）**: 対話の完全な内容をJSON形式で永続保存
- **解釈層（Firestore）**: AIが構造化した情報を保存

| 情報の種類 | 保存先コレクション |
|-----------|-------------------|
| 読書体験のコンテキスト（状況・きっかけ等） | `/readings/{readingId}` |
| 対話から抽出した気づき・学び | `/readings/{readingId}/insights` |
| ユーザーの属性・価値観・状況 | `/users/{userId}` の `currentProfile` |
| プロファイルの変遷 | `/users/{userId}/profileHistory` |

※ 各フィールドの詳細はエージェント実装時に柔軟に決定。Firestoreはスキーマレスのため、事前の厳密な定義は不要。

**プロファイル更新フロー:**
1. AIが対話からプロファイル変更を検出
2. 現在の`currentProfile`を`profileHistory`にコピー（スナップショット）
3. `currentProfile`を更新
4. `profileHistory`には変更のトリガーとなった`readingId`を記録

---

## 生ログ層のストレージ構造（Google Cloud Storage）

```
/users/{userId}/
  ├── sessions/
  │   ├── {readingId}/
  │   │   ├── {sessionId}/
  │   │   │   ├── full_log.json       # 対話の完全ログ（AI応答、タイムスタンプ等）
  │   │   │   ├── audio/              # 音声入力の生データ（Phase 2以降）
  │   │   │   │   ├── {messageId}.webm
  │   │   │   │   └── ...
  │   │   │   └── metadata.json       # セッションメタデータ
  │   │   └── ...
  ├── profile_snapshots/
  │   ├── {historyId}.json            # プロファイル変更時のスナップショット
  │   └── ...
```

**Firestoreとの対応:**
- `sessions/{readingId}/{sessionId}/full_log.json` ← Firestore `/readings/{readingId}/sessions/{sessionId}` の `gcsLogPath` が参照
- `profile_snapshots/{historyId}.json` ← Firestore `/profileHistory/{historyId}` に対応

**生ログの利点:**
- 将来的に新しいAIモデルで再分析可能
- 対話の文脈やニュアンスを完全に保持
- 音声の生データも保存（将来的な音声分析に対応）
- マルチモーダルなアート生成（映像化・漫画化）の素材として活用

---

## AIエージェント設計

### エージェント概要

| エージェント | 役割 | 起動タイミング |
|------------|------|--------------|
| 読書振り返りエージェント | ユーザーとの対話を通じて読書体験を深掘りし、感想・学びの言語化を支援 | ユーザーが対話を開始した時（リアルタイム） |
| プロファイル抽出エージェント | 対話ログからユーザーの属性・価値観・状況を抽出し、プロファイルを更新 | セッション終了時（MVP: 同期実行） |
| 推薦エージェント | ユーザープロファイルに基づき次に読むべき本を提案 | ユーザーからのリクエスト時（オンデマンド） |

### セッションタイプ

対話セッションは目的に応じて3種類に分類される：

| タイプ | 目的 | 主な対話内容 |
|--------|------|------------|
| `during_reading` | 読書中の気づきを記録 | 印象に残った箇所、疑問点、生活との関連 |
| `after_completion` | 読了後の振り返り | 全体の感想、学び、人生観への影響 |
| `reflection` | 時間を置いた再振り返り | 読後に変化したこと、新たな解釈 |

### エージェント出力形式

**Insight（気づき・学び）の出力:**
```json
{
  "content": "抽出された気づきのテキスト",
  "type": "learning | impression | question | connection",
  "sessionRef": "対話セッションの参照ID"
}
```

**プロファイル更新の出力:**
```json
{
  "updatedFields": ["変更されたフィールド名のリスト"],
  "profile": {
    "lifeStage": "現在のライフステージ",
    "situation": "職業・業界・役職等",
    "challenges": ["現在の課題・テーマ"],
    "values": ["価値観・信条"],
    "readingMotivation": "読書をする理由"
  },
  "triggerReadingId": "変更のきっかけとなったreadingId"
}
```

**推薦の出力:**
```json
{
  "books": [
    {
      "title": "書籍タイトル",
      "author": "著者",
      "reason": "推薦理由（プロファイルとの関連）",
      "profileFactors": ["根拠となったプロファイル要素"]
    }
  ]
}
```

---

## ADK実装構成

### エージェント階層構造

ADK (Agent Development Kit) のマルチエージェント構成を採用し、Root Agentが目的に応じてsub_agentsに委譲する：

```
Root Agent (Router/Orchestrator)
├── reading_reflection_agent (LlmAgent) - 読書振り返り対話
├── profile_extraction_agent (LlmAgent) - プロファイル抽出
└── recommendation_agent (LlmAgent) - 本の推薦
```

### 各エージェントのTools

| エージェント | Tool名 | 機能 |
|------------|--------|------|
| reading_reflection_agent | `save_insight` | 対話から抽出した気づきをFirestoreに保存 |
| reading_reflection_agent | `get_reading_context` | 現在のreading情報（書籍、状況等）を取得 |
| reading_reflection_agent | `get_user_profile` | ユーザーの現在のプロファイルを取得 |
| profile_extraction_agent | `update_profile` | ユーザープロファイルを更新 |
| profile_extraction_agent | `get_session_log` | 対話セッションのログを取得 |
| profile_extraction_agent | `save_profile_history` | プロファイル変更履歴を保存 |
| recommendation_agent | `get_user_profile` | ユーザーの現在のプロファイルを取得 |
| recommendation_agent | `search_books` | 書籍を検索（外部API連携） |
| recommendation_agent | `save_recommendation` | 推薦結果をFirestoreに保存 |

### Session Service

| 環境 | Session Service | 備考 |
|------|----------------|------|
| ローカル開発 | `InMemorySessionService` | 再起動でリセット |
| 本番 | Agent Engine managed | Agent Engineがセッション管理を提供 |

### デプロイ

```bash
uv run adk deploy agent_engine \
  --project=<gcp-project-id> \
  --region=<region> \
  --staging_bucket="gs://<staging-bucket>" \
  --display_name="Knowva Agent" \
  ./agents
```

---

## API設計

### エンドポイント一覧

#### 読書管理

| Method | Path | 概要 |
|--------|------|------|
| GET | `/api/readings` | ユーザーの読書一覧取得 |
| POST | `/api/readings` | 新規読書記録作成 |
| GET | `/api/readings/{readingId}` | 読書詳細取得（insights含む） |
| PATCH | `/api/readings/{readingId}` | 読書ステータス更新 |

#### 書籍検索

| Method | Path | 概要 |
|--------|------|------|
| GET | `/api/books/search?q=` | 書籍タイトル検索（外部API経由） |

#### 対話セッション

| Method | Path | 概要 |
|--------|------|------|
| POST | `/api/readings/{readingId}/sessions` | 新規セッション開始 |
| GET | `/api/readings/{readingId}/sessions` | セッション一覧取得 |
| POST | `/api/readings/{readingId}/sessions/{sessionId}/messages` | メッセージ送信（AIレスポンス返却） |
| GET | `/api/readings/{readingId}/sessions/{sessionId}/messages` | メッセージ履歴取得 |
| POST | `/api/readings/{readingId}/sessions/{sessionId}/end` | セッション終了（プロファイル抽出トリガー） |

#### プロファイル

| Method | Path | 概要 |
|--------|------|------|
| GET | `/api/profile` | 現在のプロファイル取得 |
| GET | `/api/profile/history` | プロファイル変遷履歴取得 |

#### 推薦

| Method | Path | 概要 |
|--------|------|------|
| POST | `/api/recommendations/generate` | 推薦生成リクエスト |
| GET | `/api/recommendations` | 推薦一覧取得 |

### FastAPI ↔ ADK Runner 接続

```
[FastAPI Endpoint]
    │
    ▼
[ADK Runner.run_async()]
    │
    ├── SessionService でセッション管理
    ├── Agent が LLM API を呼び出し
    ├── Agent が Tools を実行（Firestore/GCS操作）
    │
    ▼
[StreamingResponse / JSONResponse]
```

- メッセージ送信エンドポイントでは `Runner.run_async()` を使用してADKエージェントを実行
- ストリーミングレスポンスに対応（Server-Sent Events）
- セッション終了時に同期的にプロファイル抽出エージェントを実行

---

## データフロー

### 対話フロー

```
User → Next.js → POST /api/.../messages → FastAPI
                                             │
                                             ▼
                                      ADK Runner.run_async()
                                             │
                                             ├── LLM API (Gemini等)
                                             ├── save_insight (Firestore)
                                             │
                                             ▼
                                      Response (AI応答テキスト)
                                             │
                                             ▼
                                      Next.js → User
```

### セッション完了フロー

```
User → POST /api/.../sessions/{id}/end → FastAPI
                                            │
                                            ├── 1. セッション状態を "ended" に更新 (Firestore)
                                            ├── 2. 対話ログ全文を GCS に保存 (full_log.json)
                                            ├── 3. profile_extraction_agent を同期実行
                                            │      ├── get_session_log (GCS)
                                            │      ├── update_profile (Firestore)
                                            │      └── save_profile_history (Firestore)
                                            │
                                            ▼
                                      Response (完了通知 + プロファイル変更サマリ)
```

### 推薦生成フロー

```
User → POST /api/recommendations/generate → FastAPI
                                               │
                                               ├── recommendation_agent を実行
                                               │      ├── get_user_profile (Firestore)
                                               │      ├── search_books (外部API)
                                               │      └── save_recommendation (Firestore)
                                               │
                                               ▼
                                         Response (推薦リスト)
```

---

## 技術スタック

### 1) 実行基盤（Agent Engine）
**会話・ツール実行・セッション管理**
- **Agent Framework: Agent Development Kit (ADK)**
- **デプロイ先: Google Cloud Agent Engine**
- LLM API: Gemini API / OpenAI API (GPT-4) / Anthropic Claude
- セッション管理: Firestore Session / Redis

### 2) 長期保存層（本丸）
**a) Google Cloud Storage（生ログ層）**
- Google Cloud Storage (GCS)
- 会話全文の完全保存

**b) Firestore（解釈層）**
- Firestore
- 読み返し用の要約・メモ・索引

### 3) 検索基盤（必要になってから）
- ベクトル検索: Pinecone / Weaviate / Firestore Vector Search
- 全文検索: Algolia / Elasticsearch（オプション）

### フロントエンド
- **Next.js (App Router)**
- 音声録音: Web Audio API / MediaRecorder API（Phase 2以降）

#### ルーティング構成

```
/login, /register          -- 認証ページ
/home                      -- 読書一覧ダッシュボード
/books/search              -- 書籍検索・登録
/readings/[readingId]      -- 読書詳細（insights、セッション履歴）
/readings/[readingId]/chat -- 対話UI（メインインタラクション）
/profile                   -- プロファイル表示（現在 + 変遷タイムライン）
/recommendations           -- 推薦一覧
```

#### 主要コンポーネント

| コンポーネント | 役割 |
|--------------|------|
| `ChatInterface` | メッセージリスト + 入力欄（対話UI） |
| `ReadingCard` | 読書一覧の各カード表示 |
| `InsightCard` | 気づき・学びの表示カード |
| `ProfileTimeline` | プロファイルの変遷を時系列表示 |
| `RecommendationCard` | 推薦書籍の表示（理由付き） |
| `BookSearchForm` | 書籍検索フォーム |

#### 状態管理・データ取得

- Server Components をベースとし、インタラクティブ部分のみ Client Components
- データ取得: SWR または React Query でAPIとの通信
- 対話UI: Server-Sent Events (SSE) でストリーミングレスポンス受信

### バックエンド
- **Python (FastAPI)**
- バックグラウンドジョブ: Cloud Tasks / Celery（Phase 2以降）

### インフラ
- **Google Cloud Agent Engine**
- 非同期処理: Cloud Functions（Phase 2以降）
