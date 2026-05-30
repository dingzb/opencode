import { CircleHelp } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { stringInput, toolError, toolInterrupted, toolOutput, type ToolPart } from "./groups"
import { CollapsiblePart, FieldList } from "./shared"

export const QuestionToolView = memo(function QuestionToolView(props: { part: ToolPart; message: Message }) {
  const running = props.part.state.status === "pending" || props.part.state.status === "running"
  const interrupted = toolInterrupted(props.part)

  return (
    <CollapsiblePart
      icon={<CircleHelp className="size-4" />}
      label={interrupted ? "Interrupted" : running ? "Waiting for answer" : "Question"}
      detail={stringInput(props.part, "question")}
      status={interrupted ? "muted" : props.part.state.status === "error" ? "error" : running ? "running" : "done"}
      defaultOpen={props.part.state.status !== "completed" && !interrupted}
    >
      <FieldList
        rows={[
          ["question", stringInput(props.part, "question")],
          ["status", interrupted ? "interrupted by user" : undefined],
          ["error", interrupted ? undefined : toolError(props.part)],
        ]}
      />
      {toolOutput(props.part) ? (
        <div className="mt-2">
          <Markdown text={toolOutput(props.part) ?? ""} />
        </div>
      ) : null}
    </CollapsiblePart>
  )
})
