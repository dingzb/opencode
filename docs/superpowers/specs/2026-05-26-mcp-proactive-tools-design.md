# MCP Proactive (Auto-Invoke) Tools — Design Spec

## Problem

MCP tools are currently purely reactive: the LLM only calls them when the user explicitly asks a question that matches a tool's description. There is no mechanism for the LLM to **proactively** query an MCP tool when context suggests it's needed, but the user hasn't mentioned it.

**Example**: A user asks "What are our CSS variable conventions?", which is documented in an internal knowledge base exposed via MCP tools (`list_directory`, `search_fragment`). The LLM should proactively call these tools to fetch relevant documentation before answering, without the user having to say "check the knowledge base first."

## Approach: System Prompt Injection + Permission Relaxation (方案 A)

Chosen over Pre-augmentation (方案 B) and Structured Workflow (方案 C) for minimal code change and maximum leverage of existing LLM tool-calling capability. Can be incrementally enhanced to approach B or C later.

### Core mechanism

1. **System prompt injection** tells the LLM which MCP tools are available for proactive use and when to call them.
2. **First-time authorization** replaces the per-call permission prompt for configured servers.

```
User query
  → LLM sees system prompt: "Knowledge base tools available for proactive use"
  → LLM auto-decides to call list_directory → search_fragment
  → Permission check: first time → prompt "Allow auto-query?" → persist; subsequent → silent
  → Results returned, LLM synthesizes answer
```

---

## System Prompt Design

### Where

New `mcps()` method on `SystemPrompt.Service` in `src/session/system.ts`, following the existing pattern of `skills()` and `environment()`.

In `src/session/prompt.ts` line 1442, append to the system array:

```ts
const system = [...env, ...instructions, ...(skills ? [skills] : []), ...(mcps ?? [])]
```

### What

Dynamically generated per-session, generic pattern driven by MCP server config.
Only MCP servers with `autoApprove: true` are included. Tool names and descriptions
come directly from the MCP server's `listTools()` output. An optional `prompt`
config field per server can provide additional usage guidance.

```
## Proactive MCP Tools

The following MCP tools are available for proactive use. You may call these
tools BEFORE answering the user — even when the user hasn't explicitly asked
for them.

{for each auto-approved server:}
### {server_name}
- {sanitized_server}_{tool1}: {description from MCP server}
- {sanitized_server}_{tool2}: {description from MCP server}
{optional prompt from config if provided}

Use these tools proactively when a user's question may involve the information
or capabilities these tools expose. Prefer exploring first (list/discover tools)
before drilling into specifics.
```

**Dynamic attributes**:
- `{server_name}` — the config key, not sanitized (readable for LLM)
- `{sanitized_server}_{tool_name}` — the actual callable tool key (LLM must use this exact key)
- `{description}` — from MCP server's tool definition, unmodified
- `{optional prompt}` — additional guidance from `proactivePrompt` config field, e.g. "Use for internal documentation lookup, standards, and coding conventions."

**Config schema** — `proactivePrompt` field (optional, per-server):

```ts
proactivePrompt: Schema.optional(Schema.String).annotate({
  description: "Additional guidance injected into the system prompt to help the LLM decide when to proactively call this server's tools."
})
```

Note: The `mcps()` method must have access to MCP tool definitions at prompt assembly time.
Since tool defs are cached in `s.defs[clientName]`, the method queries the MCP service state.

---

## Permission Model: First-Time Authorize + Remember

### Current behavior

`src/session/tools.ts:135` — every MCP tool call triggers a permission prompt:

```ts
yield* ctx.ask({ permission: key, metadata: {}, patterns: ["*"], always: ["*"] })
```

### New behavior

The permission prompt UI remains **identical** to the existing MCP tool authorization
dialog. The difference is in the authorization persistence strategy:

```
LLM calls MCP tool (key = "{server}_{tool}")
  → Server has autoApprove config? ──No──→ always: ["*"] — prompt every call (existing behavior)
  → Yes
  → Authorized in mcp-auth.json? ──Yes──→ skip prompt, execute silently
  → No
  → Show permission prompt (same UI as existing MCP tools)
    → User confirms (with "always allow" if they choose)
    → Persist authorized=true to mcp-auth.json
    → Subsequent calls: skip prompt
  → User denies
    → Tool call fails with permission error, LLM handles the error
```

