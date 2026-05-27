import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { MoreHorizontal, Trash2 } from "lucide-react"
import type { Agent, Model } from "@opencode-ai/sdk/v2/client"
import { createOpencodeSdk } from "./lib/opencode"
import { makeID, optimisticPartIDPrefix } from "./lib/ids"
import { chatReducer } from "./store/chat-reducer"
import { useOpencodeEvents } from "./hooks/use-opencode-events"
import { ActivityBar, type ActivityID, SidePanel } from "./components/app-shell"
import { SessionsPanel } from "./components/session-list"
import { MessageTimeline } from "./components/message-timeline"
import { Composer } from "./components/composer"

const serverUrl = "http://localhost:4096"
const selectedModelStoragePrefix = "buzi:model-selection:"
const selectedVariantStoragePrefix = "buzi:model-variant:"
const selectedVariantDefaultValue = "__default__"

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

function selectedModelStorageKey(directory: string, sessionID?: string) {
  return `${selectedModelStoragePrefix}${directory}:${sessionID ?? "draft"}`
}

function selectedVariantStorageKey(directory: string, sessionID?: string) {
  return `${selectedVariantStoragePrefix}${directory}:${sessionID ?? "draft"}`
}

function readSelectedModel(directory: string | undefined, sessionID?: string) {
  if (!directory) return undefined
  return window.localStorage.getItem(selectedModelStorageKey(directory, sessionID)) || undefined
}

function writeSelectedModel(directory: string | undefined, value: string, sessionID?: string) {
  if (!directory || !value) return
  window.localStorage.setItem(selectedModelStorageKey(directory, sessionID), value)
}

function readSelectedVariant(directory: string | undefined, sessionID?: string) {
  if (!directory) return undefined
  const value = window.localStorage.getItem(selectedVariantStorageKey(directory, sessionID))
  if (value === null) return undefined
  if (value === selectedVariantDefaultValue) return null
  return value
}

function writeSelectedVariant(directory: string | undefined, value: string | null | undefined, sessionID?: string) {
  if (!directory) return
  const key = selectedVariantStorageKey(directory, sessionID)
  if (value === undefined) {
    window.localStorage.removeItem(key)
    return
  }
  window.localStorage.setItem(key, value ?? selectedVariantDefaultValue)
}

