import type { InputHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props
  return (
    <input
      className={cn(
        "h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400",
        className,
      )}
      {...rest}
    />
  )
}
