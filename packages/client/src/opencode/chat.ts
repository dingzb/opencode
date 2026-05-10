import type { Agent, Message, Part, ProviderListResponse, TextPartInput } from "@opencode-ai/sdk/v2/client"

const idPrefixes = {
  message: "msg",
  part: "prt",
} as const

const preferredModel = {
  providerID: "deepseek",
  modelID: "deepseek-v4-pro",
}

const idLength = 26
let lastTimestamp = 0
let counter = 0

export type ModelSelection = {
  providerID: string
  modelID: string
  label: string
}

export type MessageView = {
  id: string
  role: "user" | "assistant"
  text: string
  parts: Part[]
  created: number
}

export type MessagePayload = {
  info: {
    id: string
    sessionID?: string
    parentID?: string
    role: "user" | "assistant"
    time?: {
      completed?: number
      created?: number
    }
  }
  parts: Part[]
}

export function modelKey(selection: ModelSelection | undefined) {
  if (!selection) return ""
  return `${selection.providerID}/${selection.modelID}`
}

export function selectDefaultModel(providers: ProviderListResponse | undefined): ModelSelection | undefined {
  const options = modelOptions(providers)
  return (
    options.find(
      (model) => model.providerID === preferredModel.providerID && model.modelID === preferredModel.modelID,
    ) ?? options.at(0)
  )
}

export function modelOptions(providers: ProviderListResponse | undefined) {
  return (
    providers?.all.flatMap((provider) =>
      Object.values(provider.models)
        .filter((model) => model.status !== "deprecated")
        .map((model) => ({
          providerID: provider.id,
          modelID: model.id,
          label: `${provider.name} / ${model.name}`,
        })),
    ) ?? []
  )
}

export function selectDefaultAgent(agents: Pick<Agent, "name" | "mode">[]) {
  return agents.find((agent) => agent.mode === "primary")?.name ?? agents.at(0)?.name
}

export function hasAssistantResponse(messages: MessagePayload[], messageID: string) {
  return messages.some(
    (message) =>
      message.info.role === "assistant" &&
      message.info.parentID === messageID &&
      (!!message.info.time?.completed ||
        message.parts.some((part) => part.type === "text" && part.text.trim().length > 0)),
  )
}

export function makeTextPart(_messageID: string, text: string): TextPartInput {
  return {
    id: ascendingID("part"),
    type: "text",
    text,
  }
}

export function flattenMessages(messages: MessagePayload[]): MessageView[] {
  return messages.map((message) => ({
    id: message.info.id,
    role: message.info.role,
    text: message.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
    parts: message.parts,
    created: message.info.time?.created ?? 0,
  }))
}

export function mergeMessageViews(current: MessageView[], incoming: MessageView[]): MessageView[] {
  return incoming.reduce((result, message) => {
    const index = result.findIndex((item) => item.id === message.id)
    if (index === -1) return [...result, message]
    return result.map((item, currentIndex) => (currentIndex === index ? mergeMessageView(item, message) : item))
  }, current)
}

export function upsertMessageInfo(messages: MessageView[], info: Message): MessageView[] {
  const index = messages.findIndex((message) => message.id === info.id)
  if (index === -1) {
    return [
      ...messages,
      {
        id: info.id,
        role: info.role,
        text: "",
        parts: [],
        created: info.time?.created ?? Date.now(),
      },
    ]
  }

  return messages.map((message, current) =>
    current === index
      ? {
          ...message,
          role: info.role,
          created: info.time?.created ?? message.created,
        }
      : message,
  )
}

export function upsertMessagePart(messages: MessageView[], part: Part): MessageView[] {
  const message = messages.find((item) => item.id === part.messageID)
  if (!message) {
    return [
      ...messages,
      {
        id: part.messageID,
        role: "assistant",
        text: part.type === "text" ? part.text : "",
        parts: [part],
        created: Date.now(),
      },
    ]
  }

  return messages.map((item) => {
    if (item.id !== part.messageID) return item
    const parts = item.parts.some((existing) => existing.id === part.id)
      ? item.parts.map((existing) => (existing.id === part.id ? mergePart(existing, part) : existing))
      : [...item.parts, part]
    return {
      ...item,
      text: parts
        .filter((current) => current.type === "text")
        .map((current) => current.text)
        .join(""),
      parts,
    }
  })
}

