"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Clock, Film } from "lucide-react"
import type { Ayah, VideoConfig } from "@/components/quran-video-generator"

interface VideoPreviewProps {
  ayahs: Ayah[]
  config: VideoConfig
  audioDurations: (number | null)[]
}

export function VideoPreview({audioDurations, ayahs, config }: VideoPreviewProps) {
  const estimatedDuration = ayahs.length * 8 // 8 seconds per ayah estimate


  const getTemplatePreview = () => {
    switch (config.template) {
      case "classic":
        return (
          <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg p-6 text-center">
            <div className="text-lg font-serif text-slate-800 dark:text-slate-200 mb-2">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              In the name of Allah, the Most Gracious, the Most Merciful
            </div>
          </div>
        )
      case "modern":
        return (
          <div className="bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900 dark:to-purple-900 rounded-lg p-6 text-center">
            <div className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 mb-2">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <div className="text-sm text-slate-700 dark:text-slate-300">
              In the name of Allah, the Most Gracious, the Most Merciful
            </div>
          </div>
        )
      case "capcut":
        return (
          <div className="bg-gradient-to-br from-slate-900 to-black rounded-lg p-6 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 to-orange-400/10"></div>
            <div className="relative text-2xl font-bold text-yellow-400 mb-2 drop-shadow-lg">
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </div>
            <div className="relative text-sm text-slate-300">
              In the name of Allah, the Most Gracious, the Most Merciful
            </div>
          </div>
        )
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Video Preview
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Preview how your video will look</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="aspect-video bg-slate-100 dark:bg-slate-800 rounded-lg overflow-hidden">
            {getTemplatePreview()}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-6 w-6 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              ~{Math.floor(estimatedDuration / 60)}:{(estimatedDuration % 60).toString().padStart(2, "0")}
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Estimated Duration</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Film className="h-6 w-6 mx-auto mb-2 text-slate-600 dark:text-slate-400" />
            <div className="text-lg font-semibold text-slate-900 dark:text-white">{ayahs.length}</div>
            <div className="text-sm text-slate-600 dark:text-slate-400">Verses Selected</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Video Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Template:</span>
            <Badge variant="secondary" className="capitalize">
              {config.template}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Resolution:</span>
            <Badge variant="secondary">{config.resolution}</Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-600 dark:text-slate-400">Audio:</span>
            <Badge variant="secondary">
              {config.audioUrl ? (config.audioType === "recitation" ? "Recitation" : "Custom") : "None"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
