# Knowva - AIエージェント設計ドキュメント

## エージェントアーキテクチャ概要

Knowvaは ADK (Agent Development Kit) を使用した3つの独立したエージェントで構成されています。
各エージェントはGUI上で別々の画面として提供され、それぞれが独立して動作します。

**設計原則:**
- 3つのエージェントはGUI上で独立した画面として提供
- Reading Agentは読書フェーズ（前/中/後）を状態として管理し、プロンプトで対応を切り替え
- プロファイル情報は読書対話中にも自然に収集される

## エージェント関係図

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Knowva エージェント構成                              │
│                      (各エージェントはGUI上で独立)                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Reading Agent   │     │ Onboarding      │     │ Recommendation  │
│                 │     │ Agent           │     │ Agent           │
│ 読書対話全体を   │     │                 │     │ (Phase 2)       │
│ 担当            │     │ 初回の          │     │                 │
│ (前/中/後を     │     │ プロファイル     │     │ 本の推薦        │
│  状態で管理)    │     │ 作成を担当      │     │ を担当          │
│                 │     │                 │     │                 │
│ 📖 読書画面     │     │ 👋 初回画面     │     │ 📚 推薦画面     │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│ Tools:          │     │ Tools:          │     │ Tools:          │
│ - get_reading   │     │ - save_profile  │     │ - get_user      │
│   _context      │     │   _entry        │     │   _profile      │
│ - save_insight  │     │ - get_current   │     │ - search_books  │
│ - save_mood     │     │   _entries      │     │ - save_         │
│ - save_profile  │     └─────────────────┘     │   recommendation│
│   _entry        │                             └─────────────────┘
└────────┬────────┘
         │
         │ 専門的な質問の場合、委譲
         ▼
┌─────────────────┐
│ BookGuide       │
│ SubAgent        │
│                 │
│ 専門的な質問への │
│ 回答・解説      │
│                 │
│ Tools:          │
│ - web_search    │
│ - get_book_info │
└─────────────────┘
```

## 各エージェントの詳細

### 1. Reading Agent

**役割:** 
- 読書前・読書中・読書後の対話を1つのエージェントで担当
- 読書フェーズを状態として管理し、プロンプトで対応を切り替え
- 専門的な質問はBookGuide SubAgentに委譲
- 対話中に現れるユーザーの目標・興味も収集しプロファイルに保存

**実装ファイル:** `backend/src/knowva/agents/reading/agent.py`

**読書フェーズと対話内容:**

| フェーズ | 状態 | ヒアリング内容 |
|---------|------|--------------|
| 読書前 | `before_reading` | 本の基本情報、読書理由、今の心境 |
| 読書中 | `during_reading` | 感想（テキスト・音声・選択） |
| 読書後 | `after_reading` | 読了振り返り |

**フェーズ遷移のトリガー:**
- **ユーザー操作:** UIでワンタップでステータスを設定
- **Agent判断:** ユーザーの発言内容から自動でフェーズを判断

**ツール:**
| ツール名 | 機能 |
|---------|------|
| `get_reading_context` | 読書情報と現在の状態を取得 |
| `save_insight` | 気づき・学びを保存（learning/impression/question/connection） |
| `save_mood` | 心境データを保存（before/after） |
| `save_profile_entry` | 対話中に得られたプロファイル情報を保存（Onboarding Agentと同じスキーマ） |

**サブエージェント:**

#### BookGuide SubAgent

Reading Agentは専門的な質問（本の内容・背景・解説）を検知すると、BookGuide SubAgentに処理を委譲します。

**役割:** 本の内容や背景について専門的な質問に答え、理解をサポートする

**対応する質問例:**
- 難しい概念や理論の解説（物理学、哲学、経済学など）
- 本が書かれた時代背景・歴史的文脈
- 著者の意図や思想の解説
- 古典作品の現代語訳・解釈サポート
- 専門用語の説明
- 関連する概念や他の著作との繋がり

**ユースケース:**
- 「相対性理論のこの部分がよくわからない」→ わかりやすく噛み砕いて解説
- 「この古典の言い回しはどういう意味？」→ 現代語で解釈を説明
- 「著者がこれを書いた背景は？」→ 時代背景や著者の経歴を説明

**ツール:**
| ツール名 | 機能 |
|---------|------|
| `web_search` | 関連情報をWeb検索して回答を補強 |
| `get_book_info` | 本の詳細情報（著者、出版年、ジャンルなど）を取得 |

**呼び出しタイミング:** どのフェーズからでも、専門的な質問があれば委譲

### 2. Onboarding Agent

**役割:** 初回登録時に対話を通じてユーザーの目標・興味・読みたい本などを聞き出し、初期プロファイルを構築

**実装ファイル:** `backend/src/knowva/agents/onboarding/agent.py`

**使用タイミング:**
- 新規ユーザー登録後の初回対話
- ユーザーが明示的にプロファイル更新を希望した場合

**収集する情報:**
- `goal` - 目標（達成したいこと、なりたい自分）
- `interest` - 興味（最近気になっているテーマ）
- `book_wish` - 読みたい本
- `other` - その他の重要情報

**ツール:**
| ツール名 | 機能 |
|---------|------|
| `save_profile_entry` | プロファイル情報をFirestoreに保存 |
| `get_current_entries` | 既存のプロファイル情報を取得 |

### 3. Recommendation Agent (Phase 2)

**役割:** ユーザープロファイルに基づき、次に読むべき本を推薦

**実装状態:** 未実装

**計画中のツール:**
| ツール名 | 機能 |
|---------|------|
| `get_user_profile` | ユーザーの現在のプロファイルを取得 |
| `search_books` | 書籍を検索（外部API連携） |
| `save_recommendation` | 推薦結果をFirestoreに保存 |

## Reading Agent の状態管理

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Reading Agent (状態管理)                               │
└──────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                          読書セッション開始
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        │                           │                           │
        ▼                           ▼                           ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ before_reading  │       │ during_reading  │       │ after_reading   │
│                 │       │                 │       │                 │
│ ・本の基本情報   │  ──▶  │ ・感想の受け取り │  ──▶  │ ・読了振り返り   │
│ ・読書理由      │       │  (テキスト/     │       │                 │
│ ・今の心境      │       │   音声/選択)    │       │                 │
└─────────────────┘       └─────────────────┘       └─────────────────┘

フェーズ遷移トリガー:
├── ユーザー操作: UIでワンタップでステータス設定
└── Agent判断: ユーザーの発言から自動判断

どのフェーズからでも専門的な質問 → BookGuide SubAgent に委譲
                                    │
                                    ▼
                        ┌───────────────────────────────┐
                        │ BookGuide SubAgent            │
                        │                               │
                        │ ・専門用語の解説              │
                        │ ・時代背景の説明              │
                        │ ・著者の意図の解説            │
                        │                               │
                        │ Tools: web_search,            │
                        │        get_book_info          │
                        └───────────────────────────────┘
```

