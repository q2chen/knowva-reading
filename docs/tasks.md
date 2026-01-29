# Knowva - 開発タスク

## 実装完了（本番デプロイ済み）

### 設計フェーズ

- [x] データ構造設計（Firestoreコレクション構造）
- [x] 技術スタック選定（FastAPI, Next.js, ADK, Firestore）
- [x] AIエージェント設計（役割・責務・出力形式・ADK構成）
- [x] API設計（エンドポイント一覧・データフロー）
- [x] フロントエンド構成（ルーティング・コンポーネント構造）
- [x] AIエージェントのプロンプト詳細設計
- [x] 認証設計（Firebase Auth、メール/パスワード認証）

### 開発フェーズ - コア機能

- [x] ユーザー認証機能（Firebase Auth メール/パスワード）
- [x] 読書記録のCRUD（作成・表示・更新・削除）
- [x] Reading Agent実装（読書前・中・後の対話）
- [x] BookGuide SubAgent実装（専門的な質問への回答）
- [x] Onboarding Agent実装（初回プロファイル作成）
- [x] 対話UI（テキスト入力のチャット形式）
- [x] Insightの自動保存機能（ツール呼び出し）
- [x] 音声入力対応（Web Speech API）
- [x] 読書前後の心境変化の可視化（MoodForm/MoodChart）

### 開発フェーズ - 追加機能

- [x] SSEストリーミング対応（text_delta, tool_call, options_request等）
- [x] セッション初期化（`__session_init__`トリガーによるAI挨拶生成）
- [x] 対話モード設定（freeform/guided）
- [x] present_optionsツール（guidedモード用選択肢提示）
- [x] Mentor Agent実装（週次・月次振り返り）
- [x] 書籍検索サービス（Google Books API + openBD連携）
- [x] 書籍重複チェック機能（ISBN基準）
- [x] 公開Insightシステム（POP タイムライン）
- [x] Insight公開設定（private/public/anonymous）
- [x] ニックネーム設定（公開Insight用）
- [x] タイムライン表示設定（random/newest）
- [x] ユーザー設定画面（/settings）

### テスト・デプロイフェーズ

- [x] 全体の動作確認とバグ修正
- [x] 本番環境デプロイ
  - フロントエンド: Firebase App Hosting（`/frontend`をデプロイ）
  - バックエンド: Cloud Run（`/backend/Dockerfile`を使用）
  - データベース: Firestore（本番）
  - CI/CD: GitHub pushトリガーで自動デプロイ

---

## Phase 2.5 タスク（概要書機能 - 優先実装）

概要書で定義されたコア機能。ユーザー価値が高いため、Phase 2より優先して実装する。

### 読書レポート生成機能

ソリューションの柱「**Contextual Wisdom（文脈によるナレッジ化）**」を実現する機能。
**本単位**で個別のInsightを統合し、構造化された「美しい読書レポート」を生成する。

**Mentor振り返りとの位置づけ:**
| 機能 | 単位 | 目的 |
|------|------|------|
| 読書レポート | **本単位** | 1冊の読書体験を構造化・資産化 |
| Mentor振り返り | ユーザー単位（期間） | 週次/月次の読書活動全体を称賛・アドバイス |

- [x] Report Agent の実装
  - 入力: 該当Readingのセッション全メッセージ + Insight一覧 + プロファイル情報
  - 出力: 構造化されたMarkdown/JSON形式のレポート
  - 構成要素:
    - **言語化された洞察** - 抽出したInsightの要約・構造化
    - **文脈によるナレッジ化** - ユーザーの状況・目標との関連付け
    - **アクションプラン** - 具体的な行動提案（下記参照）
  - 生成タイミング: 読了時（status=completed）または手動リクエスト
- [x] Firestore データモデル: `/users/{userId}/readings/{readingId}/reports/{reportId}`
  ```
  {
    id, reading_id, created_at, updated_at,
    summary: string,           // レポート要約
    insights_summary: string,  // Insightの統合要約
    context_analysis: string,  // ユーザー文脈との関連分析
    action_plan: ActionPlan[], // アクションプラン（後述）
    metadata: {
      session_count: number,
      insight_count: number,
      generation_model: string
    }
  }
  ```
