import { Check, ChevronDown, ChevronLeft, ChevronUp, CircleHelp } from "lucide-react"
import { useMemo, useState } from "react"
import type { QuestionAnswer, QuestionRequest } from "@opencode-ai/sdk/v2/client"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"

type QuestionDockProps = {
  request: QuestionRequest
  submitting?: boolean
  onReply: (request: QuestionRequest, answers: QuestionAnswer[]) => Promise<void>
  onReject: (request: QuestionRequest) => Promise<void>
}

function Hint(props: { text: string; invert?: boolean }) {
  return (
    <span
      className={cn("buzi-question-hint", props.invert && "buzi-question-hint-invert")}
      data-tooltip={props.text}
      aria-label={props.text}
      tabIndex={0}
    >
      <CircleHelp className="size-3.5" />
    </span>
  )
}

export function QuestionDock(props: QuestionDockProps) {
  const [tab, setTab] = useState(0)
  const [minimized, setMinimized] = useState(false)
  const [answers, setAnswers] = useState<QuestionAnswer[]>([])
  const [custom, setCustom] = useState<Record<number, string>>({})
  const question = props.request.questions[tab]
  const selected = answers[tab] ?? []
  const total = props.request.questions.length
  const last = tab >= total - 1
  const progress = total > 0 ? `${Math.min(tab + 1, total)} / ${total}` : "0 / 0"

  const complete = useMemo(() => {
    return props.request.questions.every((_, index) => (answers[index] ?? []).length > 0)
  }, [answers, props.request.questions])

  const setAnswer = (index: number, next: QuestionAnswer) => {
    setAnswers((current) => {
      const copy = current.slice()
      copy[index] = next
      return copy
    })
  }

  const toggle = (label: string) => {
    if (!question) return
    if (!question.multiple) {
      setAnswer(tab, selected.includes(label) ? [] : [label])
      return
    }
    setAnswer(tab, selected.includes(label) ? selected.filter((item) => item !== label) : [...selected, label])
  }

  const updateCustom = (value: string) => {
    setCustom((current) => ({ ...current, [tab]: value }))
    const trimmed = value.trim()
    const withoutPreviousCustom = selected.filter((item) => question?.options.some((option) => option.label === item))
    if (!trimmed) {
      setAnswer(tab, withoutPreviousCustom)
      return
    }
    setAnswer(tab, question?.multiple ? [...withoutPreviousCustom, trimmed] : [trimmed])
  }

  const next = async () => {
    if (!last) {
      setTab((value) => Math.min(total - 1, value + 1))
      return
    }
    await props.onReply(props.request, answers)
  }

  if (!question) return null

  return (
    <div className={cn("buzi-question-dock", minimized && "buzi-question-dock-minimized")}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-600 text-white shadow-sm">
            <CircleHelp className="size-4" />
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <div className="min-w-0 truncate text-sm font-semibold text-zinc-800">{question.header || "Question"}</div>
              {question.question ? <Hint text={question.question} /> : null}
              <div className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                {progress}
              </div>
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex size-7 shrink-0 items-center justify-center rounded-full text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 disabled:pointer-events-none disabled:opacity-50"
          disabled={props.submitting}
          onClick={() => setMinimized((value) => !value)}
          title={minimized ? "Expand" : "Minimize"}
        >
          {minimized ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>
      {minimized ? null : total > 1 ? (
        <div className="mt-3 flex gap-1.5">
          {props.request.questions.map((_, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                index === tab ? "bg-zinc-600" : (answers[index] ?? []).length > 0 ? "bg-zinc-400" : "bg-zinc-200",
              )}
              disabled={props.submitting}
              onClick={() => setTab(index)}
              aria-label={`Question ${index + 1}`}
            />
          ))}
        </div>
      ) : null}
      {!minimized ? <div className="mt-3 flex flex-col gap-2">
        {question.options.map((option) => {
          const picked = selected.includes(option.label)
          return (
            <button
              key={option.label}
              type="button"
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
                picked
                  ? "border-zinc-500 bg-zinc-600 text-white"
                  : "border-zinc-200 bg-white/70 text-zinc-800 hover:bg-zinc-50",
              )}
              disabled={props.submitting}
              onClick={() => toggle(option.label)}
            >
              <span
                className={cn(
                  "flex size-4 shrink-0 items-center justify-center rounded-full border",
                  picked ? "border-white bg-white text-zinc-600" : "border-zinc-300 text-transparent",
                )}
              >
                <Check className="size-3" />
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <span className="min-w-0 truncate text-sm font-medium leading-5">{option.label}</span>
                {option.description ? <Hint text={option.description} invert={picked} /> : null}
              </span>
            </button>
          )
        })}
        {question.custom ? (
          <textarea
            className="min-h-20 resize-none rounded-xl border border-zinc-200 bg-white/75 px-3 py-2.5 text-sm leading-6 text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-zinc-400"
            disabled={props.submitting}
            placeholder="Type your own answer..."
            value={custom[tab] ?? ""}
            onChange={(event) => updateCustom(event.target.value)}
          />
        ) : null}
      </div> : null}
      {!minimized ? <div className="mt-3 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="ghost"
          className="h-8 rounded-full px-4 text-xs"
          disabled={props.submitting}
          onClick={() => void props.onReject(props.request)}
        >
          Dismiss
        </Button>
        <div className="flex items-center justify-end gap-2">
          {tab > 0 ? (
            <Button
              type="button"
              variant="ghost"
              className="h-8 rounded-full px-4 text-xs"
              disabled={props.submitting}
              onClick={() => setTab((value) => Math.max(0, value - 1))}
            >
              <ChevronLeft className="size-3.5" />
              Back
            </Button>
          ) : null}
          <Button
            type="button"
            className="h-8 rounded-full bg-zinc-600 px-4 text-xs hover:bg-zinc-500 disabled:bg-zinc-300 disabled:text-zinc-500"
            disabled={props.submitting || (last && !complete)}
            onClick={() => void next()}
          >
            {last ? "Submit" : "Next"}
          </Button>
        </div>
      </div> : null}
    </div>
  )
}
