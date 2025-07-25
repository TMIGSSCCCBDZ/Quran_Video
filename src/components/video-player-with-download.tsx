"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Download, Twitter, Facebook, Copy, Check } from "lucide-react"
import type { Ayah } from "@/components/quran-video-generator"

interface VideoPlayerWithDownloadProps {
  videoUrl: string
  ayahs: Ayah[]
}

export function VideoPlayerWithDownload({ videoUrl, ayahs }: VideoPlayerWithDownloadProps) {
  const [copied, setCopied] = useState(false)

  const handleDownload = () => {
    const link = document.createElement("a")
    link.href = videoUrl
    link.download = `quran-video-${ayahs[0]?.surah.englishName}-${ayahs[0]?.number}-${ayahs[ayahs.length - 1]?.number}.mp4`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error("Failed to copy link:", error)
    }
  }

  const shareText = `Beautiful Quranic verses from ${ayahs[0]?.surah.englishName} - Created with Quran Video Generator`

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Your Video is Ready! 🎉</h2>
        <p className="text-slate-600 dark:text-slate-400">Preview your generated video and share it with others</p>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="aspect-video bg-black rounded-lg overflow-hidden mb-4 flex items-center justify-center">
            {videoUrl.includes("placeholder.svg") ? (
              <img src={videoUrl || "/placeholder.svg"} alt="Video preview" className="w-full h-full object-cover" />
            ) : (
              <video src={videoUrl} controls className="w-full h-full" poster="/placeholder.svg?height=360&width=640">
                Your browser does not support the video tag.
              </video>
            )}
          </div>


          <div className="flex flex-wrap gap-3 justify-center">
            <Button onClick={handleDownload} size="lg" className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Video
            </Button>

        

          
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Video Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Surah:</span>
              <Badge variant="secondary">{ayahs[0]?.surah.englishName}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Verses:</span>
              <Badge variant="secondary">
                {ayahs[0]?.numberInSurah} - {ayahs[ayahs.length - 1]?.numberInSurah}
              </Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-600 dark:text-slate-400">Total Verses:</span>
              <Badge variant="secondary">{ayahs.length}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

  <div className="text-center text-sm text-slate-500 dark:text-slate-400">
  <p>نسأل الله أن يتقبّل منك هذا العمل، ويجعله في ميزان حسناتك 🤍</p>
  <p className="mt-1">شارك هذا المقطع مع من تُحب، لعلّه يكون نورًا يهتدي به قلب 💫</p>
</div>
    </div>
  )
}
