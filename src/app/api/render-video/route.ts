import { type NextRequest, NextResponse } from "next/server";
import { parseStream } from 'music-metadata';
import fetch from 'node-fetch';
import { getDurationsForUrlsNode } from "@/lib/audio";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max execution time

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

    // Production environment checks
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = process.env.VERCEL === '1';
    
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

      // Detect serverless environment more reliably
      const isServerless = !!(
        process.env.VERCEL || 
        process.env.AWS_LAMBDA_FUNCTION_NAME || 
        process.env.LAMBDA_TASK_ROOT ||
        process.env.AWS_EXECUTION_ENV ||
        !fsSync.existsSync(path.join(process.cwd(), 'public'))
      );

      console.log('Environment detection:', {
        isProduction,
        isVercel,
        isServerless,
        cwd: process.cwd(),
        publicExists: fsSync.existsSync(path.join(process.cwd(), 'public'))
      });

      // Use /tmp directory for serverless environments, local public for development
      const outputDir = isServerless 
        ? '/tmp/videos' 
        : path.join(process.cwd(), 'public', 'videos');
      
      console.log('Using output directory:', outputDir);
      
      // Ensure output directory exists with better error handling
      try {
        await fs.mkdir(outputDir, { recursive: true });
        console.log('Successfully created output directory:', outputDir);
      } catch (mkdirError) {
        console.warn('Async mkdir failed, trying sync:', mkdirError);
        // Try with sync version as fallback
        try {
          if (!fsSync.existsSync(outputDir)) {
            fsSync.mkdirSync(outputDir, { recursive: true });
            console.log('Successfully created output directory with sync:', outputDir);
          }
        } catch (syncError) {
          console.error('Both async and sync mkdir failed:', syncError);
          throw new Error(`Cannot create output directory: ${outputDir}. Error: ${syncError}`);
        }
      }

      const videoFileName = `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
      const outputPath = path.join(outputDir, videoFileName);

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
      const baseDurationPerAyah = isProduction ? 6 : 8; // Shorter in production
      const titleDuration = config.titleDuration || (isProduction ? 1.5 : 2);
      const closingDuration = config.closingDuration || (isProduction ? 0.5 : 1);
      const fps = config.fps || 30;
      
      const totalAyahSeconds = audioDurations.length === ayahs.length
        ? audioDurations.reduce((sum: any, dur) => sum + (dur || baseDurationPerAyah), 0)
        : ayahs.length * (config.ayahDuration || baseDurationPerAyah);

      const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
      const totalFrames = Math.ceil(totalDurationSeconds * fps);
      
      console.log(`Duration calculation: ${ayahs.length} ayahs ${totalAyahSeconds}s + ${titleDuration}s title + ${closingDuration}s closing = ${totalDurationSeconds}s (${totalFrames} frames at ${fps}fps)`);

      // Create props file in /tmp for serverless
      const propsFile = isServerless 
        ? `/tmp/temp-props-${Date.now()}.json`
        : path.join(process.cwd(), 'temp-props.json');
      
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
      const concurrency = isProduction ? 2 : 4; // Lower concurrency in production
      const crf = isProduction ? 23 : 18; // Higher compression in production
      const audioBitrate = isProduction ? '96k' : '128k'; // Lower bitrate in production
      
      const remotionCommand = [
        'npx remotion render',
        `"${path.join(process.cwd(), 'remotion', 'index.ts')}"`,
        compositionId,
        `"${outputPath}"`,
        `--props="${propsFile}"`,
        '--codec=h264',
        `--concurrency=${concurrency}`,
        `--audio-bitrate=${audioBitrate}`,
        `--crf=${crf}`,
        '--pixel-format=yuv420p',
        '--enforce-audio-track',
        ...(isProduction ? [
          '--disable-web-security', // For production environments
          '--no-open', // Don't try to open browser
          '--quiet', // Reduce log output
        ] : []),
        `--timeout=${Math.floor(Math.max(120000, totalDurationSeconds * 8000))}` // Shorter timeout in production
      ].join(' ');

      console.log('Executing command:', remotionCommand);
      
      // Production-optimized timeout
      const timeoutMs = Math.floor(Math.max(
        isProduction ? 120000 : 300000, // 2min prod vs 5min dev
        totalDurationSeconds * (isProduction ? 8000 : 15000)
      ));
      
      console.log(`Using timeout: ${timeoutMs / 1000}s for ${totalDurationSeconds}s video`);
      
      const { stdout, stderr } = await execAsync(remotionCommand, {
        timeout: timeoutMs,
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * (isProduction ? 5 : 10), // Smaller buffer in production
        killSignal: 'SIGKILL',
        env: {
          ...process.env,
          NODE_ENV: process.env.NODE_ENV,
          // Add any additional environment variables needed for Remotion
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
        stats = await fs.stat(outputPath);
      } catch (statError) {
        throw new Error(`Video file was not created at ${outputPath}: ${statError}`);
      }

      console.log(`Video rendered successfully: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

      // For production/serverless, you might need to upload to cloud storage
      // and return the cloud URL instead of local path
      const videoUrl = isServerless 
        ? await uploadToCloudStorage(outputPath, videoFileName) // You'll need to implement this
        : `/videos/${videoFileName}`;

      return NextResponse.json({
        success: true,
        videoUrl,
        message: "Video rendered successfully",
        metadata: {
          duration: totalDurationSeconds,
          ayahCount: ayahs.length,
          template: config.template,
          resolution: config.resolution || "1920x1080",
          fileSize: stats.size,
          frames: totalFrames,
          environment: isProduction ? 'production' : 'development'
        },
      });

    } catch (cliError: any) {
      console.error('CLI approach failed:', cliError);
      
      // Enhanced error handling for production
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
      
      // Enhanced programmatic fallback
      try {
        console.log('Trying programmatic approach...');
        
        // Only try programmatic approach in development or specific environments
        if (isServerless && !process.env.ALLOW_PROGRAMMATIC_RENDER) {
          throw new Error('Programmatic rendering not supported in serverless environment');
        }
        
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

        let composition = compositions.find((c) => c.id === compositionId);
        if (!composition) {
          return NextResponse.json({ 
            error: `Composition ${compositionId} not found`,
            availableCompositions: compositions.map(c => c.id)
          }, { status: 400 });
        }

        // Use the same duration calculation
        const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
        const fps = config.fps || 30;
        const totalFrames = Math.ceil(totalDurationSeconds * fps);

        composition = {
          ...composition,
          durationInFrames: totalFrames,
        };

        console.log(`Programmatic render: ${totalDurationSeconds}s (${totalFrames} frames) for ${ayahs.length} ayahs`);

        const outputDir = isServerless ? '/tmp/videos' : path.join(process.cwd(), 'public', 'videos');
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

      } catch (programmaticError: any) {
        console.error('Programmatic approach also failed:', programmaticError);
        
        return NextResponse.json({
          error: "Both rendering approaches failed", 
          cliError: cliError.message,
          programmaticError: programmaticError.message,
          suggestion: "Check your Remotion setup, reduce video length, or try with fewer ayahs. Consider using a background job queue for heavy processing.",
          debug: {
            ayahCount: ayahs.length,
            estimatedDuration: ayahs.length * 5 + 3,
            wasTimeout: cliError.signal === 'SIGTERM',
            environment: process.env.NODE_ENV,
            platform: process.platform,
            isVercel: process.env.VERCEL === '1'
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
        "Consider using a background job queue for heavy processing",
        "Check memory and CPU limits in production environment"
      ]
    }, { status: 500 });
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

// Helper function for cloud storage upload (implement based on your needs)
async function uploadToCloudStorage(filePath: string, fileName: string): Promise<string> {
  // Implement upload to AWS S3, Cloudinary, or other cloud storage
  // This is a placeholder - you'll need to implement based on your cloud provider
  
  // Example for AWS S3:
  /*
  const AWS = require('aws-sdk');
  const fs = require('fs');
  
  const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
  });
  
  const fileContent = fs.readFileSync(filePath);
  
  const params = {
    Bucket: process.env.S3_BUCKET_NAME,
    Key: `videos/${fileName}`,
    Body: fileContent,
    ContentType: 'video/mp4'
  };
  
  const result = await s3.upload(params).promise();
  
  // Clean up local file
  fs.unlinkSync(filePath);
  
  return result.Location;
  */
  
  // For now, return local path (you'll need to implement actual upload)
  return `/videos/${fileName}`;
}
// import { type NextRequest, NextResponse } from "next/server";
// import { parseStream } from 'music-metadata';
// import fetch from 'node-fetch';
// import { getDurationsForUrlsNode } from "@/lib/audio";

// export const runtime = "nodejs";

// export async function POST(request: NextRequest) {
//   try {
//     console.log('Starting video render process...');

    
//     const { ayahs, config } = await request.json();
//     console.log('Received data:', { ayahCount: ayahs?.length, template: config?.template });

//     // Validate input
//     if (!ayahs || !Array.isArray(ayahs) || ayahs.length === 0) {
//       return NextResponse.json({ error: "Invalid ayahs data provided" }, { status: 400 });
//     }
//     if (!config || !config.template) {
//       return NextResponse.json({ error: "Invalid video configuration provided" }, { status: 400 });
//     }

//     // Fix audio bitrate format
//     if (config.audioBitrate && typeof config.audioBitrate === 'number') {
//       config.audioBitrate = `${Math.round(config.audioBitrate / 1000)}k`;
//     }
  
//     try {
//       const { exec } = await import('child_process');
//       const { promisify } = await import('util');
//       const execAsync = promisify(exec);
//       const path = await import('path');
//       const fs = await import('fs');

//       // Ensure output directory exists
//       const outputDir = path.join(process.cwd(), 'public', 'videos');
//       if (!fs.existsSync(outputDir)) {
//         fs.mkdirSync(outputDir, { recursive: true });
//       }

//       const videoFileName = `video-${Date.now()}.mp4`;
//       const outputPath = path.join(outputDir, videoFileName);

//       // Map template to composition ID
//       let compositionId = "";
//       if (config.template === "classic") compositionId = "ClassicTemplate";
//       else if (config.template === "modern") compositionId = "ModernTemplate";
//       else if (config.template === "capcut") compositionId = "CapcutTemplate";
//       else {
//         return NextResponse.json({ error: "Invalid template specified" }, { status: 400 });
//       }

//       // 1. Get the audio URLs (from config or ayahs)
//       const audioUrls = config.audioUrl || []; // or however you build your ayah audio URLs

//       // 2. Fetch durations
//       const audioDurations = await getDurationsForUrlsNode(audioUrls);

//       // 3. Pass audioDurations as a prop to Remotion
//       const baseDurationPerAyah =  8; // Reduced from 8 to 5 seconds
//       const titleDuration = config.titleDuration || 2; // Reduced from 3 to 2 seconds
//       const closingDuration = config.closingDuration || 1; // Reduced from 2 to 1 second
//       const fps = config.fps || 30;
//       const totalAyahSeconds = audioDurations.length === ayahs.length
//         ? audioDurations.reduce((sum:any, dur) => sum + (dur || 8), 0)
//         : ayahs.length * (config.ayahDuration || 8);

//       const totalDurationSeconds = titleDuration + totalAyahSeconds + closingDuration;
//       const totalFrames = Math.ceil(totalDurationSeconds * fps);
      
//       console.log(`Duration calculation: ${ayahs.length} ayahs ${totalAyahSeconds}s + ${titleDuration}s title + ${closingDuration}s closing = ${totalDurationSeconds}s (${totalFrames} frames at ${fps}fps)`);

//       // Create props file with corrected duration
//       const propsFile = path.join(process.cwd(), 'temp-props.json');
//       const renderProps = {
//         ayahs,
//         config: {
//           ...config,
//           totalDurationSeconds,
//           totalFrames,
//           fps
//         },
//         audioDurations // <-- pass as top-level prop!
//       };
      
//       fs.writeFileSync(propsFile, JSON.stringify(renderProps));

//       console.log('Starting Remotion CLI render...');

//       // **FIXED: Improved Remotion command with better settings**
//       const remotionCommand = [
//         'npx remotion render',
//         `"${path.join(process.cwd(), 'remotion', 'index.ts')}"`,
//         compositionId,
//         `"${outputPath}"`,
//         `--props="${propsFile}"`,
//         '--codec=h264',
//         '--concurrency=4', // **FIXED: Increased concurrency for faster rendering**
//         '--audio-bitrate=128k',
//         '--crf=18', // **ADDED: Better video quality**
//         '--pixel-format=yuv420p', // **ADDED: Better compatibility**
//         '--enforce-audio-track', // **ADDED: Ensure audio track**
//         `--timeout=${Math.floor(Math.max(300000, totalDurationSeconds * 10000))}` // Ensure integer
//       ].join(' ');

//       console.log('Executing command:', remotionCommand);
      
//       // **FIXED: Increased timeout and better error handling**
//       const timeoutMs = Math.floor(Math.max(300000, totalDurationSeconds * 15000)); // Ensure integer
//       console.log(`Using timeout: ${timeoutMs / 1000}s for ${totalDurationSeconds}s video`);
      
//       const { stdout, stderr } = await execAsync(remotionCommand, {
//         timeout: timeoutMs,
//         cwd: process.cwd(),
//         maxBuffer: 1024 * 1024 * 10, // **ADDED: Increased buffer size**
//         killSignal: 'SIGKILL' // **ADDED: More forceful kill signal**
//       });

//       console.log('Remotion stdout:', stdout);
//       if (stderr) console.log('Remotion stderr:', stderr);

//       // Clean up props file
//       if (fs.existsSync(propsFile)) {
//         fs.unlinkSync(propsFile);
//       }

//       // Check if video was created
//       if (!fs.existsSync(outputPath)) {
//         throw new Error('Video file was not created');
//       }

//       // **ADDED: Get actual file size for verification**
//       const stats = fs.statSync(outputPath);
//       console.log(`Video rendered successfully: ${outputPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

//       return NextResponse.json({
//         success: true,
//         videoUrl: `/videos/${videoFileName}`,
//         message: "Video rendered successfully",
//         metadata: {
//           duration: totalDurationSeconds,
//           ayahCount: ayahs.length,
//           template: config.template,
//           resolution: config.resolution || "1920x1080",
//           fileSize: stats.size,
//           frames: totalFrames
//         },
//       });

//     } catch (cliError) {
//       console.error('CLI approach failed:', cliError);
      
//       // **IMPROVED: Better fallback with error details**
//       if ((cliError as any)?.signal   === 'SIGTERM' || (cliError as any)?.killed) {
//         return NextResponse.json({
//           error: "Video rendering timed out",
//           suggestion: "Try reducing video duration or ayah count",
//           details: {
//             signal: (cliError as any).signal,
//             killed: (cliError as any).killed,
//             timeout: true,
//             ayahCount: ayahs.length,
//             estimatedDuration: ayahs.length * 5 + 3
//           }
//         }, { status: 408 }); // Request Timeout
//       }
      
//       // Method 2: Fallback to programmatic approach
//       try {
//         console.log('Trying programmatic approach...');
        
//         const remotionRenderer = await import('@remotion/renderer');
//         const { getCompositions, renderMedia } = remotionRenderer;
        
//         const path = await import('path');
//         const fs = await import('fs');

//         const remotionDir = path.resolve(process.cwd(), 'remotion');
//         if (!fs.existsSync(remotionDir)) {
//           throw new Error(`Remotion directory not found at: ${remotionDir}`);
//         }

//         const serveUrl = `file://${remotionDir}`;
        
//         console.log('Getting compositions from:', serveUrl);
        
//         const compositions = await getCompositions(serveUrl, {
//           inputProps: { ayahs, config },
//           timeoutInMilliseconds: 30000,
//         });

//         console.log('Found compositions:', compositions.map(c => c.id));

//         let compositionId = "";
//         if (config.template === "classic") compositionId = "ClassicTemplate";
//         else if (config.template === "modern") compositionId = "ModernTemplate";

//         let composition = compositions.find((c) => c.id === compositionId);
//         if (!composition) {
//           return NextResponse.json({ 
//             error: `Composition ${compositionId} not found`,
//             availableCompositions: compositions.map(c => c.id)
//           }, { status: 400 });
//         }

//         // **FIXED: Use the same duration calculation**
//         const baseDurationPerAyah = config.ayahDuration || 5;
//         const titleDuration = config.titleDuration || 2;
//         const closingDuration = config.closingDuration || 1;
//         const totalDurationSeconds = titleDuration + (ayahs.length * baseDurationPerAyah) + closingDuration;
//         const fps = config.fps || 30;
//         const totalFrames = totalDurationSeconds * fps;

//         composition = {
//           ...composition,
//           durationInFrames: totalFrames,
//         };

//         console.log(`Programmatic render: ${totalDurationSeconds}s (${totalFrames} frames) for ${ayahs.length} ayahs`);

//         const outputDir = path.join(process.cwd(), 'public', 'videos');
//         if (!fs.existsSync(outputDir)) {
//           fs.mkdirSync(outputDir, { recursive: true });
//         }

//         const videoFileName = `video-${Date.now()}.mp4`;
//         const videoPath = path.join(outputDir, videoFileName);

//         console.log('Starting programmatic render...');
        
//         await renderMedia({
//           composition,
//           serveUrl,
//           codec: 'h264',
//           outputLocation: videoPath,
//           inputProps: { 
//             ayahs, 
//             config: {
//               ...config,
//               totalDurationSeconds,
//               totalFrames,
//               fps
//             }
//           },
//           imageFormat: 'jpeg',
//           overwrite: true,
//           concurrency: 2, // **FIXED: Better concurrency for programmatic**
//           timeoutInMilliseconds: Math.max(300000, totalDurationSeconds * 15000),
//           audioBitrate: '128k',
//           crf: 18,
//           pixelFormat: 'yuv420p'
//         });

//         const stats = fs.statSync(videoPath);
//         console.log(`Video rendered successfully (programmatic): ${videoPath} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

//         return NextResponse.json({
//           success: true,
//           videoUrl: `/videos/${videoFileName}`,
//           message: "Video rendered successfully (programmatic)",
//           metadata: {
//             duration: totalDurationSeconds,
//             ayahCount: ayahs.length,
//             template: config.template,
//             resolution: config.resolution || "1920x1080",
//             fileSize: stats.size,
//             frames: totalFrames
//           },
//         });

//       } catch (programmaticError) {
//         console.error('Programmatic approach also failed:', programmaticError);
        
//         return NextResponse.json(
//           { 
//             error: "Both rendering approaches failed", 
//             cliError: (cliError as any).message,
//             programmaticError: (programmaticError as any).message,
//             suggestion: "Check your Remotion setup, reduce video length, or try with fewer ayahs",
//             debug: {
//               ayahCount: ayahs.length,
//               estimatedDuration: ayahs.length * 5 + 3,
//               wasTimeout: (cliError as any).signal === 'SIGTERM'
//             }
//           }, 
//           { status: 500 }
//         );
//       }
//     }

//   } catch (error) {
//     console.error("Video rendering error:", error);

//     return NextResponse.json(
//       {
//         success: false,
//         error: "Failed to render video",
//         details: error instanceof Error ? error.message : "Unknown error",
//         timestamp: new Date().toISOString(),
//       },
//       { status: 500 },
//     );
//   }
// }

// export async function OPTIONS() {
//   return new NextResponse(null, {
//     status: 200,
//     headers: {
//       "Access-Control-Allow-Origin": "*",
//       "Access-Control-Allow-Methods": "POST, OPTIONS",
//       "Access-Control-Allow-Headers": "Content-Type",
//     },
//   });
// }


