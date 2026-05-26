# MCP Proactive (Auto-Invoke) Tools — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable LLM to proactively call MCP tools when user questions may need them, without explicit user mention.

**Architecture:** System prompt injection tells LLM which MCP servers support proactive use. Permission model relaxes from `always: ["*"]` to `always: []` for auto-approved servers, letting the existing permission dialog's "always allow" feature handle one-time authorization within the session.

**Tech Stack:** TypeScript, Effect v4, AI SDK, MCP SDK

---

### Task 1: Config Schema — Add autoApprove and proactivePrompt

**Files:**
- Modify: `packages/opencode/src/config/mcp.ts:4-18` (Local schema)
- Modify: `packages/opencode/src/config/mcp.ts:39-55` (Remote schema)

- [ ] **Step 1: Add fields to Local schema**

In `packages/opencode/src/config/mcp.ts`, add `autoApprove` after the `timeout` field (after line 17):

```ts
export const Local = Schema.Struct({
  type: Schema.Literal("local").annotate({ description: "Type of MCP server connection" }),
  command: Schema.mutable(Schema.Array(Schema.String)).annotate({
    description: "Command and arguments to run the MCP server",
  }),
  environment: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: "Environment variables to set when running the MCP server",
  }),
  enabled: Schema.optional(Schema.Boolean).annotate({
    description: "Enable or disable the MCP server on startup",
  }),
  timeout: Schema.optional(PositiveInt).annotate({
    description: "Timeout in ms for MCP server requests. Defaults to 5000 (5 seconds) if not specified.",
  }),
  autoApprove: Schema.optional(Schema.Boolean).annotate({
    description: "Enable proactive tool invocation. LLM may call tools without per-call confirmation. First call shows standard permission dialog; subsequent calls skip prompt within the session."
  }),
  proactivePrompt: Schema.optional(Schema.String).annotate({
    description: "Guidance for the LLM on when and how to proactively use this server's tools. Injected into the system prompt."
  }),
}).annotate({ identifier: "McpLocalConfig" })
```

- [ ] **Step 2: Add same fields to Remote schema**

In `packages/opencode/src/config/mcp.ts`, add to the Remote schema after `timeout` (after line 53):

```ts
export const Remote = Schema.Struct({
  type: Schema.Literal("remote").annotate({ description: "Type of MCP server connection" }),
  url: Schema.String.annotate({ description: "URL of the remote MCP server" }),
  enabled: Schema.optional(Schema.Boolean).annotate({
    description: "Enable or disable the MCP server on startup",
  }),
  headers: Schema.optional(Schema.Record(Schema.String, Schema.String)).annotate({
    description: "Headers to send with the request",
  }),
  oauth: Schema.optional(Schema.Union([OAuth, Schema.Literal(false)])).annotate({
    description: "OAuth authentication configuration for the MCP server. Set to false to disable OAuth auto-detection.",
  }),
  timeout: Schema.optional(PositiveInt).annotate({
    description: "Timeout in ms for MCP server requests. Defaults to 5000 (5 seconds) if not specified.",
  }),
  autoApprove: Schema.optional(Schema.Boolean).annotate({
    description: "Enable proactive tool invocation. LLM may call tools without per-call confirmation. First call shows standard permission dialog; subsequent calls skip prompt within the session."
  }),
  proactivePrompt: Schema.optional(Schema.String).annotate({
    description: "Guidance for the LLM on when and how to proactively use this server's tools. Injected into the system prompt."
  }),
}).annotate({ identifier: "McpRemoteConfig" })
```

- [ ] **Step 3: Run typecheck to verify schema compiles**

```powershell
cd packages/opencode; bun typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/opencode/src/config/mcp.ts
git commit -m "feat(mcp): add autoApprove and proactivePrompt config fields"
```

---

### Task 2: Auth Storage — Add authorized field (v2 prep)

**Files:**
- Modify: `packages/opencode/src/mcp/auth.ts:23-29`

- [ ] **Step 1: Add authorized field to Entry schema**

In `packages/opencode/src/mcp/auth.ts`, modify the `Entry` schema:

```ts
export const Entry = Schema.Struct({
  tokens: Schema.mutableKey(Schema.optional(Tokens)),
  clientInfo: Schema.mutableKey(Schema.optional(ClientInfo)),
  codeVerifier: Schema.mutableKey(Schema.optional(Schema.String)),
  oauthState: Schema.mutableKey(Schema.optional(Schema.String)),
  serverUrl: Schema.mutableKey(Schema.optional(Schema.String)),
  authorized: Schema.mutableKey(Schema.optional(Schema.Boolean)),
})
```

The existing `set()`/`get()`/`all()` methods handle this field automatically — no further code changes needed. This field is persisted for future cross-session persistence support but is not consumed in v1 permission logic.

- [ ] **Step 2: Run typecheck**

```powershell
cd packages/opencode; bun typecheck
```

- [ ] **Step 3: Commit**

