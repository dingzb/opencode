import { ChevronDown, ChevronRight } from "lucide-react"
import { type ReactNode, useLayoutEffect, useRef, useState } from "react"
import { cn } from "../../lib/utils"

export type PartStatus = "done" | "running" | "error" | "muted"

export function statusTone(status: PartStatus) {
  if (status === "error") return "bg-red-400"
  if (status === "running") return "bg-amber-400"
  if (status === "muted") return "bg-zinc-300"
  return "bg-emerald-400"
}

export function CollapsiblePart(props: {
  icon: ReactNode
  label: string
  detail?: string
  children?: ReactNode
  defaultOpen?: boolean
  status?: PartStatus
  hideDetails?: boolean
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const status = props.status ?? "done"

  useLayoutEffect(() => {
    if (!open) return
    const frame = window.requestAnimationFrame(() => {
      const element = bodyRef.current
      if (element) element.scrollTop = element.scrollHeight
    })
    return () => window.cancelAnimationFrame(frame)
  }, [open, props.children])

  return (
    <div className="my-2">
      <button
        className="flex w-full items-center gap-2 rounded-md px-0 py-1.5 text-left text-zinc-500 hover:text-zinc-700"
        onClick={() => setOpen(!open)}
      >
        <span className="text-zinc-400">{props.icon}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">
          <span className="font-medium text-zinc-700">{props.label}</span>
          {props.detail ? <span className="text-zinc-400"> · {props.detail}</span> : null}
        </span>
        <span className={cn("size-1.5 rounded-full", statusTone(status))} />
        {props.hideDetails ? null : open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
      </button>
      {!props.hideDetails && open && props.children ? (
        <div
          ref={bodyRef}
          className="process-markdown max-h-64 overflow-y-auto overflow-x-hidden rounded-r-lg border-l-[3px] border-zinc-300/70 bg-zinc-100/45 px-3 py-2.5 [overflow-wrap:anywhere]"
        >
          {props.children}
        </div>
      ) : null}
    </div>
  )
}

export function FieldList(props: { rows: Array<[string, string | undefined]> }) {
  const rows = props.rows.filter((row): row is [string, string] => !!row[1])
  if (rows.length === 0) return null
  return (
    <dl className="space-y-1 text-xs">
      {rows.map(([label, value]) => (
        <div className="grid grid-cols-[5rem_1fr] gap-2" key={label}>
          <dt className="text-zinc-400">{label}</dt>
          <dd className="min-w-0 break-words font-mono text-zinc-700">{value}</dd>
        </div>
      ))}
    </dl>
  )
}
