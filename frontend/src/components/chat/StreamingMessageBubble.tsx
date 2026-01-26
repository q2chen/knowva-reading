"use client";

import type { StreamingState } from "@/lib/types";

interface Props {
  streamingState: StreamingState;
}

export function StreamingMessageBubble({ streamingState }: Props) {
  if (!streamingState.isStreaming && !streamingState.currentText) {
    return null;
  }

  return (
    <div className="flex justify-start">
      <div className="bg-gray-100 px-4 py-2 rounded-2xl rounded-bl-md max-w-[80%]">
        {/* ツール呼び出し表示 */}
        {streamingState.toolCalls.length > 0 && (
          <div className="mb-2 text-xs text-gray-500 space-y-1">
            {streamingState.toolCalls.map((tc) => (
              <div key={tc.id} className="flex items-center gap-1">
                <span className={tc.result ? "text-green-500" : "animate-pulse"}>
                  {tc.result ? "✓" : "●"}
                </span>
                <span>{tc.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* ストリーミングテキスト */}
        {streamingState.currentText ? (
          <p className="whitespace-pre-wrap">
            {streamingState.currentText}
            {/* カーソル表示 */}
            {streamingState.isStreaming && (
              <span className="inline-block w-0.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />
            )}
          </p>
        ) : (
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.1s]" />
            <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
          </div>
        )}
      </div>
    </div>
  );
}
