import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"

export const defaultServerUrl = "http://localhost:4096"

export type ClientConfig = {
  serverUrl: string
  directory?: string
  username?: string
  password?: string
}

function authToken(input: { username?: string; password: string }) {
  return btoa(`${input.username ?? "opencode"}:${input.password}`)
}

export function createClient(config: ClientConfig) {
  return createOpencodeClient({
    baseUrl: config.serverUrl,
    directory: config.directory,
    throwOnError: true,
    headers: config.password
      ? {
          Authorization: `Basic ${authToken({ username: config.username, password: config.password })}`,
        }
      : undefined,
  })
}

export function formatError(error: unknown) {
  if (error && typeof error === "object" && "data" in error) {
    const data = error.data
    if (data && typeof data === "object" && "message" in data && typeof data.message === "string") return data.message
  }
  if (error instanceof Error) return error.message
  return "Request failed"
}
