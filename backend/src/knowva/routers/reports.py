"""Reading Report & Action Plan API Router."""

import json
import logging
import time
from collections.abc import AsyncGenerator
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from google.adk.runners import Runner
from google.genai import types
from sse_starlette import EventSourceResponse, ServerSentEvent

from knowva.agents import report_agent
from knowva.config import settings
from knowva.middleware.firebase_auth import get_current_user
from knowva.middleware.rate_limit import limiter
from knowva.models.action_plan import ActionPlanResponse, ActionPlanUpdate
from knowva.models.report import ReportResponse
from knowva.services import firestore
from knowva.services.session_service import get_session_service

logger = logging.getLogger(__name__)

router = APIRouter()

APP_NAME = "knowva_report"


def json_serializer(obj):
    """datetimeオブジェクトをシリアライズする。"""
    if isinstance(obj, datetime):
        return obj.isoformat()
    raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")


def get_report_runner() -> Runner:
    """Report Agent用のADK Runnerを取得する。"""
    return Runner(
        agent=report_agent,
        app_name=APP_NAME,
        session_service=get_session_service(),
    )


# --- Report Endpoints ---


@router.post("/{reading_id}/reports/generate")
@limiter.limit(settings.rate_limit_ai_endpoints)
async def generate_report(
    request: Request,
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """読書レポートを生成する（SSEストリーミング）。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    async def event_generator() -> AsyncGenerator[ServerSentEvent, None]:
        session_service = get_session_service()
        session_id = f"report_{reading_id}_{int(time.time())}"

        # ADKセッション作成
        await session_service.create_session(
            app_name=APP_NAME,
            user_id=user["uid"],
            session_id=session_id,
            state={
                "reading_id": reading_id,
                "user_id": user["uid"],
            },
        )

        runner = get_report_runner()
        init_content = types.Content(
            role="user",
            parts=[types.Part(text="この読書のレポートを生成してください。")],
        )

        message_id = f"report_{reading_id}_{int(time.time() * 1000)}"
        accumulated_text = ""
        pending_tool_calls: dict[str, str] = {}

        yield ServerSentEvent(
            data=json.dumps({"message_id": message_id}), event="message_start"
        )

        try:
            async for event in runner.run_async(
                user_id=user["uid"],
                session_id=session_id,
                new_message=init_content,
            ):
                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if hasattr(part, "function_call") and part.function_call:
                            fc = part.function_call
                            tool_name = getattr(fc, "name", "unknown")
                            tool_id = getattr(
                                fc, "id", f"tc_{int(time.time() * 1000)}"
                            )
                            pending_tool_calls[tool_id] = tool_name
                            yield ServerSentEvent(
                                data=json.dumps(
                                    {"tool_name": tool_name, "tool_call_id": tool_id}
                                ),
                                event="tool_call_start",
                            )

                        if (
                            hasattr(part, "function_response")
                            and part.function_response
                        ):
                            fr = part.function_response
                            tool_id = getattr(fr, "id", None)
                            tool_name = getattr(fr, "name", None)
                            result = getattr(fr, "response", {})

                            if not tool_id and tool_name:
                                for tid, tname in pending_tool_calls.items():
                                    if tname == tool_name:
                                        tool_id = tid
                                        break

                            if tool_id:
                                yield ServerSentEvent(
                                    data=json.dumps(
                                        {
                                            "tool_call_id": tool_id,
                                            "result": result,
                                        },
                                        default=json_serializer,
                                    ),
                                    event="tool_call_done",
                                )
                                pending_tool_calls.pop(tool_id, None)

                if event.content and event.content.parts:
                    for part in event.content.parts:
                        if part.text:
                            new_text = part.text
                            if new_text != accumulated_text:
                                delta = (
                                    new_text[len(accumulated_text) :]
                                    if new_text.startswith(accumulated_text)
                                    else new_text
                                )
                                if delta:
                                    yield ServerSentEvent(
                                        data=json.dumps({"delta": delta}),
                                        event="text_delta",
                                    )
                                accumulated_text = new_text

        except Exception as e:
            logger.error(f"Report generation error: {e}", exc_info=True)
            yield ServerSentEvent(
                data=json.dumps(
                    {
                        "code": "generation_error",
                        "message": "レポート生成中にエラーが発生しました。",
                    }
                ),
                event="error",
            )
            return

        yield ServerSentEvent(
            data=json.dumps({"text": accumulated_text}), event="text_done"
        )
        yield ServerSentEvent(
            data=json.dumps({"status": "completed"}), event="message_done"
        )

        # セッションクリーンアップ
        try:
            await session_service.delete_session(
                app_name=APP_NAME, user_id=user["uid"], session_id=session_id
            )
        except Exception:
            pass

    return EventSourceResponse(
        event_generator(),
        headers={"Cache-Control": "no-cache"},
    )


@router.get("/{reading_id}/reports", response_model=list[ReportResponse])
async def list_reports(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """レポート一覧を取得する。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return await firestore.list_reports(user["uid"], reading_id)


@router.get("/{reading_id}/reports/latest")
async def get_latest_report(
    reading_id: str,
    user: dict = Depends(get_current_user),
) -> Optional[ReportResponse]:
    """最新のレポートを取得する。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    report = await firestore.get_latest_report(user["uid"], reading_id)
    if not report:
        return None
    return report


# --- Action Plan Endpoints ---


@router.get("/{reading_id}/action-plans", response_model=list[ActionPlanResponse])
async def list_action_plans(
    reading_id: str,
    user: dict = Depends(get_current_user),
):
    """アクションプラン一覧を取得する。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")
    return await firestore.list_action_plans(user["uid"], reading_id)


@router.patch(
    "/{reading_id}/action-plans/{plan_id}", response_model=ActionPlanResponse
)
async def update_action_plan(
    reading_id: str,
    plan_id: str,
    body: ActionPlanUpdate,
    user: dict = Depends(get_current_user),
):
    """アクションプランのステータスを更新する。"""
    reading = await firestore.get_reading(user["uid"], reading_id)
    if not reading:
        raise HTTPException(status_code=404, detail="Reading not found")

    result = await firestore.update_action_plan(
        user["uid"],
        reading_id,
        plan_id,
        body.model_dump(exclude_unset=True),
    )
    if not result:
        raise HTTPException(status_code=404, detail="Action plan not found")
    return result
