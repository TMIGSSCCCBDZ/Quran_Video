export class AudioManager {
  private static instance: AudioManager

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }


  /**
   * Get recitation URL for a specific surah and reciter
   */
  async getRecitationUrl( surahNumber: number, reciter: string): Promise<string | null> {
    try {
      const reciterUrl = this.getPopularReciterUrl(reciter, surahNumber)
      return reciterUrl
    } catch (error) {
      console.error("Error fetching recitation:", error)
      return null
    
    }
  }

  /**
   * Validate if an audio URL is accessible and valid
   */
  async validateAudioUrl(url: string): Promise<boolean> {
    try {
      // Simple extension check for preview environment
      const isAudioLike = /\.(mp3|wav|m4a|aac|ogg)(\?.*)?$/i.test(url)
      return isAudioLike
    } catch (error) {
      console.error("Audio validation failed:", error)
      return false
    }
  }

  /**
   * Get audio duration from URL (if possible)
   */
  async getAudioDuration(url: string): Promise<number | null> {
    try {
      // This would require loading the audio in a browser environment
      // For server-side, we'd need a different approach
      return null
    } catch (error) {
      console.error("Error getting audio duration:", error)
      return null
    }
  }

  /**
   * Generate audio URL for popular reciters
   */
  getPopularReciterUrl(reciter: string, surahNumber: number): string {
    const baseUrls: Record<string, string> = {
      sudais: "https://verses.quran.foundation/AbdulBaset/Mujawwad/mp3",
      alafasy: "https://the-quran-project.github.io/Quran-Audio/Data/2",
      ghamdi: "https://the-quran-project.github.io/Quran-Audio/Data/3",
      muaiqly: "https://the-quran-project.github.io/Quran-Audio/Data/4",
      ajmy: "https://the-quran-project.github.io/Quran-Audio/Data/5",
    }


    const baseUrl = baseUrls[reciter]
    if (!baseUrl) {
      throw new Error(`Unsupported reciter: ${reciter}`)
    }

    // Format surah number with leading zeros (001, 002, etc.)
    // const formattedSurah = surahNumber.toString().padStart(3, "0")
    return `${baseUrl}/${surahNumber}.mp3`
  }
}

export const audioManager = AudioManager.getInstance()
// export const audioManager = AudioManager.getInstance()

/**
 * Get recitation URLs for a range of ayahs in a surah for a given reciter.
 */
export function getRecitationUrlsForAyahRange(
  startAyah: number,
  endAyah: number,
  surahNumber: number,
  reciter: string
): string[] {
  // Map reciter to base URL (adjust as needed)
  const reciterBase: Record<string, string> = {
    AbdulBaset_Mujawwad: "https://verses.quran.foundation/AbdulBaset/Mujawwad/mp3",
    AbdulBaset_Murattal: "https://verses.quran.foundation/AbdulBaset/Murattal/mp3",
    Minshawi_Mujawwad: "https://verses.quran.foundation/Minshawi/Mujawwad/mp3",
    Minshawi_Murattal : "https://verses.quran.foundation/Minshawi/Murattal/mp3",
  }
  const baseUrl = reciterBase[reciter]
  if (!baseUrl) throw new Error(`Unsupported reciter: ${reciter}`)

  // Generate URLs for each ayah in the range
      const formattedSurah = surahNumber.toString().padStart(3, "0")

  const urls: string[] = []
  for (let ayah = startAyah; ayah <= endAyah; ayah++) {
    const formattedAyah = ayah.toString().padStart(3, "0")
    urls.push(`${baseUrl}/${formattedSurah}${formattedAyah}.mp3`)
  }
  console.log("THIS IS URLS",urls)
  return urls
}

export async function getAudioDurationFromUrl(url: string): Promise<number | null> {
  return new Promise((resolve) => {
    const audio = new window.Audio();
    audio.src = url;
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(null);
    });
  });
}

export async function getDurationsForUrls(urls: string[]): Promise<(number | null)[]> {
  console.log("THIS IS DURATION LENGTH",Promise.all(urls.map(getAudioDurationFromUrl)))
  return Promise.all(urls.map(getAudioDurationFromUrl));
}