## ユーザー体験フロー

### 新規ユーザーの場合
```
1. 初回ログイン
       │
       ▼
2. Onboarding 画面へ遷移
       │
       ▼
3. Onboarding Agent との対話
   「どんな本に興味がありますか？」
   「読書で達成したい目標はありますか？」
       │
       ▼
4. 初期プロファイル作成完了
       │
       ▼
5. 読書画面へ遷移、本を選択して読書開始
       │
       ▼
6. Reading Agent との対話
   (フェーズに応じて対話内容を切り替え)
```

### 読書対話の例
```
User: 「7つの習慣」を読み始めようと思ってます
       │
       ▼
Reading Agent: (状態: before_reading)
       │
       ▼
Agent: この本を読もうと思ったきっかけを教えてください。
       │
       ▼
User: 仕事の効率を上げたくて...
       │
       ▼
(save_profile_entry で「goal: 仕事の効率化」を保存)
       │
       ▼
User: 第1章の「パラダイム」って何ですか？
       │
       ▼
Reading Agent: (専門的な質問を検知 → BookGuide SubAgent に委譲)
       │
       ▼
BookGuide SubAgent: (web_search で情報補強しつつ解説)
```

## requirements.mdとの整合性

| requirements.md の要件 | 対応エージェント | 実装状態 |
|----------------------|----------------|---------|
| No.4 AIとの対話的な振り返り | Reading Agent | 完了 |
| No.5 学びの言語化と記録 | Reading Agent (save_insight) | 完了 |
| No.6 ユーザープロファイルの抽出 | Onboarding Agent + Reading Agent | 完了 |
| No.8 AIによる本の推薦 | Recommendation Agent | Phase 2 |

## 対話フロー（SSEストリーミング）

```
User Input
    │
    ▼
ChatInterface (Frontend)
    │
    ▼ POST /api/readings/{id}/sessions/{id}/messages/stream
    │
FastAPI Endpoint
    │
    ▼
Reading Agent
    │
    ├──▶ LLM API (Gemini)
    │       │
    │       ▼
    │   Tool Calls (save_insight, etc.)
    │   または BookGuide SubAgent に委譲
    │       │
    │       ▼
    │   Firestore Updates
    │
    ▼
SSE Event Stream
    │
    ├── event: message_start
    ├── event: text_delta (複数回)
    ├── event: tool_call_start
    ├── event: tool_call_done
    ├── event: text_done
    └── event: message_done
    │
    ▼
ChatInterface (Frontend) - リアルタイム表示
```

## セッション管理

| 環境 | Session Service |
|------|----------------|
| ローカル開発 | FirestoreSessionService |
| 本番 (現在) | FirestoreSessionService |
| 本番 (Phase 2) | Agent Engine managed |

## 技術スタック

- **Agent Framework:** ADK (Agent Development Kit)
- **LLM:** Gemini (`gemini-3-flash-preview`)
- **Session Storage:** Firestore
- **Streaming:** Server-Sent Events (SSE) via fetch streaming
