import { Sparkles } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { CollapsiblePart } from "./shared"
import type { ReasoningPart } from "./groups"

export const ReasoningPartView = memo(function ReasoningPartView(props: { part: ReasoningPart; message: Message }) {
  return (
    <CollapsiblePart
      icon={<Sparkles className="size-4" />}
      label="Thinking"
      status={typeof props.part.time.end === "number" ? "done" : "running"}
      defaultOpen={typeof props.part.time.end !== "number"}
    >
      <Markdown text={props.part.text} streaming={typeof props.part.time.end !== "number"} />
    </CollapsiblePart>
  )
})
