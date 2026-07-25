"use client"

import * as React from "react"
import { Send, Square, Bot, Paperclip, Mic, MessageSquare, Code, FileText, Brain, PenTool, BarChart, Sparkles } from "lucide-react"
import TextareaAutosize from "react-textarea-autosize"
import { motion, Variants } from "framer-motion"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { ApiClient } from "@/lib/api"
import { useChatStore } from "@/lib/store"
import { ChatMessage } from "@/components/chat/chat-message"
import { cn } from "@/lib/utils"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

const SUGGESTED_PROMPTS = [
  { icon: Sparkles, title: "Explain a concept", text: "Explain quantum computing in simple terms" },
  { icon: FileText, title: "Summarize a document", text: "Summarize the key points of a lengthy document" },
  { icon: Code, title: "Write Python code", text: "Write a Python script to scrape a website" },
  { icon: Code, title: "Debug code", text: "Help me debug a React useEffect dependency issue" },
  { icon: Brain, title: "Brainstorm ideas", text: "Brainstorm 10 ideas for a new mobile app" },
  { icon: PenTool, title: "Draft an email", text: "Draft a professional email to my boss asking for time off" },
  { icon: MessageSquare, title: "Translate text", text: "Translate the following English text to French" },
  { icon: BarChart, title: "Analyze data", text: "How should I structure a SQL query to analyze user retention?" },
]

const QUICK_ACTIONS = [
  { icon: MessageSquare, label: "Chat" },
  { icon: Code, label: "Code" },
  { icon: FileText, label: "Documents" },
  { icon: Brain, label: "Study" },
  { icon: PenTool, label: "Write" },
  { icon: BarChart, label: "Analyze" },
]

