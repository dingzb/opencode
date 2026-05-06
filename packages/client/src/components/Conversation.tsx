import type { MessageView } from "../opencode/chat"

type ConversationProps = {
  messages: MessageView[]
  status: string
  error: string
}

export function Conversation(props: ConversationProps) {
  return (
    <main className="conversation">
      {props.error && <div className="error-banner">{props.error}</div>}
      {props.messages.length === 0 && (
        <div className="empty-state">
          <div>Start a session</div>
          <span>Choose a model and agent, then send a prompt.</span>
        </div>
      )}
      {props.messages.map((message) => (
        <article className={`message-row ${message.role}`} key={message.id}>
          <div className="message-role">{message.role}</div>
          <div className="message-bubble">{message.text || "..."}</div>
        </article>
      ))}
      {props.status === "streaming" && (
        <div className="streaming-line">
          <span />
          Streaming
        </div>
      )}
    </main>
  )
}
