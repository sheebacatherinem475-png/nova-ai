export interface ChatMessage {
  role: "user" | "model"
  content: string
  images?: { id: string, url: string, filename: string }[]
}

import { useChatStore } from "./store"

export interface DocumentMeta {
  id: string
  filename: string
  size: number
  upload_time: string
}

export interface UploadDatasetResponse {
  id: string;
  filename: string;
  size: number;
  upload_time: string;
  summary: Record<string, unknown>;
}

export class ApiClient {
  private static get baseUrl() {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
  }

  private static getHeaders(extraHeaders: Record<string, string> = {}) {
    const headers: Record<string, string> = { ...extraHeaders }
    
    // We can access the state since we imported it.
    const token = useChatStore.getState().token;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }
    return headers
  }

  static async streamChat(
    message: string, 
    history: ChatMessage[], 
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: this.getHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ message, history }),
      signal
    })

    if (!res.ok) {
      let errorDetail = "Failed to connect to the backend."
      try {
        const errorData = await res.json()
        if (errorData.detail) errorDetail = errorData.detail
      } catch {
        // ignore
      }
      throw new Error(errorDetail)
    }

    if (!res.body) throw new Error("No response body")

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (data.error) {
                throw new Error(data.error)
              }
              if (data.chunk) {
                onChunk(data.chunk)
              }
            } catch (e) {
              if (e instanceof Error && !e.message.includes("JSON")) {
                throw e
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  static async streamImageAnalysis(
    message: string, 
    history: ChatMessage[], 
    images: { id: string, url: string, filename: string }[],
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/images/analyze`, {
      method: "POST",
      headers: this.getHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({ message, history, images }),
      signal
    })

    if (!res.ok) {
      let errorDetail = "Failed to connect to the backend."
      try {
        const errorData = await res.json()
        if (errorData.detail) errorDetail = errorData.detail
      } catch {
        // ignore
      }
      throw new Error(errorDetail)
    }

    if (!res.body) throw new Error("No response body")

    const reader = res.body.getReader()
    const decoder = new TextDecoder("utf-8")
    let buffer = ""

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6)
            try {
              const data = JSON.parse(dataStr)
              if (data.error) {
                throw new Error(data.error)
              }
              if (data.chunk) {
                onChunk(data.chunk)
              }
            } catch (e) {
              if (e instanceof Error && !e.message.includes("JSON")) {
                throw e
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }

  static async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<DocumentMeta> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${this.baseUrl}/api/documents/upload`, true)
      const token = useChatStore.getState().token
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total))
        }
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          reject(new Error(`Upload failed: ${xhr.statusText}`))
        }
      }
      
      xhr.onerror = () => reject(new Error("Network Error"))
      
      const formData = new FormData()
      formData.append("file", file)
      xhr.send(formData)
    })
  }

  static async uploadImages(files: File[], onProgress?: (progress: number) => void): Promise<{ id: string, url: string, filename: string }[]> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${this.baseUrl}/api/images/upload`, true)
      const token = useChatStore.getState().token
      if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.round((event.loaded * 100) / event.total))
        }
      }
      
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(JSON.parse(xhr.responseText))
        } else {
          try {
            const err = JSON.parse(xhr.responseText)
            reject(new Error(err.detail || "Upload failed"))
          } catch {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }
      }
      
      xhr.onerror = () => reject(new Error("Network Error"))
      
      const formData = new FormData()
      files.forEach(file => formData.append("files", file))
      xhr.send(formData)
    })
  }

  static async getDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(`${this.baseUrl}/api/documents`, { headers: this.getHeaders() })
    if (!res.ok) throw new Error("Failed to fetch documents")
    return res.json()
  }

  static async uploadDataset(file: File): Promise<UploadDatasetResponse> {
    const formData = new FormData()
    formData.append("file", file)
    const res = await fetch(`${this.baseUrl}/api/datasets/upload`, {
      method: "POST",
      headers: this.getHeaders(),
      body: formData
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || "Failed to upload dataset")
    }
    return res.json()
  }

  static async listDatasets(): Promise<UploadDatasetResponse[]> {
    const res = await fetch(`${this.baseUrl}/api/datasets`, { headers: this.getHeaders() })
    if (!res.ok) throw new Error("Failed to fetch datasets")
    return res.json()
  }

  static async deleteDataset(id: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/datasets/${id}`, { method: "DELETE", headers: this.getHeaders() })
    if (!res.ok) throw new Error("Failed to delete dataset")
  }

  static async streamDataAnalysis(
    message: string, 
    history: {role: string, content: string}[], 
    datasetId: string,
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ) {
    const res = await fetch(`${this.baseUrl}/api/data-analysis/analyze`, {
      method: "POST",
      headers: this.getHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ message, history, dataset_id: datasetId }),
      signal
    })
    
    if (!res.ok) {
      throw new Error(`Data analysis failed: ${res.statusText}`)
    }
    
    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    if (!reader) return

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      
      const chunkStr = decoder.decode(value, { stream: true })
      const lines = chunkStr.split("\n")
      
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const dataStr = line.slice(6)
          try {
            const data = JSON.parse(dataStr)
            if (data.chunk) {
              onChunk(data.chunk)
            } else if (data.error) {
              console.error("Data analysis error:", data.error)
              throw new Error(data.error)
            }
          } catch {
            // ignore parse errors for incomplete chunks
          }
        }
      }
    }
  }

  static async getVoices() {
    const response = await fetch(`${this.baseUrl}/api/voice/voices`, { headers: this.getHeaders() })
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`)
    }
    return response.json()
  }

  static async generateTTS(text: string, voice: string = "en-US-JennyNeural", rate: string = "+0%") {
    const response = await fetch(`${this.baseUrl}/api/voice/tts`, {
      method: 'POST',
      headers: this.getHeaders({
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ text, voice, rate }),
    })

    if (!response.ok) {
      throw new Error(`Failed to generate TTS: ${response.statusText}`)
    }

    const blob = await response.blob()
    return URL.createObjectURL(blob)
  }

  static async deleteDocument(docId: string): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/documents/${docId}`, {
      method: "DELETE",
      headers: this.getHeaders()
    })
    if (!res.ok) throw new Error("Failed to delete document")
  }

  static async getDatasetInsights(datasetId: string) {
    const res = await fetch(`${this.baseUrl}/api/data-analysis/insights/${datasetId}`, { headers: this.getHeaders() })
    if (!res.ok) throw new Error('Failed to fetch insights')
    return res.json()
  }

  static async filterDataset(datasetId: string, query: string) {
    const res = await fetch(`${this.baseUrl}/api/datasets/${datasetId}/filter`, {
      method: 'POST',
      headers: this.getHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ query }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.detail || 'Filter failed')
    }
    return res.json()
  }

  static async login(email: string, password: string) {
    const formData = new URLSearchParams()
    formData.append('username', email)
    formData.append('password', password)
    
    const res = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Login failed')
    }
    return res.json()
  }

  static async register(email: string, password: string) {
    const res = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.detail || 'Registration failed')
    }
    return res.json()
  }

  static async getMe() {
    const res = await fetch(`${this.baseUrl}/api/auth/me`, { headers: this.getHeaders() })
    if (!res.ok) throw new Error('Failed to fetch user')
    return res.json()
  }
}
