import { create } from "zustand"
import { persist } from "zustand/middleware"
import { v4 as uuidv4 } from "uuid"

export interface ImageAttachment {
  id: string;
  url: string;
  filename: string;
}

export interface DatasetMeta {
  id: string
  filename: string
  size: number
  upload_time: string
  summary: Record<string, unknown>
}

export interface ChatMessage {
  id: string
  role: "user" | "model"
  content: string
  timestamp: number
  images?: ImageAttachment[]
}

export interface Chat {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
  isPinned?: boolean
}

interface ChatState {
  chats: Chat[]
  activeChatId: string | null
  datasets: DatasetMeta[]
  activeDatasetId: string | null
  searchQuery: string
  voiceAutoRead: boolean
  selectedVoice: string
  speechRate: string
  setVoiceAutoRead: (val: boolean) => void
  setSelectedVoice: (val: string) => void
  setSpeechRate: (val: string) => void
  setSearchQuery: (query: string) => void
  createChat: () => string
  setActiveChat: (id: string) => void
  deleteChat: (id: string) => void
  renameChat: (id: string, title: string) => void
  pinChat: (id: string) => void
  addMessage: (chatId: string, message: Omit<ChatMessage, "id" | "timestamp">) => string
  updateMessage: (chatId: string, messageId: string, content: string) => void
  setDatasets: (datasets: DatasetMeta[]) => void
  setActiveDataset: (id: string | null) => void
  addDataset: (dataset: DatasetMeta) => void
  removeDataset: (id: string) => void
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      chats: [],
      activeChatId: null,
      datasets: [],
      activeDatasetId: null,
      searchQuery: "",
      voiceAutoRead: false,
      selectedVoice: "en-US-JennyNeural",
      speechRate: "+0%",
      
      setVoiceAutoRead: (val) => set({ voiceAutoRead: val }),
      setSelectedVoice: (val) => set({ selectedVoice: val }),
      setSpeechRate: (val) => set({ speechRate: val }),
      setSearchQuery: (query) => set({ searchQuery: query }),
      
      createChat: () => {
        const id = uuidv4()
        const newChat: Chat = {
          id,
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          chats: [newChat, ...state.chats],
          activeChatId: id,
        }))
        return id
      },

      setActiveChat: (id) => set({ activeChatId: id }),

      deleteChat: (id) => set((state) => ({
        chats: state.chats.filter((c) => c.id !== id),
        activeChatId: state.activeChatId === id 
          ? (state.chats.find(c => c.id !== id)?.id || null) 
          : state.activeChatId
      })),

      renameChat: (id, title) => set((state) => ({
        chats: state.chats.map((c) => 
          c.id === id ? { ...c, title, updatedAt: Date.now() } : c
        )
      })),

      pinChat: (id) => set((state) => ({
        chats: state.chats.map((c) =>
          c.id === id ? { ...c, isPinned: !c.isPinned, updatedAt: Date.now() } : c
        )
      })),

      addMessage: (chatId, message) => {
        const newMessageId = uuidv4()
        set((state) => {
          const newMessage: ChatMessage = {
            ...message,
            id: newMessageId,
            timestamp: Date.now(),
          }
          
          let newTitle = undefined
          const chat = state.chats.find(c => c.id === chatId)
          if (chat && chat.messages.length === 0 && chat.title === "New Chat" && message.role === "user") {
            newTitle = message.content.slice(0, 30) + (message.content.length > 30 ? "..." : "")
          }

          return {
            chats: state.chats.map((c) =>
              c.id === chatId
                ? {
                    ...c,
                    messages: [...c.messages, newMessage],
                    title: newTitle || c.title,
                    updatedAt: Date.now(),
                  }
                : c
            ),
          }
        })
        return newMessageId
      },

      updateMessage: (chatId, messageId, content) => set((state) => ({
        chats: state.chats.map((c) =>
          c.id === chatId
            ? {
                ...c,
                messages: c.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m
                ),
                updatedAt: Date.now(),
              }
            : c
        ),
      })),
      
      setDatasets: (datasets) => set({ datasets }),
      setActiveDataset: (id) => set({ activeDatasetId: id }),
      addDataset: (dataset) => set((state) => ({ datasets: [dataset, ...state.datasets] })),
      removeDataset: (id) => set((state) => ({ 
        datasets: state.datasets.filter(d => d.id !== id),
        activeDatasetId: state.activeDatasetId === id ? null : state.activeDatasetId
      })),
    }),
    {
      name: "chat-storage",
    }
  )
)
