import { useState, useRef, useEffect } from "react";
import type { ChatMessage } from "../lib/types";

const STARTERS = [
  "Who is the DM of Lucknow?",
  "How does the Union Council of Ministers connect to district administration?",
  "Which office handles water supply complaints?",
  "What data do we have on Karnataka district collectors?",
];

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError(null);
    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Request failed");
      }
      setMessages([
        ...next,
        {
          role: "assistant",
          content: data.message?.content ?? "No response.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach AI agent.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)] max-h-[800px]">
      <div className="mb-4">
        <h1 className="font-display text-3xl font-bold text-ink-950">AI Agent</h1>
        <p className="text-ink-600 mt-2">
          Ask questions about India&apos;s government org chart, office holders, contacts,
          and citizen problem routing — powered by DeepSeek and the Accountable India dataset.
        </p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-8">
              <p className="text-ink-500 mb-4">Try one of these questions:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {STARTERS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => send(q)}
                    className="rounded-full border border-ink-200 px-3 py-1.5 text-sm text-ink-600 hover:border-saffron-400 hover:bg-saffron-50/50 transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-ink-950 text-white"
                    : "bg-ink-100 text-ink-800"
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-ink-100 px-4 py-3 text-sm text-ink-500">
                Thinking…
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-50 text-red-700 text-sm border-t border-red-100">
            {error}
          </div>
        )}

        <form
          className="border-t border-ink-100 p-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            type="text"
            className="input flex-1"
            placeholder="Ask about offices, officials, or responsibilities…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="btn-primary shrink-0" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
