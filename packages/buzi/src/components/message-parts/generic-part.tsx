import { FileQuestion } from "lucide-react"
import { memo } from "react"
import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { CollapsiblePart } from "./shared"

function body(part: Part) {
  if (part.type === "agent") return part.name
  if (part.type === "compaction") return part.overflow ? "Compaction required by context overflow." : "Session compacted."
  return JSON.stringify(part, null, 2)
}

export const GenericPartView = memo(function GenericPartView(props: { part: Part; message: Message }) {
  return (
    <CollapsiblePart icon={<FileQuestion className="size-4" />} label={props.part.type} status="done">
      <Markdown text={body(props.part)} />
    </CollapsiblePart>
  )
})
