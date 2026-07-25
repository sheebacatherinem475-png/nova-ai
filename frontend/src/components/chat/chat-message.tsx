"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { User, Bot, Copy, Check, RotateCcw, Volume2, Square, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ChatMessage as IChatMessage, useChatStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTTS } from "@/hooks/use-tts"

interface ChatMessageProps {
  message: IChatMessage
  onRegenerate?: () => void
}

export function ChatMessage({ message, onRegenerate }: ChatMessageProps) {
  const [hasCopied, setHasCopied] = React.useState(false)
  const { playTTS, stopTTS, isPlaying, isGenerating } = useTTS()
  const { selectedVoice, speechRate } = useChatStore()

  const copyToClipboard = React.useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setHasCopied(true)
      setTimeout(() => setHasCopied(false), 2000)
    } catch {
      toast.error("Failed to copy text")
    }
  }, [])

  const formatTime = (ts: number) => {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: 'numeric' }).format(new Date(ts))
  }

  return (
    <div
      className={cn(
        "flex gap-4 w-full group",
        message.role === "user" ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          message.role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div
        className={cn(
          "flex flex-col gap-2 max-w-[80%] min-w-0",
          message.role === "user" ? "items-end" : "items-start"
        )}
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground mx-1">
          <span>{message.role === "user" ? "You" : "AI Assistant"}</span>
          <span>•</span>
          <span>{formatTime(message.timestamp)}</span>
        </div>
        
        <div
          className={cn(
            "px-4 py-3 rounded-2xl relative",
            message.role === "user"
              ? "bg-primary text-primary-foreground rounded-tr-none"
              : "bg-muted rounded-tl-none prose prose-sm dark:prose-invert max-w-none overflow-hidden"
          )}
        >
          {message.role === "user" ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : (
            <ReactMarkdown
              components={{
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                code({ inline, className, children, ...props }: any) {
                  const match = /language-(\w+)/.exec(className || "")
                  const codeText = String(children).replace(/\n$/, "")
                  
                  if (!inline && match) {
                    return (
                      <div className="relative group/code my-4 rounded-md overflow-hidden bg-[#1d1f21]">
                        <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 text-zinc-300 text-xs">
                          <span>{match[1]}</span>
                          <button
                            onClick={() => copyToClipboard(codeText)}
                            className="hover:text-white transition-colors flex items-center gap-1"
                          >
                            <Copy className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <SyntaxHighlighter
                          {...props}
                          style={atomDark}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: "1rem", backgroundColor: "transparent" }}
                        >
                          {codeText}
                        </SyntaxHighlighter>
                      </div>
                    )
                  }
                  return (
                    <code {...props} className={cn("bg-background px-1 py-0.5 rounded text-primary font-mono text-sm", className)}>
                      {children}
                    </code>
                  )
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>

        {message.role === "model" && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              onClick={() => copyToClipboard(message.content)}
              title="Copy response"
            >
              {hasCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            {message.role === "model" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (isPlaying || isGenerating) {
                    stopTTS()
                  } else {
                    playTTS(message.content, selectedVoice, speechRate)
                  }
                }}
                title={isPlaying ? "Stop speaking" : "Read aloud"}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : isPlaying ? (
                  <Square className="h-4 w-4 fill-current" />
                ) : (
                  <Volume2 className="h-4 w-4" />
                )}
              </Button>
            )}
            {onRegenerate && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                onClick={onRegenerate}
                title="Regenerate response"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
