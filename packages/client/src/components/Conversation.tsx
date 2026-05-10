import type { Part, ToolState } from "@opencode-ai/sdk/v2/client"
import type { ReactNode } from "react"
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
      <div className="message-stack">
        {props.messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
      </div>
      {props.status === "streaming" && (
        <div className="streaming-line">
          <span />
          Streaming
        </div>
      )}
    </main>
  )
}

function MessageItem(props: { message: MessageView }) {
  if (props.message.role === "user") {
    return (
      <article className="message-item user-message">
        <div className="user-bubble">{props.message.text || props.message.parts.map(partText).join("") || "..."}</div>
      </article>
    )
  }

  return (
    <article className="message-item assistant-message">
      {props.message.parts.length > 0 ? (
        <div className="assistant-flow">
          {props.message.parts.map((part) => (
            <PartView key={part.id} part={part} />
          ))}
        </div>
      ) : (
        <div className="part-placeholder">Waiting for response...</div>
      )}
    </article>
  )
}

function PartView(props: { part: Part }) {
  if (props.part.type === "text") return <Markdown text={props.part.text || "..."} />
  if (props.part.type === "reasoning") {
    return (
      <ProcessDetails kind="thinking" meta={formatDuration(props.part.time.start, props.part.time.end)} title="Thinking">
        <pre>{props.part.text || "Thinking..."}</pre>
      </ProcessDetails>
    )
  }
  if (props.part.type === "tool") {
    return (
      <ProcessDetails kind={`tool ${props.part.state.status}`} meta={toolStateMeta(props.part.state)} title={props.part.tool}>
        <ToolStateView state={props.part.state} />
      </ProcessDetails>
    )
  }
  if (props.part.type === "step-start") {
    return <ProcessDetails kind="step" meta={props.part.snapshot?.slice(0, 12)} title="Step started" />
  }
  if (props.part.type === "step-finish") {
    return (
      <ProcessDetails
        kind="step"
        meta={`${formatCost(props.part.cost)} / ${props.part.tokens.input} in / ${props.part.tokens.output} out`}
        title={`Step finished: ${props.part.reason}`}
      />
    )
  }
  if (props.part.type === "file") {
    return <ProcessDetails kind="file" meta={props.part.mime} title={props.part.filename ?? props.part.url} />
  }
  if (props.part.type === "agent") {
    return <ProcessDetails kind="agent" title={`Agent @${props.part.name}`} />
  }
  if (props.part.type === "subtask") {
    return (
      <ProcessDetails kind="subtask" meta={`@${props.part.agent}`} title={props.part.description}>
        <pre>{props.part.prompt}</pre>
      </ProcessDetails>
    )
  }
  if (props.part.type === "retry") {
    return (
      <ProcessDetails kind="error" title={`Retry ${props.part.attempt}`}>
        <pre>{stringify(props.part.error)}</pre>
      </ProcessDetails>
    )
  }
  if (props.part.type === "patch") {
    return <ProcessDetails kind="patch" meta={props.part.hash.slice(0, 12)} title={`Patch ${props.part.files.length} files`} />
  }
  if (props.part.type === "snapshot") {
    return <ProcessDetails kind="snapshot" meta={props.part.snapshot.slice(0, 12)} title="Snapshot" />
  }
  if (props.part.type === "compaction") {
    return <ProcessDetails kind="compaction" meta={props.part.auto ? "auto" : "manual"} title="Compaction" />
  }
  return null
}

function ProcessDetails(props: { children?: ReactNode; kind: string; meta?: string; title: string }) {
  if (!props.children) {
    return (
      <div className={`process-card ${props.kind}`}>
        <ProcessSummary meta={props.meta} title={props.title} />
      </div>
    )
  }

  return (
    <details className={`process-card ${props.kind}`}>
      <summary>
        <ProcessSummary meta={props.meta} title={props.title} />
      </summary>
      <div className="process-body">{props.children}</div>
    </details>
  )
}

function ProcessSummary(props: { meta?: string; title: string }) {
  return (
    <>
      <span className="process-dot" />
      <span className="process-title">{props.title}</span>
      {props.meta && <span className="process-meta">{props.meta}</span>}
    </>
  )
}

