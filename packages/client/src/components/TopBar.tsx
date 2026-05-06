import type { Agent } from "@opencode-ai/sdk/v2/client"
import type { ModelSelection } from "../opencode/chat"
import { modelKey } from "../opencode/chat"

type TopBarProps = {
  agents: Agent[]
  models: ModelSelection[]
  selectedAgent: string
  selectedModelKey: string
  sessionTitle: string
  status: string
  onSelectAgent: (agent: string) => void
  onSelectModel: (model: string) => void
}

export function TopBar(props: TopBarProps) {
  return (
    <header className="topbar">
      <div className="session-title">{props.sessionTitle}</div>
      <div className="topbar-controls">
        <label className="select-label">
          <span>Model</span>
          <select value={props.selectedModelKey} onChange={(event) => props.onSelectModel(event.currentTarget.value)}>
            {props.models.map((model) => (
              <option key={modelKey(model)} value={modelKey(model)}>
                {model.label}
              </option>
            ))}
          </select>
        </label>
        <label className="select-label">
          <span>Agent</span>
          <select value={props.selectedAgent} onChange={(event) => props.onSelectAgent(event.currentTarget.value)}>
            {props.agents.map((agent) => (
              <option key={agent.name} value={agent.name}>
                {agent.name}
              </option>
            ))}
          </select>
        </label>
        <div className="status-pill">
          <span aria-hidden="true" />
          {props.status}
        </div>
        <button className="icon-button" type="button" title="Settings">
          <span aria-hidden="true">*</span>
        </button>
      </div>
    </header>
  )
}