```bash
git add packages/opencode/src/mcp/auth.ts
git commit -m "feat(mcp): add authorized field to auth Entry schema"
```

---

### Task 3: System Prompt — Generate MCP Proactive Hint

**Files:**
- Modify: `packages/opencode/src/session/prompt.ts`

- [ ] **Step 1: Add helper function**

In `packages/opencode/src/session/prompt.ts`, add this function after the imports and before the `layer` definition (around line 90):

```ts
function generateMcpProactiveHint(mcpConfig: Record<string, unknown>): string | undefined {
  const entries = Object.entries(mcpConfig).filter(([_name, entry]) => {
    if (!entry || typeof entry !== "object") return false
    return entry.autoApprove === true
  })
  if (entries.length === 0) return undefined

  const lines = [
    "## Proactive MCP Tools",
    "",
    "The following MCP servers are configured for proactive use. You",
    "may call their tools BEFORE answering the user — even when the",
    "user hasn't explicitly asked for these servers.",
    "",
  ]

  for (const [name, entry] of entries) {
    if (typeof entry.proactivePrompt === "string" && entry.proactivePrompt.trim()) {
      lines.push(`### ${name}`)
      lines.push(entry.proactivePrompt)
    } else {
      lines.push(`- **${name}**: Tools in this server are available for proactive invocation.`)
    }
    lines.push("")
  }

  lines.push(
    "Use these tools proactively when a user's question may involve the",
    "information or capabilities these tools expose.",
  )

  return lines.join("\n")
}
```

- [ ] **Step 2: Inject into system prompt array**

In `packages/opencode/src/session/prompt.ts`, after line 1442:
```ts
const system = [...env, ...instructions, ...(skills ? [skills] : [])]
```

Insert (as new lines):

```ts
const cfg = yield* config.get()
const mcpHint = generateMcpProactiveHint(cfg.mcp ?? {})
if (mcpHint) system.push(mcpHint)
```

Note: `config` (the `Config.Service`) is already available in the loop's outer closure (assigned at line 113). `cfg` must be yielded fresh each loop iteration to pick up runtime config changes.

- [ ] **Step 3: Run typecheck**

```powershell
cd packages/opencode; bun typecheck
```

- [ ] **Step 4: Commit**

```bash
git add packages/opencode/src/session/prompt.ts
git commit -m "feat(mcp): inject proactive MCP tool hints into system prompt"
```

---

### Task 4: Permission — Relax MCP Permission for Auto-Approved Tools

**Files:**
- Modify: `packages/opencode/src/session/tools.ts`
- Modify: `packages/opencode/src/session/prompt.ts` (call site)

- [ ] **Step 1: Add Config dependency to tools.ts resolve function**

In `packages/opencode/src/session/tools.ts`:

Add import at top (after line 1):
```ts
import { Config } from "@/config/config"
```

Add yield in resolve function body (after `const mcp = yield* MCP.Service` at line 39):
```ts
const config = yield* Config.Service
```

- [ ] **Step 2: Pre-compute autoApprove mapping**

In `packages/opencode/src/session/tools.ts`, after the `config` yield, add a helper to locate `autoApprove` servers. Also add the `sanitize` helper:

After line 39 (the config yield), insert:

```ts
function sanitize(s: string) {
  return s.replace(/[^a-zA-Z0-9_-]/g, "_")
}

const fullConfig = yield* config.get()
const mcpConfig = fullConfig.mcp ?? {}

const autoApproveServers = new Set<string>()
for (const [name, entry] of Object.entries(mcpConfig)) {
  if (!entry || typeof entry !== "object") continue
  if (entry.autoApprove === true) autoApproveServers.add(sanitize(name))
}
```

- [ ] **Step 3: Branch permission check in MCP tool execute handler**

In `packages/opencode/src/session/tools.ts`, at line 135, change:

```ts
yield* ctx.ask({ permission: key, metadata: {}, patterns: ["*"], always: ["*"] })
```

To:

```ts
const toolAutoApprove = [...autoApproveServers].some((prefix) => key.startsWith(prefix + "_"))
yield* ctx.ask({ permission: key, metadata: {}, patterns: ["*"], always: toolAutoApprove ? [] : ["*"] })
```

- [ ] **Step 4: Provide Config.Service at call site**

In `packages/opencode/src/session/prompt.ts`, at the `SessionTools.resolve()` call site (lines 1388-1402), add `Config.Service`:

```ts
const tools = yield* SessionTools.resolve({
  agent,
  session,
  model,
  processor: handle,
  bypassAgentCheck,
  messages: msgs,
  promptOps,
}).pipe(
  Effect.provideService(Plugin.Service, plugin),
  Effect.provideService(Permission.Service, permission),
  Effect.provideService(ToolRegistry.Service, registry),
  Effect.provideService(MCP.Service, mcp),
  Effect.provideService(Truncate.Service, truncate),
  Effect.provideService(Config.Service, config),
)
```

- [ ] **Step 5: Run typecheck**

```powershell
cd packages/opencode; bun typecheck
```

- [ ] **Step 6: Commit**

```bash
git add packages/opencode/src/session/tools.ts packages/opencode/src/session/prompt.ts
git commit -m "feat(mcp): branch MCP permission check for auto-approved tools"
```

---

### Task 5: Write Tests

**Files:**
- Create/Modify: `packages/opencode/test/mcp/proactive.test.ts`

- [ ] **Step 1: Write config schema test**

```ts
import { expect, test } from "bun:test"
import { Schema } from "effect"
import { ConfigMCP } from "../../src/config/mcp"

