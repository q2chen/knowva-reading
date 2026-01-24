# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

Knowva（ノヴァ）は、AIによる読書体験支援アプリケーション。ユーザーが読んだ本の感想や学びを対話的に言語化し、読書傾向（プロファイル）を蓄積・可視化し、次に読むべき本を推薦する。

**コアバリュー:** 読書体験を「時間とともに変化する思想の履歴」として長期保存する。完全な対話ログを不変データとして保存し、将来のAIモデルによる再解釈を可能にする。

## プロジェクト状態

設計・仕様策定フェーズ。ソースコードの実装はまだ行われていない。

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

- **Agent Framework:** Agent Development Kit (ADK)
- **LLM API:** Gemini / OpenAI GPT-4 / Anthropic Claude
- **ストレージ:** Google Cloud Storage（生ログ）+ Firestore（構造化データ）
- **フロントエンド:** Next.js (App Router)
- **バックエンド:** Python (FastAPI)
- **インフラ:** Google Cloud Agent Engine

## AIエージェント

1. **読書振り返りエージェント** - 対話を通じて読書体験を深掘りし、感想・学びの言語化を支援
2. **プロファイル抽出エージェント** - 対話ログからユーザーの属性・価値観・状況を抽出・更新
3. **推薦エージェント** - ユーザープロファイルに基づき次に読むべき本を提案
