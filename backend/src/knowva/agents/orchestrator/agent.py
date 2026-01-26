"""
ルートオーケストレーターエージェント。

複数のサブエージェントを統括し、ユーザーの意図に応じて
適切なエージェントにルーティングする。

現在は枠組みのみ実装。実際のルーティングロジックは後で追加予定。
"""

from google.adk.agents import LlmAgent

from knowva.agents.profile_interview.agent import profile_interview_agent
from knowva.agents.reading_reflection.agent import reading_reflection_agent

# TODO(phase2): 推薦エージェント追加時にimport
# from knowva.agents.recommendation.agent import recommendation_agent


root_orchestrator_agent = LlmAgent(
    name="root_orchestrator",
    model="gemini-3-flash-preview",
    instruction="""あなたはKnowvaアプリケーションのオーケストレーターエージェントです。

ユーザーのリクエストを適切なサブエージェントに振り分けます。

## サブエージェント一覧
1. reading_reflection_agent: 読書の振り返り対話を担当
2. profile_interview_agent: ユーザープロファイルのヒアリングを担当
3. (今後追加予定) recommendation_agent: 本の推薦を担当

## ルーティングルール
現在のMVPでは、セッションタイプに基づいてエージェントを選択します:
- reading セッション → reading_reflection_agent
- profile セッション → profile_interview_agent

## 注意事項
- 日本語で対話してください
- ルーティングが不明確な場合は、ユーザーに確認してください
- 現在はサブエージェントへの直接委譲のみ対応しています
""",
    sub_agents=[
        reading_reflection_agent,
        profile_interview_agent,
        # TODO(phase2): recommendation_agent 追加
    ],
)
