import type React from "react"
import type { Metadata } from "next"
import { Inter, Amiri } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const amiri = Amiri({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-arabic",
})

export const metadata: Metadata = {
  title: "نور القرآن - صمّم فيديوهات قرآنية ",
  description:
    "أنشئ فيديوهات للآيات القرآنية بتنسيقات احترافية، مع مزامنة صوتية، وخيارات تصميم متعددة تنشر نور القرآن بجمال.",
  keywords: "Quran, Ayat, Islamic videos, Islamic content, Quranic verses,القرآن الكريم, فيديوهات إسلامية, آيات قرآنية, منشئ فيديو, محتوى إسلامي, تصميم فيديوهات قرآن",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${amiri.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
