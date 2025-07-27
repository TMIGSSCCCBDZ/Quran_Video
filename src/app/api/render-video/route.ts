// // app/api/render/route.ts
// import { NextRequest, NextResponse } from 'next/server';

// export async function POST(req: NextRequest) {
//   const body = await req.json();

//   const renderRes = await fetch('http://localhost:3000/render-video', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(body),
//   });


  

//   if (!renderRes.ok) {
//     const err = await renderRes.json();
//     return NextResponse.json({ error: 'Render server error', details: err }, { status: 502 });
//   }

//   const buffer = await renderRes.arrayBuffer();
//   return new NextResponse(Buffer.from(buffer), {
//     status: 200,
//     headers: {
//       'Content-Type': 'video/mp4',
//       'Content-Disposition': 'attachment; filename="video.mp4"',
//     },
//   });
// }

import { type NextRequest, NextResponse } from "next/server";
import { parseStream } from 'music-metadata';
import fetch from 'node-fetch';
import { getDurationsForUrlsNode } from "@/lib/audio";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    console.log('Starting video render process...');

    
    const { ayahs, config } = await request.json();
    console.log('Received data:', { ayahCount: ayahs?.length, template: config?.template });

    // Validate input
    if (!ayahs || !Array.isArray(ayahs) || ayahs.length === 0) {
      return NextResponse.json({ error: "Invalid ayahs data provided" }, { status: 400 });
    }
    if (!config || !config.template) {
      return NextResponse.json({ error: "Invalid video configuration provided" }, { status: 400 });
    }

    // Fix audio bitrate format
    if (config.audioBitrate && typeof config.audioBitrate === 'number') {
      config.audioBitrate = `${Math.round(config.audioBitrate / 1000)}k`;
    }
  
    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const path = await import('path');
      const fs = await import('fs');

      // Ensure output directory exists
      const outputDir = path.join(process.cwd(), 'public', 'videos');
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      const videoFileName = `video-${Date.now()}.mp4`;
      const outputPath = path.join(outputDir, videoFileName);

      // Map template to composition ID
      let compositionId = "";
      if (config.template === "classic") compositionId = "ClassicTemplate";
      else if (config.template === "modern") compositionId = "ModernTemplate";
      else if (config.template === "capcut") compositionId = "CapcutTemplate";
      else {
        return NextResponse.json({ error: "Invalid template specified" }, { status: 400 });
      }

      // 1. Get the audio URLs (from config or ayahs)
      const audioUrls = config.audioUrl || []; // or however you build your ayah audio URLs

      // 2. Fetch durations
      const audioDurations = await getDurationsForUrlsNode(audioUrls);

      // 3. Pass audioDurations as a prop to Remotion
      const baseDurationPerAyah =  8; // Reduced from 8 to 5 seconds
      const titleDuration = config.titleDuration || 2; // Reduced from 3 to 2 seconds
      const closingDuration = config.closingDuration || 1; // Reduced from 2 to 1 second
      const fps = config.fps || 30;
      const totalAyahSeconds = audioDurations.length === ayahs.length
        ? audioDurations.reduce((sum:any, dur) => sum + (dur || 8), 0)
        : ayahs.length * (config.ayahDuration || 8);

      const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
      const totalFrames = Math.ceil(totalDurationSeconds * fps);
      
      console.log(`Duration calculation: ${ayahs.length} ayahs ${totalAyahSeconds}s + ${titleDuration}s title + ${closingDuration}s closing = ${totalDurationSeconds}s (${totalFrames} frames at ${fps}fps)`);

      // Create props file with corrected duration
      const propsFile = path.join(process.cwd(), 'temp-props.json');
      const renderProps = {
        ayahs,
        config: {
          ...config,
          totalDurationSeconds,
          totalFrames,
          fps
        },
        audioDurations // <-- pass as top-level prop!
      };
      
      fs.writeFileSync(propsFile, JSON.stringify(renderProps));

      console.log('Starting Remotion CLI render...');

      // **FIXED: Improved Remotion command with better settings**
      const remotionCommand = [
        'npx remotion render',
        `"${path.join(process.cwd(), 'remotion', 'index.ts')}"`,
        compositionId,
        `"${outputPath}"`,
        `--props="${propsFile}"`,
        '--codec=h264',
        '--concurrency=4', // **FIXED: Increased concurrency for faster rendering**
        '--audio-bitrate=128k',
        '--crf=18', // **ADDED: Better video quality**
        '--pixel-format=yuv420p', // **ADDED: Better compatibility**
        '--enforce-audio-track', // **ADDED: Ensure audio track**
        `--timeout=${Math.floor(Math.max(300000, totalDurationSeconds * 10000))}` // Ensure integer
      ].join(' ');

      console.log('Executing command:', remotionCommand);
      
      // **FIXED: Increased timeout and better error handling**
      const timeoutMs = Math.floor(Math.max(300000, totalDurationSeconds * 15000)); // Ensure integer
      console.log(`Using timeout: ${timeoutMs / 1000}s for ${totalDurationSeconds}s video`);
      
      const { stdout, stderr } = await execAsync(remotionCommand, {
        timeout: timeoutMs,
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // **ADDED: Increased buffer size**
        killSignal: 'SIGKILL' // **ADDED: More forceful kill signal**
      });

      console.log('Remotion stdout:', stdout);
      if (stderr) console.log('Remotion stderr:', stderr);

      // Clean up props file
      if (fs.existsSync(propsFile)) {
        fs.unlinkSync(propsFile);
      }

      // Check if video was created
      if (!fs.existsSync(outputPath)) {
        throw new Error('Video file was not created');
      }

      // **ADDED: Get actual file size for verification**
      const stats = fs.statSync(outputPath);
      console.log(`Video rendered successfully: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      return NextResponse.json({
        success: true,
        videoUrl: `/videos/${videoFileName}`,
        message: "Video rendered successfully",
        metadata: {
          duration: totalDurationSeconds,
          ayahCount: ayahs.length,
          template: config.template,
          resolution: config.resolution || "1920x1080",
          fileSize: stats.size,
          frames: totalFrames
        },
      });

    } catch (cliError) {
      console.error('CLI approach failed:', cliError);
      
      // **IMPROVED: Better fallback with error details**
      if ((cliError as any)?.signal   === 'SIGTERM' || (cliError as any)?.killed) {
        return NextResponse.json({
          error: "Video rendering timed out",
          suggestion: "Try reducing video duration or ayah count",
          details: {
            signal: (cliError as any).signal,
            killed: (cliError as any).killed,
            timeout: true,
            ayahCount: ayahs.length,
            estimatedDuration: ayahs.length * 5 + 3
          }
        }, { status: 408 }); // Request Timeout
      }
      
      // Method 2: Fallback to programmatic approach
      try {
        console.log('Trying programmatic approach...');
        
        const remotionRenderer = await import('@remotion/renderer');
        const { getCompositions, renderMedia } = remotionRenderer;
        
        const path = await import('path');
        const fs = await import('fs');

        const remotionDir = path.resolve(process.cwd(), 'remotion');
        if (!fs.existsSync(remotionDir)) {
          throw new Error(`Remotion directory not found at: ${remotionDir}`);
        }

        const serveUrl = `file://${remotionDir}`;
        
        console.log('Getting compositions from:', serveUrl);
        
        const compositions = await getCompositions(serveUrl, {
          inputProps: { ayahs, config },
          timeoutInMilliseconds: 30000,
        });

        console.log('Found compositions:', compositions.map(c => c.id));

        let compositionId = "";
        if (config.template === "classic") compositionId = "ClassicTemplate";
        else if (config.template === "modern") compositionId = "ModernTemplate";

        let composition = compositions.find((c) => c.id === compositionId);
        if (!composition) {
          return NextResponse.json({ 
            error: `Composition ${compositionId} not found`,
            availableCompositions: compositions.map(c => c.id)
          }, { status: 400 });
        }

        // **FIXED: Use the same duration calculation**
        const baseDurationPerAyah = config.ayahDuration || 5;
        const titleDuration = config.titleDuration || 2;
        const closingDuration = config.closingDuration || 1;
        const totalDurationSeconds = titleDuration + (ayahs.length * baseDurationPerAyah) + closingDuration;
        const fps = config.fps || 30;
        const totalFrames = totalDurationSeconds * fps;

        composition = {
          ...composition,
          durationInFrames: totalFrames,
        };

        console.log(`Programmatic render: ${totalDurationSeconds}s (${totalFrames} frames) for ${ayahs.length} ayahs`);

        const outputDir = path.join(process.cwd(), 'public', 'videos');
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }

        const videoFileName = `video-${Date.now()}.mp4`;
        const videoPath = path.join(outputDir, videoFileName);

        console.log('Starting programmatic render...');
        
        await renderMedia({
          composition,
          serveUrl,
          codec: 'h264',
          outputLocation: videoPath,
          inputProps: { 
            ayahs, 
            config: {
              ...config,
              totalDurationSeconds,
              totalFrames,
              fps
            }
          },
          imageFormat: 'jpeg',
          overwrite: true,
          concurrency: 2, // **FIXED: Better concurrency for programmatic**
          timeoutInMilliseconds: Math.max(300000, totalDurationSeconds * 15000),
          audioBitrate: '128k',
          crf: 18,
          pixelFormat: 'yuv420p'
        });

        const stats = fs.statSync(videoPath);
        console.log(`Video rendered successfully (programmatic): ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        return NextResponse.json({
          success: true,
          videoUrl: `/videos/${videoFileName}`,
          message: "Video rendered successfully (programmatic)",
          metadata: {
            duration: totalDurationSeconds,
            ayahCount: ayahs.length,
            template: config.template,
            resolution: config.resolution || "1920x1080",
            fileSize: stats.size,
            frames: totalFrames
          },
        });

      } catch (programmaticError) {
        console.error('Programmatic approach also failed:', programmaticError);
        
        return NextResponse.json(
          { 
            error: "Both rendering approaches failed", 
            cliError: (cliError as any).message,
            programmaticError: (programmaticError as any).message,
            suggestion: "Check your Remotion setup, reduce video length, or try with fewer ayahs",
            debug: {
              ayahCount: ayahs.length,
              estimatedDuration: ayahs.length * 5 + 3,
              wasTimeout: (cliError as any).signal === 'SIGTERM'
            }
          }, 
          { status: 500 }
        );
      }
    }

  } catch (error) {
    console.error("Video rendering error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to render video",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}