function ToolStateView(props: { state: ToolState }) {
  if (props.state.status === "pending") {
    return (
      <>
        <LabeledBlock label="Input" value={props.state.input} />
        {props.state.raw && <LabeledBlock label="Raw" value={props.state.raw} />}
      </>
    )
  }
  if (props.state.status === "running") {
    return (
      <>
        {props.state.title && <div className="tool-title">{props.state.title}</div>}
        <LabeledBlock label="Input" value={props.state.input} />
      </>
    )
  }
  if (props.state.status === "completed") {
    return (
      <>
        <div className="tool-title">{props.state.title}</div>
        <LabeledBlock label="Input" value={props.state.input} />
        <LabeledBlock label="Output" value={props.state.output} />
        {props.state.attachments && props.state.attachments.length > 0 && (
          <div className="attachment-list">
            {props.state.attachments.map((attachment) => (
              <code key={attachment.id}>{attachment.filename ?? attachment.url}</code>
            ))}
          </div>
        )}
      </>
    )
  }
  return (
    <>
      <LabeledBlock label="Input" value={props.state.input} />
      <LabeledBlock label="Error" value={props.state.error} />
    </>
  )
}

function Markdown(props: { text: string }) {
  return <div className="markdown-body">{renderBlocks(props.text)}</div>
}

function renderBlocks(text: string) {
  const blocks: ReactNode[] = []
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ""
    if (!line.trim()) {
      index += 1
      continue
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim()
      const code: string[] = []
      index += 1
      while (index < lines.length && !(lines[index] ?? "").startsWith("```")) {
        code.push(lines[index] ?? "")
        index += 1
      }
      index += 1
      blocks.push(
        <pre className="markdown-code" key={blocks.length}>
          {language && <span>{language}</span>}
          <code>{code.join("\n")}</code>
        </pre>,
      )
      continue
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const Tag = `h${(heading[1] ?? "#").length + 1}` as "h2" | "h3" | "h4"
      blocks.push(<Tag key={blocks.length}>{renderInline(heading[2] ?? "")}</Tag>)
      index += 1
      continue
    }

    if (line.startsWith("> ")) {
      const quote: string[] = []
      while (index < lines.length && (lines[index] ?? "").startsWith("> ")) {
        quote.push((lines[index] ?? "").slice(2))
        index += 1
      }
      blocks.push(<blockquote key={blocks.length}>{quote.map(renderInline)}</blockquote>)
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*[-*]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*]\s+/, ""))
        index += 1
      }
      blocks.push(
        <ul key={blocks.length}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (index < lines.length && /^\s*\d+\.\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+\.\s+/, ""))
        index += 1
      }
      blocks.push(
        <ol key={blocks.length}>
          {items.map((item, itemIndex) => (
            <li key={itemIndex}>{renderInline(item)}</li>
          ))}
        </ol>,
      )
      continue
    }

    const paragraph: string[] = []
    while (index < lines.length && (lines[index] ?? "").trim()) {
      const current = lines[index] ?? ""
      if (current.startsWith("```") || /^(#{1,3})\s+/.test(current) || current.startsWith("> ")) break
      if (/^\s*[-*]\s+/.test(current) || /^\s*\d+\.\s+/.test(current)) break
      paragraph.push(current)
      index += 1
    }
    blocks.push(<p key={blocks.length}>{renderInline(paragraph.join("\n"))}</p>)
  }

  return blocks
}

function renderInline(text: string) {
  const nodes: ReactNode[] = []
  const segments = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g)
  segments.forEach((segment, index) => {
    if (!segment) return
    if (segment.startsWith("`") && segment.endsWith("`")) {
      nodes.push(<code key={index}>{segment.slice(1, -1)}</code>)
      return
    }
    if (segment.startsWith("**") && segment.endsWith("**")) {
      nodes.push(<strong key={index}>{segment.slice(2, -2)}</strong>)
      return
    }
    nodes.push(segment)
  })
  return nodes
}

function LabeledBlock(props: { label: string; value: unknown }) {
  return (
    <div className="labeled-block">
      <div>{props.label}</div>
      <pre>{stringify(props.value)}</pre>
    </div>
  )
}

function partText(part: Part) {
  if (part.type === "text") return part.text
  return ""
}

function stringify(value: unknown) {
  if (typeof value === "string") return value
  return JSON.stringify(value, null, 2)
}

function toolStateMeta(state: ToolState) {
  if (state.status === "completed") return "completed"
  if (state.status === "running") return state.title ?? "running"
  if (state.status === "error") return "error"
  return "pending"
}

function formatDuration(start: number, end: number | undefined) {
  if (!end) return "running"
  return `${Math.max(0, Math.round((end - start) / 100) / 10)}s`
}

function formatCost(cost: number) {
  if (cost === 0) return "$0"
  if (cost < 0.01) return `$${cost.toFixed(4)}`
  return `$${cost.toFixed(2)}`
}
