import { memo } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { type AssistantPartGroup } from "./groups"
import { ContextToolGroup } from "./context-tool-group"
import { GenericPartView } from "./generic-part"
import { GenericToolView } from "./generic-tool"
import { partRenderer, toolRenderer } from "./registry"

export const RenderAssistantGroup = memo(function RenderAssistantGroup(props: {
  group: AssistantPartGroup
  message: Message
}) {
  if (props.group.type === "context") return <ContextToolGroup parts={props.group.parts} />
  if (props.group.part.type === "tool") {
    const Tool = toolRenderer(props.group.part.tool) ?? GenericToolView
    return <Tool part={props.group.part} message={props.message} />
  }

  const Part = partRenderer(props.group.part.type) ?? GenericPartView
  return <Part part={props.group.part} message={props.message} />
})
