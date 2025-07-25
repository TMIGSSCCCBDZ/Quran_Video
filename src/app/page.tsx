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
          <h1 className="text-4xl md:text-6xl h-20 font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent mb-4">
             نور القرآن

          </h1>
        <p className="text-md md:text-lg text-slate-600 dark:text-slate-300 max-w-3xl mx-auto mt-6 leading-relaxed text-center">
  زائرنا الكريم...  
  <br />
  نسأل الله أن يجعل زيارتك لهذا المكان سببًا في نور قلبك وقربك من كلام الله عزّ وجلّ.  
   نسعى  لخدمة القرآن ونشره بجمالٍ يليق بعظمته.  
  فإن رأيت فيه نفعًا أو أثرًا، فلا تنسَ أخاك من دعوةٍ بظهر الغيب،  
  أن يغفر الله لي، ويثبتني، ويرزقني الإخلاص والقبول.  
  <br />
  <span className="italic text-emerald-600 dark:text-emerald-400">
   {` ( وَتَعَاوَنُوا عَلَى الْبِرِّ وَالتَّقْوَى )`}
  </span>
  <br />
  نرجو أن نكون قد اجتمعنا هنا على خير، وافترقنا على ذكر الله.  
  بارك الله فيك، وجعل القرآن ربيع قلبك، ونور دربك، وشفيعك يوم تلقاه. 🤲
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