- [x] レポート生成API: `POST /api/readings/{readingId}/reports/generate`
- [x] レポート取得API: `GET /api/readings/{readingId}/reports`
- [x] レポート表示UI（`/readings/[id]/report`）
- [ ] レポートのPDF/画像エクスポート機能（オプション）

### アクションプラン生成機能

ソリューションの柱「**Contextual Wisdom**」の具体的な成果物。
読書から得た学びを、ユーザーの人生に適用する具体的なアクションへと変換する。

- [x] Report Agent に `generate_action_plan` 機能を統合
  - 読書から得た学びを具体的なアクションに変換
  - プロファイル（目標・悩み）と紐づけたパーソナライズ
  - 出力例:
    ```
    {
      action: "毎朝15分、第2象限のタスクを洗い出す時間を設ける",
      source_insight: "時間管理マトリクスで緊急ではないが重要なことに集中する",
      relevance: "仕事の効率化という目標に直結",
      difficulty: "easy",
      timeframe: "1週間"
    }
    ```
- [x] Firestore データモデル: `/users/{userId}/readings/{readingId}/actionPlans/{planId}`
  ```
  {
    id, reading_id, created_at, updated_at,
    action: string,           // 具体的なアクション
    source_insight_id: string?, // 関連するInsight
    relevance: string,        // プロファイルとの関連性
    difficulty: "easy" | "medium" | "hard",
    timeframe: string,        // 実行目安期間
    status: "pending" | "in_progress" | "completed" | "skipped",
    completed_at?: timestamp
  }
  ```
- [x] アクションプラン管理API
  - `POST /api/readings/{readingId}/action-plans` - 生成
  - `GET /api/readings/{readingId}/action-plans` - 一覧取得
  - `PATCH /api/readings/{readingId}/action-plans/{planId}` - ステータス更新
- [x] アクションプラン表示・管理UI
  - 読書詳細画面にアクションプランセクション追加
  - チェックリスト形式での進捗管理

### ワンタップ音声入力機能

ソリューションの柱「**Frictionless UX（没入を妨げない直感体験）**」を実現する機能。
ホーム画面から最小の遷移で、ワンタップで音声入力を開始できる。

- [x] ワンタップ音声入力画面（`/quick-voice`）
  - 画面中央に大きなマイクボタン（概要書イメージ参照）
  - 「読書中に感じたことを、話しかけてください」のメッセージ
  - クエリパラメータ: `?readingId={readingId}`
  - リアルタイム文字起こし表示エリア
- [x] ホーム画面にFAB（フローティングアクションボタン）追加
  - 現在「読書中」のReadingがある場合に表示
  - タップで `/quick-voice?readingId={readingId}` に遷移
  - 読書中のReadingがない場合は非表示
  - FAB表示位置の設定機能（左/右/非表示）
- [x] 音声入力完了後の自動遷移
  - 音声入力 → 確定ボタン → メッセージ送信（既存API）
  - `/readings/{readingId}/chat` に自動遷移（AI応答を表示）
- [x] 既存コンポーネントの再利用
  - `useSpeechRecognition` フック（完全再利用）
  - `MicIcon` / `StopIcon` / `CheckIcon` SVG
  - SSEストリーミング経由のメッセージ送信
  - `input_type: "voice"` フラグ

**UIフロー:**
```
ホーム画面
    │ [FAB: マイクアイコン] をタップ
    ▼
/quick-voice?readingId={id}
    │ 画面中央に大きなマイクボタン
    │ [マイクボタン] をタップ → 録音開始
    │ 発話 → リアルタイム文字起こし表示
    │ [停止/確定ボタン] をタップ
    ▼
メッセージ送信 → /readings/{id}/chat に自動遷移
```