test("autoApprove and proactivePrompt are optional in Local schema", () => {
  const result = Schema.decodeUnknownSync(ConfigMCP.Local)({
    type: "local",
    command: ["node", "server.js"],
  })
  expect(result.autoApprove).toBeUndefined()
  expect(result.proactivePrompt).toBeUndefined()
})

test("autoApprove and proactivePrompt are accepted in Local schema", () => {
  const result = Schema.decodeUnknownSync(ConfigMCP.Local)({
    type: "local",
    command: ["node", "server.js"],
    autoApprove: true,
    proactivePrompt: "Use for internal doc lookup.",
  })
  expect(result.autoApprove).toBe(true)
  expect(result.proactivePrompt).toBe("Use for internal doc lookup.")
})

test("autoApprove and proactivePrompt are optional in Remote schema", () => {
  const result = Schema.decodeUnknownSync(ConfigMCP.Remote)({
    type: "remote",
    url: "https://example.com/mcp",
  })
  expect(result.autoApprove).toBeUndefined()
  expect(result.proactivePrompt).toBeUndefined()
})

test("autoApprove and proactivePrompt are accepted in Remote schema", () => {
  const result = Schema.decodeUnknownSync(ConfigMCP.Remote)({
    type: "remote",
    url: "https://example.com/mcp",
    autoApprove: true,
    proactivePrompt: "Use for API documentation.",
  })
  expect(result.autoApprove).toBe(true)
  expect(result.proactivePrompt).toBe("Use for API documentation.")
})
```

- [ ] **Step 2: Write system prompt hint generation test**

```ts
import { expect, test } from "bun:test"
import { generateMcpProactiveHint } from "../../src/session/prompt"

test("generateMcpProactiveHint returns undefined when no autoApprove entries", () => {
  expect(generateMcpProactiveHint({})).toBeUndefined()
  expect(generateMcpProactiveHint({ "no-auto": { type: "local", command: ["cmd"] } })).toBeUndefined()
})

test("generateMcpProactiveHint returns hint for autoApprove entries", () => {
  const result = generateMcpProactiveHint({
    "my-kb": { type: "local", command: ["node", "kb.js"], autoApprove: true },
  })
  expect(result).toBeDefined()
  expect(result!).toContain("my-kb")
  expect(result!).toContain("Proactive MCP Tools")
})

test("generateMcpProactiveHint includes proactivePrompt when provided", () => {
  const result = generateMcpProactiveHint({
    "my-kb": { type: "local", command: ["node", "kb.js"], autoApprove: true, proactivePrompt: "Internal docs and standards." },
  })
  expect(result!).toContain("Internal docs and standards.")
})
```

**Note:** For step 2 to work, `generateMcpProactiveHint` must be exported from `prompt.ts`. Update the function to be exported:

```ts
export function generateMcpProactiveHint(mcpConfig: Record<string, unknown>): string | undefined {
```

- [ ] **Step 3: Run tests**

```powershell
cd packages/opencode; bun test test/mcp/proactive.test.ts
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add packages/opencode/test/mcp/proactive.test.ts packages/opencode/src/session/prompt.ts
git commit -m "test(mcp): add proactive tools unit tests"
```

---

### Task 6: Final Verification

- [ ] **Step 1: Full typecheck**

```powershell
cd packages/opencode; bun typecheck
```

Expected: No type errors.

- [ ] **Step 2: Run full test suite**

```powershell
cd packages/opencode; bun test
```

Expected: All existing tests pass, no regressions.

- [ ] **Step 3: Verify build**

```powershell
cd packages/opencode; bun run build
```

Expected: Build succeeds.

---

## File Summary

| File | Change |
|------|--------|
| `src/config/mcp.ts` | Add `autoApprove` + `proactivePrompt` to Local and Remote schemas |
| `src/mcp/auth.ts` | Add `authorized` field to Entry schema (v2 prep) |
| `src/session/prompt.ts` | Add `generateMcpProactiveHint()` helper; inject hint into system array; provide Config.Service to resolve call |
| `src/session/tools.ts` | Add config dependency; pre-compute autoApprove mapping; branch permission check |

## Out of Scope (v2+)

- Cross-session authorization persistence via `mcp-auth.json` (field added but not consumed)
- Per-tool granularity for auto-approve
- Pre-classification layer to pre-filter irrelevant queries
- Tool description augmentation in system prompt (LLM already sees tool descriptions through normal registration)