The authorization prompt wording matches existing MCP tool prompts — it asks
for permission to invoke the specific tool, not a separate "auto-query" prompt.
The "always allow" mechanism in the existing permission UI serves as the natural
first-time authorization trigger.

### Config schema changes

`src/config/mcp.ts` — add two new optional fields to both `Local` and `Remote` schemas:

```ts
autoApprove: Schema.optional(Schema.Boolean).annotate({
  description: "Enable proactive tool invocation. First call prompts for authorization via the standard MCP permission dialog; subsequent calls skip the prompt. Authorization is persisted per-server in mcp-auth.json."
})
proactivePrompt: Schema.optional(Schema.String).annotate({
  description: "Additional guidance for the LLM on when and how to proactively use this server's tools. Injected into the system prompt alongside the tool listing."
})
```

Example config:

```json
{
  "mcp": {
    "knowledge-base": {
      "type": "local",
      "command": ["node", "kb-server.js"],
      "autoApprove": true,
      "proactivePrompt": "Use for internal documentation, coding standards, and project conventions."
    }
  }
}
```

### Auth storage

`src/mcp/auth.ts` — add `authorized` field to `Entry`:

```ts
export const Entry = Schema.Struct({
  // ... existing fields (tokens, clientInfo, codeVerifier, oauthState, serverUrl)
  authorized: Schema.mutableKey(Schema.optional(Schema.Boolean)),
})
```

Reuse existing `McpAuth.set()` / `McpAuth.get()` for persistence to `mcp-auth.json`.

### Authorization granularity

Server-level, not tool-level. Rationale: typical auto-approve scenarios (knowledge base, internal docs) have all read-only tools within a server; per-tool granularity adds complexity without clear benefit for v1.

### Revocation

`opencode mcp auth logout {name}` clears all fields including `authorized`. Next call re-prompts.

---

## Error Handling & Edge Cases

| Scenario | Behavior |
|----------|----------|
| MCP server disconnected | Tool call returns error to LLM; LLM falls back to "I can't access the knowledge base right now" |
| Tool timeout | Same as existing timeout handling; error returned to LLM |
| Auth revoked | `authorized` flag cleared; next call re-prompts |
| Multiple auto-approve servers | Each independently checked; first call to each server triggers its own one-time prompt |
| LLM over-triggers (calls tool for irrelevant query) | System prompt guides to be judicious; if it happens, tool returns empty results, LLM moves on |
| Permission denied by user | Tool call fails with permission error; LLM sees error and falls back |
| autoApprove config changed at runtime | Evaluated on each tool call; adding autoApprove takes effect immediately, removing it reverts to per-call prompts |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/config/mcp.ts` | Add `autoApprove` to `Local` and `Remote` schemas |
| `src/mcp/auth.ts` | Add `authorized` field to `Entry` schema |
| `src/session/system.ts` | Add `mcps()` method to `SystemPrompt.Service` |
| `src/session/tools.ts` | Branch MCP permission check: if `autoApprove` + authorized → silent; else → existing prompt |
| `src/session/prompt.ts:1442` | Append `mcps` output to system array |

## Files NOT Modified

| File | Reason |
|------|--------|
| `src/mcp/index.ts` | Tool conversion/discovery unchanged |
| `src/tool/registry.ts` | Built-in tool registry unaffected |
| `src/provider/*` | No provider-specific changes needed |
| `src/session/llm.ts` | No changes to streaming or toolChoice |
| `src/session/processor.ts` | Tool execution path unchanged |
| `src/session/llm/request.ts` | Tool filtering unchanged |

## Out of Scope (v2+)

- Pre-classification layer (方案 B) to pre-filter irrelevant queries
- Per-tool auto-approve granularity (server-level is sufficient for v1)
- Tool description augmentation (modifying MCP tool descriptions for proactive use)
- UI indicator showing "proactive tool call in progress"
- Auto-approve metrics/logging

---

## Testing Strategy

1. **Unit**: Auth storage read/write for `authorized` field; `autoApprove` config parsing
2. **Integration** (extend `test/mcp/lifecycle.test.ts`):
   - autoApprove server: first call triggers permission prompt, second call silent
   - non-autoApprove server: every call triggers permission prompt (existing behavior unchanged)
   - autoApprove server with authorized=true: no permission prompt
3. **Manual / E2E**: Configure a test MCP server with `autoApprove: true`, ask a relevant question, verify LLM proactively calls the tool
