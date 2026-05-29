import { useRef, type MouseEvent as ReactMouseEvent, type ReactNode } from "react"
import {
  Blocks,
  BookOpen,
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
import { startWindowDrag } from "../runtime/window-actions"

export type SidebarPanel = "conversations" | "projects" | "plugins" | "knowledge" | "settings" | "help"

const sidebarPanels: Array<{ id: SidebarPanel; label: string; icon: typeof MessageCircle }> = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "plugins", label: "Plugins", icon: Blocks },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: CircleHelp },
]

const windowDragThreshold = 4

export function TitleBar(props: {
  projectPath: string
  title: string
  serverState: "connected" | "connecting" | "error"
  sidebarCollapsed: boolean
  inspectorCollapsed: boolean
  frameLeading?: ReactNode
  frameTrailing?: ReactNode
  className?: string
  dragRegion?: boolean
  nativeTitleBar?: boolean
  onToggleSidebar: () => void
  onToggleInspector: () => void
}) {
  const suppressNextTitleBarClick = useRef(false)

  const handleTitleBarMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (!props.dragRegion || event.button !== 0) return
    if (event.detail > 1) return

    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.closest("input,textarea,select,[data-no-window-drag]")) return

    const startX = event.clientX
    const startY = event.clientY
    const ownerDocument = event.currentTarget.ownerDocument

    const cleanup = () => {
      ownerDocument.removeEventListener("mousemove", handleMouseMove)
      ownerDocument.removeEventListener("mouseup", cleanup)
    }

    const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
      const deltaX = moveEvent.clientX - startX
      const deltaY = moveEvent.clientY - startY
      if (Math.hypot(deltaX, deltaY) < windowDragThreshold) return

      suppressNextTitleBarClick.current = true
      cleanup()
      moveEvent.preventDefault()
      void startWindowDrag()
    }

    ownerDocument.addEventListener("mousemove", handleMouseMove)
    ownerDocument.addEventListener("mouseup", cleanup, { once: true })
  }

  const handleTitleBarClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressNextTitleBarClick.current) return
    suppressNextTitleBarClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <header
      className={cn(
        "grid shrink-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center border-b border-zinc-200/80 bg-[#f7f7f5] px-2 sm:px-3 lg:grid-cols-[1fr_auto_1fr]",
        props.nativeTitleBar ? "h-10" : "h-12",
        props.className,
      )}
      onMouseDown={handleTitleBarMouseDown}
      onClickCapture={handleTitleBarClickCapture}
      {...(props.dragRegion ? { "data-tauri-drag-region": true } : {})}
    >
      <div className="flex min-w-0 items-center gap-1">
        {props.frameLeading}
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
          title={props.sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
          onClick={props.onToggleSidebar}
        >
          {props.sidebarCollapsed ? <PanelLeft className="size-4" /> : <PanelLeftClose className="size-4" />}
        </button>
      </div>
      <div className="flex min-w-0 justify-center">
        {!props.nativeTitleBar ? (
          <div className="min-w-0 max-w-[160px] cursor-default px-2 py-1 text-center min-[420px]:max-w-[220px] sm:max-w-[360px] sm:px-3 lg:max-w-[520px]">
            <div className="truncate text-[11px] font-semibold leading-4 text-zinc-950 min-[420px]:text-[12px] sm:text-[13px]">
              {props.projectPath || "No project selected"}
            </div>
            <div className="truncate text-[10px] font-medium leading-4 text-zinc-500 sm:text-[11px]">
              {props.title}
            </div>
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
            className="hidden size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950 sm:flex"
            title="Application menu"
          >
            <Menu className="size-4" />
          </button>
          {props.frameTrailing}
        </div>
      </div>
    </header>
  )
}

export function RightInspector(props: { collapsed: boolean; onClose: () => void }) {
  return (
    <aside
      aria-hidden={props.collapsed}
      className={cn(
        "fixed bottom-3 right-3 top-[3.75rem] z-30 flex w-[min(360px,calc(100vw-24px))] shrink-0 flex-col overflow-hidden rounded-l-xl rounded-r-md border border-zinc-200/80 bg-[#f1f1ef] shadow-2xl shadow-zinc-950/20 transition-[transform,opacity,width,border-color] duration-200 ease-out xl:static xl:h-full xl:w-[304px] xl:rounded-none xl:border-y-0 xl:border-r-0 xl:shadow-none",
        props.collapsed &&
          "pointer-events-none translate-x-[calc(100%+0.75rem)] opacity-0 xl:w-0 xl:translate-x-0 xl:border-transparent",
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="truncate text-[13px] font-semibold text-zinc-950">Inspector</div>
        <button
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950 xl:hidden"
          title="Close inspector"
          onClick={props.onClose}
        >
          <PanelRightClose className="size-4" />
        </button>
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
  onClose: () => void
  onPanelChange: (panel: SidebarPanel) => void
  conversations: ReactNode
}) {
  const feature = sidebarPanels.find((panel) => panel.id === props.activePanel)

  return (
    <aside
      aria-hidden={props.collapsed}
      className={cn(
        "fixed bottom-3 left-3 top-[3.75rem] z-30 flex w-[min(340px,calc(100vw-24px))] shrink-0 flex-col overflow-hidden rounded-l-md rounded-r-xl border border-zinc-200/80 bg-[#f1f1ef] shadow-2xl shadow-zinc-950/20 transition-[transform,opacity,width,border-color] duration-200 ease-out md:static md:h-full md:w-[304px] md:rounded-none md:border-y-0 md:border-l-0 md:shadow-none",
        props.collapsed &&
          "pointer-events-none -translate-x-[calc(100%+0.75rem)] opacity-0 md:w-0 md:translate-x-0 md:border-transparent",
      )}
    >
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <MessageCircle className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-[13px] font-semibold text-zinc-950">
            {props.activePanel === "conversations" ? "Conversations" : feature?.label}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {props.activePanel !== "conversations" ? (
            <button
              className="flex h-7 items-center rounded-md px-2 text-xs text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
              onClick={() => props.onPanelChange("conversations")}
            >
              Sessions
            </button>
          ) : null}
          <button
            className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950 md:hidden"
            title="Close sidebar"
            onClick={props.onClose}
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
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
