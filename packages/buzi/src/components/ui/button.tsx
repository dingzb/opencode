import type { ButtonHTMLAttributes } from "react"
import { cn } from "../../lib/utils"

export function Button(props: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "outline" }) {
  const { className, variant = "primary", ...rest } = props
  return (
    <button
      className={cn(
        "inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-zinc-950 text-white hover:bg-zinc-800",
        variant === "ghost" && "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950",
        variant === "outline" && "border border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50",
        className,
      )}
      {...rest}
    />
  )
}
