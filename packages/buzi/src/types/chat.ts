import type { Message, Part, Session, SessionStatus } from "@opencode-ai/sdk/v2/client"

export type MessagePageItem = {
  info: Message
  parts: Part[]
}

export type ChatState = {
  sessions: Session[]
  sessionStatus: Record<string, SessionStatus>
  messages: Record<string, Message[]>
  parts: Record<string, Part[]>
  activeSessionID?: string
}

export type ChatAction =
  | { type: "sessions.loaded"; sessions: Session[] }
  | { type: "session.active"; sessionID?: string }
  | { type: "session.upsert"; session: Session }
  | { type: "session.remove"; sessionID: string }
  | { type: "session.status"; sessionID: string; status: SessionStatus }
  | { type: "session.status.loaded"; statuses: Record<string, SessionStatus> }
  | { type: "messages.loaded"; sessionID: string; items: MessagePageItem[] }
  | { type: "message.upsert"; message: Message }
  | { type: "message.remove"; sessionID: string; messageID: string }
  | { type: "part.upsert"; part: Part }
  | { type: "part.remove"; messageID: string; partID: string }
  | { type: "part.delta"; messageID: string; partID: string; field: string; delta: string }
