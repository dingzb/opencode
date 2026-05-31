import { useCallback, useEffect, useMemo, useReducer, useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import type { Agent, Model, Project, Session } from "@opencode-ai/sdk/v2/client"
import { createOpencodeSdk } from "./lib/opencode"
import { makeID, optimisticPartIDPrefix } from "./lib/ids"
import { chatReducer } from "./store/chat-reducer"
import { useOpencodeEvents } from "./hooks/use-opencode-events"
import { LeftSidebar, RightInspector, type SidebarPanel, TitleBar } from "./components/app-shell"
import { ProjectsPanel } from "./components/projects"
import { DialogSelectProjectDirectory } from "./components/dialog-select-project-directory"
import { MessageTimeline } from "./components/message-timeline"
import { Composer } from "./components/composer"
import { ProjectWelcome } from "./components/project-welcome"
import { AppFrame } from "./shell/app-frame"
import { setWindowTitle } from "./runtime/window-actions"
import type { BuziProject } from "./types/project"

const serverUrl = "http://localhost:4096"
const selectedModelStoragePrefix = "buzi:model-selection:"
const selectedVariantStoragePrefix = "buzi:model-variant:"
const selectedVariantDefaultValue = "__default__"
const projectsStorageKey = "buzi:projects:v1"
const activeRouteStorageKey = "buzi:active-route:v1"
const sidebarDefaultWidth = 304

type ModelOption = {
  value: string
  providerID: string
  providerName: string
  modelID: string
  model: Model
}

type ActiveRoute = {
  projectID?: string
  sessionID?: string | null
}

function modelValue(providerID: string, modelID: string) {
  return JSON.stringify({ providerID, modelID })
}

function temporaryTitle(text: string) {
  const title = text.replace(/\s+/g, " ").trim()
  if (title.length <= 64) return title
  return `${title.slice(0, 61)}...`
}

function isStoredProject(value: unknown): value is BuziProject {
  if (!value || typeof value !== "object") return false
  const item = value as Partial<BuziProject>
  return (
    typeof item.id === "string" &&
    typeof item.worktree === "string" &&
    !!item.id &&
    !!item.worktree &&
    typeof item.time?.created === "number" &&
    typeof item.time.updated === "number"
  )
}

function readProjects() {
  try {
    const value = window.localStorage.getItem(projectsStorageKey)
    const parsed: unknown = value ? JSON.parse(value) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter(isStoredProject)
  } catch {
    return []
  }
}

function writeProjects(projects: BuziProject[]) {
  window.localStorage.setItem(projectsStorageKey, JSON.stringify(projects))
}

function isStoredActiveRoute(value: unknown): value is ActiveRoute {
  if (!value || typeof value !== "object") return false
  const item = value as ActiveRoute
  return (
    (item.projectID === undefined || typeof item.projectID === "string") &&
    (item.sessionID === undefined || item.sessionID === null || typeof item.sessionID === "string")
  )
}

function readActiveRoute(): ActiveRoute {
  try {
    const value = window.localStorage.getItem(activeRouteStorageKey)
    const parsed: unknown = value ? JSON.parse(value) : {}
    return isStoredActiveRoute(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeActiveRoute(route: ActiveRoute) {
  if (!route.projectID) {
    window.localStorage.removeItem(activeRouteStorageKey)
    return
  }
  window.localStorage.setItem(activeRouteStorageKey, JSON.stringify(route))
}

function projectRecord(project: Project): BuziProject {
  return {
    id: project.id,
    worktree: project.worktree,
    name: project.name,
    time: {
      created: project.time.created,
      updated: project.time.updated ?? project.time.created,
    },
  }
}

function upsertProject(projects: BuziProject[], project: BuziProject) {
  const index = projects.findIndex((item) => item.id === project.id || item.worktree === project.worktree)
  if (index === -1) return [project, ...projects]
  const next = projects.slice()
  next[index] = {
    ...next[index],
    ...project,
    time: {
      created: next[index].time.created,
      updated: project.time.updated,
    },
  }
  return next
}

function sessionTime(session: Session) {
  return session.time.updated ?? session.time.created
}

function latestSession(sessions: Session[]) {
  return sessions
    .filter((session) => !session.parentID && !session.time.archived)
    .slice()
    .sort((a, b) => sessionTime(b) - sessionTime(a))[0]
}

function projectForSession(projects: BuziProject[], session: Session | undefined) {
  if (!session) return
  return projects.find(
    (project) =>
      project.id === session.projectID ||
      project.worktree === session.directory,
  )
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

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [query])

  return matches
}

export function App() {
  const queryClient = useQueryClient()
  const [initialRoute] = useState(readActiveRoute)
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected")
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<SidebarPanel>("conversations")
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [inspectorOpen, setInspectorOpen] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(sidebarDefaultWidth)
  const [inspectorWidth, setInspectorWidth] = useState(sidebarDefaultWidth)
  const isPhoneOverlayLayout = useMediaQuery("(max-width: 767px)")
  const shouldAutoHideSidebars = useMediaQuery("(max-width: 1280px)")
  const [selectedModelValue, setSelectedModelValue] = useState("")
  const [selectedVariant, setSelectedVariant] = useState<string | null | undefined>()
  const [restoredModelSessions, setRestoredModelSessions] = useState<Set<string>>(() => new Set())
  const [selectedAgent, setSelectedAgent] = useState("")
  const [stoppingSessionID, setStoppingSessionID] = useState<string>()
  const [projects, setProjects] = useState<BuziProject[]>(readProjects)
  const [activeProjectID, setActiveProjectID] = useState(initialRoute.projectID)
  const [projectDialogOpen, setProjectDialogOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [state, dispatch] = useReducer(chatReducer, {
    sessions: [],
    sessionStatus: {},
    temporaryTitles: {},
    messages: {},
    parts: {},
    activeSessionID: initialRoute.sessionID,
  })

  const globalSdk = useMemo(() => createOpencodeSdk({ serverUrl }), [])
  const activeProject = activeProjectID
    ? projects.find((project) => project.id === activeProjectID)
    : undefined
  const activeSession = state.activeSessionID
    ? state.sessions.find((session) => session.id === state.activeSessionID)
    : undefined
  const activeDirectory = activeSession?.directory ?? activeProject?.worktree
  const sdk = useMemo(() => createOpencodeSdk({ serverUrl, directory: activeDirectory }), [activeDirectory])
  const enabled = Boolean(activeDirectory)

  const health = useQuery({
    queryKey: ["health"],
    queryFn: async () => {
      const result = await globalSdk.global.health()
      return result.data
    },
    refetchInterval: 10_000,
  })

  const sessions = useQuery({
    queryKey: ["sessions", projects.map((project) => `${project.id}:${project.worktree}`).join("|")],
    enabled: projects.length > 0,
    queryFn: async () => {
      const next = (
        await Promise.all(
          projects.map(async (project) => {
            const result = await createOpencodeSdk({ serverUrl, directory: project.worktree }).session.list({ limit: 80 })
            return result.data ?? []
          }),
        )
      ).flat()
      dispatch({ type: "sessions.loaded", sessions: next })
      return next
    },
  })

  const recentProjects = useQuery({
    queryKey: ["recent-projects"],
    queryFn: async () => {
      const result = await globalSdk.project.list()
      return result.data ?? []
    },
  })

  const messages = useQuery({
    queryKey: ["messages", activeDirectory, state.activeSessionID],
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
    queryKey: ["session-status", activeDirectory],
    enabled,
    queryFn: async () => {
      const result = await sdk.session.status()
      dispatch({ type: "session.status.loaded", statuses: result.data ?? {} })
      return result.data
    },
  })

  const providers = useQuery({
    queryKey: ["providers", activeDirectory],
    enabled,
    queryFn: async () => {
      const result = await sdk.provider.list()
      return result.data
    },
  })

  const agents = useQuery({
    queryKey: ["agents", activeDirectory],
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
    directory: activeDirectory ?? "",
    dispatch,
    enabled,
    onStatus: setStatus,
  })

  useEffect(() => {
    writeProjects(projects)
  }, [projects])

  useEffect(() => {
    writeActiveRoute({ projectID: activeProjectID, sessionID: state.activeSessionID })
  }, [activeProjectID, state.activeSessionID])

  useEffect(() => {
    if (projects.length === 0) {
      if (activeProjectID !== undefined) setActiveProjectID(undefined)
      return
    }

    if (activeProject && state.activeSessionID === null) return

    if (state.activeSessionID) {
      const project = projectForSession(projects, activeSession)
      if (project) {
        if (project.id !== activeProjectID) setActiveProjectID(project.id)
        return
      }
      if (sessions.isLoading) return
    }

    if (sessions.isLoading) return

    const latest = latestSession(state.sessions)
    if (latest) {
      const project = projectForSession(projects, latest)
      setActiveProjectID(project?.id ?? projects[0].id)
      dispatch({ type: "session.active", sessionID: latest.id })
      return
    }

    setActiveProjectID(activeProject?.id ?? projects[0].id)
    dispatch({ type: "session.active", sessionID: null })
  }, [activeProject, activeProjectID, activeSession, projects, sessions.isLoading, state.activeSessionID, state.sessions])

  useEffect(() => {
    setSelectedModelValue("")
    setSelectedVariant(undefined)
    setSelectedAgent("")
    setRestoredModelSessions(new Set())
  }, [activeDirectory])

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

    const sessionID = state.activeSessionID ?? undefined
    const storedSessionModel = readSelectedModel(activeDirectory, sessionID)
    const storedSessionVariant = readSelectedVariant(activeDirectory, sessionID)
    const storedDraftModel = readSelectedModel(activeDirectory)
    const storedDraftVariant = readSelectedVariant(activeDirectory)
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
      writeSelectedModel(activeDirectory, restoredSessionModel, sessionID)
      writeSelectedVariant(activeDirectory, restoredVariant, sessionID)
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
    activeDirectory,
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
      writeSelectedModel(activeDirectory, value, state.activeSessionID ?? undefined)
      const option = modelOptions.find((item) => item.value === value)
      if (selectedVariant && !option?.model.variants?.[selectedVariant]) {
        setSelectedVariant(undefined)
        writeSelectedVariant(activeDirectory, undefined, state.activeSessionID ?? undefined)
      }
    },
    [activeDirectory, modelOptions, selectedVariant, state.activeSessionID],
  )

  const handleVariantChange = useCallback(
    (value: string | null | undefined) => {
      setSelectedVariant(value)
      writeSelectedVariant(activeDirectory, value, state.activeSessionID ?? undefined)
    },
    [activeDirectory, state.activeSessionID],
  )

  const handleSessionSelect = useCallback((sessionID: string) => {
    const project = projectForSession(projects, state.sessions.find((session) => session.id === sessionID))
    if (project) setActiveProjectID(project.id)
    dispatch({ type: "session.active", sessionID })
    setSelectedModelValue("")
    setSelectedVariant(undefined)
  }, [projects, state.sessions])

  const archiveSession = useCallback(async (session: Session) => {
    dispatch({ type: "session.archive", sessionID: session.id })
    await createOpencodeSdk({ serverUrl, directory: session.directory }).session
      .update({ sessionID: session.id, time: { archived: Date.now() } })
      .catch((error) => {
        dispatch({ type: "session.upsert", session, source: "local" })
        throw error
      })
    void queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }, [queryClient])

  const closeProject = useCallback((project: BuziProject) => {
    setProjects((current) => current.filter((item) => item.id !== project.id && item.worktree !== project.worktree))
    if (activeProjectID === project.id) setActiveProjectID(undefined)
    dispatch({ type: "project.close", projectID: project.id, directory: project.worktree })
    void queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }, [activeProjectID, queryClient])

  const createSession = useCallback((project?: BuziProject) => {
    const nextProject = project ?? activeProject
    if (!nextProject) return
    setActiveProjectID(nextProject.id)
    dispatch({ type: "session.active", sessionID: null })
    setSelectedModelValue("")
    setSelectedVariant(undefined)
    void queryClient.invalidateQueries({ queryKey: ["sessions"] })
  }, [activeProject, queryClient])

  const addProject = useCallback(
    async (nextDirectory: string) => {
      const result = await createOpencodeSdk({ serverUrl, directory: nextDirectory }).project.current()
      const project = result.data
      if (!project) return
      const nextProject = projectRecord(project)
      setProjects((current) => upsertProject(current, nextProject))
      setActiveProjectID(nextProject.id)
      dispatch({ type: "session.active", sessionID: null })
      setProjectDialogOpen(false)
      void queryClient.invalidateQueries({ queryKey: ["sessions"] })
      void queryClient.invalidateQueries({ queryKey: ["recent-projects"] })
    },
    [queryClient],
  )

  const submit = useCallback(
    async (text: string) => {
      if (!enabled) return
      const newSession = state.activeSessionID ? undefined : await sdk.session.create()
      const sessionID = state.activeSessionID ?? newSession?.data?.id
      if (!sessionID) return
      if (newSession?.data) dispatch({ type: "session.upsert", session: newSession.data })
      if (newSession?.data) dispatch({ type: "session.temporaryTitle", sessionID, title: temporaryTitle(text) })
      const project = projectForSession(projects, newSession?.data ?? activeSession)
      if (project) setActiveProjectID(project.id)
      dispatch({ type: "session.active", sessionID })
      writeSelectedModel(activeDirectory, selectedModelValue, sessionID)
      writeSelectedVariant(activeDirectory, selectedVariant, sessionID)
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
      activeDirectory,
      enabled,
      sdk,
      selectedAgent,
      selectedModel,
      selectedModelValue,
      selectedVariant,
      currentVariant,
      activeSession,
      projects,
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

  const sessionTitle = useCallback(
    (session: { id: string; title?: string; slug?: string }) =>
      state.temporaryTitles[session.id] ?? session.title ?? session.slug ?? "New chat",
    [state.temporaryTitles],
  )
  const isSessionBusy = useCallback((sessionID: string) => state.sessionStatus[sessionID]?.type === "busy", [
    state.sessionStatus,
  ])
  const activeSessionStatus = state.activeSessionID ? state.sessionStatus[state.activeSessionID] : undefined
  const connected = health.data?.healthy === true && (!enabled || status === "connected")
  const serverState = health.isError ? "error" : connected ? "connected" : "connecting"
  const title = activeSession ? sessionTitle(activeSession) : activeProject ? "New chat" : "Welcome"
  const windowTitle = [title, activeDirectory].filter(Boolean).join(" - ") || "Buzi"
  const toggleSidebar = useCallback(() => {
    setSidebarOpen((open) => {
      if (isPhoneOverlayLayout && !open) setInspectorOpen(false)
      return !open
    })
  }, [isPhoneOverlayLayout])
  const toggleInspector = useCallback(() => {
    setInspectorOpen((open) => {
      if (isPhoneOverlayLayout && !open) setSidebarOpen(false)
      return !open
    })
  }, [isPhoneOverlayLayout])

  useEffect(() => {
    if (!shouldAutoHideSidebars) return
    setSidebarOpen(false)
    setInspectorOpen(false)
  }, [shouldAutoHideSidebars])

  useEffect(() => {
    if (!isPhoneOverlayLayout) return
    setSidebarOpen(false)
    setInspectorOpen(false)
  }, [isPhoneOverlayLayout])

  useEffect(() => {
    document.title = windowTitle
    void setWindowTitle(windowTitle)
    window.webkit?.messageHandlers?.buziHeader?.postMessage({
      projectPath: activeDirectory ?? "No project selected",
      title,
      serverState,
    })
  }, [activeDirectory, serverState, title, windowTitle])

  useEffect(() => {
    window.addEventListener("buzi:toggle-sidebar", toggleSidebar)
    window.addEventListener("buzi:toggle-inspector", toggleInspector)
    return () => {
      window.removeEventListener("buzi:toggle-sidebar", toggleSidebar)
      window.removeEventListener("buzi:toggle-inspector", toggleInspector)
    }
  }, [toggleInspector, toggleSidebar])

  return (
    <AppFrame>
      {(frameSlots) => (
        <>
          <main className="flex h-full min-h-0 flex-col">
            {!import.meta.env.VITE_BUZI_NATIVE_HEADERBAR ? (
              <TitleBar
                projectPath={activeDirectory ?? ""}
                title={title}
                serverState={serverState}
                sidebarOpen={sidebarOpen}
                inspectorOpen={inspectorOpen}
                frameLeading={frameSlots.leading}
                frameTrailing={frameSlots.trailing}
                className={frameSlots.titleBarClassName}
                dragRegion={frameSlots.dragRegion}
                nativeTitleBar={frameSlots.nativeTitleBar}
                onToggleSidebar={toggleSidebar}
                onToggleInspector={toggleInspector}
              />
            ) : null}
            <div className="flex min-h-0 flex-1">
              {sidebarOpen ? (
                <button
                  className="fixed inset-0 top-12 z-20 bg-zinc-950/20 backdrop-blur-[1px] md:hidden"
                  aria-label="Close sidebar overlay"
                  onClick={() => setSidebarOpen(false)}
                />
              ) : null}
              <LeftSidebar
                activePanel={activeSidebarPanel}
                open={sidebarOpen}
                overlayActive={sidebarOpen && !inspectorOpen}
                width={sidebarWidth}
                onPanelChange={setActiveSidebarPanel}
                onResize={setSidebarWidth}
                conversations={
                  <ProjectsPanel
                    projects={projects}
                    sessions={state.sessions}
                    directory={activeDirectory}
                    activeSessionID={state.activeSessionID ?? undefined}
                    titleForSession={sessionTitle}
                    isSessionBusy={isSessionBusy}
                    onSelect={handleSessionSelect}
                    onArchiveSession={archiveSession}
                    onNewSession={createSession}
                    onCloseProject={closeProject}
                    onAddProject={() => setProjectDialogOpen(true)}
                    query={searchQuery}
                    onSearchChange={setSearchQuery}
                    loading={sessions.isLoading}
                  />
                }
              />
              <section className="relative flex min-w-0 flex-1 flex-col overflow-x-hidden bg-[#fbfbfa]">
                {health.isError ? (
                  <div className="mx-6 mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    Could not connect to opencode at <span className="font-mono">http://localhost:4096</span>.
                  </div>
                ) : null}
                {!activeProject ? (
                  <ProjectWelcome
                    recentProjects={recentProjects.data}
                    loading={recentProjects.isLoading}
                    onAddProject={() => setProjectDialogOpen(true)}
                    onOpenProject={addProject}
                  />
                ) : (
                  <>
                    <MessageTimeline
                      messages={activeMessages}
                      parts={state.parts}
                      loading={state.activeSessionID !== null && (messages.isLoading || sessions.isLoading)}
                      providers={providers.data?.all}
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
                  </>
                )}
              </section>
              {inspectorOpen ? (
                <button
                  className="fixed inset-0 top-12 z-20 bg-zinc-950/20 backdrop-blur-[1px] md:hidden"
                  aria-label="Close inspector overlay"
                  onClick={() => setInspectorOpen(false)}
                />
              ) : null}
              <RightInspector
                open={inspectorOpen}
                overlayActive={inspectorOpen}
                width={inspectorWidth}
                onClose={() => setInspectorOpen(false)}
                onResize={setInspectorWidth}
              />
            </div>
          </main>
          <DialogSelectProjectDirectory
            open={projectDialogOpen}
            sdk={globalSdk}
            projects={projects}
            onClose={() => setProjectDialogOpen(false)}
            onSelect={addProject}
          />
        </>
      )}
    </AppFrame>
  )
}