export function applyPartDelta(
  messages: MessageView[],
  delta: { messageID: string; partID: string; field: string; delta: string },
): MessageView[] {
  const message = messages.find((item) => item.id === delta.messageID)
  if (!message) {
    return upsertMessagePart(messages, {
      id: delta.partID,
      sessionID: "",
      messageID: delta.messageID,
      type: "text",
      text: delta.field === "text" ? delta.delta : "",
    })
  }

  return messages.map((item) => {
    if (item.id !== delta.messageID) return item
    const existing = item.parts.find((part) => part.id === delta.partID)
    const parts = existing
      ? item.parts.map((part) => (part.id === delta.partID ? appendPartDelta(part, delta) : part))
      : [
          ...item.parts,
          {
            id: delta.partID,
            sessionID: "",
            messageID: delta.messageID,
            type: "text",
            text: delta.field === "text" ? delta.delta : "",
          } satisfies Part,
        ]
    return {
      ...item,
      text: parts
        .filter((part) => part.type === "text")
        .map((part) => part.text)
        .join(""),
      parts,
    }
  })
}

export function messageID() {
  return ascendingID("message")
}

function ascendingID(prefix: keyof typeof idPrefixes) {
  const currentTimestamp = Date.now()
  if (currentTimestamp !== lastTimestamp) {
    lastTimestamp = currentTimestamp
    counter = 0
  }

  counter += 1
  const now = BigInt(currentTimestamp) * BigInt(0x1000) + BigInt(counter)
  const timeBytes = new Uint8Array(6)
  for (let i = 0; i < 6; i += 1) {
    timeBytes[i] = Number((now >> BigInt(40 - 8 * i)) & BigInt(0xff))
  }

  return `${idPrefixes[prefix]}_${bytesToHex(timeBytes)}${randomBase62(idLength - 12)}`
}

function bytesToHex(bytes: Uint8Array) {
  let hex = ""
  for (let i = 0; i < bytes.length; i += 1) {
    hex += (bytes[i] ?? 0).toString(16).padStart(2, "0")
  }
  return hex
}

function randomBase62(length: number) {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
  const bytes = new Uint8Array(length)
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : undefined
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    cryptoObj.getRandomValues(bytes)
  } else {
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  let result = ""
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt((bytes[i] ?? 0) % chars.length)
  }
  return result
}

function appendPartDelta(part: Part, delta: { field: string; delta: string }): Part {
  if (delta.field !== "text") return part
  if (part.type === "text") {
    return {
      ...part,
      text: part.text + delta.delta,
    }
  }
  if (part.type === "reasoning") {
    return {
      ...part,
      text: part.text + delta.delta,
    }
  }
  return part
}

function mergeMessageView(current: MessageView, incoming: MessageView): MessageView {
  const parts = incoming.parts.reduce((result, part) => {
    const index = result.findIndex((item) => item.id === part.id)
    if (index === -1) return [...result, part]
    return result.map((item, currentIndex) => (currentIndex === index ? mergePart(item, part) : item))
  }, current.parts)

  return {
    ...current,
    ...incoming,
    text: parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join(""),
    parts,
  }
}

function mergePart(current: Part, incoming: Part): Part {
  if (current.type !== incoming.type) return incoming
  if (current.type === "text" && incoming.type === "text") {
    return {
      ...incoming,
      text: longest(current.text, incoming.text),
    }
  }
  if (current.type === "reasoning" && incoming.type === "reasoning") {
    return {
      ...incoming,
      text: longest(current.text, incoming.text),
    }
  }
  if (current.type === "tool" && incoming.type === "tool") {
    return toolStatusRank(current.state.status) > toolStatusRank(incoming.state.status) ? current : incoming
  }
  return incoming
}

function longest(current: string, incoming: string) {
  return current.length > incoming.length ? current : incoming
}

function toolStatusRank(status: "pending" | "running" | "completed" | "error") {
  if (status === "pending") return 0
  if (status === "running") return 1
  return 2
}
