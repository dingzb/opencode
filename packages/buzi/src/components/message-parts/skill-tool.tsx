import { Brain } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { stringInput, toolStatus, type ToolPart } from "./groups"
import { CollapsiblePart, FieldList } from "./shared"

export const SkillToolView = memo(function SkillToolView(props: { part: ToolPart; message: Message }) {
  const name = stringInput(props.part, "name") ?? "Skill"
  const running = props.part.state.status === "pending" || props.part.state.status === "running"

  return (
    <CollapsiblePart
      icon={<Brain className="size-4" />}
      label={running ? "Loading skill" : "Skill"}
      detail={name}
      status={props.part.state.status === "error" ? "error" : running ? "running" : "done"}
      hideDetails={props.part.state.status === "completed"}
      defaultOpen={props.part.state.status === "error"}
    >
      <FieldList rows={[["name", name], ["status", toolStatus(props.part)]]} />
    </CollapsiblePart>
  )
})
