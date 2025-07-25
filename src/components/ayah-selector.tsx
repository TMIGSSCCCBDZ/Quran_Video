"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Search, BookOpen, Play } from "lucide-react"
import type { Ayah } from "@/components/quran-video-generator"

interface Surah {
  number: number
  name: string
  englishName: string
  englishNameTranslation: string
  numberOfAyahs: number
  revelationType: string
}

interface AyahSelectorProps {
  onAyahsSelected: (ayahs: Ayah[]) => void
}

export function AyahSelector({ onAyahsSelected }: AyahSelectorProps) {
  const [surahs, setSurahs] = useState<Surah[]>([])
  const [selectedSurah, setSelectedSurah] = useState<Surah | null>(null)
  const [fromAyah, setFromAyah] = useState(1)
  const [toAyah, setToAyah] = useState(1)
  const [searchTerm, setSearchTerm] = useState("")
  const [loading, setLoading] = useState(false)
  const [selectedAyahs, setSelectedAyahs] = useState<Ayah[]>([])

  
  useEffect(() => {
    fetchSurahs()
  }, [])

  const fetchSurahs = async () => {
    try {
      const response = await fetch("/api/surahs")
      const data = await response.json()
      setSurahs(data.surahs || [])
    } catch (error) {
      console.error("Failed to fetch surahs:", error)
    }
  }

  const fetchAyahs = async () => {
    if (!selectedSurah) return

    setLoading(true)
    try {
      const response = await fetch(`/api/ayahs?surah=${selectedSurah.number}&from=${fromAyah}&to=${toAyah}`)
      const data = await response.json()
      setSelectedAyahs(data.ayahs || [])
      onAyahsSelected(data.ayahs || [])
    } catch (error) {
      console.error("Failed to fetch ayahs:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredSurahs = surahs.filter(
    (surah) => surah.englishName.toLowerCase().includes(searchTerm.toLowerCase()) || surah.name.includes(searchTerm),
  )

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Select Quranic Verses</h2>
        <p className="text-slate-600 dark:text-slate-400">
          Choose a Surah and specify the range of Ayahs for your video
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Select Surah
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search Surah..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="max-h-64 overflow-y-auto space-y-2">
              {filteredSurahs.map((surah) => (
                <div
                  key={surah.number}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedSurah?.number === surah.number
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  }`}
                  onClick={() => setSelectedSurah(surah)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {surah.number}. {surah.englishName}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400">{surah.englishNameTranslation}</div>
                    </div>
                    <Badge variant="secondary">{surah.numberOfAyahs} verses</Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ayah Range</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedSurah ? (
              <>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
                  <div className="font-semibold text-slate-900 dark:text-white">{selectedSurah.englishName}</div>
                  <div className="text-sm text-slate-600 dark:text-slate-400">
                    {selectedSurah.numberOfAyahs} verses • {selectedSurah.revelationType}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="from-ayah">From Ayah</Label>
                    <Input
                      id="from-ayah"
                      type="number"
                      min={1}
                      max={selectedSurah.numberOfAyahs}
                      value={fromAyah}
                      onChange={(e) => setFromAyah(Number(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="to-ayah">To Ayah</Label>
                    <Input
                      id="to-ayah"
                      type="number"
                      min={fromAyah}
                      max={selectedSurah.numberOfAyahs}
                      value={toAyah}
                      onChange={(e) => setToAyah(Number(e.target.value))}
                    />
                  </div>
                </div>

                <Button onClick={fetchAyahs} disabled={loading} className="w-full">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Loading Ayahs...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Play className="h-4 w-4" />
                      Load Ayahs ({toAyah - fromAyah + 1} verses)
                    </div>
                  )}
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-slate-500 dark:text-slate-400">Please select a Surah first</div>
            )}
          </CardContent>
        </Card>
      </div>

      {selectedAyahs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Selected Ayahs Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {selectedAyahs.map((ayah) => (
                <div key={ayah.number} className="p-4 border rounded-lg">
                  <div className="flex items-start gap-3">
                    <Badge variant="outline">{ayah.number}</Badge>
                    <div className="flex-1">
                      <div className="text-right text-xl leading-relaxed mb-2 font-arabic">{ayah.text}</div>
                      {ayah.translation && (
                        <div className="text-sm text-slate-600 dark:text-slate-400">{ayah.translation}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
