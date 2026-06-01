import { ArrowUp, Bot, Brain, Check, ChevronDown, ChevronRight, MoreHorizontal, Plus, Search, Square, Zap } from "lucide-react"
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
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
  value: string
  onChange: (value: string) => void
  onSubmit: (text: string) => Promise<void>
  onStop: () => Promise<void>
}

type DropdownOption = {
  value: string
  label: string
  meta?: string
}

type DropdownGroup = {
  key: string
  label: string
  options: DropdownOption[]
}

const compactComposerControlsWidth = 420

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
  groups?: DropdownGroup[]
  searchable?: boolean
  menuWidth?: string
  showMeta?: boolean
  buttonClassName?: string
  onChange: (value: string) => void
  onSelect?: () => void
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const ref = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const allOptions = props.groups ? props.groups.flatMap((g) => g.options) : props.options
  const selected = allOptions.find((option) => option.value === props.value)
  const selectedTitle = selected ? [selected.label, selected.meta].filter(Boolean).join(" - ") : props.placeholder
  const normalizedQuery = query.trim().toLocaleLowerCase()
  const hasQuery = normalizedQuery.length > 0
  const visibleOptions = hasQuery
    ? allOptions.filter((option) =>
        [option.label, option.meta].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery)),
      )
    : props.options

  const toggleGroup = (key: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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
          "composer-control flex h-8 min-w-0 max-w-56 items-center gap-1.5 rounded-lg px-2 font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-50",
          open && "bg-zinc-100 text-zinc-800",
          props.buttonClassName,
        )}
        disabled={props.disabled}
        onClick={() => setOpen((value) => !value)}
        title={selectedTitle}
      >
        {props.icon}
        <span className="min-w-0 truncate leading-none">{selected?.label ?? props.placeholder}</span>
        <ChevronDown className={cn("size-3 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open ? (
        <div className={cn("absolute bottom-full right-0 z-20 mb-2 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10", props.menuWidth ?? "w-[min(18rem,calc(100vw-24px))]")}>
          <div className="px-2 py-1.5 text-[11px] font-medium text-zinc-400">{props.label}</div>
          {props.searchable ? (
            <div className="mb-1 flex h-8 items-center gap-2 rounded-lg bg-zinc-50 px-2 text-zinc-400">
              <Search className="size-3.5 shrink-0" />
              <input
                ref={searchRef}
                className="composer-control min-w-0 flex-1 bg-transparent text-zinc-800 outline-none placeholder:text-zinc-400"
                value={query}
                placeholder="Search models..."
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.stopPropagation()}
              />
            </div>
          ) : null}
          {allOptions.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-zinc-500">{props.placeholder}</div>
          ) : visibleOptions.length === 0 && hasQuery ? (
            <div className="px-2 py-2 text-[11px] text-zinc-500">No matching models</div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              {props.groups && !hasQuery
                ? props.groups.map((group) => {
                    const collapsed = collapsedGroups.has(group.key)
                    return (
                      <div key={group.key}>
                        <button
                          type="button"
                          className="flex w-full items-center gap-1 rounded-lg px-2 py-1 text-left text-zinc-500 hover:bg-zinc-100 hover:text-zinc-700"
                          onClick={() => toggleGroup(group.key)}
                        >
                          {collapsed ? (
                            <ChevronRight className="size-3 shrink-0" />
                          ) : (
                            <ChevronDown className="size-3 shrink-0" />
                          )}
                          <span className="min-w-0 truncate text-[11px] font-medium">
                            {group.label}
                          </span>
                        </button>
                        {!collapsed
                          ? group.options.map((option) => {
                              const active = option.value === props.value
                              return (
                                <button
                                  key={option.value}
                                  type="button"
                                  className={cn(
                                    "composer-control flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 pl-6 text-left text-zinc-700 hover:bg-zinc-100",
                                    active && "bg-zinc-100 text-zinc-950",
                                  )}
                                  onClick={() => {
                                    props.onChange(option.value)
                                    props.onSelect?.()
                                    setOpen(false)
                                  }}
                                  title={[option.label, option.meta].filter(Boolean).join(" - ")}
                                >
                                  <span className="min-w-0 flex-1">
                                    <span className="block truncate">{option.label}</span>
                                    {option.meta && props.showMeta !== false ? (
                                      <span className="composer-option-meta block truncate text-zinc-400">
                                        {option.meta}
                                      </span>
                                    ) : null}
                                  </span>
                                  {active ? <Check className="size-3.5 shrink-0 text-zinc-700" /> : null}
                                </button>
                              )
                            })
                          : null}
                      </div>
                    )
                  })
                : visibleOptions.map((option) => {
                    const active = option.value === props.value
                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={cn(
                          "composer-control flex w-full min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 text-left text-zinc-700 hover:bg-zinc-100",
                          active && "bg-zinc-100 text-zinc-950",
                        )}
                        onClick={() => {
                          props.onChange(option.value)
                          props.onSelect?.()
                          setOpen(false)
                        }}
                        title={[option.label, option.meta].filter(Boolean).join(" - ")}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate">{option.label}</span>
                          {option.meta && props.showMeta !== false ? (
                            <span className="composer-option-meta block truncate text-zinc-400">
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

function ComposerMoreMenu(props: { children: (close: () => void) => ReactNode; disabled?: boolean }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const close = () => setOpen(false)

  useEffect(() => {
    if (!open) return
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener("pointerdown", close)
    return () => document.removeEventListener("pointerdown", close)
  }, [open])

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false)
      }}
    >
      <button
        type="button"
        className={cn(
          "flex size-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:pointer-events-none disabled:opacity-50",
          open && "bg-zinc-100 text-zinc-800",
        )}
        disabled={props.disabled}
        title="More options"
        onClick={() => setOpen((value) => !value)}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open ? (
        <div className="absolute bottom-full right-0 z-20 mb-2 flex w-52 flex-col gap-1 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-xl shadow-zinc-950/10">
          {props.children(close)}
        </div>
      ) : null}
    </div>
  )
}

export function Composer(props: ComposerProps) {
  const [compactControls, setCompactControls] = useState(false)
  const composerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const textareaLineHeightPx = 14 * 1.7

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const minHeight = textareaLineHeightPx * 1.5
    const maxHeight = textareaLineHeightPx * 10

    textarea.style.height = `${minHeight}px`
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight)
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > maxHeight ? "auto" : "hidden"
  }, [props.value])

  useLayoutEffect(() => {
    const composer = composerRef.current
    if (!composer) return

    const updateCompactControls = () => {
      setCompactControls(composer.getBoundingClientRect().width < compactComposerControlsWidth)
    }

    updateCompactControls()
    const observer = new ResizeObserver(updateCompactControls)
    observer.observe(composer)
    return () => observer.disconnect()
  }, [])

  const modelGroups = useMemo(() => {
    const groups = new Map<string, DropdownOption[]>()
    for (const option of props.modelOptions) {
      const key = option.providerID
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push({
        value: option.value,
        label: option.model.name || option.modelID,
        meta: option.providerName,
      })
    }
    return Array.from(groups.entries()).map(([key, options]) => ({
      key,
      label: options[0]?.meta ?? key,
      options,
    }))
  }, [props.modelOptions])

  const submit = async () => {
    if (props.stopping) return
    if (props.working) {
      await props.onStop()
      return
    }
    const value = props.value.trim()
    if (!value) return
    await props.onSubmit(value)
  }

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[calc(0.875rem+(var(--chat-scrollbar-width)-2px)/2)] pb-5 pt-10">
      <div ref={composerRef} className="pointer-events-auto mx-auto flex w-full max-w-[800px] flex-col gap-2 rounded-[24px] border border-zinc-200/80 bg-white p-3 shadow-lg shadow-zinc-950/10">
        <textarea
          ref={textareaRef}
          className="composer-textarea resize-none overflow-hidden bg-transparent px-2 py-0.5 text-zinc-900 outline-none placeholder:text-zinc-400"
          value={props.value}
          disabled={props.disabled}
          placeholder="Tell me what you want to build..."
          onChange={(event) => props.onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" || event.shiftKey) return
            event.preventDefault()
            if (event.repeat) return
            if (props.working || props.stopping) return
            void submit()
          }}
        />
        <div className="flex min-w-0 flex-nowrap items-center justify-between gap-3">
          <Button
            type="button"
            className="size-8 shrink-0 rounded-full bg-transparent px-0 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:text-zinc-300"
            disabled={props.disabled}
            title="Upload file"
          >
            <Plus className="size-4 stroke-[2.2]" />
          </Button>
          <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-1">
            {!compactControls ? (
              <>
                <DropdownControl
                  icon={<Bot className="size-3.5 shrink-0" />}
                  label="Agent"
                  value={props.selectedAgent}
                  placeholder={props.agentLoading ? "Loading agents..." : "No primary agents"}
                  disabled={props.disabled || props.agentLoading || props.agents.length === 0}
                  menuWidth="w-48"
                  showMeta={false}
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
                  menuWidth="w-56"
                  showMeta={false}
                  groups={modelGroups}
                  onChange={props.onModelChange}
                  options={modelGroups.flatMap((g) => g.options)}
                />
                {props.variantOptions.length > 2 ? (
                  <DropdownControl
                    icon={<Zap className="size-3.5 shrink-0" />}
                    label="Reasoning"
                    value={props.selectedVariant ?? "default"}
                    placeholder="Default"
                    disabled={props.disabled}
                    menuWidth="w-40"
                    onChange={(value) => props.onVariantChange(value === "default" ? null : value)}
                    options={props.variantOptions.map((variant) => ({
                      value: variant,
                      label: formatVariantName(variant),
                    }))}
                  />
                ) : null}
              </>
            ) : (
              <ComposerMoreMenu disabled={props.disabled}>
                {(close) => (
                  <>
                    <DropdownControl
                      icon={<Bot className="size-3.5 shrink-0" />}
                      label="Agent"
                      value={props.selectedAgent}
                      placeholder={props.agentLoading ? "Loading agents..." : "No primary agents"}
                      disabled={props.disabled || props.agentLoading || props.agents.length === 0}
                      menuWidth="w-48"
                      showMeta={false}
                      buttonClassName="w-full max-w-none justify-start"
                      onChange={props.onAgentChange}
                      onSelect={close}
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
                      menuWidth="w-56"
                      showMeta={false}
                      groups={modelGroups}
                      buttonClassName="w-full max-w-none justify-start"
                      onChange={props.onModelChange}
                      onSelect={close}
                      options={modelGroups.flatMap((g) => g.options)}
                    />
                    {props.variantOptions.length > 2 ? (
                      <DropdownControl
                        icon={<Zap className="size-3.5 shrink-0" />}
                        label="Reasoning"
                        value={props.selectedVariant ?? "default"}
                        placeholder="Default"
                        disabled={props.disabled}
                        menuWidth="w-40"
                        buttonClassName="w-full max-w-none justify-start"
                        onChange={(value) => props.onVariantChange(value === "default" ? null : value)}
                        onSelect={close}
                        options={props.variantOptions.map((variant) => ({
                          value: variant,
                          label: formatVariantName(variant),
                        }))}
                      />
                    ) : null}
                  </>
                )}
              </ComposerMoreMenu>
            )}
            <Button
              type="button"
              className="size-8 shrink-0 rounded-full bg-zinc-900 px-0 text-white shadow-sm shadow-zinc-950/10 hover:bg-zinc-700 disabled:bg-zinc-300 disabled:text-zinc-500 disabled:shadow-none"
              disabled={props.disabled || props.stopping || (!props.working && !props.value.trim())}
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
