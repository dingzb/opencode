import type { ReactNode } from "react"
import { CircleHelp, MessageCircle, PanelLeftClose, Settings } from "lucide-react"
import { cn } from "../lib/utils"

export type ActivityID = "sessions"

export function ActivityBar(props: {
  activeActivity: ActivityID
  panelCollapsed: boolean
  onActivityClick: (activity: ActivityID) => void
}) {
  return (
    <nav className="flex h-full w-12 shrink-0 flex-col items-center border-r border-zinc-200/80 bg-[#e9e9e6] py-2">
      <button
        className={cn(
          "flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-white/70 hover:text-zinc-950",
          props.activeActivity === "sessions" && !props.panelCollapsed && "bg-white text-zinc-950 shadow-sm",
        )}
        title="Workspaces & Sessions"
        onClick={() => props.onActivityClick("sessions")}
      >
        <MessageCircle className="size-5" />
      </button>
      <div className="flex-1" />
      <button
        className="flex size-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-950"
        title="Settings"
      >
        <Settings className="size-5" />
      </button>
      <button
        className="mt-1 flex size-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/70 hover:text-zinc-950"
        title="Help"
      >
        <CircleHelp className="size-5" />
      </button>
    </nav>
  )
}

export function SidePanel(props: { title: string; collapsed: boolean; onCollapse: () => void; children: ReactNode }) {
  if (props.collapsed) return null

  return (
    <aside className="flex h-full w-[304px] shrink-0 flex-col border-r border-zinc-200/80 bg-[#f1f1ef]">
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="truncate text-[13px] font-semibold text-zinc-950">{props.title}</div>
        <button
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
          title="Collapse sidebar"
          onClick={props.onCollapse}
        >
          <PanelLeftClose className="size-4" />
        </button>
      </header>
      {props.children}
    </aside>
  )
}
