"use client"

import React from 'react'
import { useDropzone } from "react-dropzone"
import { FileSpreadsheet, Loader2, Database, Trash2, CheckCircle2, UploadCloud, X } from "lucide-react"
import { toast } from "sonner"
import { motion, AnimatePresence } from "framer-motion"

import { ApiClient } from "@/lib/api"
import { useChatStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function DatasetManager({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { datasets, setDatasets, activeDatasetId, setActiveDataset, addDataset, removeDataset } = useChatStore()
  const [isUploading, setIsUploading] = React.useState(false)
  const [insights, setInsights] = React.useState<Record<string, Record<string, unknown>>>({})
  const [loadingInsights, setLoadingInsights] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (isOpen) {
      ApiClient.listDatasets().then(setDatasets).catch(() => {
        toast.error("Failed to load datasets")
      })
    }
  }, [isOpen, setDatasets])

  const onDrop = React.useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return
    const file = acceptedFiles[0]
    
    // max 25MB check
    if (file.size > 25 * 1024 * 1024) {
      toast.error("File is too large. Maximum 25MB allowed.")
      return
    }

    setIsUploading(true)
    try {
      const result = await ApiClient.uploadDataset(file)
      addDataset(result)
      setActiveDataset(result.id)
      toast.success("Dataset uploaded successfully")
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Upload failed")
    } finally {
      setIsUploading(false)
    }
  }, [addDataset, setActiveDataset])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1
  })

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await ApiClient.deleteDataset(id)
      removeDataset(id)
      toast.success("Dataset deleted")
    } catch {
      toast.error("Failed to delete dataset")
    }
  }

  const handleGenerateInsights = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingInsights(id)
    try {
      const result = await ApiClient.getDatasetInsights(id)
      setInsights(prev => ({ ...prev, [id]: result }))
      toast.success("Insights generated successfully")
    } catch (error: unknown) {
      const err = error as Error
      toast.error(err.message || "Failed to generate insights")
    } finally {
      setLoadingInsights(null)
    }
  }

  const handleDownload = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    window.open(`${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"}/api/datasets/${id}/download`, '_blank')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-medium text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Dataset Manager
          </h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center group",
              isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 hover:border-white/40 hover:bg-white/5',
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            <input {...getInputProps()} />
            {isUploading ? (
              <div className="flex flex-col items-center space-y-4">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                <div className="text-sm text-zinc-300">Processing dataset...</div>
              </div>
            ) : (
              <>
                <UploadCloud className="w-10 h-10 text-zinc-400 mb-4 group-hover:scale-110 transition-transform" />
                <p className="text-zinc-300 font-medium text-center">Click or drag file to upload</p>
                <p className="text-zinc-500 text-sm mt-2 text-center">CSV, JSON, XLSX up to 25MB</p>
              </>
            )}
          </div>

          <div className="mt-8">
            <h3 className="text-lg font-medium text-white mb-4">Uploaded Datasets</h3>
            <div className="h-[250px] overflow-y-auto rounded-md">
              <AnimatePresence mode="popLayout">
                {datasets.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-[200px] text-zinc-500 border border-white/5 rounded-xl bg-white/5">
                    <Database className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No datasets uploaded yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {datasets.map((ds) => {
                      const isActive = activeDatasetId === ds.id
                      return (
                        <motion.div
                          key={ds.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className={cn(
                            "group relative flex flex-col p-4 rounded-xl border transition-all cursor-pointer",
                            isActive ? "bg-indigo-500/10 border-indigo-500 shadow-sm" : "bg-zinc-800/50 border-white/10 hover:border-white/40 hover:bg-zinc-800"
                          )}
                          onClick={() => setActiveDataset(isActive ? null : ds.id)}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className={cn("p-2 rounded-lg shrink-0", isActive ? "bg-indigo-500 text-white" : "bg-zinc-700 text-zinc-400")}>
                                <FileSpreadsheet className="h-4 w-4" />
                              </div>
                              <div className="truncate">
                                <p className="font-semibold text-sm text-zinc-200 truncate">{ds.filename}</p>
                                <p className="text-xs text-zinc-500 mt-0.5">
                                  {(ds.size / 1024 / 1024).toFixed(2)} MB • {String(ds.summary?.row_count || 0)} rows • {String(ds.summary?.col_count || 0)} columns
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                              {isActive && <CheckCircle2 className="h-5 w-5 text-indigo-400" />}
                              <button
                                className="p-2 text-zinc-500 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors ml-2 opacity-0 group-hover:opacity-100"
                                onClick={(e) => handleDownload(ds.id, e)}
                                title="Download Dataset"
                              >
                                <UploadCloud className="h-4 w-4 rotate-180" />
                              </button>
                              <button
                                className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                onClick={(e) => handleDelete(ds.id, e)}
                                title="Delete Dataset"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {/* Preview of first 5 column names */}
                          {ds.summary?.columns && Array.isArray(ds.summary.columns) ? (
                            <div className="mt-3 flex gap-2 overflow-hidden text-[10px] text-zinc-400">
                              {(ds.summary.columns as { name: string }[]).slice(0, 5).map((c) => (
                                <span key={c.name} className="bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-[80px] border border-white/5">{c.name}</span>
                              ))}
                              {(ds.summary.columns as { name: string }[]).length > 5 && <span>...</span>}
                            </div>
                          ) : null}

                          {/* Insights Section */}
                          {isActive && (
                            <div className="mt-4 pt-4 border-t border-white/10">
                              {!insights[ds.id] ? (
                                <button
                                  onClick={(e) => handleGenerateInsights(ds.id, e)}
                                  disabled={loadingInsights === ds.id}
                                  className="w-full py-2 bg-indigo-500/20 text-indigo-300 rounded hover:bg-indigo-500/30 transition flex items-center justify-center gap-2 text-sm"
                                >
                                  {loadingInsights === ds.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
                                  {loadingInsights === ds.id ? 'Analyzing...' : 'Generate AI Insights'}
                                </button>
                              ) : (
                                <div className="space-y-3 bg-black/20 p-3 rounded-lg border border-white/5">
                                  <div>
                                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Summary</h4>
                                    <p className="text-sm text-zinc-400">{String(insights[ds.id].summary)}</p>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Highlights</h4>
                                    <ul className="list-disc pl-4 text-sm text-zinc-400 space-y-1">
                                      {((insights[ds.id].highlights as string[]) || []).map((h: string, i: number) => <li key={i}>{h}</li>)}
                                    </ul>
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1">Recommended Charts</h4>
                                    <ul className="list-disc pl-4 text-sm text-zinc-400 space-y-1">
                                      {((insights[ds.id].recommended_charts as Record<string, unknown>[]) || []).map((rc, i: number) => <li key={i}>{String(rc.description)} ({String(rc.type)})</li>)}
                                    </ul>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </motion.div>
                      )
                    })}
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