**実装ファイル:**
| ファイル | 内容 |
|---------|------|
| `frontend/src/app/(main)/quick-voice/page.tsx` | ワンタップ音声入力画面 |
| `frontend/src/components/quick-voice/QuickVoiceButton.tsx` | 大きなマイクボタンコンポーネント |
| `frontend/src/components/quick-voice/QuickVoiceFAB.tsx` | ホーム画面FABコンポーネント |
| `frontend/src/app/(main)/home/page.tsx` | FAB追加（既存ファイル修正） |
| `frontend/src/app/(main)/settings/page.tsx` | FAB位置設定UI |

---

## Phase 2 タスク（未実装）

以下の機能はドキュメントに記載されていますが、まだ実装されていません。
コード内に `# TODO(phase2):` コメントで記録されている箇所もあります。

### データ保存

**廃止:** GCS生ログ保存機能は、Firestoreのmessagesコレクションで完全な対話履歴が保持されているため不要と判断。
- Firestoreの`/sessions/{id}/messages`が事実上の生ログとして機能
- `get_report_context()`で全メッセージを集約して再分析可能
- スケール時のオプションとしてGCSエクスポート機能は将来検討

~~- [ ] GCS生ログ保存~~
~~- [ ] 生ログからのInsight再生成機能~~ → Firestoreベースで対応済み

### AIエージェント

- [ ] 推薦エージェント - プロファイルに基づく書籍推薦
  - コード内TODO: `backend/src/knowva/main.py`（推薦APIルーター追加）
- [x] ルートオーケストレーター - 複数エージェントの統括（枠組み実装済み、ルーティングロジックは未実装）

### 機能拡張

- [ ] ベクトル検索・全文検索基盤
- [ ] 読書履歴の可視化・分析機能
- [ ] 音声録音対応（WebM形式でGCS保存）

### インフラ

- [x] 本番Firebase Auth設定（Googleログイン等追加）

---

## 実装ファイル参照

### バックエンド主要ファイル

| ファイル | 内容 |
|---------|------|
| `backend/src/knowva/main.py` | FastAPIエントリポイント |
| `backend/src/knowva/agents/reading/agent.py` | Reading Agent |
| `backend/src/knowva/agents/reading/book_guide/agent.py` | BookGuide SubAgent |
| `backend/src/knowva/agents/onboarding/agent.py` | Onboarding Agent |
| `backend/src/knowva/agents/mentor/agent.py` | Mentor Agent |
| `backend/src/knowva/routers/sessions.py` | 対話セッションAPI |
| `backend/src/knowva/routers/readings.py` | 読書記録API |
| `backend/src/knowva/routers/moods.py` | 心境記録API |
| `backend/src/knowva/routers/books.py` | 書籍管理API |
| `backend/src/knowva/routers/timeline.py` | タイムラインAPI |
| `backend/src/knowva/routers/mentor.py` | メンターAPI |
| `backend/src/knowva/services/firestore.py` | Firestore操作 |
| `backend/src/knowva/services/book_search.py` | 書籍検索サービス |

### フロントエンド主要ファイル

| ファイル | 内容 |
|---------|------|
| `frontend/src/app/(main)/home/page.tsx` | ホーム画面 |
| `frontend/src/app/(main)/readings/page.tsx` | 読書一覧 |
| `frontend/src/app/(main)/readings/[readingId]/page.tsx` | 読書詳細 |
| `frontend/src/app/(main)/readings/[readingId]/chat/page.tsx` | 対話画面 |
| `frontend/src/app/(main)/mentor/page.tsx` | 振り返り画面 |
| `frontend/src/app/(main)/pop/page.tsx` | タイムライン画面 |
| `frontend/src/app/(main)/settings/page.tsx` | 設定画面 |
| `frontend/src/components/chat/ChatInterface.tsx` | チャットUI |
| `frontend/src/components/mood/MoodForm.tsx` | 心境入力フォーム |
| `frontend/src/components/mood/MoodChart.tsx` | 心境可視化 |
| `frontend/src/hooks/useStreamingChat.ts` | SSEストリーミング処理 |
| `frontend/src/hooks/useSpeechRecognition.ts` | 音声認識 |
