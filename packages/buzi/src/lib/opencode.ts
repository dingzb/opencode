import { createOpencodeClient } from "@opencode-ai/sdk/v2/client"

export type OpencodeSettings = {
  serverUrl: string
  directory?: string
  username?: string
  password?: string
}

export function createOpencodeSdk(input: OpencodeSettings) {
  const headers = input.password
    ? {
        Authorization: `Basic ${btoa(`${input.username || "opencode"}:${input.password}`)}`,
      }
    : undefined

  return createOpencodeClient({
    baseUrl: input.serverUrl.replace(/\/+$/, ""),
    directory: input.directory || undefined,
    headers,
    throwOnError: true,
  })
}

export type OpencodeSdk = ReturnType<typeof createOpencodeSdk>
