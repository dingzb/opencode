import { ChevronDown, ChevronRight, Hammer } from "lucide-react"
import { memo, useState } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import {
  type AssistantPartGroup,
  groupsInterrupted,
  groupsStreaming,
  processedLabel,
} from "./groups"
import { RenderAssistantGroup } from "./render-group"

export const ProcessingSummary = memo(function ProcessingSummary(props: {
  groups: AssistantPartGroup[]
  message: Message
  durationMs?: number
}) {
  const streaming = groupsStreaming(props.groups) || (props.message.role === "assistant" && typeof props.message.time.completed !== "number")
  const interrupted = !streaming && groupsInterrupted(props.groups)
  const [userOpen, setUserOpen] = useState<boolean | undefined>(undefined)
  const open = userOpen ?? streaming
  if (props.groups.length === 0) return null
  const label = interrupted ? "Interrupted" : processedLabel(props.durationMs)
  const content = (
    <div className="mb-3">
      {props.groups.map((group, index) => (
        <RenderAssistantGroup group={group} message={props.message} key={group.type === "context" ? `context-${group.parts[0]?.id ?? index}` : group.part.id} />
      ))}
    </div>
  )

  if (streaming) return content

  return (
    <div className="mb-3">
      <button
        className="mb-1 inline-flex items-center gap-1.5 text-left text-sm text-zinc-500 hover:text-zinc-700"
        onClick={() => setUserOpen(!open)}
      >
        <Hammer className="size-3.5 text-zinc-400" />
        <span>{label}</span>
        {open ? <ChevronDown className="size-3.5 shrink-0" /> : <ChevronRight className="size-3.5 shrink-0" />}
      </button>
      {open ? (
        <div>
          {props.groups.map((group, index) => (
            <RenderAssistantGroup group={group} message={props.message} key={group.type === "context" ? `context-${group.parts[0]?.id ?? index}` : group.part.id} />
          ))}
        </div>
      ) : null}
    </div>
  )
})
