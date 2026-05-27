import { ArrowUp, Bot, Brain, Check, ChevronDown, Gauge, Plus, Search, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import type { Agent, Model } from "@opencode-ai/sdk/v2/client"
import { Button } from "./ui/button"
import { cn } from "../lib/utils"

type ModelOption = {
  value: string
  providerID: string
  providerName: string
  modelID: string
  model: Model
}

type ComposerProps = {
  disabled?: boolean
  working: boolean
  stopping: boolean
  modelOptions: ModelOption[]
  selectedModel: string
  onModelChange: (value: string) => void
  variantOptions: string[]
  selectedVariant: string | undefined
  onVariantChange: (value: string | null | undefined) => void
  modelLoading: boolean
  agents: Agent[]
  selectedAgent: string
  onAgentChange: (value: string) => void
  agentLoading: boolean
  onSubmit: (text: string) => Promise<void>
  onStop: () => Promise<void>
}

type DropdownOption = {
  value: string
  label: string
  meta?: string
}

function formatAgentName(name: string) {
  return name.charAt(0).toLocaleUpperCase() + name.slice(1)
}

function formatVariantName(name: string) {
  if (name === "default") return "Default"
  return name.charAt(0).toLocaleUpperCase() + name.slice(1)
}

function DropdownControl(props: {
  icon: ReactNode
  label: string
  value: string
  disabled?: boolean
  placeholder: string
  options: DropdownOption[]
  searchable?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const selected = props.options.find((option) => option.value === props.value)
  const selectedTitle = selected ? [selected.label, selected.meta].filter(Boolean).join(" - ") : props.placeholder
  const textStyle = { fontSize: 11 }
  const metaStyle = { fontSize: 10 }
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const visibleOptions = normalizedQuery
    ? props.options.filter((option) =>
        [option.label, option.meta].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : props.options

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery("")
      return
    }
    if (props.searchable) window.setTimeout(() => searchRef.current?.focus(), 0)
  }, [open, props.searchable])

  return (
    <div
      ref={ref}
      className="relative min-w-0"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false)
      }}
    >
      <button
        type="button"
        className={cn(
          "flex h-8 min-w-0 max-w-56 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-50",
          open && "bg-zinc-100 text-zinc-800",
        )}
        style={textStyle}
        disabled={props.disabled}
        onClick={() => setOpen((value) => !value)}
        title={selectedTitle}
      >
        {props.icon}
        <span className="min-w-0 truncate text-[11px] leading-none">{selected?.label ?? props.placeholder}</span>
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-20 mb-2 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10">
          <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">{props.label}</div>
          {props.searchable ? (
            <div className="mb-1 flex h-8 items-center gap-2 rounded-lg bg-zinc-50 px-2 text-zinc-400">
              <Search className="size-3.5 shrink-0" />
              <input
                ref={searchRef}
                className="min-w-0 flex-1 bg-transparent text-[11px] text-zinc-800 outline-none placeholder:text-zinc-400"
                style={textStyle}
                value={query}
                placeholder="Search models..."
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          {props.options.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-zinc-500">{props.placeholder}</div>
          ) : visibleOptions.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-zinc-500">No matching models</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {visibleOptions.map((option) => {
                const active = option.value === props.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[11px] text-zinc-700 hover:bg-zinc-100",
                      active && "bg-zinc-100 text-zinc-950",
                    )}
                    style={textStyle}
                    onClick={() => {
                      props.onChange(option.value)
                      setOpen(false)
                    }}
                    title={[option.label, option.meta].filter(Boolean).join(" - ")}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate" style={textStyle}>
                        {option.label}
                      </span>
                      {option.meta ? (
                        <span className="block truncate text-[10px] text-zinc-400" style={metaStyle}>
                          {option.meta}
                        </span>
                      ) : null}
                    </span>
                    {active ? <Check className="size-3.5 shrink-0 text-zinc-700" /> : null}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}

export function Composer(props: ComposerProps) {
  const [text, setText] = useState("")
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaFontSize = 14
  const textareaLineHeight = 1.7

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const lineHeight = textareaFontSize * textareaLineHeight
    const minHeight = lineHeight * 1.5
    const maxHeight = lineHeight * 10

    textarea.style.height = `${minHeight}px`
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden"
  }, [text])

  const submit = async () => {
    if (props.stopping) return
    if (props.working) {
      await props.onStop()
      return
    }
    const value = text.trim()
    if (!value) return
    setText("")
    await props.onSubmit(value)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[calc(1.75rem+var(--chat-scrollbar-width)-2px)] pb-5 pt-10">
      <div className="pointer-events-auto mx-auto flex w-full max-w-4xl flex-col gap-2 rounded-[24px] border border-zinc-200/80 bg-[#fbfbfa] p-3 shadow-lg shadow-zinc-950/10">
        <textarea
          ref={textareaRef}
          className="resize-none overflow-hidden bg-transparent px-2 py-0.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
          style={{ fontSize: textareaFontSize, lineHeight: textareaLineHeight }}
          value={text}
          disabled={props.disabled}
          placeholder="Ask opencode..."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            if (event.repeat) return
            if (props.working || props.stopping) return
            void submit()
          }}
        />
        <div className="flex min-w-0 items-center justify-between gap-3">
          <Button
            type="button"
            className="size-8 shrink-0 rounded-full bg-transparent px-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:text-zinc-300"
            disabled={props.disabled}
            title="Upload file"
          >
            <Plus className="size-4 stroke-[2.2]" />
          </Button>
          <div className="ml-auto flex min-w-0 items-center justify-end gap-1">
            <DropdownControl
              icon={<Bot className="size-3.5 shrink-0" />}
              label="Agent"
              value={props.selectedAgent}
              placeholder={props.agentLoading ? "Loading agents..." : "No primary agents"}
              disabled={props.disabled || props.agentLoading || props.agents.length === 0}
              onChange={props.onAgentChange}
              options={props.agents.map((agent) => ({
                value: agent.name,
                label: formatAgentName(agent.name),
                meta: agent.description,
              }))}
            />
            <DropdownControl
              icon={<Brain className="size-3.5 shrink-0" />}
              label="Model"
              value={props.selectedModel}
              placeholder={props.modelLoading ? "Loading models..." : "No configured models"}
              disabled={props.disabled || props.modelLoading || props.modelOptions.length === 0}
              searchable
              onChange={props.onModelChange}
              options={props.modelOptions.map((option) => ({
                value: option.value,
                label: option.model.name || option.modelID,
                meta: option.providerName,
              }))}
            />
            {props.variantOptions.length > 2 ? (
              <DropdownControl
                icon={<Gauge className="size-3.5 shrink-0" />}
                label="Reasoning"
                value={props.selectedVariant ?? "default"}
                placeholder="Default"
                disabled={props.disabled}
                onChange={(value) => props.onVariantChange(value === "default" ? null : value)}
                options={props.variantOptions.map((variant) => ({
                  value: variant,
                  label: formatVariantName(variant),
                }))}
              />
            ) : null}
            <Button
              type="button"
              className="size-8 shrink-0 rounded-full bg-zinc-900 px-0 text-white shadow-sm shadow-zinc-950/10 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
              disabled={props.disabled || props.stopping || (!props.working && !text.trim())}
              onClick={submit}
              title={props.working ? "Stop response" : "Send message"}
            >
              {props.working ? (
                <Square className="size-3 fill-current stroke-[2.4]" />
              ) : (
                <ArrowUp className="size-4 stroke-[2.4]" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
