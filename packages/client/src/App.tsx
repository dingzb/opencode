import type { Agent, ProviderListResponse, Session } from "@opencode-ai/sdk/v2/client"
import { useEffect, useMemo, useRef, useState } from "react"
import { Sidebar } from "./components/Sidebar"
import { TopBar } from "./components/TopBar"
import { Conversation } from "./components/Conversation"
import { Composer } from "./components/Composer"
import { createClient, defaultServerUrl, formatError } from "./opencode/client"
import {
  flattenMessages,
  makeTextPart,
  messageID,
  modelKey,
  modelOptions,
  selectDefaultAgent,
  selectDefaultModel,
  type MessagePayload,
  type MessageView,
  type ModelSelection,
} from "./opencode/chat"

const defaultDirectory = "D:\\work\\opensource\\opencode"

type ConnectionStatus = "connecting" | "ready" | "streaming" | "error"

export function App() {
  const [serverUrl] = useState(defaultServerUrl)
  const [directory] = useState(defaultDirectory)
  const [status, setStatus] = useState<ConnectionStatus>("connecting")
  const [error, setError] = useState("")
  const [providers, setProviders] = useState<ProviderListResponse>()
  const [agents, setAgents] = useState<Agent[]>([])
  const [sessions, setSessions] = useState<Session[]>([])
  const [activeSessionID, setActiveSessionID] = useState("")
  const [messages, setMessages] = useState<MessageView[]>([])
  const [selectedModel, setSelectedModel] = useState<ModelSelection>()
  const [selectedAgent, setSelectedAgent] = useState("")
  const [draft, setDraft] = useState("")
  const refreshTimer = useRef<number | undefined>(undefined)

  const client = useMemo(() => createClient({ serverUrl, directory }), [serverUrl, directory])
  const models = useMemo(() => modelOptions(providers), [providers])
  const activeSession = sessions.find((session) => session.id === activeSessionID)

  const refreshMessages = async (sessionID: string) => {
    const response = await client.session.messages({ sessionID, limit: 80 })
    setMessages(flattenMessages((response.data ?? []) as MessagePayload[]))
  }

  const refreshSessions = async () => {
    const response = await client.session.list({ limit: 50 })
    setSessions((response.data ?? []).filter((session) => !!session?.id))
  }

  useEffect(() => {
    const abort = new AbortController()
    setStatus("connecting")
    setError("")

    async function bootstrap() {
      try {
        await client.global.health({ signal: abort.signal })
        const [providerResponse, agentResponse, sessionResponse] = await Promise.all([
          client.provider.list(undefined, { signal: abort.signal }),
          client.app.agents(undefined, { signal: abort.signal }),
          client.session.list({ limit: 50 }, { signal: abort.signal }),
        ])
        if (abort.signal.aborted) return

        setProviders(providerResponse.data)
        setAgents(agentResponse.data ?? [])
        setSessions((sessionResponse.data ?? []).filter((session) => !!session?.id))
        setSelectedModel(selectDefaultModel(providerResponse.data))
        setSelectedAgent(selectDefaultAgent(agentResponse.data ?? []) ?? "")
        setActiveSessionID(sessionResponse.data?.at(0)?.id ?? "")
        setStatus("ready")
      } catch (err) {
        if (abort.signal.aborted) return
        setError(formatError(err))
        setStatus("error")
      }
    }

    void bootstrap()
    return () => abort.abort()
  }, [client])

  useEffect(() => {
    if (!activeSessionID) {
      setMessages([])
      return
    }
    const abort = new AbortController()
    refreshMessages(activeSessionID).catch((err) => {
      if (abort.signal.aborted) return
      setError(formatError(err))
    })
    return () => abort.abort()
  }, [activeSessionID])

  useEffect(() => {
    const abort = new AbortController()

    async function listen() {
      try {
        const events = await client.global.event({ signal: abort.signal })
        for await (const event of events.stream) {
          if (abort.signal.aborted) return
          if (!activeSessionID) continue
          const payload = event.payload
          if (payload.type !== "message.part.updated" && payload.type !== "message.updated") continue
          window.clearTimeout(refreshTimer.current)
          refreshTimer.current = window.setTimeout(() => {
            refreshMessages(activeSessionID).catch((err) => setError(formatError(err)))
          }, 80)
        }
      } catch (err) {
        if (!abort.signal.aborted) setError(formatError(err))
      }
    }

    void listen()
    return () => {
      abort.abort()
      window.clearTimeout(refreshTimer.current)
    }
  }, [client, activeSessionID])

  const createSession = async () => {
    setStatus("connecting")
    setError("")
    try {
      const response = await client.session.create({
        agent: selectedAgent || undefined,
        model: selectedModel
          ? {
              id: selectedModel.modelID,
              providerID: selectedModel.providerID,
            }
          : undefined,
      })
      const session = response.data
      if (!session) return
      setSessions((current) => [session, ...current.filter((item) => item.id !== session.id)])
      setActiveSessionID(session.id)
      setMessages([])
      setStatus("ready")
    } catch (err) {
      setError(formatError(err))
      setStatus("error")
    }
  }

  const send = async () => {
    const text = draft.trim()
    if (!text || !selectedModel || !selectedAgent) return

    const sessionID = activeSessionID || (await client.session.create().then((response) => response.data?.id ?? ""))
    if (!sessionID) return
    if (!activeSessionID) {
      setActiveSessionID(sessionID)
      await refreshSessions()
    }

    const id = messageID()
    setDraft("")
    setStatus("streaming")
    setMessages((current) => [
      ...current,
      {
        id,
        role: "user",
        text,
        created: Date.now(),
      },
    ])

    try {
      await client.session.promptAsync({
        sessionID,
        agent: selectedAgent,
        model: {
          providerID: selectedModel.providerID,
          modelID: selectedModel.modelID,
        },
        messageID: id,
        parts: [makeTextPart(id, text)],
      })
      await refreshMessages(sessionID)
      await refreshSessions()
      setStatus("ready")
    } catch (err) {
      setError(formatError(err))
      setStatus("error")
      setDraft(text)
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        sessions={sessions}
        activeSessionID={activeSessionID}
        serverUrl={serverUrl}
        directory={directory}
        status={status}
        onNewSession={createSession}
        onSelectSession={setActiveSessionID}
      />
      <section className="workspace">
        <TopBar
          agents={agents}
          models={models}
          selectedAgent={selectedAgent}
          selectedModelKey={modelKey(selectedModel)}
          sessionTitle={activeSession?.title ?? "New session"}
          status={status}
          onSelectAgent={setSelectedAgent}
          onSelectModel={(key) => setSelectedModel(models.find((model) => modelKey(model) === key))}
        />
        <Conversation error={error} messages={messages} status={status} />
        <Composer
          value={draft}
          disabled={status === "connecting" || status === "streaming"}
          canSend={!!selectedAgent && !!selectedModel && draft.trim().length > 0}
          selectedAgent={selectedAgent}
          selectedModel={selectedModel?.label ?? "No model"}
          onChange={setDraft}
          onSubmit={send}
        />
      </section>
    </div>
  )
}
