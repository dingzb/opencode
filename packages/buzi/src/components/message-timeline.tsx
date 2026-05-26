import { useLayoutEffect, useRef } from "react"
import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import { Bot, UserRound } from "lucide-react"
import { Markdown } from "./markdown"
import { ProcessPart } from "./process-part"
import { cn } from "../lib/utils"

function textParts(parts: Part[]) {
  return parts.filter((part) => part.type === "text").map((part) => part.text)
}

function processParts(parts: Part[]) {
  return parts.filter((part) => part.type !== "text" && part.type !== "step-start" && part.type !== "step-finish")
}

export function MessageTimeline(props: { messages: Message[]; parts: Record<string, Part[]>; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const stickToBottomRef = useRef(true)

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return
    const element = scrollRef.current
    if (!element) return
    element.scrollTop = element.scrollHeight
  }, [props.messages, props.parts])

  if (props.loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Loading conversations...</div>
  }

  if (props.messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="mb-3 rounded-full border border-zinc-200 bg-white p-3 shadow-sm">
          <Bot className="size-5 text-zinc-500" />
        </div>
        <h2 className="text-lg font-semibold text-zinc-950">Start a focused coding session</h2>
        <p className="mt-1 max-w-md text-sm text-zinc-500">
          Pick a session or send a message. Responses stream from the local opencode server.
        </p>
      </div>
    )
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-7 py-7"
      onScroll={(event) => {
        const element = event.currentTarget
        stickToBottomRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 24
      }}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        {props.messages.map((message) => {
          const parts = props.parts[message.id] ?? []
          const text = textParts(parts).join("\n\n")
          const processes = processParts(parts)
          const user = message.role === "user"

          return (
            <div key={message.id} className={cn("flex gap-3.5", user && "justify-end")}>
              {!user ? (
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm">
                  <Bot className="size-4 text-zinc-600" />
                </div>
              ) : null}
              <div className={cn("min-w-0", user ? "max-w-[70%]" : "flex-1")}>
                {user ? (
                  <div className="rounded-2xl rounded-tr-md bg-zinc-950 px-4 py-2.5 text-sm leading-6 text-white shadow-sm">
                    {text || "Message sent"}
                  </div>
                ) : (
                  <div className="rounded-xl border border-zinc-200/90 bg-white px-4 py-3.5 shadow-sm">
                    {processes.map((part) => (
                      <ProcessPart key={part.id} part={part} />
                    ))}
                    {text ? <Markdown text={text} /> : <div className="text-sm text-zinc-500">Waiting for output...</div>}
                  </div>
                )}
              </div>
              {user ? (
                <div className="mt-1 flex size-8 shrink-0 items-center justify-center rounded-full bg-zinc-950 shadow-sm">
                  <UserRound className="size-4 text-white" />
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
