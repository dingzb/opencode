import { FileText } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { CollapsiblePart, FieldList } from "./shared"
import type { FilePart } from "./groups"

export const FilePartView = memo(function FilePartView(props: { part: FilePart; message: Message }) {
  const source = props.part.source?.type === "file" ? props.part.source.path : undefined

  return (
    <CollapsiblePart
      icon={<FileText className="size-4" />}
      label="File"
      detail={props.part.filename ?? source ?? props.part.mime}
      status="done"
    >
      <FieldList rows={[["name", props.part.filename], ["mime", props.part.mime], ["source", source], ["url", props.part.url]]} />
    </CollapsiblePart>
  )
})
