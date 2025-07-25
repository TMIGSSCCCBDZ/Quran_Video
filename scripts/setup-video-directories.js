const fs = require("fs")
const path = require("path")

// Create necessary directories for video rendering
const directories = ["public/videos", "public/audio", "remotion/templates", "remotion/assets"]

directories.forEach((dir) => {
  const fullPath = path.join(process.cwd(), dir)
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true })
    console.log(`Created directory: ${dir}`)
  } else {
    console.log(`Directory already exists: ${dir}`)
  }
})

// Create .gitkeep files to ensure directories are tracked
directories.forEach((dir) => {
  const gitkeepPath = path.join(process.cwd(), dir, ".gitkeep")
  if (!fs.existsSync(gitkeepPath)) {
    fs.writeFileSync(gitkeepPath, "")
    console.log(`Created .gitkeep in: ${dir}`)
  }
})

console.log("Video rendering directories setup completed!")
