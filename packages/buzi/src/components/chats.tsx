import { Archive, ChevronDown, ChevronRight, Ellipsis, Folder, FolderOpen, FolderPlus, LoaderCircle, MessageCircle, MessageSquarePlus, Search } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
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

export function ChatsPanel(props: {
  projects: BuziProject[]
  sessions: Session[]
  directory?: string
  activeSessionID?: string
  titleForSession?: (session: Session) => string
  isSessionBusy?: (sessionID: string) => boolean
  onSelect: (sessionID: string) => void
  onArchiveSession: (session: Session) => void
  onNewSession: (project: BuziProject) => void
  onCloseProject: (project: BuziProject) => void
  onAddProject: () => void
  query: string
  onSearchChange: (query: string) => void
  loading: boolean
}) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [projectsSectionCollapsed, setProjectsSectionCollapsed] = useState(false)
  const [globalSectionCollapsed, setGlobalSectionCollapsed] = useState(false)
  const [projectMenuOpen, setProjectMenuOpen] = useState<string>()
  useEffect(() => {
    if (!projectMenuOpen) return
    function closeProjectMenu(event: PointerEvent) {
      if (event.target instanceof Element && event.target.closest("[data-project-menu]")) return
      setProjectMenuOpen(undefined)
    }
    document.addEventListener("pointerdown", closeProjectMenu)
    return () => document.removeEventListener("pointerdown", closeProjectMenu)
  }, [projectMenuOpen])

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

  function renderSessionRow(session: Session) {
    return (
      <div
        key={session.id}
        title={`Last activity: ${subtitle(session)}`}
        className={cn(
          "group/session flex h-8 w-full items-center gap-2 rounded-md pl-8 pr-1.5 text-left transition-colors",
          props.activeSessionID === session.id
            ? "bg-white"
            : "hover:bg-white/70",
        )}
      >
        <button
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
          onClick={() => props.onSelect(session.id)}
        >
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-zinc-900">
            {props.titleForSession?.(session) ?? title(session)}
          </span>
          <span className="flex h-6 shrink-0 items-center group-hover/session:hidden group-focus-within/session:hidden">
            {props.isSessionBusy?.(session.id) ? (
              <LoaderCircle className="size-3.5 shrink-0 animate-spin text-zinc-500" />
            ) : (
              <span className="shrink-0 text-[11px] text-zinc-500">{relativeTime(sessionTime(session))}</span>
            )}
          </span>
        </button>
        <button
          className="hidden size-6 shrink-0 items-center justify-center rounded-md text-zinc-400 hover:bg-white/90 hover:text-zinc-950 group-hover/session:flex group-focus-within/session:flex"
          title="Archive chat"
          onClick={() => props.onArchiveSession(session)}
        >
          <Archive className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-9 shrink-0 items-center justify-between border-b border-zinc-200/80 px-4">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-[13px] font-semibold text-zinc-950">Chats</div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
            title="Search projects & chats"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search className="size-4" />
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
      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto pl-2.5 pr-0 py-2">
        <div className="mb-1 flex h-8 items-center justify-between rounded-md hover:bg-white/70">
          <button
            className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-xs font-semibold text-zinc-500 hover:text-zinc-950"
            onClick={() => setProjectsSectionCollapsed(!projectsSectionCollapsed)}
            aria-expanded={!projectsSectionCollapsed}
          >
            <span className="truncate font-bold">Projects</span>
            {projectsSectionCollapsed ? (
              <ChevronRight className="size-3.5 shrink-0" />
            ) : (
              <ChevronDown className="size-3.5 shrink-0" />
            )}
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
              title="Add project"
              onClick={(event) => {
                event.stopPropagation()
                props.onAddProject()
              }}
            >
              <FolderPlus className="size-4" />
            </button>
          </div>
        </div>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            projectsSectionCollapsed ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100",
          )}
          aria-hidden={projectsSectionCollapsed}
        >
          <div className="min-h-0 overflow-hidden">
            {props.loading ? <div className="py-4 text-sm text-zinc-500">Loading chats...</div> : null}
            {projects.map((item) => {
              const isCollapsed = collapsed.has(item.project.id)
              const sessionsExpanded = expandedSessions.has(item.project.id)
              const visibleSessions = item.sessions.slice(0, defaultVisibleSessionCount)
              const hiddenSessions = item.sessions.slice(defaultVisibleSessionCount)
              const hasHiddenSessions = item.sessions.length > defaultVisibleSessionCount
              return (
                <div key={item.project.id} className="mb-2">
                  <div className="group flex h-8 w-full items-center gap-1 rounded-md text-zinc-700 transition-colors hover:bg-white/70">
                    <button
                      className="flex h-8 min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 text-left"
                      onClick={() => toggleProject(item.project.id)}
                    >
                      {isCollapsed ? (
                        <Folder className="size-3.5 shrink-0 text-zinc-500" />
                      ) : (
                        <FolderOpen className="size-3.5 shrink-0 text-zinc-500" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-zinc-900">
                        {projectTitle(item.project)}
                      </span>
                      <span
                        className="shrink-0 text-[11px] text-zinc-500 group-hover:hidden group-focus-within:hidden data-[open=true]:hidden"
                        data-open={projectMenuOpen === item.project.id}
                      >
                        {item.sessions.length}
                      </span>
                    </button>
                    <div
                      className="hidden shrink-0 items-center gap-0.5 group-hover:flex group-focus-within:flex data-[open=true]:flex"
                      data-open={projectMenuOpen === item.project.id}
                    >
                      <div className="relative shrink-0" data-project-menu>
                        <button
                          className="flex size-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/90 hover:text-zinc-950 data-[open=true]:bg-white/90 data-[open=true]:text-zinc-950"
                          title="Project options"
                          data-open={projectMenuOpen === item.project.id}
                          onClick={(event) => {
                            event.stopPropagation()
                            setProjectMenuOpen((current) => current === item.project.id ? undefined : item.project.id)
                          }}
                        >
                          <Ellipsis className="size-4" />
                        </button>
                        {projectMenuOpen === item.project.id ? (
                          <div className="absolute right-0 top-8 z-20 w-36 rounded-md border border-zinc-200 bg-white p-1 shadow-lg shadow-zinc-950/10">
                            <button
                              className="flex h-6 w-full items-center rounded px-2 text-left text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                              onClick={() => {
                                setProjectMenuOpen(undefined)
                                props.onCloseProject(item.project)
                              }}
                            >
                              Remove Project
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <button
                        className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-white/90 hover:text-zinc-950"
                        title="New Chat"
                        onClick={() => props.onNewSession(item.project)}
                      >
                        <MessageSquarePlus className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div
                    className={cn(
                      "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                      isCollapsed ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100",
                    )}
                    aria-hidden={isCollapsed}
                  >
                    <div className="min-h-0 overflow-hidden">
                      <div className="mt-1 space-y-1">
                        {visibleSessions.map(renderSessionRow)}
                        {hasHiddenSessions ? (
                          <div
                            className={cn(
                              "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
                              sessionsExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 pointer-events-none",
                            )}
                            aria-hidden={!sessionsExpanded}
                          >
                            <div className="min-h-0 overflow-hidden space-y-1">
                              {hiddenSessions.map(renderSessionRow)}
                            </div>
                          </div>
                        ) : null}
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
                    </div>
                  </div>
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
        <div className="mb-2 flex h-8 items-center justify-between rounded-md hover:bg-white/70">
          <button
            className="flex h-full min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 text-left text-xs font-semibold text-zinc-500 hover:text-zinc-950"
            onClick={() => setGlobalSectionCollapsed(!globalSectionCollapsed)}
            aria-expanded={!globalSectionCollapsed}
          >
            <span className="truncate font-bold">AI Chats</span>
            {globalSectionCollapsed ? (
              <ChevronRight className="size-3.5 shrink-0" />
            ) : (
              <ChevronDown className="size-3.5 shrink-0" />
            )}
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <button
              className="flex size-7 items-center justify-center rounded-md text-zinc-400"
              title="New chat (coming soon)"
              disabled
            >
              <MessageSquarePlus className="size-4" />
            </button>
          </div>
        </div>
        <div
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none",
            globalSectionCollapsed ? "grid-rows-[0fr] opacity-0 pointer-events-none" : "grid-rows-[1fr] opacity-100",
          )}
          aria-hidden={globalSectionCollapsed}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="py-2 pl-1.5 text-xs text-zinc-500">Coming soon</div>
          </div>
        </div>
      </div>
    </div>
  )
}