export function ChatInterface() {
  const [input, setInput] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  
  const { chats, activeChatId, addMessage, updateMessage, createChat, voiceAutoRead, selectedVoice, speechRate } = useChatStore()
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const { isListening, startListening, stopListening, browserSupportsSpeechRecognition } = useSpeechRecognition((text) => setInput(text))
  
  // Local hook to just play the response globally (without UI sync on the specific message, since it's auto-read)
  // To avoid duplicating TTS hook state, we can use a simpler approach or just import ApiClient directly
  // But using useTTS is better if we want to stop it easily. We'll just generate and play.

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault()
        if (browserSupportsSpeechRecognition) {
          if (isListening) stopListening()
          else startListening()
        }
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [isListening, startListening, stopListening, browserSupportsSpeechRecognition])

  const activeChat = chats.find(c => c.id === activeChatId)
  const messages = React.useMemo(() => activeChat?.messages || [], [activeChat?.messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  React.useEffect(() => {
    scrollToBottom()
  }, [messages])

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsGenerating(false)
    }
  }

  const handleSend = async (text: string = input, isRetry = false) => {
    if (!text.trim() || isGenerating) return

    let chatId = activeChatId
    if (!chatId || messages.length === 0) {
      // If we don't have an active chat, or if the active chat is empty (new chat)
      if (!chatId) chatId = createChat()
    }

    if (!isRetry) {
      setInput("")
      addMessage(chatId, { role: "user", content: text })
    }

    setIsGenerating(true)
    const newController = new AbortController()
    abortControllerRef.current = newController

    const assistantMessageId = addMessage(chatId, { role: "model", content: "" })
    let accumulatedResponse = ""

    try {
      const historyForApi = useChatStore.getState().chats
        .find(c => c.id === chatId)?.messages
        .filter(m => m.id !== assistantMessageId)
        .map(m => ({ role: m.role, content: m.content })) || []

      await ApiClient.streamChat(
        text,
        historyForApi,
        (chunk) => {
          accumulatedResponse += chunk
          updateMessage(chatId!, assistantMessageId, accumulatedResponse)
        },
        newController.signal
      )
      
      if (voiceAutoRead && accumulatedResponse) {
        // Auto play the response using ApiClient directly since we don't need UI sync for global auto-read
        // Or we can just create a detached audio element
        ApiClient.generateTTS(accumulatedResponse, selectedVoice, speechRate)
          .then(url => {
            const audio = new Audio(url)
            audio.play().catch(e => console.error("Auto-play failed:", e))
          })
          .catch(e => console.error("TTS Auto-read failed:", e))
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        toast.info("Generation stopped.")
      } else {
        toast.error("Network Error", {
          description: err instanceof Error ? err.message : "Failed to connect to AI.",
        })
      }
    } finally {
      setIsGenerating(false)
      abortControllerRef.current = null
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleRegenerate = () => {
    const lastUserMessage = [...messages].reverse().find(m => m.role === "user")
    if (lastUserMessage) {
      handleSend(lastUserMessage.content, true)
    }
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return "Good morning"
    if (hour < 18) return "Good afternoon"
    return "Good evening"
  }

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  }

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  }

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden">
      <div className="flex-1 overflow-y-auto w-full">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-full py-12 px-4 w-full max-w-4xl mx-auto space-y-12 pb-48">
            <motion.div 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="text-center space-y-4"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-6">
                <Bot className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground">
                {getGreeting()}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground font-medium">
                I&apos;m your AI Assistant. How can I help you today?
              </p>
            </motion.div>

            <motion.div 
              variants={containerVariants} 
              initial="hidden" 
              animate="show" 
              className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full"
            >
              {SUGGESTED_PROMPTS.map((prompt, i) => (
                <motion.div variants={itemVariants} key={i}>
                  <button
                    onClick={() => handleSend(prompt.text)}
                    className="flex flex-col h-full w-full items-start gap-3 p-4 text-left border rounded-xl bg-card hover:bg-accent/50 hover:border-accent-foreground/20 transition-all group"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <prompt.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground mb-1">{prompt.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{prompt.text}</p>
                    </div>
                  </button>
                </motion.div>
              ))}
            </motion.div>
          </div>
        ) : (
          <div className="px-4 md:px-8 py-6 w-full max-w-3xl mx-auto space-y-6 pb-48">
            {messages.map((msg, index) => (
              <ChatMessage 
                key={msg.id} 
                message={msg} 
                onRegenerate={msg.role === "model" && index === messages.length - 1 ? handleRegenerate : undefined}
              />
            ))}
            {isGenerating && messages.length > 0 && messages[messages.length - 1].role === "model" && messages[messages.length - 1].content === "" && (
              <div className="flex gap-4 w-full">
                 <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="flex items-center gap-1 px-4 py-3 bg-muted rounded-2xl rounded-tl-none h-10">
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <div className="absolute bottom-0 w-full bg-gradient-to-t from-background via-background/90 to-transparent pt-12 pb-6 px-4 md:px-8 pointer-events-none">
        <div className="max-w-3xl mx-auto w-full pointer-events-auto">
          {messages.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide w-full"
            >
              {QUICK_ACTIONS.map((action, i) => (
                <button 
                  key={i} 
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors shrink-0"
                >
                  <action.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  {action.label}
                </button>
              ))}
            </motion.div>
          )}

          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend() }} 
            className="relative flex flex-col w-full border bg-background rounded-2xl shadow-lg focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-shadow"
          >
            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={isListening ? "Listening..." : "Message AI Assistant..."}
              maxRows={8}
              className="w-full resize-none bg-transparent px-4 py-4 pr-12 text-base focus:outline-none disabled:opacity-50 min-h-[56px] rounded-2xl"
              disabled={isGenerating}
              autoFocus
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full hover:bg-accent/50 hover:text-foreground" title="Attach file">
                  <Paperclip className="h-4 w-4" />
                  <span className="sr-only">Attach file</span>
                </Button>
                {browserSupportsSpeechRecognition && (
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-8 w-8 rounded-full hover:bg-accent/50 hover:text-foreground transition-colors", isListening && "text-red-500 hover:text-red-600 bg-red-100 dark:bg-red-900/30")} 
                    onClick={() => isListening ? stopListening() : startListening()}
                    title="Use voice input (Alt+M)"
                  >
                    <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                    <span className="sr-only">Use voice</span>
                  </Button>
                )}
              </div>

              {isGenerating ? (
                <Button type="button" size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" onClick={stopGeneration}>
                  <Square className="h-4 w-4 fill-current" />
                  <span className="sr-only">Stop generation</span>
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="default"
                  className={cn("h-8 w-8 rounded-full transition-all shadow-sm", input.trim() ? "opacity-100 scale-100" : "opacity-40 scale-95 grayscale")}
                  disabled={!input.trim()}
                >
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send message</span>
                </Button>
              )}
            </div>
          </form>
          
          <div className="flex flex-col sm:flex-row items-center justify-between mt-3 text-xs text-muted-foreground px-2 gap-2 text-center sm:text-left">
            <span>AI can make mistakes. Consider verifying important information.</span>
            <div className="hidden sm:flex items-center gap-2">
              <span className="flex items-center gap-1">Press <kbd className="font-sans px-1.5 py-0.5 rounded border bg-muted/50 text-[10px] font-semibold tracking-wider">Alt+M</kbd> for mic</span>
              <span className="flex items-center gap-1">Press <kbd className="font-sans px-1.5 py-0.5 rounded border bg-muted/50 text-[10px] font-semibold tracking-wider">Enter ↵</kbd> to send</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
