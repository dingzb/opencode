import type { ChatAction, ChatState } from "../types/chat"
import type { Message, Part, Session } from "@opencode-ai/sdk/v2/client"
import { optimisticPartIDPrefix } from "../lib/ids"

const cmp = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0)

function upsertByID<T extends { id: string }>(items: T[], item: T) {
  const next = items.slice()
  const index = next.findIndex((existing) => existing.id === item.id)
  if (index >= 0) {
    next[index] = item
    return next.sort((a, b) => cmp(a.id, b.id))
  }
  next.push(item)
  return next.sort((a, b) => cmp(a.id, b.id))
}

function removeByID<T extends { id: string }>(items: T[] | undefined, id: string) {
  return (items ?? []).filter((item) => item.id !== id)
}

function removeKey<T>(items: Record<string, T>, key: string) {
  return Object.fromEntries(Object.entries(items).filter(([id]) => id !== key))
}

function updatePart(parts: Part[] | undefined, partID: string, field: string, delta: string) {
  return (parts ?? []).map((part) => {
    if (part.id !== partID) return part
    if (field !== "text") return part
    if (part.type !== "text" && part.type !== "reasoning") return part
    return { ...part, text: `${part.text ?? ""}${delta}` } as Part
  })
}

function sessionTime(session: Session) {
  return session.time.updated ?? session.time.created
}

function newestSession(a: Session, b: Session) {
  return sessionTime(a) > sessionTime(b) ? a : b
}

function mergeLoadedSessions(current: Session[], loaded: Session[]) {
  const loadedIDs = new Set(loaded.map((item) => item.id))
  return [
    ...loaded.map((item) => {
      const existing = current.find((session) => session.id === item.id)
      return existing ? newestSession(existing, item) : item
    }),
    ...current.filter((item) => !loadedIDs.has(item.id)),
  ]
}

function messageByID(state: ChatState, messageID: string) {
  for (const messages of Object.values(state.messages)) {
    const message = messages.find((item) => item.id === messageID)
    if (message) return message
  }
}

function removeOptimisticTextParts(parts: Part[] | undefined) {
  return (parts ?? []).filter((part) => !(part.type === "text" && part.id.startsWith(optimisticPartIDPrefix)))
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "sessions.loaded":
      return {
        ...state,
        sessions: mergeLoadedSessions(state.sessions, action.sessions).sort((a, b) => sessionTime(b) - sessionTime(a)),
      }
    case "session.active":
      return { ...state, activeSessionID: action.sessionID }
    case "session.upsert":
      const existing = state.sessions.find((session) => session.id === action.session.id)
      const clearTemporaryTitle =
        action.source === "updated" && existing !== undefined && existing.title !== action.session.title
      return {
        ...state,
        sessions: upsertByID(state.sessions, action.session).sort((a, b) => sessionTime(b) - sessionTime(a)),
        temporaryTitles: clearTemporaryTitle
          ? removeKey(state.temporaryTitles, action.session.id)
          : state.temporaryTitles,
      }
    case "session.temporaryTitle":
      return {
        ...state,
        temporaryTitles: { ...state.temporaryTitles, [action.sessionID]: action.title },
      }
    case "session.remove":
      return {
        ...state,
        sessions: removeByID(state.sessions, action.sessionID),
        temporaryTitles: removeKey(state.temporaryTitles, action.sessionID),
        sessionStatus: Object.fromEntries(
          Object.entries(state.sessionStatus).filter(([sessionID]) => sessionID !== action.sessionID),
        ),
        activeSessionID: state.activeSessionID === action.sessionID ? undefined : state.activeSessionID,
      }
    case "session.status":
      return {
        ...state,
        sessionStatus: { ...state.sessionStatus, [action.sessionID]: action.status },
      }
    case "session.status.loaded":
      return { ...state, sessionStatus: action.statuses }
    case "messages.loaded": {
      const messages = action.items.map((item) => item.info).sort((a, b) => cmp(a.id, b.id))
      const parts = action.items.reduce<Record<string, Part[]>>((acc, item) => {
        acc[item.info.id] = item.parts.filter((part) => part.type !== "step-start" && part.type !== "step-finish")
        return acc
      }, {})
      return {
        ...state,
        messages: { ...state.messages, [action.sessionID]: messages },
        parts: { ...state.parts, ...parts },
      }
    }
    case "message.upsert": {
      const existing = state.messages[action.message.sessionID] ?? []
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.message.sessionID]: upsertByID(existing, action.message as Message),
        },
      }
    }
    case "message.remove":
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.sessionID]: removeByID(state.messages[action.sessionID], action.messageID),
        },
        parts: Object.fromEntries(Object.entries(state.parts).filter(([messageID]) => messageID !== action.messageID)),
      }
    case "part.upsert": {
      const existing = state.parts[action.part.messageID] ?? []
      const message = messageByID(state, action.part.messageID)
      const parts = message?.role === "user" && action.part.type === "text" ? removeOptimisticTextParts(existing) : existing

      return {
        ...state,
        parts: {
          ...state.parts,
          [action.part.messageID]: upsertByID(parts, action.part),
        },
      }
    }
    case "part.remove":
      return {
        ...state,
        parts: {
          ...state.parts,
          [action.messageID]: removeByID(state.parts[action.messageID], action.partID),
        },
      }
    case "part.delta":
      return {
        ...state,
        parts: {
          ...state.parts,
          [action.messageID]: updatePart(state.parts[action.messageID], action.partID, action.field, action.delta),
        },
      }
  }
}
