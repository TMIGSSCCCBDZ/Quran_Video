"use client"

import { useState } from "react"
import { AyahSelector } from "@/components/ayah-selector"
import { TemplatePicker } from "@/components/template-picker"
import { AudioUploader } from "@/components/audio-uploader"
import { RenderControls } from "@/components/render-controls"
import { VideoPreview } from "@/components/video-preview"
import { VideoPlayerWithDownload } from "@/components/video-player-with-download"
import { useToast } from "@/../hooks/use-toast"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

import axios from 'axios'
/**
 * A single ayah (verse) with minimal metadata we need for rendering.
 */
export interface Ayah {
  number: number
  text: string
  numberInSurah: number
  translation?: string
  surah: {
    number: number
    name: string
    englishName: string
  }
}

/**
 * Video configuration chosen by the user.
 */
export interface VideoConfig {
  template: "classic" | "modern" | "capcut"
  resolution: "720p" | "1080p"
  themeColor: string

  backgroundColor: string
  backgroundVideoUrl?: string // <-- add this
  audioUrl?: string[]
  audioType?: "recitation" | "nasheed"
  reciterId?: string // <-- add this
}

const initialConfig: VideoConfig = {
  template: "classic",
  resolution: "720p",
  themeColor: "#059669",
  backgroundColor: "#1e293b",
  backgroundVideoUrl: undefined, // <-- add this
  audioUrl: [],
  audioType: undefined,
  reciterId: "1", // default reciter
}

/**
 * High-level orchestration component that ties all UI pieces together and
 * triggers the `/api/render-video` endpoint.
 */
export function QuranVideoGenerator() {
  // -------------------------------------------------
  // Local state
  // -------------------------------------------------
  const [ayahs, setAyahs] = useState<Ayah[]>([])
  const [config, setConfig] = useState<VideoConfig>(initialConfig)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()
  
  const [audioDurations, setAudioDurations] = useState<(number | null)[]>([]);

  // -------------------------------------------------
  // Handlers
  // -------------------------------------------------
  
  const handleAudioChange = (audioUrl?: string[], audioType?: "recitation" | "nasheed", durations?: (number | null)[]) => {
    setConfig((prev) => ({ ...prev, audioUrl, audioType }));
    setAudioDurations(durations || []);
  };
  
  console.log("THIS IS DURATIONS",audioDurations)
  
  const handleConfigChange = (patch: Partial<VideoConfig>) => setConfig((prev) => ({ ...prev, ...patch }))
  const handleRender = async () => {
    console.log("THIS IS CONFIG:::",config)

    if (ayahs.length === 0) {
      toast({
        title: "Select verses first",
        description: "Please choose at least 1 ayah before generating a video.",
        variant: "destructive",
      })
      return
    }

    setIsRendering(true)
    setError(null)
    try {
      const res = await fetch("/api/render-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ayahs, config }),
      })
       const blob = await res.blob();
  const url = URL.createObjectURL(blob);

   

      
      /**
      //  * Some 4xx/5xx responses from the API might return plain-text
      //  * ("Internal server error") instead of JSON.  Attempt to read
      //  * JSON only when the `Content-Type` header suggests it, so we
      //  * don’t hit a `SyntaxError: Unexpected token …`.
      //  */
      // let json: any = undefined
      // const isJson = res.headers.get("content-type")?.includes("application/json")

      // if (isJson) {
      //   try {
      //     json = await res.json()
      //   } catch {
      //     /* JSON parse failed – fall through to text extraction below   */
      //   }
      // }

      // if (!isJson || json === undefined) {
      //   // fallback to plain text for better diagnostics
      //   const text = await res.text()
      //   throw new Error(text || "Unexpected server response")
      // }

      if (!res.ok) {
        throw new Error("Failed to render video")
      }

      setVideoUrl(url)
      toast({ title: "Video ready!", description: "Scroll down to preview and download it." })
    } catch (err: unknown) {
      console.error(err)
      setError(err instanceof Error ? err.message : "Unknown rendering error")
      toast({
        title: "Rendering failed",
        description: "Something went wrong while generating the video.",
        variant: "destructive",
      })
    } 
    
    finally {
      setIsRendering(false)
    }
  

}
 
  // console.log("THIS IS AYAYHS",ayahs)
  // -------------------------------------------------
  // UI
  // -------------------------------------------------
  return (
    <div className="grid lg:grid-cols-2 gap-10">
      {/* Left column – all inputs */}
      <div className="space-y-10">
        <AyahSelector onAyahsSelected={setAyahs} />


        <TemplatePicker
          selectedTemplate={config.template}
          onTemplateChange={(template) => handleConfigChange({ template })}
        />

        <AudioUploader
        startAyah={ayahs[0]?.numberInSurah}
        endAyah={ayahs[ayahs.length - 1]?.numberInSurah}
          surahNumber={ayahs[0]?.surah.number ?? 1}
          audioUrl={config.audioUrl}
          audioType={config.audioType}
          onAudioChange={handleAudioChange}
        />
      </div>

      {/* Right column – preview + render */}
      <div className="space-y-10">

        <RenderControls
          config={config}
          onConfigChange={handleConfigChange}
          onRender={handleRender}
          isRendering={isRendering}
          disabled={ayahs.length === 0}
        />

        {/* Error display */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Rendering error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Final video */}
        {videoUrl && <VideoPlayerWithDownload videoUrl={videoUrl} ayahs={ayahs} />}
      </div>
    </div>
  )
}

export default QuranVideoGenerator
