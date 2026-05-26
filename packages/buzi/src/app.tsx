import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { RotateCw } from "lucide-react"
import type { Agent, Model } from "@opencode-ai/sdk/v2/client"
import { createOpencodeSdk } from "./lib/opencode"
import { makeID, optimisticPartIDPrefix } from "./lib/ids"
import { chatReducer } from "./store/chat-reducer"
import { useOpencodeEvents } from "./hooks/use-opencode-events"
import { SessionList } from "./components/session-list"
import { MessageTimeline } from "./components/message-timeline"
import { Composer } from "./components/composer"

const serverUrl = "http://localhost:4096"

type ModelOption = {
  value: string
  providerID: string
  providerName: string
  modelID: string
  model: Model
}

function modelValue(providerID: string, modelID: string) {
  return JSON.stringify({ providerID, modelID })
}

export function App() {
  const queryClient = useQueryClient()
  const [directory, setDirectory] = useState<string>()
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [search, setSearch] = useState("")
  const [selectedModelValue, setSelectedModelValue] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("")
  const [state, dispatch] = useReducer(chatReducer, {
    sessions: [],
    messages: {},
    parts: {},
  })

  const globalSdk = useMemo(() => createOpencodeSdk({ serverUrl }), [])
  const sdk = useMemo(() => createOpencodeSdk({ serverUrl, directory }), [directory])
  const enabled = Boolean(directory)

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const result = await globalSdk.global.health()
      return result.data
    },
    refetchInterval: 10_000,
  })

  const path = useQuery({
    queryKey: ["path"],
    queryFn: async () => {
      const result = await globalSdk.path.get()
      const next = result.data?.directory
      if (next) setDirectory(next)
      return result.data
    },
  })

  const sessions = useQuery({
    queryKey: ["sessions", directory],
    enabled,
    queryFn: async () => {
      const result = await sdk.session.list({ limit: 80 })
      const next = result.data ?? []
      dispatch({ type: "sessions.loaded", sessions: next })
      return next
    },
  })

  const messages = useQuery({
    queryKey: ["messages", directory, state.activeSessionID],
    enabled: enabled && Boolean(state.activeSessionID),
    queryFn: async () => {
      const sessionID = state.activeSessionID!
      const result = await sdk.session.messages({ sessionID, limit: 120 })
      const items = result.data ?? []
      dispatch({ type: "messages.loaded", sessionID, items })
      return items
    },
  })

  const providers = useQuery({
    queryKey: ["providers", directory],
    enabled,
    queryFn: async () => {
      const result = await sdk.provider.list()
      return result.data
    },
  })

  const agents = useQuery({
    queryKey: ["agents", directory],
    enabled,
    queryFn: async () => {
      const result = await sdk.app.agents()
      return result.data ?? []
    },
  })

  const modelOptions = useMemo<ModelOption[]>(() => {
    const data = providers.data
    if (!data) return []

    const connected = new Set(data.connected)
    return data.all
      .filter((provider) => connected.has(provider.id))
      .flatMap((provider) =>
        Object.entries(provider.models).map(([modelID, model]) => ({
          value: modelValue(provider.id, modelID),
          providerID: provider.id,
          providerName: provider.name,
          modelID,
          model,
        })),
      )
      .sort((a, b) => a.providerName.localeCompare(b.providerName) || a.model.name.localeCompare(b.model.name))
  }, [providers.data])

  const primaryAgents = useMemo<Agent[]>(() => {
    return (agents.data ?? [])
      .filter((agent) => !agent.hidden && (agent.mode === "primary" || agent.mode === "all"))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [agents.data])

  useOpencodeEvents({
    sdk: globalSdk,
    directory: directory ?? "",
    dispatch,
    enabled,
    onStatus: setStatus,
  })

  useEffect(() => {
    if (!directory) return
    dispatch({ type: "session.active", sessionID: undefined })
    setSelectedModelValue("")
    setSelectedAgent("")
  }, [directory])

  useEffect(() => {
    if (modelOptions.length === 0) return
    if (modelOptions.some((option) => option.value === selectedModelValue)) return

    const defaults = providers.data?.default ?? {}
    const defaultModel =
      modelOptions.find((option) => defaults[option.providerID] === option.modelID) ??
      modelOptions.find((option) => option.model.status === "active") ??
      modelOptions[0]
    setSelectedModelValue(defaultModel.value)
  }, [modelOptions, providers.data?.default, selectedModelValue])

  useEffect(() => {
    if (primaryAgents.length === 0) return
    if (primaryAgents.some((agent) => agent.name === selectedAgent)) return

    const defaultAgent = primaryAgents.find((agent) => agent.name === "build") ?? primaryAgents[0]
    setSelectedAgent(defaultAgent.name)
  }, [primaryAgents, selectedAgent])

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["health"] })
    void queryClient.invalidateQueries({ queryKey: ["path"] })
    void queryClient.invalidateQueries({ queryKey: ["sessions"] })
    void queryClient.invalidateQueries({ queryKey: ["providers"] })
    void queryClient.invalidateQueries({ queryKey: ["agents"] })
    if (state.activeSessionID) void queryClient.invalidateQueries({ queryKey: ["messages"] })
  }, [queryClient, state.activeSessionID])

  const selectedModel = modelOptions.find((option) => option.value === selectedModelValue)

  const createSession = useCallback(async () => {
    if (!enabled) return
    const result = await sdk.session.create({ title: "New session" })
    if (!result.data) return
    dispatch({ type: "session.upsert", session: result.data })
    dispatch({ type: "session.active", sessionID: result.data.id })
    refresh()
  }, [enabled, refresh, sdk])

  const submit = useCallback(
    async (text: string) => {
      if (!enabled) return
      const sessionID = state.activeSessionID ?? (await sdk.session.create({ title: text.slice(0, 64) })).data?.id
      if (!sessionID) return
      dispatch({ type: "session.active", sessionID })
      const model = selectedModel ? { providerID: selectedModel.providerID, modelID: selectedModel.modelID } : undefined
      const agent = selectedAgent || "build"

      const messageID = makeID("message")
      dispatch({
        type: "messages.loaded",
        sessionID,
        items: [
          ...(state.messages[sessionID] ?? []).map((info) => ({ info, parts: state.parts[info.id] ?? [] })),
          {
            info: {
              id: messageID,
              sessionID,
              role: "user",
              time: { created: Date.now() },
              agent,
              model: model ?? { providerID: "default", modelID: "default" },
            },
            parts: [{ id: `${optimisticPartIDPrefix}${makeID("part")}`, sessionID, messageID, type: "text", text }],
          },
        ],
      })

      await sdk.session.promptAsync({
        sessionID,
        messageID,
        model,
        agent,
        parts: [{ type: "text", text }],
      })
    },
    [enabled, sdk, selectedAgent, selectedModel, state.activeSessionID, state.messages, state.parts],
  )

  const activeMessages = state.activeSessionID ? (state.messages[state.activeSessionID] ?? []) : []
  const activeSession =
    state.sessions.find((session) => session.id === state.activeSessionID) ??
    (state.activeSessionID ? undefined : state.sessions[0])
  const connected = health.data?.healthy === true && status === "connected"
  const connectionText =
    health.isError || path.isError
      ? "Server unavailable"
      : connected
        ? "Connected"
        : status === "connecting"
          ? "Syncing"
          : "Connecting"

  return (
    <div className="h-dvh bg-[#f7f7f5] text-zinc-950">
      <main className="flex h-full min-h-0">
        <SessionList
          sessions={state.sessions}
          activeSessionID={state.activeSessionID}
          search={search}
          setSearch={setSearch}
          onSelect={(sessionID) => dispatch({ type: "session.active", sessionID })}
          onNew={createSession}
          loading={sessions.isLoading}
        />
        <section className="relative flex min-w-0 flex-1 flex-col bg-[#fbfbfa]">
          <header className="flex h-16 items-center justify-between border-b border-zinc-200/80 bg-[#fbfbfa] px-6">
            <div className="min-w-0">
              <div className="truncate text-[15px] font-semibold text-zinc-950">
                {activeSession?.title ?? activeSession?.slug ?? "opencode"}
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-zinc-500">
                <span
                  className={
                    connected
                      ? "size-1.5 rounded-full bg-emerald-500"
                      : status === "connecting"
                        ? "size-1.5 rounded-full bg-amber-500"
                        : "size-1.5 rounded-full bg-zinc-300"
                  }
                />
                <span>{connectionText}</span>
                <span className="text-zinc-300">/</span>
                <span className="truncate">{directory ?? "Detecting workspace..."}</span>
              </div>
            </div>
            <button
              className="inline-flex h-8 items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-xs text-zinc-600 shadow-sm hover:bg-zinc-50"
              onClick={refresh}
            >
              <RotateCw className="size-3.5" />
              Refresh
            </button>
          </header>
          {health.isError || path.isError ? (
            <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Could not connect to opencode at <span className="font-mono">http://localhost:4096</span>.
            </div>
          ) : null}
          <MessageTimeline
            messages={activeMessages}
            parts={state.parts}
            loading={messages.isLoading || path.isLoading || sessions.isLoading}
          />
          <Composer
            disabled={!enabled || health.isError}
            modelOptions={modelOptions}
            selectedModel={selectedModelValue}
            onModelChange={setSelectedModelValue}
            modelLoading={providers.isLoading}
            agents={primaryAgents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            agentLoading={agents.isLoading}
            onSubmit={submit}
          />
        </section>
      </main>
    </div>
  )
}
