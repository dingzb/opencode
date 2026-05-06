import type { Agent, Part, ProviderListResponse, TextPartInput } from "@opencode-ai/sdk/v2/client"

export type ModelSelection = {
  providerID: string
  modelID: string
  label: string
}

export type MessageView = {
  id: string
  role: "user" | "assistant"
  text: string
  created: number
}

export type MessagePayload = {
  info: {
    id: string
    sessionID?: string
    role: "user" | "assistant"
    time?: {
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
  return providers?.all
    .flatMap((provider) =>
      Object.values(provider.models)
        .filter((model) => model.status !== "deprecated")
        .map((model) => ({
          providerID: provider.id,
          modelID: model.id,
          label: `${provider.name} / ${model.name}`,
        })),
    )
    .at(0)
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

export function makeTextPart(messageID: string, text: string): TextPartInput {
  return {
    id: `${messageID}-text`,
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
    created: message.info.time?.created ?? 0,
  }))
}

export function messageID() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `msg-${crypto.randomUUID()}`
  return `msg-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
