import { SendHorizonal } from "lucide-react"
import { useState } from "react"
import { Button } from "./ui/button"

export function Composer(props: { disabled?: boolean; onSubmit: (text: string) => Promise<void> }) {
  const [text, setText] = useState("")

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    setText("")
    await props.onSubmit(value)
  }

  return (
    <div className="border-t border-zinc-200/80 bg-[#fbfbfa] px-7 py-5">
      <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-sm">
        <textarea
          className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
          value={text}
          disabled={props.disabled}
          placeholder="Ask opencode..."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || (!event.metaKey && !event.ctrlKey)) return
            event.preventDefault()
            if (event.repeat) return
            void submit()
          }}
        />
        <Button
          type="button"
          className="mb-1 size-9 rounded-xl px-0"
          disabled={props.disabled || !text.trim()}
          onClick={submit}
        >
          <SendHorizonal className="size-4" />
        </Button>
      </div>
    </div>
  )
}
