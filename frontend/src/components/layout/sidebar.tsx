"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { format, isToday, isYesterday, isThisWeek } from "date-fns"
import { 
  Home, 
  Settings as SettingsIcon, 
  MessageSquare, 
  Search,
  PlusCircle,
  Pin,
  Pencil,
  Trash2,
  FileText,
  Database,
  LogOut,
  Image as ImageIcon,
  Mic,
  BarChart,
  PanelLeftClose,
  MoreHorizontal
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatStore, Chat } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentManager } from "@/components/chat/document-manager"
import { DatasetManager } from "@/components/chat/dataset-manager"
import { SettingsModal } from "@/components/chat/settings-modal"

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isMobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
  isDesktopCollapsed?: boolean
  setDesktopCollapsed?: (collapsed: boolean) => void
}

type GroupedChats = {
  pinned: Chat[]
  today: Chat[]
  yesterday: Chat[]
  previous7Days: Chat[]
  older: Chat[]
}

export function Sidebar({ className, isMobileOpen, setMobileOpen, isDesktopCollapsed, setDesktopCollapsed }: SidebarProps) {
  const pathname = usePathname()
  const { 
    chats, 
    activeChatId, 
    searchQuery, 
    setSearchQuery,
    createChat, 
    setActiveChat,
    deleteChat,
    pinChat,
    renameChat,
    setToken
  } = useChatStore()
  const router = useRouter()
  
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState("")
  const editInputRef = React.useRef<HTMLInputElement>(null)
  const [isDocsOpen, setIsDocsOpen] = React.useState(false)
  const [isDatasetOpen, setIsDatasetOpen] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const groupedChats = React.useMemo(() => {
    let result = chats
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.title.toLowerCase().includes(q))
    }

    const groups: GroupedChats = {
      pinned: [],
      today: [],
      yesterday: [],
      previous7Days: [],
      older: []
    }

    result.forEach(chat => {
      if (chat.isPinned) {
        groups.pinned.push(chat)
        return
      }
      
      const date = new Date(chat.updatedAt)
      if (isToday(date)) {
        groups.today.push(chat)
      } else if (isYesterday(date)) {
        groups.yesterday.push(chat)
      } else if (isThisWeek(date)) {
        groups.previous7Days.push(chat)
      } else {
        groups.older.push(chat)
      }
    })

    // Sort each group by updatedAt descending
    Object.values(groups).forEach(arr => arr.sort((a, b) => b.updatedAt - a.updatedAt))
    
    return groups
  }, [chats, searchQuery])

  const handleRenameSubmit = (id: string) => {
    if (editTitle.trim()) {
      renameChat(id, editTitle.trim())
    }
    setEditingId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent, id: string) => {
    if (e.key === "Enter") {
      handleRenameSubmit(id)
    } else if (e.key === "Escape") {
      setEditingId(null)
    }
  }

  React.useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        createChat()
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.getElementById('chat-search')
        if (searchInput) searchInput.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKeyDown)
    return () => window.removeEventListener('keydown', handleGlobalKeyDown)
  }, [createChat])

  const renderChatGroup = (title: string, groupChats: Chat[]) => {
    if (groupChats.length === 0) return null
    return (
      <div className="mb-4">
        <h3 className="px-4 text-xs font-semibold text-muted-foreground mb-1">{title}</h3>
        <div className="space-y-0.5">
          {groupChats.map((chat) => (
            <div
              key={chat.id}
              className={cn(
                "group relative flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer mx-2",
                activeChatId === chat.id 
                  ? "bg-secondary text-secondary-foreground font-medium" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
              onClick={() => {
                setActiveChat(chat.id)
                if (setMobileOpen) setMobileOpen(false)
              }}
            >
              {chat.isPinned ? <Pin className="h-4 w-4 shrink-0 fill-current text-primary" /> : <MessageSquare className="h-4 w-4 shrink-0" />}
              
              {editingId === chat.id ? (
                <Input
                  ref={editInputRef}
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onBlur={() => handleRenameSubmit(chat.id)}
                  onKeyDown={(e) => handleKeyDown(e, chat.id)}
                  className="h-6 text-xs px-1 py-0 bg-background flex-1"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className="truncate flex-1" title={chat.title}>
                  {chat.title}
                </span>
              )}

              {!editingId && (
                <div className="hidden group-hover:flex items-center absolute right-2 bg-secondary/90 px-1 py-0.5 rounded gap-1 backdrop-blur-sm shadow-sm">
                  <button 
                    onClick={(e) => { e.stopPropagation(); pinChat(chat.id); }} 
                    className="p-1 hover:text-primary transition-colors rounded-sm"
                    title={chat.isPinned ? "Unpin" : "Pin"}
                  >
                    <Pin className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title); }} 
                    className="p-1 hover:text-primary transition-colors rounded-sm"
                    title="Rename"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} 
                    className="p-1 hover:text-destructive transition-colors rounded-sm"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  const sidebarVariants = {
    open: { width: 260, x: 0 },
    closed: { width: 0, x: -260 },
    mobileOpen: { x: 0 },
    mobileClosed: { x: -280 }
  }

  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false
  const isOpen = isMobile ? isMobileOpen : !isDesktopCollapsed

  return (
    <>
      <AnimatePresence>
        {(isOpen) && (
          <motion.div
            initial={isMobile ? "mobileClosed" : "closed"}
            animate={isMobile ? "mobileOpen" : "open"}
            exit={isMobile ? "mobileClosed" : "closed"}
            variants={sidebarVariants}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className={cn(
              "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r bg-background overflow-hidden",
              isMobile ? "w-[280px] shadow-xl" : ""
            )}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <span className="font-semibold text-lg flex items-center gap-2 tracking-tight">
                <div className="h-6 w-6 rounded-md bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-sm">N</span>
                </div>
                Nova AI
              </span>
              {!isMobile && (
                <Button variant="ghost" size="icon" onClick={() => setDesktopCollapsed?.(true)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                  <PanelLeftClose className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="p-3">
              <Button 
                onClick={() => { createChat(); if (setMobileOpen) setMobileOpen(false) }} 
                className="w-full justify-start gap-2 shadow-sm"
                variant="default"
              >
                <PlusCircle className="h-4 w-4" />
                New Chat
                <span className="ml-auto text-[10px] text-primary-foreground/70 border border-primary-foreground/30 px-1.5 rounded bg-primary-foreground/10 hidden sm:inline-block">
                  ⌘N
                </span>
              </Button>
            </div>

            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="chat-search"
                  type="search"
                  placeholder="Search chats... (⌘K)"
                  className="h-8 pl-8 text-sm bg-secondary/50 border-transparent focus-visible:ring-1"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="py-2">
                {renderChatGroup("Pinned", groupedChats.pinned)}
                {renderChatGroup("Today", groupedChats.today)}
                {renderChatGroup("Yesterday", groupedChats.yesterday)}
                {renderChatGroup("Previous 7 Days", groupedChats.previous7Days)}
                {renderChatGroup("Older", groupedChats.older)}
                
                {chats.length === 0 && (
                  <div className="text-center py-6 px-4 text-sm text-muted-foreground">
                    No conversations yet.
                  </div>
                )}
              </div>
            </ScrollArea>

            <div className="mt-auto p-2 border-t bg-background space-y-1">
              <Button onClick={() => setIsDocsOpen(true)} variant="ghost" className="w-full justify-start text-sm h-9 px-2 font-normal text-muted-foreground hover:text-foreground">
                <FileText className="mr-2 h-4 w-4" /> Documents
              </Button>
              <Button onClick={() => setIsDatasetOpen(true)} variant="ghost" className="w-full justify-start text-sm h-9 px-2 font-normal text-muted-foreground hover:text-foreground">
                <Database className="mr-2 h-4 w-4" /> Datasets
              </Button>
              <Button onClick={() => setIsSettingsOpen(true)} variant="ghost" className="w-full justify-start text-sm h-9 px-2 font-normal text-muted-foreground hover:text-foreground">
                <SettingsIcon className="mr-2 h-4 w-4" /> Settings
              </Button>
              <Button 
                onClick={() => { setToken(null); router.push("/login"); }} 
                variant="ghost" 
                className="w-full justify-start text-sm h-9 px-2 font-normal text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" /> Log out
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DocumentManager isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
      <DatasetManager isOpen={isDatasetOpen} onClose={() => setIsDatasetOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
