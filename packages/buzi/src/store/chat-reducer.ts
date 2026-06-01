import type { ChatAction, ChatState } from "../types/chat"
import type { Message, Part, QuestionRequest, Session } from "@opencode-ai/sdk/v2/client"
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

function removeKeys<T>(items: Record<string, T>, keys: Set<string>) {
  return Object.fromEntries(Object.entries(items).filter(([id]) => !keys.has(id)))
}

function groupQuestions(items: QuestionRequest[]) {
  return items.reduce<Record<string, QuestionRequest[]>>((acc, item) => {
    const list = acc[item.sessionID]
    if (list) list.push(item)
    if (!list) acc[item.sessionID] = [item]
    return acc
  }, {})
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
    case "project.close": {
      const sessionIDs = new Set(
        state.sessions
          .filter((session) => session.projectID === action.projectID || session.directory === action.directory)
          .map((session) => session.id),
      )
      const messageIDs = new Set(
        [...sessionIDs].flatMap((sessionID) => (state.messages[sessionID] ?? []).map((message) => message.id)),
      )
      return {
        ...state,
        sessions: state.sessions.filter((session) => !sessionIDs.has(session.id)),
        messages: removeKeys(state.messages, sessionIDs),
        parts: removeKeys(state.parts, messageIDs),
        temporaryTitles: removeKeys(state.temporaryTitles, sessionIDs),
        sessionStatus: removeKeys(state.sessionStatus, sessionIDs),
        question: removeKeys(state.question, sessionIDs),
        activeSessionID: state.activeSessionID && sessionIDs.has(state.activeSessionID) ? undefined : state.activeSessionID,
      }
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
    case "session.archive":
      return {
        ...state,
        sessions: removeByID(state.sessions, action.sessionID),
        temporaryTitles: removeKey(state.temporaryTitles, action.sessionID),
        sessionStatus: Object.fromEntries(
          Object.entries(state.sessionStatus).filter(([sessionID]) => sessionID !== action.sessionID),
        ),
        question: removeKey(state.question, action.sessionID),
        activeSessionID: state.activeSessionID === action.sessionID ? undefined : state.activeSessionID,
      }
    case "session.remove":
      return {
        ...state,
        sessions: removeByID(state.sessions, action.sessionID),
        temporaryTitles: removeKey(state.temporaryTitles, action.sessionID),
        sessionStatus: Object.fromEntries(
          Object.entries(state.sessionStatus).filter(([sessionID]) => sessionID !== action.sessionID),
        ),
        question: removeKey(state.question, action.sessionID),
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
    case "question.loaded": {
      const grouped = groupQuestions(action.items)
      const next = Object.fromEntries(
        Object.entries(grouped).map(([sessionID, items]) => [sessionID, items.sort((a, b) => cmp(a.id, b.id))]),
      )
      const syncedSessionIDs = new Set(
        state.sessions.filter((session) => session.directory === action.directory).map((session) => session.id),
      )
      return {
        ...state,
        question: {
          ...Object.fromEntries(Object.entries(state.question).filter(([sessionID]) => !syncedSessionIDs.has(sessionID))),
          ...next,
        },
      }
    }
    case "question.upsert": {
      const existing = state.question[action.request.sessionID] ?? []
      const next = upsertByID(existing, action.request).sort((a, b) => cmp(a.id, b.id))
      return { ...state, question: { ...state.question, [action.request.sessionID]: next } }
    }
    case "question.remove": {
      const existing = state.question[action.sessionID]
      if (!existing) return state
      const next = existing.filter((item) => item.id !== action.requestID)
      if (next.length === 0) return { ...state, question: removeKey(state.question, action.sessionID) }
      return { ...state, question: { ...state.question, [action.sessionID]: next } }
    }
  }
}
