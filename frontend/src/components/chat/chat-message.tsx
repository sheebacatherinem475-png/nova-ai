"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"

import { Copy, Check, RotateCcw, Volume2, Square, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { ChatMessage as IChatMessage, useChatStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTTS } from "@/hooks/use-tts"
import { InteractiveChart } from "./interactive-chart"
import { DataDashboard } from "./data-dashboard"

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

  const isUser = message.role === "user"

  return (
    <div className={cn("flex w-full group", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[85%] md:max-w-[75%]", isUser ? "flex-col items-end" : "flex-row items-start gap-4")}>
        
        {/* Avatar for AI */}
        {!isUser && (
          <div className="flex h-8 w-8 mt-1 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-background text-primary shadow-sm">
            <span className="font-bold text-xs">N</span>
          </div>
        )}

        <div className={cn("flex flex-col min-w-0", isUser ? "items-end" : "items-start")}>
          <div 
            className={cn(
              "px-5 py-3.5 relative shadow-sm",
              isUser 
                ? "bg-secondary text-secondary-foreground rounded-[24px] rounded-br-sm" 
                : "bg-transparent text-foreground prose prose-sm md:prose-base dark:prose-invert max-w-none w-full"
            )}
          >
            {message.images && message.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {message.images.map((img) => (
                  <div key={img.id} className="relative group/image">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt={img.filename} className="w-48 h-auto max-h-64 object-contain rounded-xl border border-border bg-background/50 shadow-sm" />
                    <a href={img.url} download={img.filename} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-foreground/60 text-background p-1.5 rounded-lg opacity-0 group-hover/image:opacity-100 transition-opacity backdrop-blur-sm">
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
            
            {isUser ? (
              <span className="whitespace-pre-wrap break-words">{message.content}</span>
            ) : (
              <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 w-full prose-headings:font-semibold prose-a:text-primary">
                <ReactMarkdown
                  components={{
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  code({ inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "")
                    const language = match ? match[1] : ""
                    const codeText = String(children).replace(/\n$/, "")
                    
                    if (language === "chart") {
                      try {
                        const config = JSON.parse(codeText)
                        return (
                          <div className="my-6 border rounded-xl overflow-hidden shadow-sm bg-card p-4">
                            <InteractiveChart 
                              initialType={config.type} 
                              data={config.data} 
                              initialXKey={config.xKey} 
                              initialYKey={config.yKey} 
                              title={config.title} 
                            />
                          </div>
                        )
                      } catch (e) {
                        console.error("Failed to parse chart JSON", e)
                        return <div className="text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20 my-4 text-sm font-mono">Failed to render chart: Invalid JSON format</div>
                      }
                    }
                    
                    if (language === "dashboard") {
                      try {
                        const charts = JSON.parse(codeText)
                        if (!Array.isArray(charts)) throw new Error("Dashboard config must be an array")
                        return <div className="my-6"><DataDashboard charts={charts} /></div>
                      } catch (e) {
                        console.error("Failed to parse dashboard JSON", e)
                        return <div className="text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20 my-4 text-sm font-mono">Failed to render dashboard: Invalid JSON format</div>
                      }
                    }

                    if (!inline && match) {
                      return (
                        <div className="relative group/code my-6 rounded-xl overflow-hidden border bg-zinc-950 shadow-sm">
                          <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 text-zinc-400 text-xs font-mono">
                            <span>{match[1]}</span>
                            <button
                              onClick={() => copyToClipboard(codeText)}
                              className="hover:text-zinc-100 transition-colors flex items-center gap-1.5"
                            >
                              <Copy className="h-3 w-3" />
                              Copy code
                            </button>
                          </div>
                          <SyntaxHighlighter
                            {...props}
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            customStyle={{ margin: 0, padding: "1.25rem", backgroundColor: "transparent", fontSize: "0.875rem" }}
                          >
                            {codeText}
                          </SyntaxHighlighter>
                        </div>
                      )
                    }
                    return (
                      <code {...props} className={cn("bg-muted px-1.5 py-0.5 rounded-md font-mono text-[0.85em] font-medium text-foreground", className)}>
                        {children}
                      </code>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
              </div>
            )}
          </div>

          <div className={cn("flex items-center gap-1 mt-1 text-xs text-muted-foreground/70 transition-opacity", isUser ? "" : "opacity-0 group-hover:opacity-100")}>
            <span className="px-2">{formatTime(message.timestamp)}</span>
            
            {!isUser && (
              <div className="flex items-center gap-0.5 ml-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md"
                  onClick={() => copyToClipboard(message.content)}
                  title="Copy response"
                >
                  {hasCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                </Button>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md"
                  onClick={() => {
                    if (isPlaying || isGenerating) stopTTS()
                    else playTTS(message.content, selectedVoice, speechRate)
                  }}
                  title={isPlaying ? "Stop speaking" : "Read aloud"}
                >
                  {isGenerating ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : isPlaying ? (
                    <Square className="h-3.5 w-3.5 fill-current" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>

                {onRegenerate && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-md"
                    onClick={onRegenerate}
                    title="Regenerate response"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
