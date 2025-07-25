import { NextResponse } from "next/server"

export async function GET() {
  try {
    const response = await fetch("https://api.alquran.cloud/v1/surah")
    const data = await response.json()

    if (data.code === 200) {
      return NextResponse.json({ surahs: data.data })
    } else {
      throw new Error("Failed to fetch surahs")
    }
  } catch (error) {
    console.error("Error fetching surahs:", error)
    return NextResponse.json({ error: "Failed to fetch surahs" }, { status: 500 })
  }
}
