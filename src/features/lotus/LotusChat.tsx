import React, { Fragment, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import type { LotusMessage } from "./types";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Lightweight markdown renderer (inline: bold, italic, code, links)
// ---------------------------------------------------------------------------

type InlineToken =
  | { type: "text"; value: string }
  | { type: "code"; value: string }
  | { type: "bold"; value: string }
  | { type: "italic"; value: string }
  | { type: "link"; label: string; href: string };

function tokenizeInline(text: string): Array<InlineToken> {
  const pattern = /(\[[^\]]+\]\(https?:\/\/[^\s)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  const tokens: Array<InlineToken> = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const full = match[0];
    if (match.index > lastIndex) {
      tokens.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    if (full.startsWith("`") && full.endsWith("`")) {
      tokens.push({ type: "code", value: full.slice(1, -1) });
    } else if (full.startsWith("**") && full.endsWith("**")) {
      tokens.push({ type: "bold", value: full.slice(2, -2) });
    } else if (full.startsWith("*") && full.endsWith("*")) {
      tokens.push({ type: "italic", value: full.slice(1, -1) });
    } else if (full.startsWith("[")) {
      const linkMatch = full.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (linkMatch) {
        tokens.push({ type: "link", label: linkMatch[1], href: linkMatch[2] });
      } else {
        tokens.push({ type: "text", value: full });
      }
    } else {
      tokens.push({ type: "text", value: full });
    }

    lastIndex = match.index + full.length;
  }

  if (lastIndex < text.length) {
    tokens.push({ type: "text", value: text.slice(lastIndex) });
  }
  return tokens;
}

function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {tokenizeInline(text).map((token, i) => {
        if (token.type === "code")
          return (
            <code
              key={i}
              className="px-1 py-0.5 rounded bg-background/50 border border-border/40 text-[0.9em] font-mono"
            >
              {token.value}
            </code>
          );
        if (token.type === "bold")
          return (
            <strong key={i} className="font-semibold">
              {token.value}
            </strong>
          );
        if (token.type === "italic") return <em key={i}>{token.value}</em>;
        if (token.type === "link")
          return (
            <a
              key={i}
              href={token.href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-dotted underline-offset-2 hover:opacity-80"
            >
              {token.label}
            </a>
          );
        return <Fragment key={i}>{token.value}</Fragment>;
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Block-level markdown (headings, code blocks, lists)
// ---------------------------------------------------------------------------

function MarkdownContent({ content }: { content: string }) {
  const blocks = useMemo(() => {
    const lines = content.split(/\r?\n/);
    const result: Array<{ type: "code"; value: string } | { type: "line"; value: string }> = [];
    let inCode = false;
    let codeBuf: Array<string> = [];

    lines.forEach((line) => {
      if (line.trim().startsWith("```")) {
        if (inCode) {
          result.push({ type: "code", value: codeBuf.join("\n") });
          codeBuf = [];
          inCode = false;
        } else {
          inCode = true;
        }
        return;
      }
      if (inCode) {
        codeBuf.push(line);
        return;
      }
      result.push({ type: "line", value: line });
    });

    if (codeBuf.length) {
      result.push({ type: "code", value: codeBuf.join("\n") });
    }
    return result;
  }, [content]);

  return (
    <div className="space-y-1.5 select-text min-w-0 max-w-full">
      {blocks.map((block, i) => {
        if (block.type === "code") {
          return (
            <pre
              key={i}
              className="rounded-md border border-border/50 bg-background/30 p-2.5 overflow-x-auto whitespace-pre-wrap break-words text-[11px] font-mono leading-relaxed"
            >
              <code>{block.value}</code>
            </pre>
          );
        }

        const text = block.value;
        const headingMatch = text.match(/^(#{1,6})\s+(.*)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          const cls = level <= 2 ? "text-sm font-semibold mt-2" : "text-xs font-semibold mt-1";
          return (
            <div key={i} className={cls}>
              <InlineMarkdown text={headingMatch[2]} />
            </div>
          );
        }

        const bulletMatch = text.match(/^\s*[-*]\s+(.*)$/);
        if (bulletMatch) {
          return (
            <div key={i} className="flex items-start gap-1.5 ml-1">
              <span className="opacity-50 shrink-0">{"•"}</span>
              <span className="min-w-0">
                <InlineMarkdown text={bulletMatch[1]} />
              </span>
            </div>
          );
        }

        const numberMatch = text.match(/^\s*(\d+)\.\s+(.*)$/);
        if (numberMatch) {
          return (
            <div key={i} className="flex items-start gap-1.5 ml-1">
              <span className="opacity-50 shrink-0 tabular-nums">{numberMatch[1]}.</span>
              <span className="min-w-0">
                <InlineMarkdown text={numberMatch[2]} />
              </span>
            </div>
          );
        }

        if (!text.trim()) return <div key={i} className="h-1" />;

        return (
          <div key={i} className="min-w-0 break-words">
            <InlineMarkdown text={text} />
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Thinking block (collapsible)
// ---------------------------------------------------------------------------

function parseThinking(raw: string): {
  thinking: string | null;
  content: string;
} {
  const thinkMatch = raw.match(/<think>([\s\S]*?)<\/think>/);
  if (!thinkMatch) return { thinking: null, content: raw.trim() };
  const thinking = thinkMatch[1].trim();
  const content = raw.replace(/<think>[\s\S]*?<\/think>/, "").trim();
  return { thinking: thinking || null, content };
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = React.useState(false);

  return (
    <div className="mb-1.5">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", !open && "-rotate-90")} />
        <span>Thought process</span>
      </button>
      {open && (
        <div className="mt-1 pl-3 border-l-2 border-muted-foreground/15 text-[11px] text-muted-foreground/40 leading-relaxed">
          <MarkdownContent content={text} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main chat component
// ---------------------------------------------------------------------------

interface LotusChatProps {
  messages: Array<LotusMessage>;
  loading?: boolean;
  onSuggestionClick?: (s: { label: string; action?: string; capId?: string }) => void;
}

export function LotusChat({ messages, loading, onSuggestionClick }: LotusChatProps) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, loading]);

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-2">
            <div className="text-2xl opacity-30">{"\u2726"}</div>
            <div className="text-sm font-medium">Lotus Mode</div>
            <div className="text-xs text-center max-w-xs">
              {"Ask questions, run actions, or chat with your configured agent profile. Press "}
              <kbd className="rounded border px-1 py-0.5 text-[9px] font-mono bg-muted">Tab</kbd>
              {" to switch back to search."}
            </div>
          </div>
        )}
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          const { thinking, content } = isUser
            ? { thinking: null, content: msg.content }
            : parseThinking(msg.content);

          return (
            <div
              key={msg.id}
              className={cn(
                "rounded-lg px-3 py-2 text-sm max-w-[85%]",
                isUser ? "ml-auto bg-primary text-primary-foreground" : "bg-muted",
              )}
            >
              {thinking && <ThinkingBlock text={thinking} />}
              {isUser ? (
                <div className="whitespace-pre-wrap">{content}</div>
              ) : (
                <MarkdownContent content={content} />
              )}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-xs transition-colors",
                        "hover:bg-primary/10 hover:border-primary/30",
                        "active:bg-primary/20",
                      )}
                      onClick={() => onSuggestionClick?.(s)}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {loading && (
          <div className="bg-muted rounded-lg px-3 py-2 text-sm max-w-[85%]">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
              <span>Lotus is thinking...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
