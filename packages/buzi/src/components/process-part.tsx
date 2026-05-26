import { ChevronDown, ChevronRight, FileText, Hammer, Sparkles } from "lucide-react"
import { useLayoutEffect, useRef, useState } from "react"
import type { Part } from "@opencode-ai/sdk/v2/client"
import { cn } from "../lib/utils"

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
  const bodyRef = useRef<HTMLPreElement>(null)
  const stickToBottomRef = useRef(true)
  const body = partBody(props.part)

  useLayoutEffect(() => {
    if (!open || !stickToBottomRef.current) return
    const element = bodyRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [body, open])

  return (
    <div className="my-2 rounded-lg border border-zinc-200 bg-zinc-50/80">
      <button className="flex w-full items-center gap-2 px-3 py-2 text-left" onClick={() => setOpen(!open)}>
        {open ? <ChevronDown className="size-4 text-zinc-500" /> : <ChevronRight className="size-4 text-zinc-500" />}
        <span className="text-zinc-500">
          <Icon type={props.part.type} />
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{props.part.type}</span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-zinc-800">{partLabel(props.part)}</span>
        <span
          className={cn(
            "size-2 rounded-full",
            props.part.type === "tool" && props.part.state.status === "error"
              ? "bg-red-500"
              : props.part.type === "tool" && props.part.state.status !== "completed"
                ? "bg-amber-500"
                : "bg-emerald-500",
          )}
        />
      </button>
      {open && body ? (
        <pre
          ref={bodyRef}
          className="max-h-64 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words border-t border-zinc-200 p-3 text-xs leading-5 text-zinc-700 [overflow-wrap:anywhere]"
          onScroll={(event) => {
            const element = event.currentTarget
            stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24
          }}
        >
          {body}
        </pre>
      ) : null}
    </div>
  )
}
