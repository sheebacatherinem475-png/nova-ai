"use client"

import * as React from "react"
import { ChatInterface } from "@/components/chat/chat-interface"
import { DashboardLayout } from "@/components/layout/dashboard-layout"

export default function DashboardPage() {
  return (
    <DashboardLayout>
      <ChatInterface />
    </DashboardLayout>
  )
}
