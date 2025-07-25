import { Config } from "@remotion/cli/config"

// Video rendering configuration
Config.setVideoImageFormat("jpeg")
Config.setOverwriteOutput(true)
Config.setPixelFormat("yuv420p")
Config.setConcurrency(2)
Config.setCodec("h264")
Config.setCrf(18)
Config.setImageSequence(false)

// Performance optimizations
Config.setChromiumOpenGlRenderer("egl")
Config.setChromiumHeadlessMode(true)

// Audio settings
Config.setAudioCodec("aac")
Config.setAudioBitrate("128000")

export default Config
