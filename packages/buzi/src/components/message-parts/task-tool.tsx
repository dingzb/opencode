import { GitBranchPlus } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { stringInput, type ToolPart } from "./groups"
import { CollapsiblePart, FieldList } from "./shared"

export const TaskToolView = memo(function TaskToolView(props: { part: ToolPart; message: Message }) {
  const running = props.part.state.status === "pending" || props.part.state.status === "running"

  return (
    <CollapsiblePart
      icon={<GitBranchPlus className="size-4" />}
      label={running ? "Running subtask" : "Subtask"}
      detail={stringInput(props.part, "description") ?? stringInput(props.part, "subagent_type")}
      status={props.part.state.status === "error" ? "error" : running ? "running" : "done"}
      defaultOpen={props.part.state.status === "error"}
    >
      <FieldList
        rows={[
          ["agent", stringInput(props.part, "subagent_type")],
          ["description", stringInput(props.part, "description")],
          ["status", props.part.state.status],
        ]}
      />
    </CollapsiblePart>
  )
})
