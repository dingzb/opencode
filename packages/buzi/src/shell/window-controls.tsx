import { Minus, Square, X } from "lucide-react"
import type { ReactNode } from "react"
import { closeWindow, minimizeWindow, toggleMaximizeWindow } from "../runtime/window-actions"
import type { DesktopPlatform } from "../runtime/platform"
import { cn } from "../lib/utils"

export function WindowControls(props: { os: DesktopPlatform }) {
  if (props.os === "darwin") return <MacWindowControls />
  return <StandardWindowControls />
}

function MacWindowControls() {
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
        title="Maximize"
        onClick={() => void toggleMaximizeWindow()}
      />
    </div>
  )
}

function StandardWindowControls() {
  return (
    <div className="window-controls window-controls-standard" data-tauri-drag-region={false}>
      <WindowButton title="Minimize" onClick={minimizeWindow}>
        <Minus className="size-3.5" />
      </WindowButton>
      <WindowButton title="Maximize" onClick={toggleMaximizeWindow}>
        <Square className="size-3" />
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
