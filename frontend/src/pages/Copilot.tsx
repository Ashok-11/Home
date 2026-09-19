import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send, Sparkles } from "lucide-react";
import { apiGet } from "@/lib/api";
import { useMe } from "@/lib/session";
import type { CopilotMessage } from "@/lib/types";
import { BackgroundBlobs, PageHeader } from "@/components/decor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Copilot() {
  const me = useMe();
  const qc = useQueryClient();
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ["copilot"],
    queryFn: () => apiGet<CopilotMessage[]>("/ai/copilot/history"),
  });

  useEffect(() => {
    if (history.data && messages.length === 0) setMessages(history.data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.data]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (override?: string) => {
    const text = (override ?? input).trim();
    if (!text || streaming) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      // Streaming needs the raw fetch ReadableStream — apiPost parses JSON only.
      // Still a relative /api path: same proxy/origin rules as the helpers.
      const res = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok || !res.body) throw new Error(`request failed with ${res.status}`);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const payload = line.replace(/^data: /, "").trim();
          if (payload === "[DONE]") continue;
          try {
            const evt = JSON.parse(payload) as { delta?: string; error?: string };
            if (evt.error) throw new Error(evt.error);
            if (evt.delta) {
              setMessages((m) => {
                const copy = [...m];
                copy[copy.length - 1] = { role: "assistant", content: copy[copy.length - 1].content + evt.delta };
                return copy;
              });
            }
          } catch {
            /* keep-alive or partial chunk */
          }
        }
      }
      qc.invalidateQueries({ queryKey: ["copilot"] });
    } catch (err) {
      setMessages((m) => {
        const copy = [...m];
        copy[copy.length - 1] = {
          role: "assistant",
          content: copy[copy.length - 1].content || "Sorry — the copilot is unavailable right now.",
        };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="relative flex min-h-[calc(100svh-8rem)] flex-col">
      <BackgroundBlobs />
      <PageHeader title="AI Copilot" subtitle={`Your household brain — ${me.data?.name === "Husband" ? "run the numbers, plan the week" : "answers from your real data"}.`} />

      <div className="glass flex-1 rounded-2xl p-4 sm:p-6" data-testid="copilot-thread">
        <div className="grid gap-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1E4030] to-[#D0663C] text-white shadow-lg">
                <Sparkles className="h-7 w-7" />
              </div>
              <p className="mt-4 font-heading text-lg font-semibold">Ask me anything about your home</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {["How much did we spend this month?", "What's for dinner today?", "Are we within budget?"].map((q) => (
                  <button
                    key={q}
                    data-testid="copilot-suggested-question"
                    onClick={() => {
                      send(q);
                    }}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`} data-testid="copilot-message">
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "rounded-br-md bg-[#1E4030] text-white"
                    : "rounded-bl-md bg-card shadow-sm ring-1 ring-border"
                }`}
              >
                {m.content || (streaming && i === messages.length - 1 ? <Loader2 className="h-4 w-4 animate-spin" /> : "")}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="glass mt-3 flex items-center gap-2 rounded-2xl p-2 pl-4">
        <Input
          data-testid="copilot-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about spending, menu, chores…"
          className="border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button data-testid="copilot-send-button" disabled={streaming || !input.trim()} onClick={() => send()} className="bg-[#D0663C] text-white hover:bg-[#B8552F]">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
