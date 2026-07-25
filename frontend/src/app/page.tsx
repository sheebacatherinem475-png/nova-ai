"use client"

import * as React from "react"
import { ChatInterface } from "@/components/chat/chat-interface"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { useChatStore } from "@/lib/store"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const token = useChatStore((state) => state.token)
  const router = useRouter()

  React.useEffect(() => {
    if (!token) {
      router.push("/login")
    }
  }, [token, router])

  if (!token) {
    return null // wait for redirect
  }

  return (
    <DashboardLayout>
      <ChatInterface />
    </DashboardLayout>
  )
}
