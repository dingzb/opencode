import { ChevronDown, ChevronRight, FileText, Hammer, Sparkles } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import type { Part } from "@opencode-ai/sdk/v2/client"
import { cn } from "../lib/utils"
import { Markdown } from "./markdown"

function partLabel(part: Part) {
  if (part.type === "reasoning") return "Thinking"
  if (part.type === "tool") return part.tool || "Tool call"
  if (part.type === "file") return part.filename || "Read file"
  if (part.type === "patch") return "Patch"
  if (part.type === "subtask") return "Subtask"
  return part.type
}

function partBody(part: Part) {
  if (part.type === "reasoning") return part.text
  if (part.type === "tool") {
    const state = part.state
    if (state.status === "completed") return state.output || state.title
    if (state.status === "error") return state.error
    if (state.status === "pending") return state.raw || JSON.stringify(state.input, null, 2)
    return JSON.stringify(state.input, null, 2)
  }
  if (part.type === "file") return part.source?.type === "file" ? part.source.path : part.url
  if (part.type === "patch") return part.files.join("\n")
  if (part.type === "subtask") return part.prompt
  return ""
}

function Icon(props: { type: Part["type"] }) {
  if (props.type === "reasoning") return <Sparkles className="size-4" />
  if (props.type === "tool" || props.type === "patch") return <Hammer className="size-4" />
  return <FileText className="size-4" />
}

export function ProcessPart(props: { part: Part }) {
  const [open, setOpen] = useState(true)
  const bodyRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)
  const body = partBody(props.part)

  useLayoutEffect(() => {
    if (!open || !stickToBottomRef.current) return
    const element = bodyRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [body, open])

  return (
    <div className="my-2">
      <button
        className="flex w-full items-center gap-2 rounded-md px-0 py-1.5 text-left text-zinc-500 hover:text-zinc-700"
        onClick={() => setOpen(!open)}
      >
        {open ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <span className="text-zinc-400">
          <Icon type={props.part.type} />
        </span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-zinc-400">{props.part.type}</span>
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-600">{partLabel(props.part)}</span>
        <span
          className={cn(
            "size-1.5 rounded-full",
            props.part.type === "tool" && props.part.state.status === "error"
              ? "bg-red-400"
              : props.part.type === "tool" && props.part.state.status !== "completed"
                ? "bg-amber-400"
                : "bg-emerald-400",
          )}
        />
      </button>
      {open && body ? (
        <div
          ref={bodyRef}
          className="process-markdown max-h-64 overflow-y-auto overflow-x-hidden rounded-r-lg border-l-[3px] border-zinc-300/70 bg-zinc-100/45 px-3 py-2.5 [overflow-wrap:anywhere]"
          onScroll={(event) => {
            const element = event.currentTarget
            stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24
          }}
        >
          <Markdown text={body} />
        </div>
      ) : null}
    </div>
  )
}
