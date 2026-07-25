export interface ChatMessage {
  role: "user" | "model"
  content: string
}

export interface DocumentMeta {
  id: string
  filename: string
  size: number
  upload_time: string
}

export class ApiClient {
  private static get baseUrl() {
    return process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
  }

  static async streamChat(
    message: string, 
    history: ChatMessage[], 
    onChunk: (chunk: string) => void,
    signal?: AbortSignal
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
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

  static async uploadDocument(file: File, onProgress?: (progress: number) => void): Promise<DocumentMeta> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open("POST", `${this.baseUrl}/api/documents/upload`, true)
      
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

  static async getDocuments(): Promise<DocumentMeta[]> {
    const res = await fetch(`${this.baseUrl}/api/documents`)
    if (!res.ok) throw new Error("Failed to fetch documents")
    return res.json()
  }

  static async getVoices() {
    const response = await fetch(`${this.baseUrl}/api/voice/voices`)
    if (!response.ok) {
      throw new Error(`Failed to fetch voices: ${response.statusText}`)
    }
    return response.json()
  }

  static async generateTTS(text: string, voice: string = "en-US-JennyNeural", rate: string = "+0%") {
    const response = await fetch(`${this.baseUrl}/api/voice/tts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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
      method: "DELETE"
    })
    if (!res.ok) throw new Error("Failed to delete document")
  }
}
