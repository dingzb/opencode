import { useEffect } from "react"
import type { ChatAction } from "../types/chat"
import type { OpencodeSdk } from "../lib/opencode"
import type { Event } from "@opencode-ai/sdk/v2/client"

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
type DeltaAction = Extract<ChatAction, { type: "part.delta" }>

function toAction(event: Event): ChatAction | undefined {
  switch (event.type) {
    case "session.created":
      return { type: "session.upsert", session: event.properties.info, source: "created" }
    case "session.updated":
      if (event.properties.info.time.archived) return { type: "session.archive", sessionID: event.properties.info.id }
      return { type: "session.upsert", session: event.properties.info, source: "updated" }
    case "session.deleted":
      return { type: "session.remove", sessionID: event.properties.info.id }
    case "session.status":
      return { type: "session.status", sessionID: event.properties.sessionID, status: event.properties.status }
    case "message.updated":
      return { type: "message.upsert", message: event.properties.info }
    case "message.removed":
      return { type: "message.remove", sessionID: event.properties.sessionID, messageID: event.properties.messageID }
    case "message.part.updated":
      return { type: "part.upsert", part: event.properties.part }
    case "message.part.removed":
      return { type: "part.remove", messageID: event.properties.messageID, partID: event.properties.partID }
    case "message.part.delta":
      return {
        type: "part.delta",
        messageID: event.properties.messageID,
        partID: event.properties.partID,
        field: event.properties.field,
        delta: event.properties.delta,
      }
    case "question.asked":
      return { type: "question.upsert", request: event.properties }
    case "question.replied":
    case "question.rejected":
      return { type: "question.remove", sessionID: event.properties.sessionID, requestID: event.properties.requestID }
  }
}

export function useOpencodeEvents(input: {
  sdk: OpencodeSdk
  directory: string
  dispatch: React.Dispatch<ChatAction>
  enabled: boolean
  onStatus: (status: "connecting" | "connected" | "disconnected") => void
}) {
  useEffect(() => {
    if (!input.enabled) return

    const controller = new AbortController()
    const pendingDeltas = new Map<string, DeltaAction>()
    let flushFrame: number | undefined

    const flushDeltas = () => {
      if (flushFrame !== undefined) {
        window.cancelAnimationFrame(flushFrame)
        flushFrame = undefined
      }
      if (pendingDeltas.size === 0) return
      const actions = Array.from(pendingDeltas.values())
      pendingDeltas.clear()
      for (const action of actions) input.dispatch(action)
    }

    const scheduleDelta = (action: DeltaAction) => {
      const key = `${action.messageID}:${action.partID}:${action.field}`
      const existing = pendingDeltas.get(key)
      pendingDeltas.set(key, existing ? { ...existing, delta: `${existing.delta}${action.delta}` } : action)
      if (flushFrame !== undefined) return
      flushFrame = window.requestAnimationFrame(flushDeltas)
    }

    const dispatchAction = (action: ChatAction) => {
      if (action.type === "part.delta") {
        scheduleDelta(action)
        return
      }
      flushDeltas()
      input.dispatch(action)
    }

    const run = async () => {
      while (!controller.signal.aborted) {
        input.onStatus("connecting")
        try {
          const events = await input.sdk.global.event({
            signal: controller.signal,
            onSseError(error) {
              if (!controller.signal.aborted) console.error("[opencode:event]", error)
            },
          })

          input.onStatus("connected")
          for await (const event of events.stream) {
            if (controller.signal.aborted) return
            if ((event.directory ?? "global") !== input.directory) continue
            const payload = event.payload as Event
            const action = toAction(payload)
            if (action) dispatchAction(action)
          }
        } catch (error) {
          if (!controller.signal.aborted) console.error("[opencode:event]", error)
        }
        input.onStatus("disconnected")
        await delay(500)
      }
    }

    void run()

    return () => {
      controller.abort()
      flushDeltas()
      input.onStatus("disconnected")
    }
  }, [input.sdk, input.directory, input.dispatch, input.enabled, input.onStatus])
}
