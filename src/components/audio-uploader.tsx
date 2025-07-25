"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Music, Mic, Volume2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { audioManager, getDurationsForUrls, getRecitationUrlsForAyahRange } from "@/../lib/audio-utils"

interface AudioUploaderProps {
  startAyah: number,
  endAyah: number,
  surahNumber: number
  audioUrl?: string[]
  audioType?: "recitation" | "nasheed"
  onAudioChange: (audioUrl?: string[], audioType?: "recitation" | "nasheed", durations?: number[]) => void
}
const popularReciters = [
  { name: "Abdul Baset Mujawwad", value: "AbdulBaset_Mujawwad" },
  { name: "Abdul Baset Murattal", value: "AbdulBaset_Murattal" },
  { name: "Minshawi Mujawwad", value: "Minshawi_Mujawwad" },
  { name: "Minshawi Murattal", value: "Minshawi_Murattal" },
];
export function AudioUploader({startAyah, endAyah, surahNumber, audioUrl, audioType, onAudioChange }: AudioUploaderProps) {
  const [selectedReciter, setSelectedReciter] = useState("")
  const [customAudioUrl, setCustomAudioUrl] = useState("")
  const [audioMode, setAudioMode] = useState<"none" | "reciter" | "custom">("none")


const handleReciterSelect = async (reciter: string) => {
  setSelectedReciter(reciter)
  const reciterUrl = getRecitationUrlsForAyahRange(startAyah, endAyah, surahNumber, reciter)
  const durations = await getDurationsForUrls(reciterUrl)
  console.log("THIS IS DURATIONS:::",durations)
  onAudioChange(reciterUrl, "recitation", durations.filter(duration => duration !== null))
}  
  const handleCustomAudio = () => {
    if (customAudioUrl) {
      onAudioChange([customAudioUrl], "nasheed")
    }
  }

  const clearAudio = () => {
    onAudioChange(undefined, undefined)
    setAudioMode("none")
    setSelectedReciter("")
    setCustomAudioUrl("")
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">Audio Settings</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Add recitation or background audio to your video</p>
      </div>

      <div className="grid gap-3">
        <Button
          variant={audioMode === "none" ? "default" : "outline"}
          onClick={() => {
            setAudioMode("none")
            clearAudio()
          }}
          className="justify-start"
        >
          <Volume2 className="h-4 w-4 mr-2" />
          No Audio
        </Button>

        <Button
          variant={audioMode === "reciter" ? "default" : "outline"}
          onClick={() => setAudioMode("reciter")}
          className="justify-start"
        >
          <Mic className="h-4 w-4 mr-2" />
          Quran Recitation
        </Button>

        <Button
          variant={audioMode === "custom" ? "default" : "outline"}
          onClick={() => setAudioMode("custom")}
          className="justify-start"
        >
          <Music className="h-4 w-4 mr-2" />
          Custom Audio
        </Button>
      </div>
      

      {audioMode === "reciter" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Label>Select Reciter</Label>
            <Select value={selectedReciter} onValueChange={handleReciterSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a reciter" />
              </SelectTrigger>
              <SelectContent>
                {popularReciters.map((reciter) => (
                  <SelectItem key={reciter.value} value={reciter.value}>
                    {reciter.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {audioMode === "custom" && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <Label htmlFor="audio-url">Audio URL</Label>
            <div className="flex gap-2">
              <Input
                id="audio-url"
                placeholder="https://example.com/audio.mp3"
                value={customAudioUrl}
                onChange={(e) => setCustomAudioUrl(e.target.value)}
              />
              <Button onClick={handleCustomAudio} disabled={!customAudioUrl}>
                Add
              </Button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">Supported formats: MP3, WAV, M4A</p>
          </CardContent>
        </Card>
      )}

      {audioUrl && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-medium">Audio Selected</span>
                <Badge variant="secondary">{audioType === "recitation" ? "Recitation" : "Custom Audio"}</Badge>
              </div>
              <Button variant="ghost" size="sm" onClick={clearAudio}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
