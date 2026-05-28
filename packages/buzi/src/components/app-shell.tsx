import { useState, type ReactNode } from "react"
import {
  Blocks,
  BookOpen,
  ChevronDown,
  CircleHelp,
  FolderKanban,
  Menu,
  MessageCircle,
  MoreHorizontal,
  PanelLeft,
  PanelLeftClose,
  PanelRight,
  PanelRightClose,
  Server,
  Settings,
} from "lucide-react"
import { cn } from "../lib/utils"

export type SidebarPanel = "conversations" | "projects" | "plugins" | "knowledge" | "settings" | "help"

const sidebarPanels: Array<{ id: SidebarPanel; label: string; icon: typeof MessageCircle }> = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "plugins", label: "Plugins", icon: Blocks },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: CircleHelp },
]

export function TitleBar(props: {
  projectPath: string
  title: string
  serverState: "connected" | "connecting" | "error"
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  onToggleSidebar: () => void
  onNewProject: () => void
  onToggleInspector: () => void
}) {
  const [projectMenuOpen, setProjectMenuOpen] = useState(false)

  return (
    <header className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-b border-zinc-200/80 bg-[#f7f7f5] px-3">
      <div className="flex min-w-0 items-center">
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
          title={props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          onClick={props.onToggleSidebar}
        >
          {props.sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      <div className="relative flex min-w-0 justify-center">
        <button
          className="group flex min-w-0 max-w-[520px] items-center gap-2 rounded-md px-3 py-1 text-center hover:bg-zinc-100"
          onClick={() => setProjectMenuOpen((current) => !current)}
        >
          <div className="min-w-0">
            <div className="truncate text-[13px] font-semibold leading-4 text-zinc-950">
              {props.projectPath || "No project selected"}
            </div>
            <div className="truncate text-[11px] font-medium leading-4 text-zinc-500">{props.title}</div>
          </div>
          <ChevronDown className="size-3.5 shrink-0 text-zinc-400 group-hover:text-zinc-600" />
        </button>
        {projectMenuOpen ? (
          <div className="absolute top-11 z-20 w-[360px] rounded-md border border-zinc-200 bg-white p-1 shadow-lg">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
              Projects
            </div>
            <button className="flex h-8 w-full items-center rounded px-2 text-left text-xs text-zinc-800 hover:bg-zinc-100">
              <span className="truncate">{props.projectPath || "No project selected"}</span>
            </button>
            <div className="my-1 border-t border-zinc-100" />
            <button className="flex h-8 w-full items-center rounded px-2 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950">
              Show all projects
            </button>
            <button
              className="flex h-8 w-full items-center rounded px-2 text-left text-xs text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
              onClick={props.onNewProject}
            >
              Add new project
            </button>
          </div>
        ) : null}
      </div>
      <div className="flex min-w-0 justify-end">
        <div className="flex shrink-0 items-center gap-1">
          <button
            className="relative flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            title="Configure server"
          >
            <Server className="size-4" />
            <span
              className={cn(
                "absolute bottom-1.5 right-1.5 size-2 rounded-full ring-2 ring-[#f7f7f5]",
                props.serverState === "connected" && "bg-emerald-500",
                props.serverState === "connecting" && "bg-amber-500",
                props.serverState === "error" && "bg-red-500",
              )}
            />
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            title={props.inspectorCollapsed ? "Show inspector" : "Hide inspector"}
            onClick={props.onToggleInspector}
          >
            {props.inspectorCollapsed ? <PanelRight className="size-4" /> : <PanelRightClose className="size-4" />}
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            title="Application menu"
          >
            <Menu className="size-4" />
          </button>
        </div>
      </div>
    </header>
  )
}

export function RightInspector(props: { collapsed: boolean }) {
  if (props.collapsed) return null

  return (
    <aside className="flex h-full w-[304px] shrink-0 flex-col border-l border-zinc-200/80 bg-[#f1f1ef]">
      <div className="flex h-11 shrink-0 items-center border-b border-zinc-200/80 px-3">
        <div className="truncate text-[13px] font-semibold text-zinc-950">Inspector</div>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center px-8 text-center">
        <div>
          <div className="text-sm font-semibold text-zinc-900">待补充</div>
          <div className="mt-1 text-xs leading-5 text-zinc-500">Agent Runtime Inspector content will be added later.</div>
        </div>
      </div>
    </aside>
  )
}

export function LeftSidebar(props: {
  activePanel: SidebarPanel
  collapsed: boolean
  onPanelChange: (panel: SidebarPanel) => void
  conversations: ReactNode
}) {
  if (props.collapsed) return null

  const feature = sidebarPanels.find((panel) => panel.id === props.activePanel)

  return (
    <aside className="flex h-full w-[304px] shrink-0 flex-col border-r border-zinc-200/80 bg-[#f1f1ef]">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-[13px] font-semibold text-zinc-950">
            {props.activePanel === "conversations" ? "Conversations" : feature?.label}
          </div>
        </div>
        {props.activePanel !== "conversations" ? (
          <button
            className="flex h-7 items-center rounded-md px-2 text-xs text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
            onClick={() => props.onPanelChange("conversations")}
          >
            Sessions
          </button>
        ) : null}
      </div>
      <div className="min-h-0 flex-1">
        {props.activePanel === "conversations" ? props.conversations : <FeaturePanel panel={feature} />}
      </div>
      <SidebarDock activePanel={props.activePanel} onPanelChange={props.onPanelChange} />
    </aside>
  )
}

function FeaturePanel(props: { panel?: { label: string; icon: typeof MessageCircle } }) {
  const Icon = props.panel?.icon ?? MoreHorizontal
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 text-center">
      <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-white text-zinc-500 ring-1 ring-zinc-200">
        <Icon className="size-5" />
      </div>
      <div className="text-sm font-semibold text-zinc-900">{props.panel?.label ?? "More"}</div>
      <div className="mt-1 text-xs leading-5 text-zinc-500">This workspace panel will be filled in a later pass.</div>
    </div>
  )
}

function SidebarDock(props: { activePanel: SidebarPanel; onPanelChange: (panel: SidebarPanel) => void }) {
  return (
    <nav className="flex shrink-0 items-center justify-between border-t border-zinc-200/80 px-2 py-2">
      <button
        className={cn(
          "flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950",
          props.activePanel === "conversations" && "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200",
        )}
        title="Conversations"
        onClick={() => props.onPanelChange("conversations")}
      >
        <MessageCircle className="size-4" />
      </button>
      {sidebarPanels.map((panel) => {
        const Icon = panel.icon
        return (
          <button
            key={panel.id}
            className={cn(
              "flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950",
              props.activePanel === panel.id && "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200",
            )}
            title={panel.label}
            onClick={() => props.onPanelChange(panel.id)}
          >
            <Icon className="size-4" />
          </button>
        )
      })}
    </nav>
  )
}
