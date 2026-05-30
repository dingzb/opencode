import { memo, useMemo } from "react"
import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import "./builtins"
import { groupAssistantParts, groupsInterrupted, pendingLabel, splitAssistantGroups } from "./groups"
import { ProcessingSummary } from "./processing-summary"
import { TextPartView } from "./text-part"

export const AssistantPartList = memo(function AssistantPartList(props: {
  message: Message
  parts: Part[]
  meta?: string
  turnDurationMs?: number
}) {
  const groups = useMemo(() => groupAssistantParts(props.parts), [props.parts])
  const split = useMemo(() => splitAssistantGroups(groups), [groups])
  const streaming = props.message.role === "assistant" && typeof props.message.time.completed !== "number"
  const interrupted = !streaming && groupsInterrupted(groups)

  return (
    <div className="min-w-0 flex-1">
      <ProcessingSummary groups={split.processGroups} message={props.message} durationMs={props.turnDurationMs} />
      {split.finalText ? (
        <TextPartView part={split.finalText} message={props.message} final meta={props.meta} />
      ) : (
        <div className="text-sm text-zinc-500">{streaming ? pendingLabel(groups) : interrupted ? "Interrupted by user." : "No response text."}</div>
      )}
    </div>
  )
})
