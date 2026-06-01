import type { Message, Part, Session } from "@opencode-ai/sdk/v2/client"
import { chatReducer } from "./chat-reducer"
import type { ChatState } from "../types/chat"

declare const expect: {
  (value: unknown): {
    toBe(expected: unknown): void
  }
}
declare const test: (name: string, run: () => void) => void

const session = (input: { id: string; title: string; created: number; updated?: number }) =>
  ({
    id: input.id,
    title: input.title,
    time: { created: input.created, updated: input.updated },
  }) as Session

const projectSession = (input: { id: string; projectID: string; directory: string }) =>
  ({
    id: input.id,
    projectID: input.projectID,
    directory: input.directory,
    title: input.id,
    time: { created: 1 },
  }) as Session

const initial: ChatState = {
  sessions: [],
  sessionStatus: {},
  temporaryTitles: {},
  messages: {},
  parts: {},
  question: {},
}

test("chatReducer keeps a newer session update when an older list load finishes later", () => {
  const state = chatReducer(initial, {
    type: "session.upsert",
    session: session({ id: "ses_1", title: "Updated title", created: 1, updated: 20 }),
  })

  const next = chatReducer(state, {
    type: "sessions.loaded",
    sessions: [session({ id: "ses_1", title: "New session", created: 1, updated: 10 })],
  })

  expect(next.sessions[0]?.title).toBe("Updated title")
})

test("chatReducer keeps explicit draft session active while loading sessions", () => {
  const state = chatReducer(initial, { type: "session.active", sessionID: null })

  const next = chatReducer(state, {
    type: "sessions.loaded",
    sessions: [session({ id: "ses_1", title: "Existing session", created: 1 })],
  })

  expect(next.activeSessionID).toBe(null)
})

test("chatReducer does not auto-select a session when sessions load", () => {
  const next = chatReducer(initial, {
    type: "sessions.loaded",
    sessions: [session({ id: "ses_1", title: "Existing session", created: 1 })],
  })

  expect(next.activeSessionID).toBe(undefined)
})

test("chatReducer removes archived active session", () => {
  const state = chatReducer(
    {
      ...initial,
      sessions: [session({ id: "ses_1", title: "Existing session", created: 1 })],
      activeSessionID: "ses_1",
      temporaryTitles: { ses_1: "Draft title" },
      sessionStatus: { ses_1: { type: "idle" } },
    },
    { type: "session.archive", sessionID: "ses_1" },
  )

  expect(state.sessions.length).toBe(0)
  expect(state.activeSessionID).toBe(undefined)
  expect(state.temporaryTitles.ses_1).toBe(undefined)
  expect(state.sessionStatus.ses_1).toBe(undefined)
})

test("chatReducer closes a project and clears its cached session data", () => {
  const message = { id: "msg_1", sessionID: "ses_1" } as Message
  const part = { id: "prt_1", sessionID: "ses_1", messageID: "msg_1", type: "text", text: "hello" } as Part
  const state = chatReducer(
    {
      ...initial,
      sessions: [
        projectSession({ id: "ses_1", projectID: "proj_1", directory: "/repo/a" }),
        projectSession({ id: "ses_2", projectID: "proj_2", directory: "/repo/b" }),
      ],
      activeSessionID: "ses_1",
      messages: { ses_1: [message] },
      parts: { msg_1: [part] },
      temporaryTitles: { ses_1: "Draft title" },
      sessionStatus: { ses_1: { type: "idle" } },
    },
    { type: "project.close", projectID: "proj_1", directory: "/repo/a" },
  )

  expect(state.sessions.length).toBe(1)
  expect(state.sessions[0]?.id).toBe("ses_2")
  expect(state.activeSessionID).toBe(undefined)
  expect(state.messages.ses_1).toBe(undefined)
  expect(state.parts.msg_1).toBe(undefined)
  expect(state.temporaryTitles.ses_1).toBe(undefined)
  expect(state.sessionStatus.ses_1).toBe(undefined)
})

test("chatReducer keeps temporary title on session created", () => {
  const state = chatReducer(
    chatReducer(initial, { type: "session.temporaryTitle", sessionID: "ses_1", title: "First prompt" }),
    {
      type: "session.upsert",
      source: "created",
      session: session({ id: "ses_1", title: "New session - 2026-05-27T10:00:00.000Z", created: 1 }),
    },
  )

  expect(state.temporaryTitles.ses_1).toBe("First prompt")
})

test("chatReducer clears temporary title when session updated changes title", () => {
  const state = chatReducer(
    {
      ...initial,
      sessions: [session({ id: "ses_1", title: "New session - 2026-05-27T10:00:00.000Z", created: 1 })],
      temporaryTitles: { ses_1: "First prompt" },
    },
    {
      type: "session.upsert",
      source: "updated",
      session: session({ id: "ses_1", title: "Generated title", created: 1, updated: 2 }),
    },
  )

  expect(state.temporaryTitles.ses_1).toBe(undefined)
})

test("chatReducer keeps temporary title when session updated does not change title", () => {
  const state = chatReducer(
    {
      ...initial,
      sessions: [session({ id: "ses_1", title: "New session - 2026-05-27T10:00:00.000Z", created: 1 })],
      temporaryTitles: { ses_1: "First prompt" },
    },
    {
      type: "session.upsert",
      source: "updated",
      session: session({ id: "ses_1", title: "New session - 2026-05-27T10:00:00.000Z", created: 1, updated: 2 }),
    },
  )

  expect(state.temporaryTitles.ses_1).toBe("First prompt")
})
