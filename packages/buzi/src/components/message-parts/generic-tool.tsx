import { Hammer } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { CollapsiblePart, FieldList } from "./shared"
import { stringInput, toolError, toolOutput, toolStatus, toolTitle, type ToolPart } from "./groups"

function toolBody(part: ToolPart) {
  if (part.state.status === "completed") return part.state.output || part.state.title
  if (part.state.status === "error") return part.state.error
  if (part.state.status === "pending") return part.state.raw || JSON.stringify(part.state.input, null, 2)
  return JSON.stringify(part.state.input, null, 2)
}

function viewStatus(part: ToolPart) {
  if (part.state.status === "error") return "error" as const
  if (part.state.status === "pending" || part.state.status === "running") return "running" as const
  return "done" as const
}

export const GenericToolView = memo(function GenericToolView(props: { part: ToolPart; message: Message }) {
  return (
    <CollapsiblePart
      icon={<Hammer className="size-4" />}
      label={props.part.tool}
      detail={toolTitle(props.part)}
      status={viewStatus(props.part)}
      defaultOpen={toolStatus(props.part) !== "completed"}
    >
      <FieldList
        rows={[
          ["status", toolStatus(props.part)],
          ["path", stringInput(props.part, "filePath") ?? stringInput(props.part, "path")],
          ["error", toolError(props.part)],
        ]}
      />
      {toolOutput(props.part) || toolBody(props.part) ? (
        <div className="mt-2">
          <Markdown text={toolOutput(props.part) ?? toolBody(props.part)} streaming={viewStatus(props.part) === "running"} />
        </div>
      ) : null}
    </CollapsiblePart>
  )
})
