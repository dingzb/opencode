import { ChevronRight, Folder, LoaderCircle, Search, X } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import type { Project } from "@opencode-ai/sdk/v2/client"
import type { OpencodeSdk } from "../lib/opencode"
import type { BuziProject } from "../types/project"
import { cn } from "../lib/utils"

type DirectoryRow = {
  absolute: string
  search: string
  group: "recent" | "folders"
  name?: string
  added?: boolean
}

function cleanInput(value: string) {
  return (value ?? "").split(/\r?\n/)[0]?.replace(/[\u0000-\u001F\u007F]/g, "").trim() ?? ""
}

function normalizePath(input: string) {
  const value = input.replaceAll("\\", "/")
  if (value.startsWith("//") && !value.startsWith("///")) return `//${value.slice(2).replace(/\/+/g, "/")}`
  return value.replace(/\/+/g, "/")
}

function normalizeDriveRoot(input: string) {
  const value = normalizePath(input)
  if (/^[A-Za-z]:$/.test(value)) return `${value}/`
  return value
}

function trimTrailing(input: string) {
  const value = normalizeDriveRoot(input)
  if (value === "/" || value === "//" || /^[A-Za-z]:\/$/.test(value)) return value
  return value.replace(/\/+$/, "")
}

function rootOf(input: string) {
  const value = normalizeDriveRoot(input)
  if (value.startsWith("//")) return "//"
  if (value.startsWith("/")) return "/"
  if (/^[A-Za-z]:\//.test(value)) return value.slice(0, 3)
  return ""
}

function parentOf(input: string) {
  const value = trimTrailing(input)
  if (value === "/" || value === "//" || /^[A-Za-z]:\/$/.test(value)) return value
  const index = value.lastIndexOf("/")
  if (index <= 0) return "/"
  if (index === 2 && /^[A-Za-z]:/.test(value)) return value.slice(0, 3)
  return value.slice(0, index)
}

function joinPath(base: string | undefined, rel: string) {
  const left = trimTrailing(base ?? "")
  const right = trimTrailing(rel).replace(/^\/+/, "")
  if (!left) return right
  if (!right) return left
  if (left.endsWith("/")) return left + right
  return `${left}/${right}`
}

function filename(input: string) {
  return trimTrailing(input).split("/").filter(Boolean).at(-1) ?? trimTrailing(input)
}

function dirname(input: string) {
  const parent = parentOf(input)
  if (parent === input) return ""
  return parent.endsWith("/") ? parent : `${parent}/`
}

function tildeOf(absolute: string, home: string) {
  const full = trimTrailing(absolute)
  const base = trimTrailing(home)
  if (!base) return ""
  if (full.toLowerCase() === base.toLowerCase()) return "~"
  if (full.toLowerCase().startsWith(`${base.toLowerCase()}/`)) return `~${full.slice(base.length)}`
  return ""
}

function displayPath(path: string, input: string, home: string) {
  const full = trimTrailing(path)
  if (rootOf(normalizeDriveRoot(input.trim()))) return full
  return tildeOf(full, home) || full
}

function rowFor(absolute: string, home: string, group: DirectoryRow["group"], name?: string, added?: boolean) {
  const full = trimTrailing(absolute)
  const tilde = tildeOf(full, home)
  const search = [full, `${full}/`, tilde, tilde && `${tilde}/`, filename(full), name].filter(Boolean).join("\n")
  return { absolute: full, search, group, name, added } satisfies DirectoryRow
}

function uniqueRows(rows: DirectoryRow[]) {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.absolute)) return false
    seen.add(row.absolute)
    return true
  })
}

function score(query: string, row: { name: string; absolute: string }) {
  const term = query.toLocaleLowerCase()
  const name = row.name.toLocaleLowerCase()
  const absolute = row.absolute.toLocaleLowerCase()
  if (!term) return 0
  if (name === term) return 0
  if (name.startsWith(term)) return 1
  if (name.includes(term)) return 2
  if (absolute.includes(term)) return 3
  return 10
}

function sortMatches(query: string, rows: Array<{ name: string; absolute: string }>, limit: number) {
  return rows
    .map((row) => ({ row, score: score(query, row) }))
    .filter((item) => item.score < 10)
    .sort((a, b) => a.score - b.score || a.row.name.localeCompare(b.row.name))
    .slice(0, limit)
    .map((item) => item.row.absolute)
}

