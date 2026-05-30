import { FilePenLine } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import { filePathFromTool, stringInput, toolError, toolOutput, type ToolPart } from "./groups"
import { CollapsiblePart, FieldList } from "./shared"

function label(part: ToolPart) {
  const running = part.state.status === "pending" || part.state.status === "running"
  if (part.tool === "write") return running ? "Writing file" : "Wrote file"
  if (part.tool === "apply_patch") return running ? "Applying patch" : "Applied patch"
  return running ? "Editing file" : "Edited file"
}

function detail(part: ToolPart) {
  if (part.tool === "apply_patch") {
    const files = stringInput(part, "files")
    if (files) return files
    return undefined
  }
  return filePathFromTool(part)
}

function status(part: ToolPart) {
  if (part.state.status === "error") return "error" as const
  if (part.state.status === "pending" || part.state.status === "running") return "running" as const
  return "done" as const
}

function inputPreview(part: ToolPart) {
  if (part.tool === "edit") {
    const oldString = stringInput(part, "oldString")
    const newString = stringInput(part, "newString")
    if (oldString || newString) return ["```diff", oldString ? `- ${oldString}` : "", newString ? `+ ${newString}` : "", "```"].filter(Boolean).join("\n")
  }
  if (part.tool === "write") return stringInput(part, "content")
  if (part.tool === "apply_patch") return stringInput(part, "patch")
}

export const FileOperationToolView = memo(function FileOperationToolView(props: { part: ToolPart; message: Message }) {
  const preview = inputPreview(props.part)

  return (
    <CollapsiblePart
      icon={<FilePenLine className="size-4" />}
      label={label(props.part)}
      detail={detail(props.part)}
      status={status(props.part)}
      defaultOpen={status(props.part) === "error"}
    >
      <FieldList
        rows={[
          ["status", props.part.state.status],
          ["file", filePathFromTool(props.part)],
          ["error", toolError(props.part)],
        ]}
      />
      {preview ? (
        <div className="mt-2">
          <Markdown text={preview} />
        </div>
      ) : null}
      {toolOutput(props.part) ? (
        <div className="mt-2">
          <Markdown text={toolOutput(props.part) ?? ""} />
        </div>
      ) : null}
    </CollapsiblePart>
  )
})
