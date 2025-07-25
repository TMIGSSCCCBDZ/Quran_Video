import { NextApiRequest, NextApiResponse } from 'next';
import { renderVideo } from '../../../scripts/render-video';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { ayahs, config } = req.body;

    if (!ayahs || !Array.isArray(ayahs) || ayahs.length === 0) {
      return res.status(400).json({ error: 'Invalid ayahs data' });
    }
    if (!config || !config.template) {
      return res.status(400).json({ error: 'Invalid config' });
    }

    const videoPath = await renderVideo(ayahs, config);

    return res.status(200).json({
      success: true,
      videoUrl: videoPath,
      metadata: {
        duration: ayahs.length * 8,
        ayahCount: ayahs.length,
        template: config.template,
        resolution: config.resolution,
      },
    });
  } catch (error: any) {
    console.error('Video rendering error:', error);
    return res.status(500).json({
      success: false,
      error: error.message ?? 'Unknown error',
    });
  }
}
