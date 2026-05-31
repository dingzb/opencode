import { Clock, Folder, FolderPlus, Sparkles } from "lucide-react"
import type { Project } from "@opencode-ai/sdk/v2/client"

function displayName(project: Project) {
  return project.name || project.worktree.replace(/[/\\]+$/, "").split(/[/\\]/).filter(Boolean).at(-1) || project.worktree
}

function displayPath(path: string) {
  return path.replace(/[/\\]+$/, "")
}

export function ProjectWelcome(props: {
  recentProjects?: Project[]
  loading?: boolean
  onAddProject: () => void
  onOpenProject: (directory: string) => void
}) {
  const recentProjects = (props.recentProjects ?? []).slice(0, 6)

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-8 py-10 text-center">
      <div className="mb-4 rounded-full border border-zinc-200 bg-white p-3 shadow-sm">
        <Sparkles className="size-5 text-zinc-500" />
      </div>
      <h2 className="text-xl font-semibold text-zinc-950">Welcome to Buzi</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-zinc-500">
        Add a project to start a focused coding session with your local opencode server.
      </p>
      <button
        className="mt-6 inline-flex h-9 items-center gap-2 rounded-md bg-zinc-950 px-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-zinc-800"
        onClick={props.onAddProject}
      >
        <FolderPlus className="size-4" />
        Add Project
      </button>

      <div className="mt-10 w-full max-w-xl text-left">
        <div className="mb-2 flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <Clock className="size-3.5" />
          Recently opened
        </div>
        <div className="rounded-lg border border-zinc-200 bg-white/70 p-1 shadow-sm">
          {props.loading ? (
            <div className="px-3 py-4 text-sm text-zinc-500">Loading recent projects...</div>
          ) : recentProjects.length > 0 ? (
            recentProjects.map((project) => (
              <button
                key={project.id}
                className="flex h-12 w-full items-center gap-3 rounded-md px-3 text-left transition-colors hover:bg-zinc-100"
                onClick={() => props.onOpenProject(project.worktree)}
              >
                <Folder className="size-4 shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-zinc-950">{displayName(project)}</div>
                  <div className="truncate text-xs text-zinc-500">{displayPath(project.worktree)}</div>
                </div>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-zinc-500">No recent projects yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
