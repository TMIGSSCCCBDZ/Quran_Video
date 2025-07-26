// src/lib/audio-utils.ts
import { parseStream } from 'music-metadata';
import fetch from 'node-fetch';

export async function getAudioDurationFromUrlNode(url: string): Promise<number | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const stream = response.body;
    const metadata = await parseStream(stream as any, undefined, { duration: true });
    return metadata.format.duration || null;
  } catch (e) {
    console.error('Failed to get duration for', url, e);
    return null;
    
  }
}

export async function getDurationsForUrlsNode(urls: string[]): Promise<(number | null)[]> {
  return Promise.all(urls.map(getAudioDurationFromUrlNode));
}
