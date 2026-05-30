import type { ComponentType } from "react"
import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import type { ToolPart } from "./groups"

export type PartRendererProps<T extends Part = Part> = {
  part: T
  message: Message
  final?: boolean
  meta?: string
  showCopy?: boolean
}

export type ToolRendererProps<T extends ToolPart = ToolPart> = {
  part: T
  message: Message
}

const partRenderers: Record<string, ComponentType<PartRendererProps> | undefined> = {}
const toolRenderers: Record<string, ComponentType<ToolRendererProps> | undefined> = {}

export function registerPartRenderer(type: string, renderer: ComponentType<PartRendererProps>) {
  partRenderers[type] = renderer
}

export function registerToolRenderer(tool: string, renderer: ComponentType<ToolRendererProps>) {
  toolRenderers[tool] = renderer
}

export function partRenderer(type: string) {
  return partRenderers[type]
}

export function toolRenderer(tool: string) {
  return toolRenderers[tool]
}
