"use client";

import { useState, useRef, useEffect } from "react";
import { addChatMessage } from "@/lib/actions/tasks";
import { aiAction } from "@/lib/actions/ai";
import type { Task, ChatAction, ChatMessage } from "@/lib/domain/types";

interface TaskChatProps {
  task: Task;
  project: string;
  mode?: "chat" | "breakdown";
  onClose: () => void;
  onApplyAction: (project: string, taskId: number, action: ChatAction) => void;
}

export default function TaskChat({ task, project, mode = "chat", onClose, onApplyAction }: TaskChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(task.chatHistory || []);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [autoStarted, setAutoStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Auto-start breakdown analysis
  useEffect(() => {
    if (mode === "breakdown" && !autoStarted && messages.length === 0) {
      setAutoStarted(true);
      sendMessage("このタスクをサブタスクに分解してください。");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, autoStarted]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || sending) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim(), timestamp: Date.now() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput("");
    setSending(true);

    await addChatMessage({ action: "addChat", project, taskId: task.id, role: "user", content: userMsg.content });

    try {
      const result = await aiAction({
        action: mode === "breakdown" ? "breakdown" : "chat",
        payload: {
          title: task.title, description: task.description,
          subtasks: task.subtasks?.map((s) => s.title) || [],
          message: userMsg.content, history: updated.slice(-10),
        },
      });
      const data = result.success ? result.data as Record<string, unknown> : { message: (result as { error: string }).error };
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: (data.message as string) || "No response",
        timestamp: Date.now(),
        actions: (data.actions as ChatAction[]) || [],
      };
      setMessages([...updated, assistantMsg]);
      await addChatMessage({ action: "addChat", project, taskId: task.id, role: "assistant", content: assistantMsg.content, actions: assistantMsg.actions });
    } catch {
      setMessages([...updated, { role: "assistant", content: "Error: could not reach AI", timestamp: Date.now() }]);
    }
    setSending(false);
  };

  const handleSend = () => sendMessage(input);

  const ACTION_LABELS: Record<string, string> = {
    "add-subtask": "+ SUBTASK",
    "set-priority": "SET PRIORITY",
    "update-description": "UPDATE DESC",
    "update-title": "UPDATE TITLE",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop" onClick={onClose}>
      <div
        className="bg-crt-dark border border-crt-green/30 rounded-lg w-[95vw] sm:w-full max-w-md mx-auto flex flex-col"
        style={{ maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-crt-gray/30 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] font-mono text-crt-gray-text">#{task.id}</span>
            <span className={`text-xs font-mono truncate ${mode === "breakdown" ? "glow-cyan" : "glow-green"}`}>{mode === "breakdown" ? "PLAN: " : ""}{task.title}</span>
          </div>
          <button onClick={onClose} className="text-crt-gray-text hover:text-gray-200 text-sm shrink-0 ml-2">&#x2715;</button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
          {messages.length === 0 && (
            <div className="text-[10px] font-mono text-crt-gray-text/50 text-center py-8">
              Ask AI about this task — refine description, suggest subtasks, discuss approach...
            </div>
          )}
          {messages.map((msg, i) => (
            <div key={i} className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[85%] rounded px-2.5 py-1.5 text-[10px] font-mono leading-relaxed ${
                  msg.role === "user"
                    ? "bg-crt-green/10 border border-crt-green/20 text-gray-200"
                    : "bg-crt-gray/50 border border-crt-gray/30 text-gray-300"
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                {/* Action buttons */}
                {msg.actions && msg.actions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-crt-gray/20">
                    {msg.actions.map((action, j) => (
                      <button
                        key={j}
                        onClick={() => onApplyAction(project, task.id, action)}
                        className="px-1.5 py-0.5 text-[8px] font-mono rounded border border-crt-cyan/30 bg-crt-cyan/10 text-crt-cyan hover:bg-crt-cyan/20 transition-all"
                      >
                        {ACTION_LABELS[action.type] || action.type}: {action.title || action.value}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex items-start">
              <div className="bg-crt-gray/50 border border-crt-gray/30 rounded px-2.5 py-1.5 text-[10px] font-mono text-crt-gray-text">
                <span className="inline-block w-2 h-2 border border-crt-green/50 border-t-crt-green rounded-full animate-spin mr-1" />
                thinking...
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 py-2.5 border-t border-crt-gray/30 shrink-0">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
              placeholder="Ask AI..."
              className="flex-1 bg-crt-black border border-crt-gray rounded px-2 py-1.5 text-xs font-mono text-gray-200 focus:border-crt-green/40 focus:outline-none"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="btn-execute px-2 py-1.5"
              style={sending || !input.trim() ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              &#x25B6;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