export function App() {
  const queryClient = useQueryClient()
  const [directory, setDirectory] = useState<string>()
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [activeActivity, setActiveActivity] = useState<ActivityID>("sessions")
  const [sidePanelCollapsed, setSidePanelCollapsed] = useState(false)
  const [sessionMenuOpen, setSessionMenuOpen] = useState(false)
  const [selectedModelValue, setSelectedModelValue] = useState("")
  const [selectedVariant, setSelectedVariant] = useState<string | null | undefined>()
  const [restoredModelSessions, setRestoredModelSessions] = useState<Set<string>>(() => new Set())
  const [selectedAgent, setSelectedAgent] = useState("")
  const [stoppingSessionID, setStoppingSessionID] = useState<string>()
  const [state, dispatch] = useReducer(chatReducer, {
    sessions: [],
    sessionStatus: {},
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

  useQuery({
    queryKey: ["session-status", directory],
    enabled,
    queryFn: async () => {
      const result = await sdk.session.status()
      dispatch({ type: "session.status.loaded", statuses: result.data ?? {} })
      return result.data
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

  const activeMessages = state.activeSessionID ? (state.messages[state.activeSessionID] ?? []) : []

  const sessionModelSelection = useMemo(() => {
    for (let index = activeMessages.length - 1; index >= 0; index--) {
      const message = activeMessages[index]
      if (message.role === "user") {
        return {
          model: modelValue(message.model.providerID, message.model.modelID),
          variant: message.model.variant,
        }
      }
    }
  }, [activeMessages])

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
    setSelectedVariant(undefined)
    setSelectedAgent("")
    setRestoredModelSessions(new Set())
  }, [directory])

  useEffect(() => {
    if (modelOptions.length === 0) return
    const availableModel = (value: string | undefined) =>
      value && modelOptions.some((option) => option.value === value) ? value : undefined
    const availableVariant = (model: string | undefined, value: string | null | undefined) => {
      if (!model || !value) return undefined
      const option = modelOptions.find((item) => item.value === model)
      return option?.model.variants && value in option.model.variants ? value : undefined
    }
    const availableVariantOverride = (model: string | undefined, value: string | null | undefined) => {
      if (value === undefined) return undefined
      if (value === null) return null
      return availableVariant(model, value)
    }

    const sessionID = state.activeSessionID
    const storedSessionModel = readSelectedModel(directory, sessionID)
    const storedSessionVariant = readSelectedVariant(directory, sessionID)
    const storedDraftModel = readSelectedModel(directory)
    const storedDraftVariant = readSelectedVariant(directory)
    const defaults = providers.data?.default ?? {}
    const defaultModel =
      modelOptions.find((option) => defaults[option.providerID] === option.modelID) ??
      modelOptions.find((option) => option.model.status === "active") ??
      modelOptions[0]

    const restoredSessionModel = availableModel(sessionModelSelection?.model)
    if (sessionID && !storedSessionModel && !restoredModelSessions.has(sessionID) && restoredSessionModel) {
      const restoredVariant = sessionModelSelection?.variant
        ? availableVariant(restoredSessionModel, sessionModelSelection.variant)
        : null
      writeSelectedModel(directory, restoredSessionModel, sessionID)
      writeSelectedVariant(directory, restoredVariant, sessionID)
      setRestoredModelSessions((current) => new Set(current).add(sessionID))
      if (restoredSessionModel !== selectedModelValue) setSelectedModelValue(restoredSessionModel)
      if (restoredVariant !== selectedVariant) setSelectedVariant(restoredVariant)
      return
    }

    const nextModelValue =
      availableModel(storedSessionModel) ??
      availableModel(storedDraftModel) ??
      defaultModel.value
    const nextVariant =
      (storedSessionVariant !== undefined
        ? availableVariantOverride(nextModelValue, storedSessionVariant)
        : availableVariantOverride(nextModelValue, storedDraftVariant))

    if (nextModelValue !== selectedModelValue) setSelectedModelValue(nextModelValue)
    if (nextVariant !== selectedVariant) setSelectedVariant(nextVariant)
  }, [
    directory,
    modelOptions,
    providers.data?.default,
    restoredModelSessions,
    selectedModelValue,
    selectedVariant,
    sessionModelSelection,
    state.activeSessionID,
  ])

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
    void queryClient.invalidateQueries({ queryKey: ["session-status"] })
    void queryClient.invalidateQueries({ queryKey: ["providers"] })
    void queryClient.invalidateQueries({ queryKey: ["agents"] })
    if (state.activeSessionID) void queryClient.invalidateQueries({ queryKey: ["messages"] })
  }, [queryClient, state.activeSessionID])

  const selectedModel = modelOptions.find((option) => option.value === selectedModelValue)
  const selectedAgentConfig = primaryAgents.find((agent) => agent.name === selectedAgent)
  const variantOptions = useMemo(() => ["default", ...Object.keys(selectedModel?.model.variants ?? {})], [selectedModel])
  const configuredVariant = useMemo(() => {
    if (!selectedModel || !selectedAgentConfig?.variant || !selectedAgentConfig.model) return undefined
    if (selectedAgentConfig.model.providerID !== selectedModel.providerID) return undefined
    if (selectedAgentConfig.model.modelID !== selectedModel.modelID) return undefined
    if (!selectedModel.model.variants?.[selectedAgentConfig.variant]) return undefined
    return selectedAgentConfig.variant
  }, [selectedAgentConfig, selectedModel])
  const currentVariant =
    selectedVariant === null
      ? undefined
      : selectedVariant && variantOptions.includes(selectedVariant)
        ? selectedVariant
        : configuredVariant

  const handleModelChange = useCallback(
    (value: string) => {
      setSelectedModelValue(value)
      writeSelectedModel(directory, value, state.activeSessionID)
      const option = modelOptions.find((item) => item.value === value)
      if (selectedVariant && !option?.model.variants?.[selectedVariant]) {
        setSelectedVariant(undefined)
        writeSelectedVariant(directory, undefined, state.activeSessionID)
      }
    },
    [directory, modelOptions, selectedVariant, state.activeSessionID],
  )

  const handleVariantChange = useCallback(
    (value: string | null | undefined) => {
      setSelectedVariant(value)
      writeSelectedVariant(directory, value, state.activeSessionID)
    },
    [directory, state.activeSessionID],
  )

  const handleSessionSelect = useCallback((sessionID: string) => {
    dispatch({ type: "session.active", sessionID })
    setSelectedModelValue("")
    setSelectedVariant(undefined)
  }, [])

  const handleActivityClick = useCallback(
    (activity: ActivityID) => {
      if (activity === activeActivity) {
        setSidePanelCollapsed((current) => !current)
        return
      }
      setActiveActivity(activity)
      setSidePanelCollapsed(false)
    },
    [activeActivity],
  )

  const openProject = useCallback(() => {
    window.alert("Project picker is not implemented yet.")
  }, [])

  const createSession = useCallback(async () => {
    if (!enabled) return
    const result = await sdk.session.create({ title: "New session" })
    if (!result.data) return
    dispatch({ type: "session.upsert", session: result.data })
    dispatch({ type: "session.active", sessionID: result.data.id })
    refresh()
  }, [enabled, refresh, sdk])

  const deleteActiveSession = useCallback(async () => {
    const sessionID = state.activeSessionID
    if (!sessionID) return
    const session = state.sessions.find((item) => item.id === sessionID)
    const label = session?.title || session?.slug || "this session"
    if (!window.confirm(`Delete "${label}"? This cannot be undone.`)) return

    await sdk.session.delete({ sessionID })
    const nextSession = state.sessions.find((item) => item.id !== sessionID)
    dispatch({ type: "session.remove", sessionID })
    dispatch({ type: "session.active", sessionID: nextSession?.id })
    setSessionMenuOpen(false)
    refresh()
  }, [refresh, sdk, state.activeSessionID, state.sessions])

  const submit = useCallback(
    async (text: string) => {
      if (!enabled) return
      const sessionID = state.activeSessionID ?? (await sdk.session.create({ title: text.slice(0, 64) })).data?.id
      if (!sessionID) return
      dispatch({ type: "session.active", sessionID })
      writeSelectedModel(directory, selectedModelValue, sessionID)
      writeSelectedVariant(directory, selectedVariant, sessionID)
      const model = selectedModel ? { providerID: selectedModel.providerID, modelID: selectedModel.modelID } : undefined
      const agent = selectedAgent || "build"

      const messageID = makeID("message")
      dispatch({ type: "session.status", sessionID, status: { type: "busy" } })
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
              model: { ...(model ?? { providerID: "default", modelID: "default" }), variant: currentVariant },
            },
            parts: [{ id: `${optimisticPartIDPrefix}${makeID("part")}`, sessionID, messageID, type: "text", text }],
          },
        ],
      })

      await sdk.session
        .promptAsync({
          sessionID,
          messageID,
          model,
          agent,
          variant: currentVariant,
          parts: [{ type: "text", text }],
        })
        .catch((error) => {
          dispatch({ type: "session.status", sessionID, status: { type: "idle" } })
          throw error
        })
    },
    [
      directory,
      enabled,
      sdk,
      selectedAgent,
      selectedModel,
      selectedModelValue,
      selectedVariant,
      currentVariant,
      state.activeSessionID,
      state.messages,
      state.parts,
    ],
  )

  const stop = useCallback(async () => {
    const sessionID = state.activeSessionID
    if (!sessionID) return
    setStoppingSessionID(sessionID)
    await sdk.session
      .abort({ sessionID })
      .catch(() => {})
      .finally(() => {
        dispatch({ type: "session.status", sessionID, status: { type: "idle" } })
        setStoppingSessionID(undefined)
      })
  }, [sdk, state.activeSessionID])

  const activeSession =
    state.sessions.find((session) => session.id === state.activeSessionID) ??
    (state.activeSessionID ? undefined : state.sessions[0])
  const activeSessionStatus = state.activeSessionID ? state.sessionStatus[state.activeSessionID] : undefined
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
        <ActivityBar
          activeActivity={activeActivity}
          panelCollapsed={sidePanelCollapsed}
          onActivityClick={handleActivityClick}
        />
        <SidePanel title="Sessions" collapsed={sidePanelCollapsed} onCollapse={() => setSidePanelCollapsed(true)}>
          <SessionsPanel
            sessions={state.sessions}
            directory={directory}
            activeSessionID={state.activeSessionID}
            onSelect={handleSessionSelect}
            onNewProject={openProject}
            onNewSession={createSession}
            loading={sessions.isLoading}
          />
        </SidePanel>
        <section className="relative flex min-w-0 flex-1 flex-col bg-[#fbfbfa]">
          <header className="flex h-11 items-center justify-between border-b border-zinc-200/80 bg-[#fbfbfa] px-4">
            <div className="min-w-0">
              <div className="truncate text-[14px] font-semibold text-zinc-950">
                {activeSession?.title ?? activeSession?.slug ?? "opencode"}
              </div>
            </div>
            <div className="relative">
              <button
                className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
                title="Session actions"
                onClick={() => setSessionMenuOpen((current) => !current)}
                disabled={!state.activeSessionID}
              >
                <MoreHorizontal className="size-4" />
              </button>
              {sessionMenuOpen ? (
                <div className="absolute right-0 top-9 z-20 w-44 rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
                  <button
                    className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-xs text-red-600 hover:bg-red-50"
                    onClick={deleteActiveSession}
                  >
                    <Trash2 className="size-3.5" />
                    Delete session
                  </button>
                </div>
              ) : null}
            </div>
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
            working={activeSessionStatus?.type === "busy"}
            stopping={stoppingSessionID === state.activeSessionID}
            modelOptions={modelOptions}
            selectedModel={selectedModelValue}
            onModelChange={handleModelChange}
            variantOptions={variantOptions}
            selectedVariant={currentVariant}
            onVariantChange={handleVariantChange}
            modelLoading={providers.isLoading}
            agents={primaryAgents}
            selectedAgent={selectedAgent}
            onAgentChange={setSelectedAgent}
            agentLoading={agents.isLoading}
            onSubmit={submit}
            onStop={stop}
          />
        </section>
      </main>
    </div>
  )
}
