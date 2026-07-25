import React, { useState, useEffect } from 'react'
import { ApiClient, DocumentMeta } from '@/lib/api'
import { FileText, Trash2, X, UploadCloud, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import { formatDistanceToNow } from 'date-fns'

interface DocumentManagerProps {
  isOpen: boolean
  onClose: () => void
}

export function DocumentManager({ isOpen, onClose }: DocumentManagerProps) {
  const [documents, setDocuments] = useState<DocumentMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (isOpen) {
      fetchDocuments()
    }
  }, [isOpen])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const docs = await ApiClient.getDocuments()
      setDocuments(docs)
    } catch (e) {
      console.error(e)
    }
    setLoading(false)
  }

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    setUploading(true)
    setProgress(0)
    try {
      for (const file of acceptedFiles) {
        await ApiClient.uploadDocument(file, (p) => setProgress(p))
      }
      await fetchDocuments()
    } catch (e) {
      console.error("Upload failed", e)
      alert("Failed to upload document")
    }
    setUploading(false)
    setProgress(0)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    }
  })

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteDocument(id)
      setDocuments(documents.filter(d => d.id !== id))
    } catch (e) {
      console.error("Delete failed", e)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-medium text-white">Document Intelligence</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
              isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
            }`}
          >
            <input {...getInputProps()} />
            {uploading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <div className="text-sm text-zinc-300">Uploading... {progress}%</div>
                <div className="w-48 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-zinc-400 mb-4" />
                <p className="text-zinc-300 font-medium text-center">Drag & drop files here, or click to select</p>
                <p className="text-zinc-500 text-sm mt-2 text-center">Supports PDF, DOCX, and TXT</p>
              </>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-white mb-4">Uploaded Documents</h3>
            {loading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center p-8 text-zinc-500 border border-white/5 rounded-xl bg-white/5">
                No documents uploaded yet.
              </div>
            ) : (
              <div className="space-y-3">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-zinc-800/50 hover:bg-zinc-800 transition-colors">
                    <div className="flex items-center space-x-4 overflow-hidden">
                      <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="truncate">
                        <div className="text-zinc-200 font-medium truncate">{doc.filename}</div>
                        <div className="text-xs text-zinc-500 mt-1 flex space-x-2">
                          <span>{(doc.size / 1024).toFixed(1)} KB</span>
                          <span>•</span>
                          <span>{formatDistanceToNow(new Date(doc.upload_time), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-4 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
