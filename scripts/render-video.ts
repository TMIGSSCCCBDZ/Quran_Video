// scripts/render-video.ts
import { getCompositions, renderMedia } from '@remotion/renderer';
import path from 'path';

export async function renderVideo(ayahs: any[], config: any) {
  const serveUrl = 'file://' + path.resolve(process.cwd(), 'remotion');

  const compositions = await getCompositions(serveUrl, {
    inputProps: { ayahs, config },
  });

  const compositionId =
    config.template === 'classic'
      ? 'ClassicTemplate'
      : config.template === 'modern'
      ? 'ModernTemplate'
      : null;

  if (!compositionId) throw new Error('Unsupported template');

  const composition = compositions.find((c) => c.id === compositionId);

  if (!composition) throw new Error(`Composition ${compositionId} not found`);

  const outputLocation = `/tmp/video-${Date.now()}.mp4`;


  await renderMedia({
    composition,
         serveUrl: "http://localhost:3000", // replace with prod URL in deployment

    codec: 'h264',
    outputLocation,
    inputProps: { ayahs, config },
  });

  return outputLocation;
}
