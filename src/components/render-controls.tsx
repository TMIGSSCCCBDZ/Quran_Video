"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Play, Settings, Palette } from "lucide-react"
import type { VideoConfig } from "@/components/quran-video-generator"

interface RenderControlsProps {
  config: VideoConfig
  onConfigChange: (config: Partial<VideoConfig>) => void
  onRender: () => void
  isRendering: boolean
  disabled: boolean
}

const themeColors = [
  { name: "White", value: "#ffffff", bg: "bg-white " },
  { name: "Black", value: "#000000", bg: "bg-black" },
  { name: "Emerald", value: "#059669", bg: "bg-emerald-600" },
  { name: "Blue", value: "#2563eb", bg: "bg-blue-600" },
  { name: "Purple", value: "#7c3aed", bg: "bg-purple-600" },
  { name: "Gold", value: "#d97706", bg: "bg-amber-600" },
  { name: "Rose", value: "#e11d48", bg: "bg-rose-600" },
]


const backgroundColors = [
  { name: "Dark Slate", value: "#1e293b", bg: "bg-slate-800" },
  { name: "Black", value: "#000000", bg: "bg-black" },
  { name: "Dark Blue", value: "#1e3a8a", bg: "bg-blue-900" },
  { name: "Dark Green", value: "#14532d", bg: "bg-green-900" },
  { name: "White", value: "#ffffff", bg: "bg-white border" },
]

export function RenderControls({ config, onConfigChange, onRender, isRendering, disabled }: RenderControlsProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Video Settings
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">Configure your video output settings</p>
      </div>

      <div className="space-y-4">
        <div>
          <Label>Resolution</Label>
          <Select
            value={config.resolution}
            onValueChange={(value: "720p" | "1080p") => onConfigChange({ resolution: value })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720p">720p (HD)</SelectItem>
              <SelectItem value="1080p">1080p (Full HD)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-3">
            <Palette className="h-4 w-4" />
            Theme Color
          </Label>
          <div className="grid grid-cols-5 gap-2">
            {themeColors.map((color) => (
              <button
                key={color.value}
                className={`w-full h-10 rounded-lg border-2 transition-all ${
                  config.themeColor === color.value
                    ? "border-slate-900 dark:border-white scale-105"
                    : "border-slate-200 dark:border-slate-700 hover:scale-105"
                } ${color.bg}`}
                onClick={() => onConfigChange({ themeColor: color.value })}
                title={color.name}
              />
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <Label className="mb-3 block">Background Color</Label>
          <div className="grid grid-cols-5 gap-2">
            {backgroundColors.map((color) => (
              <button
                key={color.value}
                className={`w-full h-10 rounded-lg border-2 transition-all ${
                  config.backgroundColor === color.value
                    ? "border-slate-900 dark:border-white scale-105"
                    : "border-slate-200 dark:border-slate-700 hover:scale-105"
                } ${color.bg}`}
                onClick={() => onConfigChange({ backgroundColor: color.value })}
                title={color.name}
              />
            ))}
          </div>

        <div>
          <Label className="mb-3 block">Background Image URL</Label>
          <input
            type="text"

            className="w-full h-10 rounded-lg border-2 px-3 py-2 bg-transparent text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            placeholder="Paste Background Image URL"
            value={config.backgroundVideoUrl || ""}
            onChange={e => onConfigChange({ backgroundVideoUrl: e.target.value })}
            disabled={disabled}
          />
        </div>
        </div>
      </div>

      <Card className="bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 border-emerald-200 dark:border-emerald-800">
        <CardContent className="p-6">
          <Button
            onClick={onRender}
            disabled={disabled || isRendering}
            size="lg"
            className="w-full bg-gradient-to-r from-emerald-600 to-blue-600 hover:from-emerald-700 hover:to-blue-700"
          >
            {isRendering ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Rendering Video...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Generate Video
              </div>
            )}
          </Button>

          {isRendering && (
            <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-2">
              This may take a few minutes depending on video length
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

