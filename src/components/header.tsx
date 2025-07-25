import { Video } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"

export function Header() {
  return (
    <header className="border-b bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-8 w-8 text-emerald-600" />
          <span className="text-xl font-bold text-slate-900 dark:text-white">Quran Video Generator</span>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Button variant="outline" size="sm">
            About
          </Button>
        </div>
      </div>
    </header>
  )
}
