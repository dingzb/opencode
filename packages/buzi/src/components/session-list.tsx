import { MessageSquarePlus, Search, TerminalSquare } from "lucide-react"
import type { Session } from "@opencode-ai/sdk/v2/client"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { cn } from "../lib/utils"

function title(session: Session) {
  return session.title || session.slug || session.id
}

function subtitle(session: Session) {
  const date = new Date(session.time.updated ?? session.time.created)
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
}

export function SessionList(props: {
  sessions: Session[]
  activeSessionID?: string
  search: string
  setSearch: (value: string) => void
  onSelect: (sessionID: string) => void
  onNew: () => void
  loading: boolean
}) {
  const sessions = props.sessions.filter((session) => title(session).toLowerCase().includes(props.search.toLowerCase()))

  return (
    <aside className="flex h-full w-[318px] shrink-0 flex-col border-r border-zinc-200/80 bg-[#f1f1ef]">
      <div className="border-b border-zinc-200/80 px-4 py-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white">
              <TerminalSquare className="size-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-semibold text-zinc-950">opencode</div>
              <div className="text-xs text-zinc-500">Local sessions</div>
            </div>
          </div>
          <Button variant="outline" className="h-8 bg-white px-2 shadow-sm" onClick={props.onNew}>
            <MessageSquarePlus className="size-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-zinc-400" />
          <Input
            className="w-full pl-8"
            value={props.search}
            onChange={(event) => props.setSearch(event.target.value)}
            placeholder="Search sessions"
          />
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2.5">
        {props.loading ? <div className="px-3 py-4 text-sm text-zinc-500">Loading sessions...</div> : null}
        {sessions.map((session) => (
          <button
            key={session.id}
            className={cn(
              "mb-1.5 block w-full rounded-lg px-3 py-2.5 text-left transition-colors",
              props.activeSessionID === session.id ? "bg-white shadow-sm ring-1 ring-zinc-200" : "hover:bg-white/70",
            )}
            onClick={() => props.onSelect(session.id)}
          >
            <div className="truncate text-[13px] font-medium text-zinc-900">{title(session)}</div>
            <div className="mt-1 truncate text-xs text-zinc-500">{subtitle(session)}</div>
          </button>
        ))}
        {!props.loading && sessions.length === 0 ? (
          <div className="px-3 py-4 text-sm text-zinc-500">No sessions found.</div>
        ) : null}
      </div>
    </aside>
  )
}
