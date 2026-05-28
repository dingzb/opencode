import { LoaderCircle, MessageSquarePlus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { cn } from "../lib/utils"

const defaultVisibleSessionCount = 5

function title(session: Session) {
  return session.title || session.slug || session.id
}

function subtitle(session: Session) {
  const date = new Date(session.time.updated ?? session.time.created)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

function sessionTime(session: Session) {
  return session.time.updated ?? session.time.created
}

function relativeTime(value: number) {
  const seconds = Math.max(0, Math.floor((Date.now() - value) / 1000))
  const minute = 60
  const hour = minute * 60
  const day = hour * 24
  const month = day * 30
  const year = day * 365

  if (seconds < minute) return "now"
  if (seconds < hour) return `${Math.floor(seconds / minute)}m`
  if (seconds < day) return `${Math.floor(seconds / hour)}h`
  if (seconds < month) {
    const days = Math.floor(seconds / day)
    const hours = Math.floor((seconds % day) / hour)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
  if (seconds < year) return `${Math.floor(seconds / month)}mo`
  return `${Math.floor(seconds / year)}y`
}

type SessionGroup = {
  id: string
  name: string
  sessions: Session[]
}

function startOfDay(value: number) {
  const date = new Date(value)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function timeGroups(sessions: Session[]) {
  const now = startOfDay(Date.now())
  const day = 24 * 60 * 60 * 1000
  const groups: SessionGroup[] = [
    { id: "today", name: "Today", sessions: [] },
    { id: "yesterday", name: "Yesterday", sessions: [] },
    { id: "previous-7-days", name: "Previous 7 Days", sessions: [] },
    { id: "earlier", name: "Earlier", sessions: [] },
  ]

  for (const session of sessions) {
    const age = now - startOfDay(sessionTime(session))
    const group =
      age < day ? groups[0] : age < day * 2 ? groups[1] : age < day * 8 ? groups[2] : groups[3]
    group.sessions.push(session)
  }

  return groups.filter((group) => group.sessions.length > 0)
}

export function SessionsPanel(props: {
  sessions: Session[]
  directory?: string
  activeSessionID?: string
  titleForSession?: (session: Session) => string
  isSessionBusy?: (sessionID: string) => boolean
  onSelect: (sessionID: string) => void
  onNewSession: (projectID?: string) => void
  loading: boolean
}) {
  const [query, setQuery] = useState("")
  const filteredSessions = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    if (!term) return props.sessions
    return props.sessions.filter((session) => {
      const label = props.titleForSession?.(session) ?? title(session)
      return label.toLocaleLowerCase().includes(term)
    })
  }, [props.sessions, props.titleForSession, query])
  const groups = useMemo(() => timeGroups(filteredSessions), [filteredSessions])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => new Set())

  function groupKey(group: SessionGroup) {
    return group.id
  }

  function toggleGroup(key: string) {
    setCollapsed((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleSessionExpansion(key: string) {
    setExpandedSessions((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-2 border-b border-zinc-200/80 px-3 py-3">
        <div className="flex h-8 items-center gap-2 rounded-md bg-white px-2 text-zinc-500 ring-1 ring-zinc-200/80">
          <Search className="size-3.5 shrink-0" />
          <input
            className="min-w-0 flex-1 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
            placeholder="Search sessions"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <button
          className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium text-zinc-600 transition-colors hover:bg-white/70 hover:text-zinc-950"
          onClick={() => props.onNewSession()}
        >
          <MessageSquarePlus className="size-4" />
          New Session
        </button>
      </div>
      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto px-1 py-2">
        {props.loading ? <div className="px-3 py-4 text-sm text-zinc-500">Loading sessions...</div> : null}
        {groups.map((group) => {
          const key = groupKey(group)
          const isCollapsed = collapsed.has(key)
          const sessionsExpanded = expandedSessions.has(key)
          const visibleSessions = sessionsExpanded
            ? group.sessions
            : group.sessions.slice(0, defaultVisibleSessionCount)
          const hasHiddenSessions = group.sessions.length > defaultVisibleSessionCount
          return (
            <div key={key} className="mb-2">
              <div className="group flex h-8 items-center gap-1 px-2 text-zinc-700">
                <button
                  className="flex h-7 min-w-0 flex-1 items-center rounded px-1 text-left"
                  onClick={() => toggleGroup(key)}
                >
                  <span className="truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-500">
                    {group.name}
                  </span>
                </button>
              </div>
              {!isCollapsed ? (
                <div className="mt-1 space-y-1">
                  {visibleSessions.map((session) => (
                    <button
                      key={session.id}
                      title={`Last activity: ${subtitle(session)}`}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left transition-colors",
                        props.activeSessionID === session.id
                          ? "bg-white"
                          : "hover:bg-white/70",
                      )}
                      onClick={() => props.onSelect(session.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-900">
                        {props.titleForSession?.(session) ?? title(session)}
                      </span>
                      {props.isSessionBusy?.(session.id) ? (
                        <LoaderCircle className="size-3.5 shrink-0 animate-spin text-zinc-500" />
                      ) : (
                        <span className="shrink-0 text-[11px] text-zinc-500">{relativeTime(sessionTime(session))}</span>
                      )}
                    </button>
                  ))}
                  {!props.loading && group.sessions.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-zinc-500">No sessions</div>
                  ) : null}
                  {hasHiddenSessions ? (
                    <button
                      className="flex h-7 w-full items-center rounded-md px-2.5 text-left text-xs text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800"
                      onClick={() => toggleSessionExpansion(key)}
                    >
                      {sessionsExpanded ? "折叠显示" : `展开显示 ${group.sessions.length - defaultVisibleSessionCount} 个`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
        {!props.loading && groups.every((group) => group.sessions.length === 0) ? (
          <div className="px-3 py-4 text-sm text-zinc-500">
            No sessions yet. Use <MessageSquarePlus className="mx-1 inline size-3.5" /> on a workspace to create one.
          </div>
        ) : null}
      </div>
    </div>
  )
}
