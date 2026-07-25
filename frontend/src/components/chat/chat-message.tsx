"use client"

import * as React from "react"
import ReactMarkdown from "react-markdown"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { atomDark } from "react-syntax-highlighter/dist/esm/styles/prism"
import { BarChart, Bar, LineChart, Line, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { User, Bot, Copy, Check, RotateCcw, Volume2, Square, Loader2, Download } from "lucide-react"
import { toast } from "sonner"
import { ChatMessage as IChatMessage, useChatStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTTS } from "@/hooks/use-tts"

interface ChatMessageProps {
  message: IChatMessage
  onRegenerate?: () => void
}

const COLORS = ['#0ea5e9', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b', '#ef4444', '#6366f1']

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
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.images.map((img) => (
                <div key={img.id} className="relative group/image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt={img.filename} className="w-48 h-auto max-h-64 object-contain rounded-lg border border-primary-foreground/20 bg-background/10" />
                  <a href={img.url} download={img.filename} target="_blank" rel="noopener noreferrer" className="absolute top-2 right-2 bg-black/60 text-white p-1 rounded-md opacity-0 group-hover/image:opacity-100 transition-opacity">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
          {message.role === "user" ? (
            <span className="whitespace-pre-wrap break-words">{message.content}</span>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:p-0 w-full">
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
                        <div className="w-full h-[300px] my-4 p-4 bg-background border rounded-xl shadow-sm">
                          {config.title && <h4 className="text-center font-medium mb-4 text-foreground">{config.title}</h4>}
                          <ResponsiveContainer width="100%" height="100%">
                            {config.type === "bar" ? (
                              <BarChart data={config.data}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey={config.xKey} stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} opacity={0.5} />
                                <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} opacity={0.5} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                                <Legend />
                                <Bar dataKey={config.yKey} fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                              </BarChart>
                            ) : config.type === "line" ? (
                              <LineChart data={config.data}>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey={config.xKey} stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} opacity={0.5} />
                                <YAxis stroke="currentColor" fontSize={12} tickLine={false} axisLine={false} opacity={0.5} />
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                                <Legend />
                                <Line type="monotone" dataKey={config.yKey} stroke={COLORS[1]} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                              </LineChart>
                            ) : config.type === "scatter" ? (
                              <ScatterChart>
                                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                                <XAxis dataKey={config.xKey} name={config.xKey} stroke="currentColor" fontSize={12} opacity={0.5} />
                                <YAxis dataKey={config.yKey} name={config.yKey} stroke="currentColor" fontSize={12} opacity={0.5} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                                <Scatter name={config.title || "Data"} data={config.data} fill={COLORS[2]} />
                              </ScatterChart>
                            ) : config.type === "pie" ? (
                              <PieChart>
                                <Pie data={config.data} dataKey={config.yKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={80} label>
                                  {config.data.map((_: unknown, index: number) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                                <Legend />
                              </PieChart>
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">Unsupported chart type: {config.type}</div>
                            )}
                          </ResponsiveContainer>
                        </div>
                      )
                    } catch (e) {
                      console.error("Failed to parse chart JSON", e)
                      return <div className="text-destructive bg-destructive/10 p-4 rounded-xl border border-destructive/20 my-4 text-sm font-mono">Failed to render chart: Invalid JSON format</div>
                    }
                  }

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
            </div>
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
