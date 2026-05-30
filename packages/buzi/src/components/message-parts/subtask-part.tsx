import { GitBranchPlus } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { CollapsiblePart, FieldList } from "./shared"
import type { SubtaskPart } from "./groups"

export const SubtaskPartView = memo(function SubtaskPartView(props: { part: SubtaskPart; message: Message }) {
  return (
    <CollapsiblePart icon={<GitBranchPlus className="size-4" />} label="Subtask" detail={props.part.description} status="done">
      <FieldList rows={[["agent", props.part.agent], ["command", props.part.command]]} />
      <div className="mt-2">
        <Markdown text={props.part.prompt} />
      </div>
    </CollapsiblePart>
  )
})
