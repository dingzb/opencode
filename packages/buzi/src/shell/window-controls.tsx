import { Copy, Minus, Square, X } from "lucide-react"
import { useEffect, useState, type ReactNode } from "react"
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../runtime/window-actions"
import { getRuntimePlatform } from "../runtime/platform"
import type { DesktopPlatform } from "../runtime/platform"
import { cn } from "../lib/utils"

export function WindowControls(props: { os: DesktopPlatform }) {
  if (props.os === "darwin") return <MacWindowControls />
  return <StandardWindowControls />
}

function useIsMaximized() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!getRuntimePlatform().isTauri) return
    let unlisten: (() => void) | undefined

    ;(async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window")
      const win = getCurrentWindow()
      setMaximized(await win.isMaximized())
      unlisten = await win.onResized(() => void win.isMaximized().then(setMaximized))
    })()

    return () => unlisten?.()
  }, [])

  return maximized
}

function MacWindowControls() {
  const maximized = useIsMaximized()

  return (
    <div className="window-controls window-controls-mac" data-tauri-drag-region={false}>
      <button
        className="window-control-mac bg-[#ff5f57]"
        title="Close"
        onClick={() => void closeWindow()}
      />
      <button
        className="window-control-mac bg-[#ffbd2e]"
        title="Minimize"
        onClick={() => void minimizeWindow()}
      />
      <button
        className="window-control-mac bg-[#28c840]"
        title={maximized ? "Restore" : "Maximize"}
        onClick={() => void toggleMaximizeWindow()}
      />
    </div>
  )
}

function StandardWindowControls() {
  const maximized = useIsMaximized()

  return (
    <div className="window-controls window-controls-standard" data-tauri-drag-region={false}>
      <WindowButton title="Minimize" onClick={minimizeWindow}>
        <Minus className="size-3.5" />
      </WindowButton>
      <WindowButton title={maximized ? "Restore" : "Maximize"} onClick={toggleMaximizeWindow}>
        {maximized ? <Copy className="size-3" /> : <Square className="size-3" />}
      </WindowButton>
      <WindowButton title="Close" destructive onClick={closeWindow}>
        <X className="size-3.5" />
      </WindowButton>
    </div>
  )
}

function WindowButton(props: {
  title: string
  destructive?: boolean
  children: ReactNode
  onClick: () => Promise<void>
}) {
  return (
    <button
      className={cn(
        "flex h-12 w-11 items-center justify-center text-zinc-500 hover:bg-zinc-200/70 hover:text-zinc-950",
        props.destructive && "hover:bg-red-500 hover:text-white",
      )}
      title={props.title}
      onClick={() => void props.onClick()}
    >
      {props.children}
    </button>
  )
}
