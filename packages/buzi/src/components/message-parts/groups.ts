import type { Part } from "@opencode-ai/sdk/v2/client"

export type TextPart = Extract<Part, { type: "text" }>
export type ReasoningPart = Extract<Part, { type: "reasoning" }>
export type ToolPart = Extract<Part, { type: "tool" }>
export type PatchPart = Extract<Part, { type: "patch" }>
export type FilePart = Extract<Part, { type: "file" }>
export type SubtaskPart = Extract<Part, { type: "subtask" }>

export type AssistantPartGroup =
  | { type: "context"; parts: ToolPart[] }
  | { type: "part"; part: Part }

const contextTools = new Set(["read", "list", "grep", "glob"])
const hiddenTools = new Set(["todowrite"])

export function isContextTool(part: Part): part is ToolPart {
  return part.type === "tool" && contextTools.has(part.tool)
}

export function renderablePart(part: Part) {
  if (part.type === "step-start" || part.type === "step-finish") return false
  if (part.type === "tool" && hiddenTools.has(part.tool)) return false
  if (part.type === "text") return !!part.text.trim()
  if (part.type === "reasoning") return !!part.text.trim()
  return true
}

export function groupAssistantParts(parts: Part[]) {
  const groups: AssistantPartGroup[] = []
  let context: ToolPart[] = []

  const flushContext = () => {
    if (context.length === 0) return
    groups.push({ type: "context", parts: context })
    context = []
  }

  parts.filter(renderablePart).forEach((part) => {
    if (isContextTool(part)) {
      context.push(part)
      return
    }

    flushContext()
    groups.push({ type: "part", part })
  })

  flushContext()
  return groups
}

export function splitAssistantGroups(groups: AssistantPartGroup[]) {
  const finalGroup = groups.at(-1)
  return {
    processGroups: finalGroup?.type === "part" && finalGroup.part.type === "text" ? groups.slice(0, -1) : groups,
    finalText: finalGroup?.type === "part" && finalGroup.part.type === "text" ? finalGroup.part : undefined,
  }
}

export function partStreaming(part: Part) {
  if (part.type === "reasoning") return typeof part.time.end !== "number"
  if (part.type === "text") return typeof part.time?.end !== "number"
  if (part.type === "tool") return part.state.status === "pending" || part.state.status === "running"
  return false
}

export function groupsStreaming(groups: AssistantPartGroup[]) {
  return groups.some((group) =>
    group.type === "context" ? group.parts.some(partStreaming) : partStreaming(group.part),
  )
}

export function formatDuration(ms: number) {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}m ${seconds}s`
}

export function processedLabel(durationMs?: number) {
  return typeof durationMs === "number" && durationMs >= 0 ? `Worked for ${formatDuration(durationMs)}` : "Worked"
}

export function contextSummary(parts: ToolPart[]) {
  const read = parts.filter((part) => part.tool === "read").length
  const search = parts.filter((part) => part.tool === "grep" || part.tool === "glob").length
  const list = parts.filter((part) => part.tool === "list").length
  return { read, search, list }
}

export function groupSummary(groups: AssistantPartGroup[]) {
  const context = groups.flatMap((group) => (group.type === "context" ? group.parts : []))
  const tools = groups.filter((group) => group.type === "part" && group.part.type === "tool").length
  const summary = contextSummary(context)
  return [
    summary.read ? `${summary.read} read${summary.read === 1 ? "" : "s"}` : "",
    summary.search ? `${summary.search} search${summary.search === 1 ? "" : "es"}` : "",
    summary.list ? `${summary.list} list${summary.list === 1 ? "" : "s"}` : "",
    tools ? `${tools} tool${tools === 1 ? "" : "s"}` : "",
  ].filter(Boolean)
}

export function toolInput(part: ToolPart) {
  return part.state.input
}

export function stringInput(part: ToolPart, key: string) {
  const value = toolInput(part)[key]
  return typeof value === "string" && value ? value : undefined
}

export function filePathFromTool(part: ToolPart) {
  return stringInput(part, "filePath") ?? stringInput(part, "path")
}

export function toolStatus(part: ToolPart) {
  return part.state.status
}

export function toolOutput(part: ToolPart) {
  return part.state.status === "completed" ? part.state.output : undefined
}

export function toolError(part: ToolPart) {
  return part.state.status === "error" ? part.state.error : undefined
}

export function toolInterrupted(part: ToolPart) {
  return toolError(part)?.toLowerCase().includes("aborted") ?? false
}

export function groupsInterrupted(groups: AssistantPartGroup[]) {
  return groups.some((group) =>
    group.type === "context" ? group.parts.some(toolInterrupted) : group.part.type === "tool" && toolInterrupted(group.part),
  )
}

export function toolTitle(part: ToolPart) {
  if (part.tool === "skill") return stringInput(part, "name") ?? "Skill"
  if (part.tool === "bash") return stringInput(part, "description") ?? "Shell command"
  if (part.tool === "task") return stringInput(part, "description") ?? stringInput(part, "subagent_type") ?? "Task"
  if (part.tool === "read") return filePathFromTool(part) ?? "Read"
  if (part.tool === "grep") return stringInput(part, "pattern") ?? "Search"
  if (part.tool === "glob") return stringInput(part, "pattern") ?? "Find files"
  if (part.tool === "list") return filePathFromTool(part) ?? "List files"
  return part.tool
}

export function pendingLabel(groups: AssistantPartGroup[]) {
  const group = groups.at(-1)
  if (!group) return "Thinking"
  if (group.type === "context") return "Gathering context"
  const part = group.part
  if (part.type === "reasoning") return "Thinking"
  if (part.type === "text") return "Writing response"
  if (part.type !== "tool") return "Working"
  if (part.tool === "skill") return `Loading skill${stringInput(part, "name") ? `: ${stringInput(part, "name")}` : ""}`
  if (part.tool === "read") return `Reading ${filePathFromTool(part) ?? "file"}`
  if (part.tool === "grep" || part.tool === "glob") return "Searching"
  if (part.tool === "list") return "Listing files"
  if (part.tool === "bash") return "Running command"
  if (part.tool === "edit" || part.tool === "write" || part.tool === "apply_patch") return "Editing files"
  if (part.tool === "task") return "Running subtask"
  if (part.tool === "question") return "Waiting for answer"
  if (part.tool === "webfetch") return "Fetching page"
  if (part.tool === "websearch") return "Searching web"
  return `Running ${part.tool}`
}
