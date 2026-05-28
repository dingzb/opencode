import { getRuntimePlatform } from "./platform"

async function currentWindow() {
  if (!getRuntimePlatform().isTauri) return undefined
  const { getCurrentWindow } = await import("@tauri-apps/api/window")
  return getCurrentWindow()
}

export async function minimizeWindow() {
  await currentWindow().then((window) => window?.minimize())
}

export async function toggleMaximizeWindow() {
  await currentWindow().then((window) => window?.toggleMaximize())
}

export async function startWindowDrag() {
  await currentWindow().then((window) => window?.startDragging())
}

export async function closeWindow() {
  await currentWindow().then((window) => window?.close())
}
