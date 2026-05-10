import { describe, expect, test } from "bun:test"
import { hasAssistantResponse, makeTextPart, messageID, selectDefaultAgent, type MessagePayload } from "./chat"

const serverUrl = process.env.OPENCODE_SERVER_URL ?? "http://localhost:4096"
const directory = process.env.OPENCODE_DIRECTORY ?? "D:\\work\\opensource\\opencode"
const model = {
  providerID: "deepseek",
  modelID: "deepseek-v4-pro",
}

async function waitForResponse(input: {
  client: {
    session: {
      messages: (parameters: { sessionID: string; directory: string; limit: number }) => Promise<{ data?: unknown }>
    }
  }
  sessionID: string
  messageID: string
}) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    const response = await input.client.session.messages({
      sessionID: input.sessionID,
      directory,
      limit: 20,
    })
    const messages = (response.data ?? []) as MessagePayload[]
    if (hasAssistantResponse(messages, input.messageID)) return messages
    await Bun.sleep(1000)
  }
  throw new Error("Timed out waiting for assistant response")
}

describe("opencode server contract", () => {
  test("covers the chat page API flow", async () => {
    const { createClient } = await import("./client")
    const client = createClient({ serverUrl, directory })
    await client.global.health()

    const [providers, agents, sessions] = await Promise.all([
      client.provider.list(),
      client.app.agents(),
      client.session.list({ directory, limit: 5 }),
    ])

    expect(providers.data?.all.some((provider) => provider.id === model.providerID)).toBe(true)
    expect(
      providers.data?.all.some((provider) => provider.id === model.providerID && !!provider.models[model.modelID]),
    ).toBe(true)
    expect(agents.data?.length).toBeGreaterThan(0)
    expect(Array.isArray(sessions.data)).toBe(true)

    const agent = selectDefaultAgent(agents.data ?? []) ?? "build"
    const created = await client.session.create({
      directory,
      agent,
      model: {
        id: model.modelID,
        providerID: model.providerID,
      },
    })
    expect(created.data?.id).toMatch(/^ses_/)

    const sessionID = created.data!.id
    const eventAbort = new AbortController()
    const events = await client.global.event({ signal: eventAbort.signal })
    const eventPromise = (async () => {
      for await (const event of events.stream) {
        if (event.payload.type === "message.part.updated" || event.payload.type === "message.updated") return event
      }
    })()

    const id = messageID()
    await client.session.promptAsync({
      sessionID,
      directory,
      agent,
      model,
      messageID: id,
      parts: [makeTextPart(id, "Reply with exactly ok and do not use tools.")],
    })

    const messages = await waitForResponse({ client, sessionID, messageID: id })
    eventAbort.abort()
    await eventPromise.catch(() => undefined)

    expect(messages.some((message) => message.info.id === id && message.info.role === "user")).toBe(true)
    expect(
      messages.some(
        (message) =>
          message.info.role === "assistant" &&
          message.info.parentID === id &&
          message.parts.some((part) => part.type === "text" && part.text.trim().length > 0),
      ),
    ).toBe(true)
  })
})
