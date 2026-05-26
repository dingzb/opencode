import type { Message, Part, Session } from "@opencode-ai/sdk/v2/client"

export type MessagePageItem = {
  info: Message
  parts: Part[]
}

export type ChatState = {
  sessions: Session[]
  messages: Record<string, Message[]>
  parts: Record<string, Part[]>
  activeSessionID?: string
}

export type ChatAction =
  | { type: "sessions.loaded"; sessions: Session[] }
  | { type: "session.active"; sessionID?: string }
  | { type: "session.upsert"; session: Session }
  | { type: "session.remove"; sessionID: string }
  | { type: "messages.loaded"; sessionID: string; items: MessagePageItem[] }
  | { type: "message.upsert"; message: Message }
  | { type: "message.remove"; sessionID: string; messageID: string }
  | { type: "part.upsert"; part: Part }
  | { type: "part.remove"; messageID: string; partID: string }
  | { type: "part.delta"; messageID: string; partID: string; field: string; delta: string }
