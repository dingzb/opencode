/// <reference types="vite/client" />

interface Window {
  webkit?: {
    messageHandlers?: {
      buziHeader?: {
        postMessage: (message: { projectPath: string; title: string; serverState: string }) => void
      }
    }
  }
}
