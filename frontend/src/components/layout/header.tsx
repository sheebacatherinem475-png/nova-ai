"use client"

import * as React from "react"
import { Menu, Moon, Sun, PanelLeft } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/lib/store"

export function Header({
  setMobileOpen,
  isDesktopCollapsed,
  setDesktopCollapsed
}: {
  setMobileOpen: (val: boolean) => void
  isDesktopCollapsed: boolean
  setDesktopCollapsed: (val: boolean) => void
}) {
  const { setTheme, theme } = useTheme()
  const { activeChatId, chats } = useChatStore()
  
  const currentChat = chats.find(c => c.id === activeChatId)

  return (
    <header className="flex h-14 items-center gap-4 bg-background/95 backdrop-blur px-4 sticky top-0 z-30">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open sidebar"
        >
          <Menu className="h-5 w-5" />
        </Button>
        {isDesktopCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex text-muted-foreground hover:text-foreground"
            onClick={() => setDesktopCollapsed(false)}
            aria-label="Expand sidebar"
            title="Open sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </Button>
        )}
      </div>

      <div className="w-full flex-1 flex items-center">
        {currentChat && (
          <h1 className="text-sm font-medium text-muted-foreground line-clamp-1">
            {currentChat.title}
          </h1>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Placeholder for Model Selector */}
        <div className="hidden sm:flex items-center px-3 py-1.5 rounded-md bg-secondary/50 text-sm font-medium text-secondary-foreground">
          Nova Premium
        </div>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          aria-label="Toggle theme"
          className="text-muted-foreground hover:text-foreground"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        </Button>
        
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
          U
        </div>
      </div>
    </header>
  )
}
