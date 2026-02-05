"""Google Cloud Speech-to-Text API WebSocket endpoint."""

import asyncio
import json
import logging

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from google.cloud import speech

from knowva.middleware.firebase_auth import verify_websocket_token

logger = logging.getLogger(__name__)

router = APIRouter()

# Audio Configuration
SAMPLE_RATE = 16000  # 16kHz (recommended for speech recognition)
LANGUAGE_CODE = "ja-JP"  # Japanese
STREAMING_TIMEOUT = 270  # 4.5 minutes (API limit is 5 minutes)


class SpeechRecognitionSession:
    """Speech-to-Text streaming session manager."""

    def __init__(self, websocket: WebSocket):
        self.websocket = websocket
        self.client = speech.SpeechClient()
        self.audio_queue: asyncio.Queue[bytes | None] = asyncio.Queue()
        self.is_running = False
        self._stop_event = asyncio.Event()

    def get_config(self) -> speech.StreamingRecognitionConfig:
        """Create streaming recognition config."""
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=SAMPLE_RATE,
            language_code=LANGUAGE_CODE,
            enable_automatic_punctuation=True,
            model="latest_long",  # Better for longer utterances
        )

        streaming_config = speech.StreamingRecognitionConfig(
            config=config,
            interim_results=True,  # Enable interim results
            single_utterance=False,  # Continuous recognition
        )
        return streaming_config

    def _request_generator(self):
        """Generate requests for the streaming API (synchronous generator)."""
        # Only yield audio content requests (config is passed separately)
        while self.is_running:
            try:
                # Use a small timeout to check is_running periodically
                chunk = self.audio_queue.get_nowait()
                if chunk is None:  # End signal
                    break
                yield speech.StreamingRecognizeRequest(audio_content=chunk)
            except asyncio.QueueEmpty:
                # Small sleep to prevent busy waiting
                import time

                time.sleep(0.01)
                continue

    async def _send_transcripts(self, responses) -> None:
        """Process Speech-to-Text responses and send to WebSocket."""
        try:
            for response in responses:
                if self._stop_event.is_set():
                    break

                if not response.results:
                    continue

                for result in response.results:
                    if not result.alternatives:
                        continue

                    transcript = result.alternatives[0].transcript
                    confidence = (
                        result.alternatives[0].confidence if result.is_final else None
                    )

                    await self.websocket.send_json(
                        {
                            "type": "transcript",
                            "transcript": transcript,
                            "is_final": result.is_final,
                            "confidence": confidence,
                        }
                    )

        except Exception as e:
            logger.error(f"Error processing responses: {e}")
            try:
                await self.websocket.send_json(
                    {
                        "type": "error",
                        "code": "processing_error",
                        "message": str(e),
                    }
                )
            except Exception:
                pass  # WebSocket might be closed

    async def start(self) -> None:
        """Start the streaming recognition."""
        self.is_running = True
        self._stop_event.clear()

        try:
            # Run gRPC streaming in executor (blocking call)
            loop = asyncio.get_event_loop()

            async with asyncio.timeout(STREAMING_TIMEOUT):
                streaming_config = self.get_config()
                responses = await loop.run_in_executor(
                    None,
                    lambda: self.client.streaming_recognize(
                        config=streaming_config,
                        requests=self._request_generator(),
                    ),
                )
                await self._send_transcripts(responses)

        except TimeoutError:
            logger.info("Streaming recognition timed out")
            try:
                await self.websocket.send_json(
                    {
                        "type": "error",
                        "code": "timeout",
                        "message": "セッションがタイムアウトしました（最大4.5分）",
                    }
                )
            except Exception:
                pass
        except Exception as e:
            logger.error(f"Streaming recognition error: {e}")
            try:
                await self.websocket.send_json(
                    {
                        "type": "error",
                        "code": "recognition_error",
                        "message": str(e),
                    }
                )
            except Exception:
                pass
        finally:
            self.is_running = False

    async def add_audio(self, audio_data: bytes) -> None:
        """Add audio chunk to processing queue."""
        if self.is_running:
            await self.audio_queue.put(audio_data)

    async def stop(self) -> None:
        """Stop the streaming recognition."""
        self.is_running = False
        self._stop_event.set()
        await self.audio_queue.put(None)  # End signal


@router.websocket("/ws/speech")
async def websocket_speech_recognition(websocket: WebSocket):
    """WebSocket endpoint for real-time speech recognition."""
    await websocket.accept()

    # Authenticate via first message
    try:
        auth_message = await asyncio.wait_for(websocket.receive_json(), timeout=10.0)
        if auth_message.get("type") != "auth":
            await websocket.send_json({"type": "error", "code": "auth_required"})
            await websocket.close()
            return

        token = auth_message.get("token")
        user = await verify_websocket_token(token)
        if not user:
            await websocket.send_json({"type": "error", "code": "invalid_token"})
            await websocket.close()
            return

        await websocket.send_json({"type": "auth_success", "user_id": user["uid"]})
        logger.info(f"Speech WebSocket authenticated for user {user['uid']}")

    except TimeoutError:
        await websocket.send_json({"type": "error", "code": "auth_timeout"})
        await websocket.close()
        return
    except Exception as e:
        logger.error(f"Auth error: {e}")
        await websocket.close()
        return

    session = SpeechRecognitionSession(websocket)
    recognition_task: asyncio.Task | None = None

    try:
        while True:
            message = await websocket.receive()

            if message["type"] == "websocket.disconnect":
                break

            if "bytes" in message:
                # Binary audio data
                await session.add_audio(message["bytes"])

                # Start recognition if not already running
                if recognition_task is None or recognition_task.done():
                    recognition_task = asyncio.create_task(session.start())

            elif "text" in message:
                # JSON control messages
                data = json.loads(message["text"])

                if data.get("type") == "stop":
                    await session.stop()
                    await websocket.send_json({"type": "stopped"})

    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected for user {user['uid']}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await session.stop()
        if recognition_task and not recognition_task.done():
            recognition_task.cancel()
            try:
                await recognition_task
            except asyncio.CancelledError:
                pass
