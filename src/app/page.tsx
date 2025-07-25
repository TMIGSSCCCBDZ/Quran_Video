import { Suspense } from "react"
import { QuranVideoGenerator } from "@/components/quran-video-generator"
import { Header } from "@/components/header"
import { Footer } from "@/components/footer"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Quran Video Generator
          </h1>
          
          
          
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
            Create beautiful, animated videos of Quranic verses with professional templates and audio synchronization
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-emerald-500"></div>
            </div>
          }
        >
          <QuranVideoGenerator />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
