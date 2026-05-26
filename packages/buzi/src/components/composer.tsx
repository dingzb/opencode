import { ArrowUp, Bot, Check, ChevronDown, Cpu, Search } from "lucide-react"
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
  modelOptions: ModelOption[]
  selectedModel: string
  onModelChange: (value: string) => void
  modelLoading: boolean
  agents: Agent[]
  selectedAgent: string
  onAgentChange: (value: string) => void
  agentLoading: boolean
  onSubmit: (text: string) => Promise<void>
}

type DropdownOption = {
  value: string
  label: string
  meta?: string
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
          "flex h-8 min-w-0 max-w-60 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-50",
          open && "bg-zinc-100 text-zinc-800",
        )}
        disabled={props.disabled}
        onClick={() => setOpen((value) => !value)}
        title={props.label}
      >
        {props.icon}
        <span className="truncate">{selected?.label ?? props.placeholder}</span>
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute bottom-full left-0 z-20 mb-2 w-72 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10">
          <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">{props.label}</div>
          {props.searchable ? (
            <div className="mb-1 flex h-8 items-center gap-2 rounded-lg bg-zinc-50 px-2 text-zinc-400">
              <Search className="size-3.5 shrink-0" />
              <input
                ref={searchRef}
                className="min-w-0 flex-1 bg-transparent text-xs text-zinc-800 outline-none placeholder:text-zinc-400"
                value={query}
                placeholder="Search models..."
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          {props.options.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-500">{props.placeholder}</div>
          ) : visibleOptions.length === 0 ? (
            <div className="px-2 py-2 text-xs text-zinc-500">No matching models</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {visibleOptions.map((option) => {
                const active = option.value === props.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={cn(
                      "flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100",
                      active && "bg-zinc-100 text-zinc-950",
                    )}
                    onClick={() => {
                      props.onChange(option.value)
                      setOpen(false)
                    }}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{option.label}</span>
                      {option.meta ? (
                        <span className="block truncate text-[11px] text-zinc-400">{option.meta}</span>
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

  const submit = async () => {
    const value = text.trim()
    if (!value) return
    setText("")
    await props.onSubmit(value)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 pl-7 pr-[calc(1.75rem+17px)] pb-5 pt-10">
      <div className="pointer-events-auto mx-auto flex max-w-4xl flex-col gap-2 rounded-2xl bg-[#f0f0ee] p-2 shadow-lg shadow-zinc-950/10">
        <textarea
          className="max-h-40 min-h-12 resize-none bg-transparent px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400"
          value={text}
          disabled={props.disabled}
          placeholder="Ask opencode..."
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            if (event.repeat) return
            void submit()
          }}
        />
        <div className="flex min-w-0 items-center justify-between gap-2 px-1 pb-1">
          <div className="flex min-w-0 items-center gap-1">
            <DropdownControl
              icon={<Cpu className="size-3.5 shrink-0" />}
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
            <DropdownControl
              icon={<Bot className="size-3.5 shrink-0" />}
              label="Agent"
              value={props.selectedAgent}
              placeholder={props.agentLoading ? "Loading agents..." : "No primary agents"}
              disabled={props.disabled || props.agentLoading || props.agents.length === 0}
              onChange={props.onAgentChange}
              options={props.agents.map((agent) => ({
                value: agent.name,
                label: agent.name,
                meta: agent.description,
              }))}
            />
          </div>
          <Button
            type="button"
            className="size-8 rounded-full bg-zinc-900 px-0 text-white shadow-sm shadow-zinc-950/10 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
            disabled={props.disabled || !text.trim()}
            onClick={submit}
          >
            <ArrowUp className="size-4 stroke-[2.4]" />
          </Button>
        </div>
      </div>
    </div>
  )
}
