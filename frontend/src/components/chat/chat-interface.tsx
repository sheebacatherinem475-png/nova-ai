"use client"

import * as React from "react"
import { Send, Square, Bot, Paperclip, Mic, MessageSquare, Code, FileText, Brain, PenTool, BarChart, Sparkles, X, Image as ImageIcon, Database } from "lucide-react"
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

const MAX_IMAGES = 5
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

export function ChatInterface() {
  const [input, setInput] = React.useState("")
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [stagedImages, setStagedImages] = React.useState<File[]>([])
  const [isUploading, setIsUploading] = React.useState(false)
  const [isDragging, setIsDragging] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  
  const { chats, activeChatId, addMessage, updateMessage, createChat, voiceAutoRead, selectedVoice, speechRate, activeDatasetId, datasets } = useChatStore()
  const abortControllerRef = React.useRef<AbortController | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const { isListening, startListening, stopListening, browserSupportsSpeechRecognition } = useSpeechRecognition((text) => setInput(text))
  
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

  const handleAddImages = (files: FileList | File[]) => {
    const newFiles = Array.from(files)
    const validFiles = newFiles.filter(f => ALLOWED_MIME_TYPES.includes(f.type))
    
    if (validFiles.length < newFiles.length) {
      toast.error("Some files were rejected. Only PNG, JPG, JPEG, and WEBP are supported.")
    }

    setStagedImages(prev => {
      const combined = [...prev, ...validFiles]
      if (combined.length > MAX_IMAGES) {
        toast.warning(`Maximum ${MAX_IMAGES} images allowed.`)
        return combined.slice(0, MAX_IMAGES)
      }
      return combined
    })
  }

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files.length > 0) {
      handleAddImages(e.clipboardData.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleAddImages(e.dataTransfer.files)
    }
  }

  const handleSend = async (text: string = input, isRetry = false) => {
    if ((!text.trim() && stagedImages.length === 0) || isGenerating || isUploading) return

    let chatId = activeChatId
    if (!chatId || messages.length === 0) {
      if (!chatId) chatId = createChat()
    }

    setIsGenerating(true)
    let uploadedImagesData = undefined

    // Upload images if any
    if (stagedImages.length > 0 && !isRetry) {
      setIsUploading(true)
      try {
        uploadedImagesData = await ApiClient.uploadImages(stagedImages)
        setStagedImages([])
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to upload images")
        setIsGenerating(false)
        setIsUploading(false)
        return
      } finally {
        setIsUploading(false)
      }
    }

    if (!isRetry) {
      setInput("")
      addMessage(chatId, { role: "user", content: text, images: uploadedImagesData })
    }

    const newController = new AbortController()
    abortControllerRef.current = newController

    const assistantMessageId = addMessage(chatId, { role: "model", content: "" })
    let accumulatedResponse = ""

    try {
      // Check if current message has images, or any historical message has images
      const chatMessages = useChatStore.getState().chats.find(c => c.id === chatId)?.messages || []
      const historyForApi = chatMessages
        .filter(m => m.id !== assistantMessageId)
        .map(m => ({ role: m.role, content: m.content, images: m.images }))
      
      const hasImagesInChat = historyForApi.some(m => m.images && m.images.length > 0) || (uploadedImagesData && uploadedImagesData.length > 0)

      if (activeDatasetId) {
        await ApiClient.streamDataAnalysis(
          text,
          historyForApi.map(m => ({ role: m.role, content: m.content })),
          activeDatasetId,
          (chunk) => {
            accumulatedResponse += chunk
            updateMessage(chatId!, assistantMessageId, accumulatedResponse)
          },
          newController.signal
        )
      } else if (hasImagesInChat) {
        await ApiClient.streamImageAnalysis(
          text,
          historyForApi.slice(0, -1), // everything except the last user message
          historyForApi[historyForApi.length - 1]?.images || [], // the last user message images
          (chunk) => {
            accumulatedResponse += chunk
            updateMessage(chatId!, assistantMessageId, accumulatedResponse)
          },
          newController.signal
        )
      } else {
        await ApiClient.streamChat(
          text,
          historyForApi.map(m => ({ role: m.role, content: m.content })),
          (chunk) => {
            accumulatedResponse += chunk
            updateMessage(chatId!, assistantMessageId, accumulatedResponse)
          },
          newController.signal
        )
      }
      
      if (voiceAutoRead && accumulatedResponse) {
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
        toast.error("Error", {
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
      // NOTE: Regenerate won't re-upload images, it just uses the existing history
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
    <div 
      className="flex flex-col h-full w-full bg-background relative overflow-hidden"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-primary">
            <ImageIcon className="w-16 h-16" />
            <h2 className="text-2xl font-bold">Drop images to upload</h2>
          </div>
        </div>
      )}

      {activeDatasetId && (
        <div className="absolute top-0 left-0 right-0 z-40 bg-primary/10 border-b border-primary/20 px-4 py-2 flex items-center justify-center gap-2">
          <Database className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">
            Analyzing Dataset: {datasets.find(d => d.id === activeDatasetId)?.filename}
          </span>
          <Button variant="ghost" size="icon" className="h-6 w-6 ml-2 rounded-full hover:bg-primary/20" onClick={() => useChatStore.getState().setActiveDataset(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

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
            className={cn(
              "relative flex flex-col w-full border bg-background rounded-2xl shadow-lg transition-shadow",
              (isDragging || stagedImages.length > 0) ? "ring-1 ring-primary border-primary" : "focus-within:ring-1 focus-within:ring-primary focus-within:border-primary"
            )}
          >
            {stagedImages.length > 0 && (
              <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
                {stagedImages.map((file, i) => (
                  <div key={i} className="relative group shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={URL.createObjectURL(file)} alt="Staged" className="h-16 w-16 object-cover rounded-lg border border-primary/20" />
                    <button 
                      type="button"
                      onClick={() => setStagedImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept={ALLOWED_MIME_TYPES.join(",")} 
              multiple 
              onChange={(e) => {
                if (e.target.files) handleAddImages(e.target.files)
                e.target.value = '' // Reset so the same file can be selected again
              }} 
            />

            <TextareaAutosize
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePaste}
              placeholder={isListening ? "Listening..." : "Message AI Assistant..."}
              maxRows={8}
              className="w-full resize-none bg-transparent px-4 py-4 pr-12 text-base focus:outline-none disabled:opacity-50 min-h-[56px] rounded-2xl"
              disabled={isGenerating || isUploading}
              autoFocus
            />
            
            <div className="flex items-center justify-between px-3 pb-3">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Button 
                  type="button" 
                  size="icon" 
                  variant="ghost" 
                  className="h-8 w-8 rounded-full hover:bg-accent/50 hover:text-foreground" 
                  title="Attach images"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isGenerating}
                >
                  <Paperclip className="h-4 w-4" />
                  <span className="sr-only">Attach images</span>
                </Button>
                {browserSupportsSpeechRecognition && (
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="ghost" 
                    className={cn("h-8 w-8 rounded-full hover:bg-accent/50 hover:text-foreground transition-colors", isListening && "text-red-500 hover:text-red-600 bg-red-100 dark:bg-red-900/30")} 
                    onClick={() => isListening ? stopListening() : startListening()}
                    title="Use voice input (Alt+M)"
                    disabled={isUploading || isGenerating}
                  >
                    <Mic className={cn("h-4 w-4", isListening && "animate-pulse")} />
                    <span className="sr-only">Use voice</span>
                  </Button>
                )}
              </div>

              {isGenerating || isUploading ? (
                <Button type="button" size="icon" variant="destructive" className="h-8 w-8 rounded-full shadow-sm" onClick={stopGeneration} disabled={isUploading}>
                  <Square className="h-4 w-4 fill-current" />
                  <span className="sr-only">Stop generation</span>
                </Button>
              ) : (
                <Button 
                  type="submit" 
                  size="icon" 
                  variant="default"
                  className={cn("h-8 w-8 rounded-full transition-all shadow-sm", (input.trim() || stagedImages.length > 0) ? "opacity-100 scale-100" : "opacity-40 scale-95 grayscale")}
                  disabled={!input.trim() && stagedImages.length === 0}
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
