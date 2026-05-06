import type { Session } from "@opencode-ai/sdk/v2/client"

type SidebarProps = {
  sessions: Session[]
  activeSessionID: string
  serverUrl: string
  directory: string
  status: string
  onNewSession: () => void
  onSelectSession: (sessionID: string) => void
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">OC</div>
        <div>
          <div className="brand-name">opencode</div>
          <div className="brand-meta">{props.status}</div>
        </div>
      </div>

      <button className="new-session" type="button" onClick={props.onNewSession}>
        <span aria-hidden="true">+</span>
        New session
      </button>

      <div className="server-card">
        <div className="eyebrow">Server</div>
        <div className="mono-text">{props.serverUrl}</div>
        <div className="eyebrow">Directory</div>
        <div className="mono-text">{props.directory}</div>
      </div>

      <div className="section-label">Sessions</div>
      <div className="session-list">
        {props.sessions.map((session) => (
          <button
            className={session.id === props.activeSessionID ? "session-item active" : "session-item"}
            key={session.id}
            type="button"
            onClick={() => props.onSelectSession(session.id)}
          >
            <span>{session.title || "Untitled session"}</span>
            <small>{session.id}</small>
          </button>
        ))}
      </div>
    </aside>
  )
}
