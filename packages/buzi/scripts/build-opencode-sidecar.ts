#!/usr/bin/env bun
import { $ } from "bun"
import fs from "fs/promises"
import path from "path"

const __dirname = import.meta.dirname
const opencodeDir = path.resolve(__dirname, "../../opencode")
const binariesDir = path.resolve(__dirname, "../src-tauri/binaries")

const platform = process.platform
const arch = process.arch

const key = `${platform}-${arch}` as keyof typeof OC_BINARY

const OC_BINARY = {
  "darwin-arm64": "opencode-darwin-arm64",
  "darwin-x64": "opencode-darwin-x64",
  "linux-arm64": "opencode-linux-arm64",
  "linux-x64": "opencode-linux-x64",
  "win32-arm64": "opencode-windows-arm64",
  "win32-x64": "opencode-windows-x64",
}

const TARGET_TRIPLE = {
  "darwin-arm64": "aarch64-apple-darwin",
  "darwin-x64": "x86_64-apple-darwin",
  "linux-arm64": "aarch64-unknown-linux-gnu",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "win32-arm64": "aarch64-pc-windows-msvc",
  "win32-x64": "x86_64-pc-windows-msvc",
}

const ocName = OC_BINARY[key]
if (!ocName) {
  console.error(`Unsupported platform: ${key}`)
  process.exit(1)
}

const targetTriple = TARGET_TRIPLE[key]!
const ext = platform === "win32" ? ".exe" : ""
const ocBinPath = path.join(opencodeDir, "dist", ocName, "bin", `opencode${ext}`)
const destName = `opencode-${targetTriple}${ext}`
const destPath = path.join(binariesDir, destName)

let needsBuild = false
try {
  await fs.access(ocBinPath)
  console.log(`opencode binary already exists at ${ocBinPath}, skipping build`)
} catch {
  needsBuild = true
}

if (needsBuild) {
  console.log(`Building opencode for ${key}...`)
  const result =
    await $`bun run ./script/build.ts --single --skip-install --skip-embed-web-ui`.cwd(opencodeDir).nothrow()
  if (result.exitCode !== 0) {
    console.error("Failed to build opencode")
    process.exit(1)
  }
}

const srcStat = await fs.stat(ocBinPath)
await fs.mkdir(binariesDir, { recursive: true })

let skipCopy = false
try {
  const destStat = await fs.stat(destPath)
  if (destStat.size === srcStat.size) {
    console.log(`sidecar binary already up to date, skipping copy`)
    skipCopy = true
  }
} catch {}

if (!skipCopy) {
  try {
    await fs.copyFile(ocBinPath, destPath)
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EBUSY") {
      console.log(`destination locked (process running), skipping copy`)
      skipCopy = true
    } else {
      throw e
    }
  }
}

if (!skipCopy && platform === "darwin") {
  await $`chmod +x ${destPath}`.nothrow()
}

console.log(skipCopy ? `Using existing ${destPath}` : `Copied ${ocBinPath} -> ${destPath}`)
