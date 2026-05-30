import { memo, useCallback, useLayoutEffect, useMemo, useRef } from "react"
import type { Message, Part } from "@opencode-ai/sdk/v2/client"
import { Bot } from "lucide-react"
import { Virtualizer, type VirtualizerHandle } from "virtua"
import { Markdown } from "./markdown"
import { ProcessPart } from "./process-part"
import { cn } from "../lib/utils"

function textParts(parts: Part[]) {
  return parts.filter((part) => part.type === "text").map((part) => part.text)
}

function processParts(parts: Part[]) {
  return parts.filter((part) => part.type !== "text" && part.type !== "step-start" && part.type !== "step-finish")
}

const emptyParts: Part[] = []

const MessageItem = memo(function MessageItem(props: { message: Message; parts: Part[] }) {
  const text = useMemo(() => textParts(props.parts).join("\n\n"), [props.parts])
  const processes = useMemo(() => processParts(props.parts), [props.parts])
  const user = props.message.role === "user"
  const streaming = !user && (!("completed" in props.message.time) || typeof props.message.time.completed !== "number")

  return (
    <div className={cn("flex min-w-0", user ? "justify-end" : "justify-start")}>
      {user ? (
        <div className="max-w-[72%] rounded-2xl rounded-tr-md bg-[#ececea] px-4 py-2.5 text-sm leading-6 text-zinc-800">
          {text || "Message sent"}
        </div>
      ) : (
        <div className="min-w-0 flex-1">
          {processes.map((part) => (
            <ProcessPart key={part.id} part={part} />
          ))}
          {text ? <Markdown text={text} streaming={streaming} /> : <div className="text-sm text-zinc-500">Waiting for output...</div>}
        </div>
      )}
    </div>
  )
})

export function MessageTimeline(props: { messages: Message[]; parts: Record<string, Part[]>; loading: boolean }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizerRef = useRef<VirtualizerHandle>(null)
  const stickToBottomRef = useRef(true)
  const scrollFrameRef = useRef<number | undefined>(undefined)
  const userScrollAtRef = useRef(0)
  const keepMounted = useMemo(() => {
    if (props.messages.length === 0) return []
    return [props.messages.length - 1]
  }, [props.messages.length])

  const isAtBottom = useCallback((element: HTMLDivElement) => {
    return element.scrollHeight - element.scrollTop - element.clientHeight < 24
  }, [])

  const scrollToBottom = useCallback(() => {
    if (scrollFrameRef.current !== undefined) window.cancelAnimationFrame(scrollFrameRef.current)
    scrollFrameRef.current = window.requestAnimationFrame(() => {
      scrollFrameRef.current = undefined
      const element = scrollRef.current
      if (!element || !stickToBottomRef.current) return
      if (props.messages.length === 0) return
      virtualizerRef.current?.scrollToIndex(props.messages.length - 1, { align: "end" })
      element.scrollTop = element.scrollHeight
    })
  }, [props.messages.length])

  const markUserScroll = useCallback(() => {
    userScrollAtRef.current = Date.now()
  }, [])

  useLayoutEffect(() => {
    if (!stickToBottomRef.current) return
    scrollToBottom()
  }, [props.messages, props.parts, scrollToBottom])

  useLayoutEffect(() => {
    const element = scrollRef.current
    if (!element) return

    const observer = new ResizeObserver(() => {
      if (stickToBottomRef.current) scrollToBottom()
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [scrollToBottom])

  useLayoutEffect(() => {
    return () => {
      if (scrollFrameRef.current !== undefined) window.cancelAnimationFrame(scrollFrameRef.current)
    }
  }, [])

  if (props.loading) {
    return <div className="flex flex-1 items-center justify-center text-sm text-zinc-500">Loading conversations...</div>
  }

  if (props.messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-8 pb-36 text-center">
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
      className="chat-scrollbar min-w-0 flex-1 overflow-x-hidden overflow-y-scroll px-7 pb-40 pt-7"
      onKeyDown={markUserScroll}
      onPointerDown={markUserScroll}
      onScroll={(event) => {
        const element = event.currentTarget
        if (isAtBottom(element)) {
          stickToBottomRef.current = true
          return
        }
        if (Date.now() - userScrollAtRef.current < 500) stickToBottomRef.current = false
      }}
      onTouchStart={markUserScroll}
      onWheel={markUserScroll}
    >
      <Virtualizer
        data={props.messages}
        itemSize={96}
        keepMounted={keepMounted}
        ref={virtualizerRef}
        scrollRef={scrollRef}
      >
        {(message) => (
          <div className="mx-auto max-w-[800px] pb-7">
            <MessageItem message={message} parts={props.parts[message.id] ?? emptyParts} />
          </div>
        )}
      </Virtualizer>
    </div>
  )
}
