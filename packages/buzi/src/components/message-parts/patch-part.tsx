import { GitPullRequestArrow } from "lucide-react"
import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { CollapsiblePart } from "./shared"
import type { PatchPart } from "./groups"

export const PatchPartView = memo(function PatchPartView(props: { part: PatchPart; message: Message }) {
  return (
    <CollapsiblePart
      icon={<GitPullRequestArrow className="size-4" />}
      label="Changed files"
      detail={`${props.part.files.length} file${props.part.files.length === 1 ? "" : "s"}`}
      status="done"
    >
      <div className="space-y-1 font-mono text-xs text-zinc-700">
        {props.part.files.map((file) => (
          <div className="truncate" key={file}>{file}</div>
        ))}
      </div>
    </CollapsiblePart>
  )
})
