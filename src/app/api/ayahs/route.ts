import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const surah = searchParams.get("surah")
  const from = searchParams.get("from") || "1"
  const to = searchParams.get("to") || "1"

  if (!surah) {
    return NextResponse.json({ error: "Surah number is required" }, { status: 400 })
  }

  try {

    // Fetch Arabic text
    const arabicResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah}`)
    const arabicData = await arabicResponse.json()

    // Fetch English translation
    const translationResponse = await fetch(`https://api.alquran.cloud/v1/surah/${surah}/en.asad`)
    const translationData = await translationResponse.json()

    if (arabicData.code === 200 && translationData.code === 200) {
      const fromNum = Number.parseInt(from)
      const toNum = Number.parseInt(to)

      const ayahs = arabicData.data.ayahs.slice(fromNum - 1, toNum).map((ayah: any, index: number) => ({
        number: ayah.number,
        numberInSurah: ayah.numberInSurah,
        text: ayah.text,
        translation: translationData.data.ayahs[fromNum - 1 + index]?.text,
        surah: {
          number: arabicData.data.number,
          name: arabicData.data.name,
          englishName: arabicData.data.englishName,
        },
      }))

      return NextResponse.json({ ayahs })
    } else {
      throw new Error("Failed to fetch ayahs")
    }
  } catch (error) {
    console.error("Error fetching ayahs:", error)
    return NextResponse.json({ error: "Failed to fetch ayahs" }, { status: 500 })
  }
}
