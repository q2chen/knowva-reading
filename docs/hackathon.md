## 5. システムアーキテクチャ
### 5-1. 全体アーキテクチャ

```mermaid
graph LR
    subgraph Frontend
        UI[Next.js 16<br/>App Router]
        HOSTING[Firebase App Hosting<br/>フロントエンド配信]
        AUTH[Firebase Auth<br/>認証]
    end

    subgraph "Backend (Cloud Run)"
        API[FastAPI<br/>Backend API]
        ADK[Agent Development Kit<br/>ADK]
        GEMINI[Gemini API<br/>Vertex AI経由<br/>gemini-3-flash-preview]
    end

    subgraph Data
        FIRESTORE[(Firestore<br/>対話履歴 + 構造化データ)]
    end

    UI --> HOSTING
    UI --> AUTH
    UI --> API
    API --> ADK
    ADK --> GEMINI
    ADK --> FIRESTORE
    AUTH -.-> API

    style GEMINI fill:#4285f4,color:#fff
    style ADK fill:#34a853,color:#fff
    style FIRESTORE fill:#ea4335,color:#fff
    style AUTH fill:#ea4335,color:#fff
    style HOSTING fill:#ea4335,color:#fff
```

### アーキテクチャの説明

フロントエンドはNext.js 16 (App Router)で、Firebase App Hostingから配信しています。認証はFirebase Authで、APIリクエストには認証トークンを付けています。

バックエンドはCloud Run上のFastAPIです。Agent Development Kit (ADK)でエージェントの実行フローやツール呼び出し、セッション管理を行い、Gemini API（Vertex AI経由）で自然言語の理解・生成をしています。

データはFirestoreに保存しています。対話履歴（messagesコレクション）と構造化データ（読書記録、Insight、プロファイル）を同じDBで管理していて、過去の対話をいつでも振り返れるようにしました。

---

### 5-2. Reading Agent アーキテクチャ

```mermaid
graph LR
    USER[ユーザー]

    AGENT["Reading Agent<br/>━━━━━<br/>読書対話・言語化支援"]

    GUIDE["BookGuide Agent<br/>━━━━━<br/>専門的な質問回答<br/>(AgentTool)"]

    TOOLS["Tools<br/>━━━━━<br/>save_insight / save_mood<br/>save_profile_entry<br/>update_reading_status<br/>present_options<br/>get_reading_context"]

    SEARCH["Search Tools<br/>━━━━━<br/>google_search<br/>get_book_info"]

    FIRESTORE[("Firestore<br/>━━━━━<br/>対話履歴 + 構造化データ")]

    USER -->|対話| AGENT
    AGENT -->|"専門的な質問（結果が戻る）"| GUIDE
    AGENT --> TOOLS
    GUIDE --> SEARCH
    TOOLS --> FIRESTORE
    SEARCH --> FIRESTORE

    style AGENT fill:#34a853,stroke:#333,color:#fff,stroke-width:3px
    style GUIDE fill:#34a853,stroke:#333,color:#fff,stroke-dasharray: 5 5
    style TOOLS fill:#e0e0e0,stroke:#333,color:#333
    style SEARCH fill:#e0e0e0,stroke:#333,color:#333
    style FIRESTORE fill:#ea4335,stroke:#333,color:#fff
```

### Reading Agent の説明

Reading Agentがこのアプリの主役です。ユーザーと対話しながら読書体験を掘り下げて、気づきや学びを言葉にしていきます。

主な機能:
- 読書の前・途中・後で対話し、感想や気づきを引き出す
- `save_insight` — 対話から出てきた気づきを自動保存
- `save_mood` — 読書前後の心境変化を5項目のメトリクスで記録
- `save_profile_entry` — ユーザーの興味・価値観をプロファイルに蓄積
- `present_options` — 選択肢を出して会話を進める「guidedモード」

BookGuide Agent（AgentToolパターン）:
- 概念の解説、時代背景、著者情報といった専門的な質問を処理するサブエージェント
- `google_search` でWeb検索、`get_book_info` で書籍情報を取って回答を補強
- AgentToolとして登録しているので、結果はReading Agentに戻る（制御移譲ではない）
- Reading Agentが対話の主導権を持ったまま、専門知識を引き出せる

データ保存:
- 対話はすべて `messages` コレクションに保存
- Insight、Mood、プロファイルは `readings`, `insights`, `moods`, `profileHistory` に構造化データとして保存

その他のエージェント:
読書の対話以外の場面では別のAgentを作成しています。各Agentは一部のツールを共有しています
- **Onboarding Agent** — 初回プロファイル作成。ユーザーの目標・興味・読みたい本をヒアリング
- **Mentor Agent** — 週次・月次の振り返り。過去の活動をもとに励ましやアドバイスを返す
- **Report Agent** — 対話履歴からレポートを生成し、アクションプランを保存

---

### 主要技術スタック

| レイヤー | 技術 |
|---------|------|
| AI Framework | Agent Development Kit (ADK) + google-genai SDK |
| LLM | Gemini API (`gemini-3-flash-preview`) - Vertex AI経由 |
| Backend | Python 3.12+ + FastAPI |
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS 4 |
| Hosting | Firebase App Hosting (Frontend) + Cloud Run (Backend) |
| Database | Firestore (対話履歴 + 構造化データ) |
| Auth | Firebase Auth |
| Speech | Web Speech API (音声入力) |
| Streaming | Server-Sent Events (SSE) |

---
