import type { Event } from "@opencode-ai/sdk/v2/client"

export function isActiveSessionEvent(event: Event, sessionID: string) {
  if (!("properties" in event)) return false
  if (!event.properties || typeof event.properties !== "object") return false
  if (!("sessionID" in event.properties)) return false
  return event.properties.sessionID === sessionID
}
