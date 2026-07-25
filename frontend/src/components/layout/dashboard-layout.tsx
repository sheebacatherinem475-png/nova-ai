"use client"

import * as React from "react"
import { Sidebar } from "./sidebar"
import { Header } from "./header"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setMobileOpen] = React.useState(false)
  const [isDesktopCollapsed, setDesktopCollapsed] = React.useState(false)

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <Sidebar 
        isMobileOpen={isMobileOpen} 
        setMobileOpen={setMobileOpen} 
        isDesktopCollapsed={isDesktopCollapsed}
        setDesktopCollapsed={setDesktopCollapsed}
      />
      <div 
        className={`flex flex-col flex-1 transition-all duration-300 ease-in-out ${
          isDesktopCollapsed ? 'md:ml-0' : 'md:ml-[260px]'
        }`}
      >
        <Header 
          setMobileOpen={setMobileOpen} 
          isDesktopCollapsed={isDesktopCollapsed}
          setDesktopCollapsed={setDesktopCollapsed}
        />
        <main className="flex-1 overflow-hidden relative">
          {children}
        </main>
      </div>
      
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </div>
  )
}
