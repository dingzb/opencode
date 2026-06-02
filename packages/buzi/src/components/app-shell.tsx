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
  CheckCircle2,
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
  Plus,
  X,
} from "lucide-react"
import { cn } from "../lib/utils"
import { startWindowDrag, toggleMaximizeWindow } from "../runtime/window-actions"

export type SidebarPanel = "chats" | "projects" | "plugins" | "knowledge" | "settings" | "help"
export type ServerConfig = {
  id: string
  name: string
  url: string
  username?: string
  password?: string
}

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
const titleBarDragClickSuppressMs = 250

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
  onManageServers: () => void
}) {
  const suppressNextTitleBarClick = useRef(false)
  const suppressNextTitleBarClickTimeout = useRef<number | undefined>(undefined)
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

  useLayoutEffect(() => () => window.clearTimeout(suppressNextTitleBarClickTimeout.current), [])

  const suppressNextNonControlClick = () => {
    suppressNextTitleBarClick.current = true
    window.clearTimeout(suppressNextTitleBarClickTimeout.current)
    suppressNextTitleBarClickTimeout.current = window.setTimeout(() => {
      suppressNextTitleBarClick.current = false
    }, titleBarDragClickSuppressMs)
  }

  const handleTitleBarMouseDown = (event: ReactMouseEvent<HTMLElement>) => {
    if (!props.dragRegion || event.button !== 0) return
    if (event.detail > 1) return

    const target = event.target
    if (!(target instanceof HTMLElement)) return
    if (isTitleBarControl(target)) return

    event.preventDefault()

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

      suppressNextNonControlClick()
      cleanup()
      moveEvent.preventDefault()
      void startWindowDrag()
    }

    ownerDocument.addEventListener("mousemove", handleMouseMove)
    ownerDocument.addEventListener("mouseup", cleanup, { once: true })
  }

  const handleTitleBarClickCapture = (event: ReactMouseEvent<HTMLElement>) => {
    if (!suppressNextTitleBarClick.current) return
    const target = event.target
    if (target instanceof HTMLElement && isTitleBarControl(target)) return

    suppressNextTitleBarClick.current = false
    window.clearTimeout(suppressNextTitleBarClickTimeout.current)
    event.preventDefault()
    event.stopPropagation()
  }

  const handleTitleBarDoubleClick = (event: ReactMouseEvent<HTMLElement>) => {
    if (!props.dragRegion) return
    const target = event.target
    if (target instanceof HTMLElement && isTitleBarControl(target)) return

    event.preventDefault()
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
            onClick={props.onManageServers}
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

export function ServerManagerDialog(props: {
  open: boolean
  servers: ServerConfig[]
  activeServerID: string
  connectingServerURL: string
  serverState: "connected" | "connecting" | "error"
  onActivate: (serverID: string) => void
  onAdd: (url: string) => void
  onClose: () => void
}) {
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState("")
  const activeServer = props.servers.find((server) => server.id === props.activeServerID) ?? props.servers[0]
  const availableServers = props.servers.filter((server) => server.id !== activeServer?.id)

  if (!props.open) return null

  const submit = () => {
    const value = url.trim()
    if (!value) return
    props.onAdd(value)
    setUrl("")
    setAdding(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/20 px-4 pt-20 backdrop-blur-[2px]">
      <button className="absolute inset-0 cursor-default" aria-label="Close server manager" onClick={props.onClose} />
      <div className="relative flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-2xl shadow-zinc-950/15">
        <div className="flex h-12 items-center justify-between border-b border-zinc-200 px-4">
          <div className="text-sm font-semibold text-zinc-950">Server manager</div>
          <button
            className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-950"
            title="Close"
            aria-label="Close server manager"
            onClick={props.onClose}
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4">
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Connecting</div>
            <ServerRow
              server={activeServer}
              state={props.serverState}
              active
              connectingServerURL={props.connectingServerURL}
            />
          </div>
          <div>
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Available servers</div>
            <div className="space-y-2">
              {availableServers.length > 0 ? (
                availableServers.map((server) => (
                  <ServerRow
                    key={server.id}
                    server={server}
                    state="connecting"
                    connectingServerURL={props.connectingServerURL}
                    action={
                      <button
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                        onClick={() => props.onActivate(server.id)}
                      >
                        Connect
                      </button>
                    }
                  />
                ))
              ) : (
                <div className="rounded-md border border-dashed border-zinc-200 px-3 py-4 text-center text-xs text-zinc-500">
                  No other servers configured.
                </div>
              )}
            </div>
          </div>
          {adding ? (
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1 rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none ring-zinc-300 focus:ring-2"
                autoFocus
                placeholder="http://localhost:4096"
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit()
                  if (event.key === "Escape") setAdding(false)
                }}
              />
              <button className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white" onClick={submit}>
                Add
              </button>
            </div>
          ) : (
            <button
              className="flex h-9 w-full items-center justify-center gap-2 rounded-md border border-zinc-200 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              onClick={() => setAdding(true)}
            >
              <Plus className="size-4" />
              Add server
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function ServerRow(props: {
  server?: ServerConfig
  state: "connected" | "connecting" | "error"
  active?: boolean
  connectingServerURL: string
  action?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <Server className="size-4 shrink-0 text-zinc-500" />
          <div className="truncate text-sm font-medium text-zinc-950">{props.server?.name ?? "No server"}</div>
          {props.active ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : null}
        </div>
        <div className="mt-0.5 truncate font-mono text-[11px] text-zinc-500">
          {props.server?.url ?? props.connectingServerURL}
        </div>
      </div>
      {props.action ?? (
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-1 text-[11px] font-medium",
            props.state === "connected" && "bg-emerald-100 text-emerald-700",
            props.state === "connecting" && "bg-amber-100 text-amber-700",
            props.state === "error" && "bg-red-100 text-red-700",
          )}
        >
          {props.state === "connected" ? "Connected" : props.state === "error" ? "Offline" : "Starting"}
        </span>
      )}
    </div>
  )
}

function isTitleBarControl(target: HTMLElement) {
  return Boolean(target.closest("button,[role='button'],input,textarea,select,a,[data-no-window-drag]"))
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
  chats: ReactNode
}) {
  const feature = sidebarPanels.find((panel) => panel.id === props.activePanel)
  const renderContent = () => (
    <>
      <div className="min-h-0 flex-1 flex flex-col">
        {props.activePanel === "chats" ? props.chats : <FeaturePanel panel={feature} onBack={() => props.onPanelChange("chats")} />}
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
            props.activePanel === "chats" && "bg-white text-zinc-950 shadow-sm ring-1 ring-zinc-200",
          )}
          title="Chats"
          onClick={() => props.onPanelChange("chats")}
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
