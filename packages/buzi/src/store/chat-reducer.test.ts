import type { Session } from "@opencode-ai/sdk/v2/client"
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

const initial: ChatState = {
  sessions: [],
  sessionStatus: {},
  temporaryTitles: {},
  messages: {},
  parts: {},
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
