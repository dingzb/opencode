import type { ComponentType } from "react"
import type { PartRendererProps, ToolRendererProps } from "./registry"
import { registerPartRenderer, registerToolRenderer } from "./registry"
import { TextPartView } from "./text-part"
import { ReasoningPartView } from "./reasoning-part"
import { PatchPartView } from "./patch-part"
import { FilePartView } from "./file-part"
import { SubtaskPartView } from "./subtask-part"
import { SkillToolView } from "./skill-tool"
import { FileOperationToolView } from "./file-operation-tool"
import { TaskToolView } from "./task-tool"
import { QuestionToolView } from "./question-tool"

registerPartRenderer("text", TextPartView as ComponentType<PartRendererProps>)
registerPartRenderer("reasoning", ReasoningPartView as ComponentType<PartRendererProps>)
registerPartRenderer("patch", PatchPartView as ComponentType<PartRendererProps>)
registerPartRenderer("file", FilePartView as ComponentType<PartRendererProps>)
registerPartRenderer("subtask", SubtaskPartView as ComponentType<PartRendererProps>)

registerToolRenderer("skill", SkillToolView as ComponentType<ToolRendererProps>)
registerToolRenderer("edit", FileOperationToolView as ComponentType<ToolRendererProps>)
registerToolRenderer("write", FileOperationToolView as ComponentType<ToolRendererProps>)
registerToolRenderer("apply_patch", FileOperationToolView as ComponentType<ToolRendererProps>)
registerToolRenderer("task", TaskToolView as ComponentType<ToolRendererProps>)
registerToolRenderer("question", QuestionToolView as ComponentType<ToolRendererProps>)
