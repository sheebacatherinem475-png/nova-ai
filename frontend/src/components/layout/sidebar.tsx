"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Home, 
  Settings, 
  MessageSquare, 
  Search,
  PlusCircle,
  Pin,
  Pencil,
  Trash2,
  FileText
} from "lucide-react"

import { cn } from "@/lib/utils"
import { useChatStore } from "@/lib/store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { DocumentManager } from "@/components/chat/document-manager"
import { SettingsModal } from "@/components/chat/settings-modal"

const mainNavigation = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Settings", href: "/settings", icon: Settings },
]

export interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isMobileOpen?: boolean
  setMobileOpen?: (open: boolean) => void
}

export function Sidebar({ className }: SidebarProps) {
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
    renameChat
  } = useChatStore()
  
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [editTitle, setEditTitle] = React.useState("")
  const editInputRef = React.useRef<HTMLInputElement>(null)
  const [isDocsOpen, setIsDocsOpen] = React.useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false)

  React.useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus()
    }
  }, [editingId])

  const filteredChats = React.useMemo(() => {
    let result = chats
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      result = result.filter(c => c.title.toLowerCase().includes(q))
    }
    // Sort: pinned first, then by updated at
    return result.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1
      if (!a.isPinned && b.isPinned) return 1
      return b.updatedAt - a.updatedAt
    })
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

  return (
    <div className={cn("pb-12 border-r bg-card/50 backdrop-blur-sm h-screen flex flex-col", className)}>
      <div className="space-y-4 py-4 flex-1 flex flex-col overflow-hidden">
        <div className="px-3 py-2">
          <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
            Overview
          </h2>
          <div className="space-y-1">
            {mainNavigation.map((item) => (
              <Link 
                key={item.name}
                href={item.href}
                className={cn(
                  "inline-flex h-10 w-full items-center justify-start rounded-md px-4 py-2 text-sm font-medium transition-colors",
                  pathname === item.href
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.name}
              </Link>
            ))}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex h-10 w-full items-center justify-start rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left"
            >
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </button>
            <button
              onClick={() => setIsDocsOpen(true)}
              className="inline-flex h-10 w-full items-center justify-start rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground text-left"
            >
              <FileText className="mr-2 h-4 w-4" />
              Documents
            </button>
          </div>
        </div>

        <div className="px-3 py-2 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between px-4 mb-2">
            <h2 className="text-lg font-semibold tracking-tight">
              Chats
            </h2>
            <Button variant="ghost" size="icon" onClick={() => createChat()} className="h-6 w-6" title="New Chat (Ctrl+N)">
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="px-2 mb-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="chat-search"
                type="search"
                placeholder="Search... (Ctrl+K)"
                className="h-8 pl-8 text-xs bg-background/50"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1 -mx-3 px-3">
            <div className="space-y-1">
              {filteredChats.map((chat) => (
                <div
                  key={chat.id}
                  className={cn(
                    "group relative flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    activeChatId === chat.id ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                  )}
                  onClick={() => setActiveChat(chat.id)}
                >
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  
                  {editingId === chat.id ? (
                    <Input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => handleRenameSubmit(chat.id)}
                      onKeyDown={(e) => handleKeyDown(e, chat.id)}
                      className="h-6 text-xs px-1 py-0 bg-background"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <span className="truncate flex-1" title={chat.title}>
                      {chat.title}
                    </span>
                  )}

                  {chat.isPinned && !editingId && (
                    <Pin className="h-3 w-3 shrink-0 ml-auto fill-current text-primary" />
                  )}

                  {!editingId && (
                    <div className="hidden group-hover:flex items-center absolute right-2 bg-accent/90 px-1 py-0.5 rounded gap-1 backdrop-blur-sm">
                      <button 
                        onClick={(e) => { e.stopPropagation(); pinChat(chat.id); }} 
                        className="p-1 hover:text-primary transition-colors rounded-sm"
                        title={chat.isPinned ? "Unpin" : "Pin"}
                      >
                        <Pin className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingId(chat.id); setEditTitle(chat.title); }} 
                        className="p-1 hover:text-primary transition-colors rounded-sm"
                        title="Rename"
                      >
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }} 
                        className="p-1 hover:text-destructive transition-colors rounded-sm"
                        title="Delete"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
              
              {filteredChats.length === 0 && (
                <div className="text-center py-6 px-4 text-xs text-muted-foreground">
                  No chats found.
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
      <DocumentManager isOpen={isDocsOpen} onClose={() => setIsDocsOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  )
}
