import { Check, Copy } from "lucide-react"
import { memo, useCallback, useState } from "react"
import type { Message } from "@opencode-ai/sdk/v2/client"
import { Markdown } from "../markdown"
import type { TextPart } from "./groups"

export const TextPartView = memo(function TextPartView(props: {
  part: TextPart
  message: Message
  final?: boolean
  meta?: string
  showCopy?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const streaming = props.message.role === "assistant" && typeof props.message.time.completed !== "number"
  const showCopy = props.showCopy ?? props.final

  const handleCopy = useCallback(async () => {
    if (!props.part.text) return
    try {
      await navigator.clipboard.writeText(props.part.text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [props.part.text])

  return (
    <div className="group/text min-w-0">
      <Markdown text={props.part.text} streaming={streaming && props.final} />
      {showCopy && (props.meta || props.part.text) ? (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400 select-none">
          <button
            onClick={handleCopy}
            className="rounded p-0.5 text-zinc-400 opacity-0 transition-opacity hover:bg-zinc-200 hover:text-zinc-600 group-hover/text:opacity-100"
            aria-label="Copy response"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          {props.meta ? <span>{props.meta}</span> : null}
        </div>
      ) : null}
    </div>
  )
})
