import {
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react"
import {
  Blocks,
  BookOpen,
  CircleHelp,
  FolderKanban,
  Folders,
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
import { startWindowDrag, toggleMaximizeWindow } from "../runtime/window-actions"

export type SidebarPanel = "conversations" | "projects" | "plugins" | "knowledge" | "settings" | "help"

const sidebarPanels: Array<{ id: SidebarPanel; label: string; icon: typeof MessageCircle }> = [
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "plugins", label: "Plugins", icon: Blocks },
  { id: "knowledge", label: "Knowledge", icon: BookOpen },
  { id: "settings", label: "Settings", icon: Settings },
  { id: "help", label: "Help", icon: CircleHelp },
]

const windowDragThreshold = 4
const sidebarMinWidth = 240
const sidebarMaxWidth = 420
const titleBarTitleGap = 8
const titleBarMaxTitleWidth = 520

export function TitleBar(props: {
  projectPath: string
  title: string
  serverState: "connected" | "connecting" | "error"
  sidebarOpen: boolean
  inspectorOpen: boolean
  frameLeading?: ReactNode
  frameTrailing?: ReactNode
  className?: string
  dragRegion?: boolean
  nativeTitleBar?: boolean
  onToggleSidebar: () => void
  onToggleInspector: () => void
}) {
  const suppressNextTitleBarClick = useRef(false)
  const titleBarRef = useRef<HTMLElement>(null)
  const titleLeadingRef = useRef<HTMLDivElement>(null)
  const titleTrailingRef = useRef<HTMLDivElement>(null)
  const titleContentRef = useRef<HTMLDivElement>(null)
  const [titleLayout, setTitleLayout] = useState({ left: 0, width: 0, ready: false })

  useLayoutEffect(() => {
    if (props.nativeTitleBar) return

    const updateTitleLayout = () => {
      const titleBar = titleBarRef.current
      const leading = titleLeadingRef.current
      const trailing = titleTrailingRef.current
      const titleContent = titleContentRef.current
      if (!titleBar || !leading || !trailing || !titleContent) return

      const titleBarRect = titleBar.getBoundingClientRect()
      const leadingRect = leading.getBoundingClientRect()
      const trailingRect = trailing.getBoundingClientRect()
      const titleNaturalWidth = Math.min(measureTitleNaturalWidth(titleContent), titleBarMaxTitleWidth)
      const safeLeft = leadingRect.right - titleBarRect.left + titleBarTitleGap
      const safeRight = trailingRect.left - titleBarRect.left - titleBarTitleGap
      const width = Math.max(0, Math.min(titleNaturalWidth, safeRight - safeLeft))
      const left = Math.min(Math.max((titleBarRect.width - width) / 2, safeLeft), safeRight - width)

      setTitleLayout((current) => {
        const next = { left: Math.round(left), width: Math.round(width), ready: true }
        if (current.left === next.left && current.width === next.width && current.ready === next.ready) return current
        return next
      })
    }

    updateTitleLayout()
    const titleBar = titleBarRef.current
    const leading = titleLeadingRef.current
    const trailing = titleTrailingRef.current
    const titleContent = titleContentRef.current
    if (!titleBar || !leading || !trailing || !titleContent) return

    const observer = new ResizeObserver(updateTitleLayout)
    observer.observe(titleBar)
    observer.observe(leading)
    observer.observe(trailing)
    observer.observe(titleContent)
    void document.fonts?.ready.then(updateTitleLayout)

    return () => observer.disconnect()
  }, [props.nativeTitleBar, props.projectPath, props.title])

  const handleTitleBarMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (!props.dragRegion || event.button !== 0) return
    if (event.detail > 1) return

    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (target.closest("button,[role='button'],input,textarea,select,[data-no-window-drag]")) return

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
    const target = event.target
    if (target instanceof HTMLElement && target.closest("button,[role='button'],input,textarea,select,a")) return
    event.preventDefault()
    event.stopPropagation()
  }

  const handleTitleBarDoubleClick = () => {
    if (!props.dragRegion) return
    void toggleMaximizeWindow()
  }

  return (
    <header
      ref={titleBarRef}
      className={cn(
        "relative flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-[#f7f7f5] px-3",
        props.nativeTitleBar ? "h-10" : "h-12",
        props.className,
      )}
      onMouseDown={handleTitleBarMouseDown}
      onClickCapture={handleTitleBarClickCapture}
      onDoubleClick={handleTitleBarDoubleClick}
      {...(props.dragRegion ? { "data-tauri-drag-region": true } : {})}
    >
      <div ref={titleLeadingRef} className="z-10 flex min-w-0 items-center gap-1">
        {props.frameLeading}
        <button
          className="flex size-8 shrink-0 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
          title={props.sidebarOpen ? "Hide sidebar" : "Show sidebar"}
          onClick={props.onToggleSidebar}
        >
          {props.sidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeft className="size-4" />}
        </button>
      </div>
      {!props.nativeTitleBar ? (
        <div
          className="pointer-events-none absolute inset-y-0 flex items-center justify-center overflow-hidden"
          style={{
            left: titleLayout.left,
            opacity: titleLayout.ready ? 1 : 0,
            width: titleLayout.width,
          }}
        >
          <div ref={titleContentRef} className="min-w-0 cursor-default px-3 py-1 text-center">
            <div
              className="truncate text-[13px] font-semibold leading-4 text-zinc-950"
              data-title-line
            >
              {props.projectPath || "No project selected"}
            </div>
            <div className="truncate text-[11px] font-medium leading-4 text-zinc-500" data-title-line>
              {props.title}
            </div>
          </div>
        </div>
      ) : null}
      <div ref={titleTrailingRef} className="z-10 flex min-w-0 justify-end">
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
            title={props.inspectorOpen ? "Hide inspector" : "Show inspector"}
            onClick={props.onToggleInspector}
          >
            {props.inspectorOpen ? <PanelRightClose className="size-4" /> : <PanelRight className="size-4" />}
          </button>
          <button
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
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

function measureTitleNaturalWidth(element: HTMLElement) {
  const style = getComputedStyle(element)
  return (
    Math.max(
      0,
      ...Array.from(element.querySelectorAll("[data-title-line]")).map((line) => line.scrollWidth),
    ) +
    Number.parseFloat(style.paddingLeft) +
    Number.parseFloat(style.paddingRight)
  )
}

export function RightInspector(props: {
  open: boolean
  overlayActive: boolean
  width: number
  onClose: () => void
  onResize: (width: number) => void
}) {
  const renderContent = () => (
    <>
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="truncate text-[13px] font-semibold text-zinc-950">Inspector</div>
        <button
          className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
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
    </>
  )

  return (
    <>
      <aside
        aria-hidden={!props.open}
        className={cn(
          "fixed bottom-0 right-0 top-12 flex w-[min(360px,calc(100vw-0.5rem))] translate-x-full flex-col overflow-hidden rounded-l-xl border border-zinc-200/80 bg-[#f1f1ef] opacity-0 shadow-2xl shadow-zinc-950/20 transition-[transform,opacity] duration-200 ease-out pointer-events-none md:hidden",
          props.overlayActive ? "z-40" : "z-30",
          props.open && "translate-x-0 opacity-100 pointer-events-auto",
        )}
      >
        {renderContent()}
      </aside>
      <aside
        aria-hidden={!props.open}
        className={cn(
          "relative hidden h-full w-0 shrink-0 flex-col overflow-hidden border-l border-transparent bg-[#f1f1ef] transition-[width,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none motion-reduce:transition-none md:flex",
          props.open && "border-zinc-200/80 pointer-events-auto",
        )}
        style={{ width: props.open ? props.width : 0 }}
      >
        <ResizeGrip side="right" width={props.width} onResize={props.onResize} />
        {renderContent()}
      </aside>
    </>
  )
}

export function LeftSidebar(props: {
  activePanel: SidebarPanel
  open: boolean
  overlayActive: boolean
  width: number
  onPanelChange: (panel: SidebarPanel) => void
  onResize: (width: number) => void
  conversations: ReactNode
}) {
  const feature = sidebarPanels.find((panel) => panel.id === props.activePanel)
  const renderContent = () => (
    <>
      <div className="min-h-0 flex-1 flex flex-col">
        {props.activePanel === "conversations" ? props.conversations : <FeaturePanel panel={feature} onBack={() => props.onPanelChange("conversations")} />}
      </div>
      <SidebarDock activePanel={props.activePanel} onPanelChange={props.onPanelChange} />
    </>
  )

  return (
    <>
      <aside
        aria-hidden={!props.open}
        className={cn(
          "fixed bottom-0 left-0 top-12 flex w-[min(340px,calc(100vw-0.5rem))] -translate-x-full flex-col overflow-hidden rounded-r-xl border border-zinc-200/80 bg-[#f1f1ef] opacity-0 shadow-2xl shadow-zinc-950/20 transition-[transform,opacity] duration-200 ease-out pointer-events-none md:hidden",
          props.overlayActive ? "z-40" : "z-30",
          props.open && "translate-x-0 opacity-100 pointer-events-auto",
        )}
      >
        {renderContent()}
      </aside>
      <aside
        aria-hidden={!props.open}
        className={cn(
          "relative hidden h-full w-0 shrink-0 flex-col overflow-hidden border-r border-transparent bg-[#f1f1ef] transition-[width,border-color] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none motion-reduce:transition-none md:flex",
          props.open && "border-zinc-200/80 pointer-events-auto",
        )}
        style={{ width: props.open ? props.width : 0 }}
      >
        {renderContent()}
        <ResizeGrip side="left" width={props.width} onResize={props.onResize} />
      </aside>
    </>
  )
}

function ResizeGrip(props: { side: "left" | "right"; width: number; onResize: (width: number) => void }) {
  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.preventDefault()

    const startX = event.clientX
    const ownerDocument = event.currentTarget.ownerDocument
    const sidebar = event.currentTarget.parentElement
    const previousTransition = sidebar?.style.transition

    const handlePointerMove = (moveEvent: globalThis.PointerEvent) => {
      const delta = moveEvent.clientX - startX
      props.onResize(clampSidebarWidth(props.side === "left" ? props.width + delta : props.width - delta))
    }

    const cleanup = () => {
      ownerDocument.removeEventListener("pointermove", handlePointerMove)
      ownerDocument.removeEventListener("pointerup", cleanup)
      ownerDocument.removeEventListener("pointercancel", cleanup)
      ownerDocument.body.style.cursor = ""
      ownerDocument.body.style.userSelect = ""
      if (sidebar) sidebar.style.transition = previousTransition ?? ""
    }

    if (sidebar) sidebar.style.transition = "none"
    ownerDocument.body.style.cursor = "col-resize"
    ownerDocument.body.style.userSelect = "none"
    ownerDocument.addEventListener("pointermove", handlePointerMove)
    ownerDocument.addEventListener("pointerup", cleanup, { once: true })
    ownerDocument.addEventListener("pointercancel", cleanup, { once: true })
  }

  return (
    <div
      className={cn(
        "absolute inset-y-0 z-10 hidden w-1.5 cursor-col-resize hover:bg-zinc-300/40 md:block",
        props.side === "left" ? "right-0" : "left-0",
      )}
      onPointerDown={handlePointerDown}
    />
  )
}

function clampSidebarWidth(width: number) {
  return Math.min(sidebarMaxWidth, Math.max(sidebarMinWidth, Math.round(width)))
}

function FeaturePanel(props: { panel?: { label: string; icon: typeof MessageCircle }; onBack: () => void }) {
  const Icon = props.panel?.icon ?? MoreHorizontal
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-zinc-200/80 px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-[13px] font-semibold text-zinc-950">{props.panel?.label ?? "More"}</div>
        </div>
        <button
          className="flex h-7 items-center rounded-md px-2 text-xs text-zinc-500 hover:bg-white/70 hover:text-zinc-950"
          onClick={props.onBack}
        >
          Chats
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-3 flex size-10 items-center justify-center rounded-md bg-white text-zinc-500 ring-1 ring-zinc-200">
          <Icon className="size-5" />
        </div>
        <div className="text-sm font-semibold text-zinc-900">{props.panel?.label ?? "More"}</div>
        <div className="mt-1 text-xs leading-5 text-zinc-500">This workspace panel will be filled in a later pass.</div>
      </div>
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
          title="Chats"
          onClick={() => props.onPanelChange("conversations")}
        >
          <Folders className="size-4" />
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
