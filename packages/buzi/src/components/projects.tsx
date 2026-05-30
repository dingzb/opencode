import { ChevronDown, ChevronRight, Folder, FolderPlus, Folders, LoaderCircle, MessageSquarePlus, Search } from "lucide-react"
import { useMemo, useState } from "react"
import type { Session } from "@opencode-ai/sdk/v2/client"
import type { BuziProject } from "../types/project"
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

export function relativeTime(value: number) {
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

function basename(value: string) {
  return value.replace(/[/\\]+$/, "").split(/[/\\]/).filter(Boolean).at(-1) || value
}

function projectTitle(project: BuziProject) {
  return project.name || basename(project.worktree)
}

function sortSessions(sessions: Session[]) {
  return sessions
    .filter((session) => !session.parentID && !session.time.archived)
    .slice()
    .sort((a, b) => sessionTime(b) - sessionTime(a))
}

function projectSessions(project: BuziProject, sessions: Session[]) {
  return sortSessions(
    sessions.filter(
      (session) =>
        session.projectID === project.id ||
        session.directory === project.worktree,
    ),
  )
}

export function ProjectsPanel(props: {
  projects: BuziProject[]
  sessions: Session[]
  directory?: string
  activeSessionID?: string
  titleForSession?: (session: Session) => string
  isSessionBusy?: (sessionID: string) => boolean
  onSelect: (sessionID: string) => void
  onNewSession: (project: BuziProject) => void
  onAddProject: () => void
  query: string
  onSearchChange: (query: string) => void
  loading: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const projects = useMemo(() => {
    const term = props.query.trim().toLocaleLowerCase()
    return props.projects
      .map((project) => {
        const sessions = projectSessions(project, props.sessions)
        const label = projectTitle(project)
        const matchesProject = !term || label.toLocaleLowerCase().includes(term) || project.worktree.toLocaleLowerCase().includes(term)
        const matchingSessions = term
          ? sessions.filter((session) =>
              (props.titleForSession?.(session) ?? title(session)).toLocaleLowerCase().includes(term),
            )
          : sessions
        return { project, sessions: matchesProject ? sessions : matchingSessions }
      })
      .filter((item) => item.sessions.length > 0 || !term)
      .sort((a, b) => {
        const newestA = a.sessions[0] ? sessionTime(a.sessions[0]) : a.project.time.updated ?? a.project.time.created
        const newestB = b.sessions[0] ? sessionTime(b.sessions[0]) : b.project.time.updated ?? b.project.time.created
        return newestB - newestA
      })
  }, [props.projects, props.sessions, props.titleForSession, props.query])
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set())
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(() => new Set())

  function toggleProject(key: string) {
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
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200/80 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <Folders className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-[13px] font-semibold text-zinc-950">Projects</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
            title="Search projects & chats"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="size-4" />
          </button>
          <button
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
            title="Add project"
            onClick={props.onAddProject}
          >
            <FolderPlus className="size-4" />
          </button>
        </div>
      </div>
      {searchOpen ? (
        <div className="border-b border-zinc-200/80 px-4 py-2">
          <div className="flex h-8 items-center gap-2 rounded-md bg-white px-2 text-zinc-500 ring-1 ring-zinc-200/80">
            <Search className="size-3.5 shrink-0" />
            <input
              className="min-w-0 flex-1 bg-transparent text-xs text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="Search projects & chats"
              value={props.query}
              onChange={(event) => props.onSearchChange(event.target.value)}
              autoFocus
            />
          </div>
        </div>
      ) : null}
      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pl-4 pr-0 py-2">
        {props.loading ? <div className="py-4 text-sm text-zinc-500">Loading projects...</div> : null}
        {projects.map((item) => {
          const isCollapsed = collapsed.has(item.project.id)
          const sessionsExpanded = expandedSessions.has(item.project.id)
          const visibleSessions = sessionsExpanded
            ? item.sessions
            : item.sessions.slice(0, defaultVisibleSessionCount)
          const hasHiddenSessions = item.sessions.length > defaultVisibleSessionCount
          return (
            <div key={item.project.id} className="mb-2">
              <div className="group flex h-8 w-full items-center gap-1 rounded-md text-zinc-700 transition-colors hover:bg-white/70">
                <button
                  className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-left"
                  onClick={() => toggleProject(item.project.id)}
                >
                  {isCollapsed ? <ChevronRight className="size-3.5 shrink-0" /> : <ChevronDown className="size-3.5 shrink-0" />}
                  <Folder className="size-3.5 shrink-0 text-zinc-500" />
                  <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-zinc-900">
                    {projectTitle(item.project)}
                  </span>
                  <span className="shrink-0 text-[11px] text-zinc-500">{item.sessions.length}</span>
                </button>
                <button
                  className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/90 hover:text-zinc-950"
                  title="New Chat"
                  onClick={() => props.onNewSession(item.project)}
                >
                  <MessageSquarePlus className="size-4" />
                </button>
              </div>
              {!isCollapsed ? (
                <div className="mt-1 space-y-1">
                  {visibleSessions.map((session) => (
                    <button
                      key={session.id}
                      title={`Last activity: ${subtitle(session)}`}
                      className={cn(
                        "flex h-8 w-full items-center gap-2 rounded-md pl-8 pr-2.5 text-left transition-colors",
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
                  {!props.loading && item.sessions.length === 0 ? (
                    <div className="py-2 pl-8 text-xs text-zinc-500">No sessions</div>
                  ) : null}
                  {hasHiddenSessions ? (
                    <button
                      className="flex h-7 w-full items-center rounded-md pl-8 pr-2.5 text-left text-xs text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-800"
                      onClick={() => toggleSessionExpansion(item.project.id)}
                    >
                      {sessionsExpanded ? "折叠显示" : `展开显示 ${item.sessions.length - defaultVisibleSessionCount} 个`}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          )
        })}
        {!props.loading && projects.length === 0 ? (
          <div className="py-4 text-sm text-zinc-500">
            No sessions yet. Use <MessageSquarePlus className="mx-1 inline size-3.5" /> on a workspace to create one.
          </div>
        ) : null}
      </div>
    </div>
  )
}
