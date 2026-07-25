import * as React from "react"
import { X, Mic } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useChatStore } from "@/lib/store"
import { ApiClient } from "@/lib/api"

export function SettingsModal({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { voiceAutoRead, setVoiceAutoRead, selectedVoice, setSelectedVoice, speechRate, setSpeechRate } = useChatStore()
  const [voices, setVoices] = React.useState<{ ShortName: string, FriendlyName: string }[]>([])

  React.useEffect(() => {
    if (isOpen) {
      ApiClient.getVoices().then(setVoices).catch(console.error)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            Settings
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Mic className="h-4 w-4" /> Voice & Audio
            </h3>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <label htmlFor="auto-read" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Auto-read AI responses</label>
                <p className="text-xs text-muted-foreground">
                  Automatically play text-to-speech when AI replies.
                </p>
              </div>
              <input
                type="checkbox"
                id="auto-read"
                className="h-4 w-4 rounded border-primary text-primary focus:ring-primary"
                checked={voiceAutoRead}
                onChange={(e) => setVoiceAutoRead(e.target.checked)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Voice</label>
              <select 
                value={selectedVoice} 
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {voices.length > 0 ? voices.map(v => (
                  <option key={v.ShortName} value={v.ShortName}>
                    {v.FriendlyName}
                  </option>
                )) : (
                  <option value={selectedVoice}>{selectedVoice}</option>
                )}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">Speaking Rate</label>
              <select 
                value={speechRate} 
                onChange={(e) => setSpeechRate(e.target.value)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="-20%">Slow</option>
                <option value="+0%">Normal</option>
                <option value="+20%">Fast</option>
                <option value="+50%">Very Fast</option>
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
