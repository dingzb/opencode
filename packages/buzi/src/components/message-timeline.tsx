import { memo, useCallback, useLayoutEffect, useMemo, useRef, useState } from "react"
import type { Message, Part, Provider, AssistantMessage } from "@opencode-ai/sdk/v2/client"
import { Bot, Copy, Check } from "lucide-react"
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

function formatAgent(agent: string) {
  return agent ? agent[0]?.toUpperCase() + agent.slice(1) : ""
}

function formatDuration(ms: number) {
  const total = Math.round(ms / 1000)
  if (total < 60) return `${total}s`
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}m ${seconds}s`
}

function formatMessageTime(created: number) {
  const d = new Date(created)
  const now = new Date()
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  const locale = navigator.language
  if (isToday) return new Intl.DateTimeFormat(locale, { timeStyle: "short" }).format(d)
  return new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(d)
}

function modelDisplayName(
  message: Message,
  providers?: Array<Provider>,
) {
  if (message.role === "user") {
    const provider = providers?.find((p) => p.id === message.model.providerID)
    return provider?.models?.[message.model.modelID]?.name ?? message.model.modelID
  }
  const provider = providers?.find((p) => p.id === message.providerID)
  return provider?.models?.[message.modelID]?.name ?? message.modelID
}

const MessageItem = memo(function MessageItem(props: { message: Message; parts: Part[]; providers?: Array<Provider>; turnDurationMs?: number }) {
  const text = useMemo(() => textParts(props.parts).join("\n\n"), [props.parts])
  const processes = useMemo(() => processParts(props.parts), [props.parts])
  const user = props.message.role === "user"
  const streaming = !user && (!("completed" in props.message.time) || typeof props.message.time.completed !== "number")
  const [copied, setCopied] = useState(false)

  const metaItems = useMemo(() => {
    const agent = formatAgent(props.message.agent)
    const model = modelDisplayName(props.message, props.providers)
    const items = [agent, model].filter(Boolean)

    if (user) {
      const created = props.message.time?.created
      if (typeof created === "number") {
        items.push(formatMessageTime(created))
      }
    } else {
      if (typeof props.turnDurationMs === "number" && props.turnDurationMs >= 0) {
        items.push(formatDuration(props.turnDurationMs))
      }
    }
    return items.join(" · ")
  }, [props.message, props.providers, user])

  const handleCopy = useCallback(async () => {
    const content = textParts(props.parts).join("\n\n")
    if (!content) return
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {}
  }, [props.parts])

  return (
    <div className={cn("group flex flex-col w-full", user ? "items-end" : "items-start")}>
      <div className={cn("flex min-w-0", user ? "justify-end w-full" : "justify-start")}>
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
      {metaItems ? (
        <div className={cn("mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400 select-none", user ? "text-right" : "text-left")}>
          <span>{metaItems}</span>
          <button
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-zinc-200 text-zinc-400 hover:text-zinc-600 shrink-0"
            aria-label="Copy message"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
        </div>
      ) : null}
    </div>
  )
})

export function MessageTimeline(props: { messages: Message[]; parts: Record<string, Part[]>; loading: boolean; providers?: Array<Provider> }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizerRef = useRef<VirtualizerHandle>(null)
  const stickToBottomRef = useRef(true)
  const scrollFrameRef = useRef<number | undefined>(undefined)
  const userScrollAtRef = useRef(0)
  const keepMounted = useMemo(() => {
    if (props.messages.length === 0) return []
    return [props.messages.length - 1]
  }, [props.messages.length])

  const turnDurationMs = useMemo(() => {
    const map = new Map<string, number>()
    for (const message of props.messages) {
      if (message.role !== "user") continue
      const end = props.messages
        .filter((m): m is AssistantMessage => m.role === "assistant" && m.parentID === message.id)
        .reduce<number | undefined>((max, m) => {
          const completed = m.time.completed
          if (typeof completed !== "number") return max
          return max === undefined ? completed : Math.max(max, completed)
        }, undefined)
      if (typeof end !== "number" || end < message.time.created) continue
      map.set(message.id, end - message.time.created)
    }
    return map
  }, [props.messages])

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
            <MessageItem
              message={message}
              parts={props.parts[message.id] ?? emptyParts}
              providers={props.providers}
              turnDurationMs={message.role === "assistant" ? turnDurationMs.get(message.parentID) : undefined}
            />
          </div>
        )}
      </Virtualizer>
    </div>
  )
}