function recentRows(projects: Project[] | undefined, home: string, added: Set<string>) {
  return (projects ?? [])
    .slice()
    .sort((a, b) => (b.time.updated ?? b.time.created) - (a.time.updated ?? a.time.created))
    .slice(0, 8)
    .map((project) => rowFor(project.worktree, home, "recent", project.name, added.has(trimTrailing(project.worktree))))
}

export function DialogSelectProjectDirectory(props: {
  open: boolean
  sdk: OpencodeSdk
  projects: BuziProject[]
  onClose: () => void
  onSelect: (directory: string) => void
}) {
  const [filter, setFilter] = useState("")
  const [home, setHome] = useState("")
  const [start, setStart] = useState("")
  const [recent, setRecent] = useState<Project[]>()
  const [items, setItems] = useState<DirectoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeIndex, setActiveIndex] = useState(0)
  const token = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const cache = useRef(new Map<string, Promise<Array<{ name: string; absolute: string }>>>())
  const added = useMemo(() => new Set(props.projects.map((project) => trimTrailing(project.worktree))), [props.projects])

  useEffect(() => {
    if (!props.open) return
    setFilter("")
    setError("")
    setActiveIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
    void props.sdk.path.get().then((result) => {
      setHome(result.data?.home ?? "")
      setStart(result.data?.home || result.data?.directory || "")
    })
    void props.sdk.project.list().then((result) => setRecent(result.data ?? [])).catch(() => setRecent([]))
  }, [props.open, props.sdk])

  useEffect(() => {
    if (!props.open) return
    const run = async () => {
      const current = ++token.current
      const value = cleanInput(filter)
      setLoading(true)
      setError("")
      const rows = await directoryRows(value).catch((err) => {
        setError(err instanceof Error ? err.message : "Unable to load directories")
        return [] as DirectoryRow[]
      })
      if (current !== token.current) return
      setItems(rows)
      setActiveIndex(0)
      setLoading(false)
    }
    void run()
  }, [filter, home, recent, start, props.open])

  async function dirs(dir: string) {
    const key = trimTrailing(dir)
    const existing = cache.current.get(key)
    if (existing) return existing
    const request = props.sdk.file
      .list({ directory: key, path: "" })
      .then((result) => result.data ?? [])
      .catch(() => [])
      .then((nodes) =>
        nodes
          .filter((node) => node.type === "directory")
          .map((node) => ({ name: node.name, absolute: trimTrailing(normalizeDriveRoot(node.absolute)) })),
      )
    cache.current.set(key, request)
    return request
  }

  async function match(dir: string, query: string, limit: number) {
    const rows = await dirs(dir)
    if (!query) return rows.slice(0, limit).map((row) => row.absolute)
    return sortMatches(query, rows, limit)
  }

  function scoped(value: string) {
    const base = start || home
    if (!base) return
    const raw = normalizeDriveRoot(value)
    if (!raw) return { directory: trimTrailing(base), path: "" }
    if (raw === "~") return { directory: trimTrailing(home || base), path: "" }
    if (raw.startsWith("~/")) return { directory: trimTrailing(home || base), path: raw.slice(2) }
    const root = rootOf(raw)
    if (root) return { directory: trimTrailing(root), path: raw.slice(root.length) }
    return { directory: trimTrailing(base), path: raw }
  }

  async function searchDirectories(value: string) {
    const scopedInput = scoped(value)
    if (!scopedInput) return []
    const raw = normalizeDriveRoot(value)
    const isPath = raw.startsWith("~") || !!rootOf(raw) || raw.includes("/")
    const query = normalizeDriveRoot(scopedInput.path)

    if (!isPath) {
      return props.sdk.find
        .files({ directory: scopedInput.directory, query, type: "directory", limit: 50 })
        .then((result) => (result.data ?? []).map((path) => joinPath(scopedInput.directory, path)))
        .catch(() => [])
    }

    const segments = query.replace(/^\/+/, "").split("/")
    const head = segments.slice(0, segments.length - 1).filter((part) => part && part !== ".")
    const tail = segments.at(-1) ?? ""
    let paths = [scopedInput.directory]
    for (const part of head) {
      if (part === "..") {
        paths = paths.map(parentOf)
        continue
      }
      paths = Array.from(new Set((await Promise.all(paths.map((path) => match(path, part, 4)))).flat())).slice(0, 12)
      if (paths.length === 0) return []
    }

    const out = Array.from(new Set((await Promise.all(paths.map((path) => match(path, tail, 50)))).flat()))
    if (!raw.endsWith("/") || !tail) return out.slice(0, 50)
    const exact = out.find((path) => filename(path).toLocaleLowerCase() === tail.toLocaleLowerCase())
    if (!exact) return out.slice(0, 50)
    return Array.from(new Set([...out, ...(await match(exact, "", 30))])).slice(0, 50)
  }

  async function directoryRows(value: string) {
    const term = value.toLocaleLowerCase()
    const recentItems = recentRows(recent, home, added).filter((row) => !term || row.search.toLocaleLowerCase().includes(term))
    const folders = (await searchDirectories(value)).map((absolute) =>
      rowFor(absolute, home, "folders", undefined, added.has(trimTrailing(absolute))),
    )
    return uniqueRows([...recentItems, ...folders])
  }

  function select(row: DirectoryRow | undefined) {
    if (!row) return
    props.onSelect(row.absolute)
  }

  if (!props.open) return null

  const grouped = [
    { id: "recent", label: "Recently opened", rows: items.filter((item) => item.group === "recent") },
    { id: "folders", label: "Directories", rows: items.filter((item) => item.group === "folders") },
  ].filter((group) => group.rows.length > 0)
  const active = items[activeIndex]

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-zinc-950/25 px-4 pt-[12vh] backdrop-blur-[2px]">
      <div className="flex h-[min(560px,76vh)] w-full max-w-[600px] flex-col overflow-hidden rounded-lg border border-zinc-200 bg-[#f7f7f5] shadow-2xl shadow-zinc-950/20">
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-zinc-200/80 px-4">
          <div className="text-sm font-semibold text-zinc-950">Add Project</div>
          <button className="flex size-8 items-center justify-center rounded-md text-zinc-500 hover:bg-white hover:text-zinc-950" onClick={props.onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="border-b border-zinc-200/80 p-3">
          <div className="flex h-9 items-center gap-2 rounded-md bg-white px-2.5 text-zinc-500 ring-1 ring-zinc-200/80 focus-within:ring-zinc-400">
            <Search className="size-4 shrink-0" />
            <input
              ref={inputRef}
              className="min-w-0 flex-1 bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
              placeholder="Search or enter a path"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault()
                  setActiveIndex((index) => Math.min(items.length - 1, index + 1))
                }
                if (event.key === "ArrowUp") {
                  event.preventDefault()
                  setActiveIndex((index) => Math.max(0, index - 1))
                }
                if (event.key === "Enter") {
                  event.preventDefault()
                  select(active)
                }
                if (event.key === "Tab" && active) {
                  event.preventDefault()
                  const value = displayPath(active.absolute, filter, home)
                  setFilter(value.endsWith("/") ? value : `${value}/`)
                }
                if (event.key === "Escape") props.onClose()
              }}
            />
          </div>
        </div>
        <div className="sidebar-scrollbar min-h-0 flex-1 overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-4 text-sm text-zinc-500">
              <LoaderCircle className="size-4 animate-spin" />
              Loading directories...
            </div>
          ) : null}
          {error ? <div className="px-3 py-4 text-sm text-red-600">{error}</div> : null}
          {!loading && !error && grouped.length === 0 ? (
            <div className="px-3 py-4 text-sm text-zinc-500">No directories found.</div>
          ) : null}
          {grouped.map((group) => (
            <div key={group.id} className="mb-3">
              <div className="px-2 py-1 text-[11px] font-semibold uppercase text-zinc-500">{group.label}</div>
              <div className="space-y-1">
                {group.rows.map((row) => {
                  const index = items.findIndex((item) => item.absolute === row.absolute)
                  const path = displayPath(row.absolute, filter, home)
                  return (
                    <button
                      key={`${row.group}:${row.absolute}`}
                      className={cn(
                        "flex h-10 w-full items-center gap-2 rounded-md px-2 text-left transition-colors",
                        activeIndex === index ? "bg-white text-zinc-950" : "text-zinc-700 hover:bg-white/70",
                      )}
                      onMouseEnter={() => setActiveIndex(index)}
                      onClick={() => select(row)}
                    >
                      <Folder className="size-4 shrink-0 text-zinc-500" />
                      <div className="min-w-0 flex-1">
                        <div className="flex min-w-0 items-center text-sm">
                          <span className="truncate text-zinc-500">{dirname(path)}</span>
                          <span className="shrink-0 font-medium text-zinc-950">{filename(path)}</span>
                          <span className="shrink-0 text-zinc-500">/</span>
                        </div>
                        {row.name ? <div className="truncate text-[11px] text-zinc-500">{row.name}</div> : null}
                      </div>
                      {row.added ? <span className="shrink-0 text-[11px] text-zinc-500">Added</span> : null}
                      <ChevronRight className="size-3.5 shrink-0 text-zinc-400" />
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
