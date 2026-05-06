type ComposerProps = {
  value: string
  disabled: boolean
  canSend: boolean
  selectedAgent: string
  selectedModel: string
  onChange: (value: string) => void
  onSubmit: () => void
}

export function Composer(props: ComposerProps) {
  return (
    <footer className="composer">
      <div className="composer-meta">
        <span>{props.selectedModel}</span>
        <span>{props.selectedAgent || "No agent"}</span>
      </div>
      <form
        className="composer-form"
        onSubmit={(event) => {
          event.preventDefault()
          if (props.canSend) void props.onSubmit()
        }}
      >
        <textarea
          disabled={props.disabled}
          placeholder="Message opencode"
          value={props.value}
          onChange={(event) => props.onChange(event.currentTarget.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            if (props.canSend) void props.onSubmit()
          }}
        />
        <button className="send-button" disabled={!props.canSend || props.disabled} type="submit" title="Send">
          <span aria-hidden="true">&gt;</span>
        </button>
      </form>
    </footer>
  )
}
