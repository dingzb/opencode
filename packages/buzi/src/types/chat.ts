import type { Message, Part, Session, SessionStatus } from "@opencode-ai/sdk/v2/client"

export type MessagePageItem = {
  info: Message
  parts: Part[]
}

export type ChatState = {
  sessions: Session[]
  sessionStatus: Record<string, SessionStatus>
  temporaryTitles: Record<string, string>
  messages: Record<string, Message[]>
  parts: Record<string, Part[]>
  activeSessionID?: string | null
}

export type ChatAction =
  | { type: "sessions.loaded"; sessions: Session[] }
  | { type: "project.close"; projectID: string; directory: string }
  | { type: "session.active"; sessionID?: string | null }
  | { type: "session.upsert"; session: Session; source?: "created" | "updated" | "local" }
  | { type: "session.temporaryTitle"; sessionID: string; title: string }
  | { type: "session.archive"; sessionID: string }
  | { type: "session.remove"; sessionID: string }
  | { type: "session.status"; sessionID: string; status: SessionStatus }
  | { type: "session.status.loaded"; statuses: Record<string, SessionStatus> }
  | { type: "messages.loaded"; sessionID: string; items: MessagePageItem[] }
  | { type: "message.upsert"; message: Message }
  | { type: "message.remove"; sessionID: string; messageID: string }
  | { type: "part.upsert"; part: Part }
  | { type: "part.remove"; messageID: string; partID: string }
  | { type: "part.delta"; messageID: string; partID: string; field: string; delta: string }
