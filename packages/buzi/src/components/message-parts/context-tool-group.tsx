import { BookOpen, Search, ListTree } from "lucide-react"
import { memo } from "react"
import { contextSummary, filePathFromTool, toolStatus, toolTitle, type ToolPart } from "./groups"
import { CollapsiblePart } from "./shared"

function summaryText(parts: ToolPart[]) {
  const summary = contextSummary(parts)
  return [
    summary.read ? `${summary.read} read${summary.read === 1 ? "" : "s"}` : "",
    summary.search ? `${summary.search} search${summary.search === 1 ? "" : "es"}` : "",
    summary.list ? `${summary.list} list${summary.list === 1 ? "" : "s"}` : "",
  ].filter(Boolean).join(" · ")
}

function status(parts: ToolPart[]) {
  if (parts.some((part) => part.state.status === "error")) return "error" as const
  if (parts.some((part) => part.state.status === "pending" || part.state.status === "running")) return "running" as const
  return "done" as const
}

function Icon(props: { tool: string }) {
  if (props.tool === "read") return <BookOpen className="size-3.5" />
  if (props.tool === "list") return <ListTree className="size-3.5" />
  return <Search className="size-3.5" />
}

export const ContextToolGroup = memo(function ContextToolGroup(props: { parts: ToolPart[] }) {
  return (
    <CollapsiblePart
      icon={<BookOpen className="size-4" />}
      label={status(props.parts) === "running" ? "Gathering context" : "Gathered context"}
      detail={summaryText(props.parts)}
      status={status(props.parts)}
      defaultOpen={status(props.parts) === "running"}
    >
      <div className="space-y-2">
        {props.parts.map((part) => (
          <div className="flex items-center gap-2 text-sm text-zinc-600" key={part.id}>
            <span className="text-zinc-400">
              <Icon tool={part.tool} />
            </span>
            <span className="font-medium text-zinc-700">{part.tool}</span>
            <span className="min-w-0 flex-1 truncate font-mono text-xs text-zinc-500">
              {filePathFromTool(part) ?? toolTitle(part)}
            </span>
            <span className="text-[11px] uppercase tracking-wide text-zinc-400">{toolStatus(part)}</span>
          </div>
        ))}
      </div>
    </CollapsiblePart>
  )
})
