import { ChevronDown, ChevronRight, FolderPlus, MessageSquarePlus, Plus } from "lucide-react"
import { useMemo, useState } from "react"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { cn } from "../lib/utils"

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

type ProjectGroup = {
  id: string
  name: string
  sessions: Session[]
}

function projectGroups(sessions: Session[], directory: string | undefined) {
  const groups = new Map<string, ProjectGroup>()
  for (const session of sessions) {
    const key = session.projectID || session.directory || "__current__"
    const existing = groups.get(key)
    if (existing) {
      existing.sessions.push(session)
      continue
    }
    groups.set(key, {
      id: key,
      name: session.directory || directory || "Current project",
      sessions: [session],
    })
  }

  if (groups.size === 0) {
    groups.set("__current__", { id: "__current__", name: directory || "Current project", sessions: [] })
  }

  return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name))
}

export function SessionsPanel(props: {
  sessions: Session[]
  directory?: string
  activeSessionID?: string
  onSelect: (sessionID: string) => void
  onNewProject: () => void
  onNewSession: (projectID?: string) => void
  loading: boolean
  projectLoading?: boolean
}) {
  const groups = useMemo(() => projectGroups(props.sessions, props.directory), [props.directory, props.sessions])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())

  function groupKey(group: ProjectGroup) {
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-zinc-200/80 px-3 py-3">
        <button
          className="flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-xs font-medium text-zinc-600 transition-colors hover:bg-white/70 hover:text-zinc-950 disabled:pointer-events-none disabled:opacity-50"
          onClick={props.onNewProject}
          disabled={props.projectLoading}
        >
          <FolderPlus className="size-4" />
          New Project
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {props.loading ? <div className="px-3 py-4 text-sm text-zinc-500">Loading sessions...</div> : null}
        {groups.map((group) => {
          const key = groupKey(group)
          const isCollapsed = collapsed.has(key)
          return (
            <div key={key} className="mb-2">
              <div className="group flex h-8 items-center gap-1 rounded-md px-1 text-zinc-700 hover:bg-white/70">
                <button
                  className="flex h-7 min-w-0 flex-1 items-center gap-1.5 rounded px-1 text-left"
                  onClick={() => toggleGroup(key)}
                >
                  {isCollapsed ? (
                    <ChevronRight className="size-3.5 shrink-0 text-zinc-500" />
                  ) : (
                    <ChevronDown className="size-3.5 shrink-0 text-zinc-500" />
                  )}
                  <span className="truncate text-xs font-semibold">{group.name}</span>
                </button>
                <button
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 opacity-80 hover:bg-zinc-100 hover:text-zinc-950 group-hover:opacity-100"
                  title="New session"
                  onClick={() => props.onNewSession()}
                >
                  <Plus className="size-3.5" />
                </button>
              </div>
              {!isCollapsed ? (
                <div className="mt-1 space-y-1 pl-5">
                  {group.sessions.map((session) => (
                    <button
                      key={session.id}
                      title={`Last activity: ${subtitle(session)}`}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left transition-colors",
                        props.activeSessionID === session.id
                          ? "bg-white shadow-sm ring-1 ring-zinc-200"
                          : "hover:bg-white/70",
                      )}
                      onClick={() => props.onSelect(session.id)}
                    >
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-900">
                        {title(session)}
                      </span>
                      <span className="shrink-0 text-[11px] text-zinc-500">{relativeTime(sessionTime(session))}</span>
                    </button>
                  ))}
                  {!props.loading && group.sessions.length === 0 ? (
                    <div className="px-2.5 py-2 text-xs text-zinc-500">No sessions</div>
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
