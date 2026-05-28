export type DesktopPlatform = "darwin" | "win32" | "linux"

export type RuntimePlatform = {
  isTauri: boolean
  os: DesktopPlatform
}

declare global {
  interface Window {
    __TAURI_INTERNALS__?: unknown
  }
}

function detectDesktopOs(): DesktopPlatform {
  const platform = navigator.platform.toLowerCase()
  const userAgent = navigator.userAgent.toLowerCase()

  if (platform.includes("mac") || userAgent.includes("mac os")) return "darwin"
  if (platform.includes("win") || userAgent.includes("windows")) return "win32"
  return "linux"
}

export function getRuntimePlatform(): RuntimePlatform {
  return {
    isTauri: typeof window !== "undefined" && Boolean(window.__TAURI_INTERNALS__),
    os: detectDesktopOs(),
  }
}
