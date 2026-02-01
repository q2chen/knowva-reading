"""バッジ定義（マスタデータ）

バッジはFirestoreではなくコードで静的に管理する。
理由:
- バッジ種類は少数で固定的
- デプロイ時に変更可能
- クエリコスト削減
"""

from knowva.models.badge import BadgeDefinition

BADGE_DEFINITIONS: dict[str, BadgeDefinition] = {
    # === 読書系バッジ ===
    "first_reading": BadgeDefinition(
        id="first_reading",
        name="はじめの一歩",
        description="初めての読書記録を作成",
        category="reading",
        color="green",
    ),
    "books_5": BadgeDefinition(
        id="books_5",
        name="読書家見習い",
        description="5冊の読書記録を達成",
        category="reading",
        color="blue",
    ),
    "books_10": BadgeDefinition(
        id="books_10",
        name="本の虫",
        description="10冊の読書記録を達成",
        category="reading",
        color="blue",
    ),
    "books_25": BadgeDefinition(
        id="books_25",
        name="読書マスター",
        description="25冊の読書記録を達成",
        category="reading",
        color="purple",
    ),
    "books_50": BadgeDefinition(
        id="books_50",
        name="本棚の守護者",
        description="50冊の読書記録を達成",
        category="reading",
        color="amber",
    ),
    "first_completed": BadgeDefinition(
        id="first_completed",
        name="読了！",
        description="初めて本を読了",
        category="reading",
        color="green",
    ),
    # === Insight系バッジ ===
    "insights_10": BadgeDefinition(
        id="insights_10",
        name="学びの芽",
        description="10個の気づきを記録",
        category="insight",
        color="purple",
    ),
    "insights_50": BadgeDefinition(
        id="insights_50",
        name="知恵の泉",
        description="50個の気づきを記録",
        category="insight",
        color="purple",
    ),
    "insights_100": BadgeDefinition(
        id="insights_100",
        name="思索の達人",
        description="100個の気づきを記録",
        category="insight",
        color="amber",
    ),
    # === オンボーディング系バッジ ===
    "profile_3_entries": BadgeDefinition(
        id="profile_3_entries",
        name="自己紹介",
        description="プロファイル情報を3件以上登録",
        category="onboarding",
        color="green",
    ),
    "first_reflection": BadgeDefinition(
        id="first_reflection",
        name="振り返り",
        description="初めての振り返り対話を完了",
        category="onboarding",
        color="blue",
    ),
    "first_mood": BadgeDefinition(
        id="first_mood",
        name="心の記録",
        description="初めて心境を記録",
        category="onboarding",
        color="pink",
    ),
    "onboarding_complete": BadgeDefinition(
        id="onboarding_complete",
        name="スタート完了",
        description="オンボーディングを完了",
        category="onboarding",
        color="amber",
    ),
}


def get_badge_definition(badge_id: str) -> BadgeDefinition | None:
    """バッジ定義を取得する。"""
    return BADGE_DEFINITIONS.get(badge_id)


def get_all_badge_definitions() -> list[BadgeDefinition]:
    """全バッジ定義を取得する。"""
    return list(BADGE_DEFINITIONS.values())
