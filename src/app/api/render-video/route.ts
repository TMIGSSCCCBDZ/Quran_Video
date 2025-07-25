import { type NextRequest, NextResponse } from "next/server";
import { parseStream } from 'music-metadata';
import fetch from 'node-fetch';
import { getDurationsForUrlsNode } from "@/lib/audio";
import { PrismaClient } from '@prisma/client';

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max execution time

const prisma = new PrismaClient();

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

    // Environment detection - moved outside try-catch blocks for scope access
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    const isServerless = !!(
      process.env.VERCEL || 
      process.env.AWS_LAMBDA_FUNCTION_NAME || 
      process.env.LAMBDA_TASK_ROOT ||
      process.env.AWS_EXECUTION_ENV ||
      process.env.FORCE_SERVERLESS
    );

    console.log('Environment detection:', {
      isProduction,
      isVercel,
      isServerless,
      cwd: process.cwd()
    });
    
    // Limit processing for production to prevent timeouts
    if (isProduction && ayahs.length > 10) {
      return NextResponse.json({ 
        error: "Too many ayahs for production environment",
        suggestion: "Maximum 10 ayahs allowed in production. Consider splitting into smaller videos.",
        maxAllowed: 10,
        received: ayahs.length
      }, { status: 400 });
    }

    // Fix audio bitrate format
    if (config.audioBitrate && typeof config.audioBitrate === 'number') {
      config.audioBitrate = `${Math.round(config.audioBitrate / 1000)}k`;
    }

    try {
      // Dynamic imports for better compatibility
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      const path = await import('path');
      const fs = await import('fs/promises');
      const fsSync = await import('fs');

      // Always use /tmp for temporary files in any environment
      const tempDir = '/tmp/videos';
      
      // Ensure temp directory exists
      try {
        await fs.mkdir(tempDir, { recursive: true });
        console.log('Successfully created temp directory:', tempDir);
      } catch (mkdirError) {
        console.warn('Async mkdir failed, trying sync:', mkdirError);
        try {
          if (!fsSync.existsSync(tempDir)) {
            fsSync.mkdirSync(tempDir, { recursive: true });
            console.log('Successfully created temp directory with sync:', tempDir);
          }
        } catch (syncError) {
          console.error('Both async and sync mkdir failed:', syncError);
          throw new Error(`Cannot create temp directory: ${tempDir}. Error: ${syncError}`);
        }
      }

      const videoFileName = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
      const tempVideoPath = path.join(tempDir, videoFileName);

      // Map template to composition ID
      let compositionId = "";
      if (config.template === "classic") compositionId = "ClassicTemplate";
      else if (config.template === "modern") compositionId = "ModernTemplate";
      else if (config.template === "capcut") compositionId = "CapcutTemplate";
      else {
        return NextResponse.json({ error: "Invalid template specified" }, { status: 400 });
      }

      // Get audio durations with error handling
      let audioDurations: number[] = [];
      try {
        const audioUrls = config.audioUrl || [];
        audioDurations = await getDurationsForUrlsNode(audioUrls);
      } catch (audioError) {
        console.warn('Failed to get audio durations:', audioError);
        // Fallback to default duration
        audioDurations = new Array(ayahs.length).fill(config.ayahDuration || 8);
      }

      // Production-optimized duration calculation
      const baseDurationPerAyah = isProduction ? 6 : 8;
      const titleDuration = config.titleDuration || (isProduction ? 1.5 : 2);
      const closingDuration = config.closingDuration || (isProduction ? 0.5 : 1);
      const fps = config.fps || 30;
      
      const totalAyahSeconds = audioDurations.length === ayahs.length
        ? audioDurations.reduce((sum: any, dur) => sum + (dur || baseDurationPerAyah), 0)
        : ayahs.length * (config.ayahDuration || baseDurationPerAyah);

      const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
      const totalFrames = Math.ceil(totalDurationSeconds * fps);
      
      console.log(`Duration calculation: ${ayahs.length} ayahs ${totalAyahSeconds}s + ${titleDuration}s title + ${closingDuration}s closing = ${totalDurationSeconds}s (${totalFrames} frames at ${fps}fps)`);

      // Create props file in /tmp
      const propsFile = `/tmp/temp-props-${Date.now()}-${Math.random().toString(36).substr(2, 5)}.json`;
      
      const renderProps = {
        ayahs,
        config: {
          ...config,
          totalDurationSeconds,
          totalFrames,
          fps,
          isProduction
        },
        audioDurations
      };
      
      await fs.writeFile(propsFile, JSON.stringify(renderProps));

      console.log('Starting Remotion CLI render...');

      // Production-optimized Remotion command
      const concurrency = isProduction ? 2 : 4;
      const crf = isProduction ? 23 : 18;
      const audioBitrate = isProduction ? '96k' : '128k';
      
      const remotionCommand = [
        'npx remotion render',
        `"${path.join(process.cwd(), 'remotion', 'index.ts')}"`,
        compositionId,
        `"${tempVideoPath}"`,
        `--props="${propsFile}"`,
        '--codec=h264',
        `--concurrency=${concurrency}`,
        `--audio-bitrate=${audioBitrate}`,
        `--crf=${crf}`,
        '--pixel-format=yuv420p',
        '--enforce-audio-track',
        ...(isProduction ? [
          '--disable-web-security',
          '--no-open',
          '--quiet',
        ] : []),
        `--timeout=${Math.floor(Math.max(120000, totalDurationSeconds * 8000))}`
      ].join(' ');

      console.log('Executing command:', remotionCommand);
      
      const timeoutMs = Math.floor(Math.max(
        isProduction ? 120000 : 300000,
        totalDurationSeconds * (isProduction ? 8000 : 15000)
      ));
      
      console.log(`Using timeout: ${timeoutMs / 1000}s for ${totalDurationSeconds}s video`);
      
      const { stdout, stderr } = await execAsync(remotionCommand, {
        timeout: timeoutMs,
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * (isProduction ? 5 : 10),
        killSignal: 'SIGKILL',
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV,
          REMOTION_CONCURRENCY: concurrency.toString(),
        }
      });

      console.log('Remotion stdout:', stdout);
      if (stderr) console.log('Remotion stderr:', stderr);

      // Clean up props file
      try {
        await fs.unlink(propsFile);
      } catch (cleanupError) {
        console.warn('Could not clean up props file:', cleanupError);
      }

      // Check if video was created
      let stats;
      try {
        stats = await fs.stat(tempVideoPath);
      } catch (statError) {
        throw new Error(`Video file was not created at ${tempVideoPath}: ${statError}`);
      }

      console.log(`Video rendered successfully: ${tempVideoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // Read the video file as buffer
      console.log('Reading video file to store in database...');
      const videoBuffer = await fs.readFile(tempVideoPath);
      
      // Store video in database
      console.log('Storing video in database...');
      const videoRecord = await prisma.video.create({
        data: {
          filename: videoFileName,
          originalName: `${config.template}-video-${ayahs.length}-ayahs.mp4`,
          mimeType: 'video/mp4',
          size: stats.size,
          data: videoBuffer,
          metadata: {
            duration: totalDurationSeconds,
            ayahCount: ayahs.length,
            template: config.template,
            resolution: config.resolution || "1920x1080",
            frames: totalFrames,
            createdAt: new Date().toISOString(),
            config: config
          }
        }
      });

      console.log('Video stored in database with ID:', videoRecord.id);

      // Clean up temporary file
      try {
        await fs.unlink(tempVideoPath);
        console.log('Temporary video file cleaned up');
      } catch (cleanupError) {
        console.warn('Could not clean up temporary video file:', cleanupError);
      }

      // Return the database video URL
      const videoUrl = `/api/video/${videoRecord.id}`;

      return NextResponse.json({
        success: true,
        videoUrl,
        videoId: videoRecord.id,
        downloadUrl: `/api/video/${videoRecord.id}/download`,
        message: "Video rendered and stored successfully",
        metadata: {
          id: videoRecord.id,
          duration: totalDurationSeconds,
          ayahCount: ayahs.length,
          template: config.template,
          resolution: config.resolution || "1920x1080",
          fileSize: stats.size,
          frames: totalFrames,
          filename: videoFileName,
          originalName: videoRecord.originalName
        },
      });

    } catch (cliError: any) {
      console.error('CLI approach failed:', cliError);
      
      if (cliError?.signal === 'SIGTERM' || cliError?.killed) {
        return NextResponse.json({
          error: "Video rendering timed out",
          suggestion: "Try reducing video duration, ayah count, or use lower quality settings",
          details: {
            signal: cliError.signal,
            killed: cliError.killed,
            timeout: true,
            ayahCount: ayahs.length,
            estimatedDuration: ayahs.length * 5 + 3,
            environment: process.env.NODE_ENV
          }
        }, { status: 408 });
      }
      
      // Enhanced programmatic fallback (still storing in database)
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

        let composition = compositions.find((c) => c.id === compositionId);
        if (!composition) {
          return NextResponse.json({ 
            error: `Composition ${compositionId} not found`,
            availableCompositions: compositions.map(c => c.id)
          }, { status: 400 });
        }

        const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
        const fps = config.fps || 30;
        const totalFrames = Math.ceil(totalDurationSeconds * fps);

        composition = {
          ...composition,
          durationInFrames: totalFrames,
        };

        const tempDir = '/tmp/videos';
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const videoFileName = `video-${Date.now()}.mp4`;
        const videoPath = path.join(tempDir, videoFileName);

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
            },
            audioDurations
          },
          imageFormat: 'jpeg',
          overwrite: true,
          concurrency: isProduction ? 1 : 2,
          timeoutInMilliseconds: Math.max(180000, totalDurationSeconds * 10000),
          audioBitrate: isProduction ? '96k' : '128k',
          crf: isProduction ? 23 : 18,
          pixelFormat: 'yuv420p'
        });

        const stats = fs.statSync(videoPath);
        console.log(`Video rendered successfully (programmatic): ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

        // Store in database (same as CLI approach)
        const videoBuffer = fs.readFileSync(videoPath);
        
        const videoRecord = await prisma.video.create({
          data: {
            filename: videoFileName,
            originalName: `${config.template}-video-${ayahs.length}-ayahs.mp4`,
            mimeType: 'video/mp4',
            size: stats.size,
            data: videoBuffer,
            metadata: {
              duration: totalDurationSeconds,
              ayahCount: ayahs.length,
              template: config.template,
              resolution: config.resolution || "1920x1080",
              frames: totalFrames,
              createdAt: new Date().toISOString(),
              config: config
            }
          }
        });

        // Clean up temporary file
        fs.unlinkSync(videoPath);

        return NextResponse.json({
          success: true,
          videoUrl: `/api/video/${videoRecord.id}`,
          videoId: videoRecord.id,
          downloadUrl: `/api/video/${videoRecord.id}/download`,
          message: "Video rendered and stored successfully (programmatic)",
          metadata: {
            id: videoRecord.id,
            duration: totalDurationSeconds,
            ayahCount: ayahs.length,
            template: config.template,
            resolution: config.resolution || "1920x1080",
            fileSize: stats.size,
            frames: totalFrames
          },
        });

      } catch (programmaticError: any) {
        console.error('Programmatic approach also failed:', programmaticError);
        
        return NextResponse.json({
          error: "Both rendering approaches failed", 
          cliError: cliError.message,
          programmaticError: programmaticError.message,
          suggestion: "Check your Remotion setup, reduce video length, or try with fewer ayahs.",
          debug: {
            ayahCount: ayahs.length,
            estimatedDuration: ayahs.length * 5 + 3,
            wasTimeout: cliError.signal === 'SIGTERM',
            environment: process.env.NODE_ENV,
            platform: process.platform
          }
        }, { status: 500 });
      }
    }

  } catch (error: any) {
    console.error("Video rendering error:", error);

    return NextResponse.json({
      success: false,
      error: "Failed to render video",
      details: error instanceof Error ? error.message : "Unknown error",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      suggestions: [
        "Check server logs for detailed error information",
        "Ensure all dependencies are properly installed",
        "Verify Remotion configuration is correct",
        "Check database connection and Video model schema"
      ]
    }, { status: 500 });
  } finally {
    // Clean up Prisma connection
    await prisma.$disconnect();
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