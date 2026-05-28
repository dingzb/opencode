import type { ReactNode } from "react"
import { getRuntimePlatform } from "../runtime/platform"
import { WindowControls } from "./window-controls"

export type TitleBarFrameSlots = {
  leading?: ReactNode
  trailing?: ReactNode
  titleBarClassName?: string
  dragRegion?: boolean
}

export function AppFrame(props: { children: (slots: TitleBarFrameSlots) => ReactNode }) {
  const platform = getRuntimePlatform()

  if (!platform.isTauri) {
    return <WebFrame>{props.children({})}</WebFrame>
  }

  return (
    <DesktopFrame>
      {props.children({
        leading: platform.os === "darwin" ? <WindowControls os={platform.os} /> : undefined,
        trailing: platform.os !== "darwin" ? <WindowControls os={platform.os} /> : undefined,
        titleBarClassName: "desktop-titlebar",
        dragRegion: true,
      })}
    </DesktopFrame>
  )
}

function DesktopFrame(props: { children: ReactNode }) {
  return <div className="desktop-frame h-dvh overflow-hidden bg-[#f7f7f5] text-zinc-950">{props.children}</div>
}

function WebFrame(props: { children: ReactNode }) {
  return <div className="h-dvh bg-[#f7f7f5] text-zinc-950">{props.children}</div>
}
