# opencode React Client V1 Design

## Goal

Build a first independent React web client for opencode with a Codex-inspired desktop chat surface. The first version focuses on one usable loop: connect to an opencode server, create or select a session, choose provider/model and agent, send a message, and render the streamed conversation.

This client is intentionally not integrated into the existing desktop packaging yet. It lives as a separate Vite app and talks to a hard-coded opencode server URL during development.

## Sources

- `docs/my-opencode/opencode_desktop_ui_design_spec_v_1.md`: visual direction, dense desktop layout, dark graphite theme, top bar, sidebar, timeline, composer, model and agent controls.
- `docs/my-opencode/*接口调用梳理.md`: server interaction map, SDK-first usage, session lifecycle, SSE event stream, provider/model and agent bootstrapping.
- `packages/app`: current Solid app implementation. The new client should copy its server interaction semantics, not its framework code.

## Recommended Approach

Use a new standalone package at `packages/client`.

Trade-offs considered:

1. Replace `packages/app` in place.
   This would reuse app paths, but it risks mixing React and Solid during a prototype and makes rollback harder.

2. Build outside the monorepo.
   This isolates the experiment, but it loses workspace access to `@opencode-ai/sdk` and makes API drift easier.

3. Build a new workspace package.
   This keeps the prototype close to the SDK and server code while preserving the existing app. This is the best fit for V1.

## Tech Stack

- Runtime and package manager command surface: Bun
- App framework: Vite + React + TypeScript
- Server SDK: `@opencode-ai/sdk/v2/client`
- Styling: plain CSS modules/global CSS for V1, using Codex-like dark graphite tokens
- State: React hooks and reducer-style helper functions, no external store for V1

Bun owns dependency installation, script execution, and `bun test` for this client. Vite still owns browser-facing TS/TSX transpilation, React Fast Refresh, asset handling, and production bundling. Type checking stays explicit through `tsgo --noEmit`.

## Server Contract

The client should mirror the existing app's server logic:

- Create SDK clients with `createOpencodeClient({ baseUrl, directory, throwOnError: true })`.
- Use the same directory scoping behavior as `packages/app/src/context/sdk.tsx`: the active directory is passed into the SDK client so requests carry `x-opencode-directory` or equivalent query params.
- Bootstrap global and directory data with:
  - `global.health()`
  - `provider.list()`
  - `app.agents()`
  - `session.list()`
  - `session.status()`
- Create a session with `session.create()`.
- Fetch messages with `session.messages({ sessionID, limit })`.
- Send normal chat with `session.promptAsync({ sessionID, agent, model, messageID, parts })`.
- Subscribe to server events with `global.event()` and apply relevant session/message events into local state.

For V1, unsupported flows are deliberately out of scope: worktrees, shell mode, slash commands, permissions, questions, file attachments, diff/review panels, terminal panels, OAuth/provider setup, and packaging.

## UX Shape

The first screen is the actual chat workspace, not a landing page.

Layout:

- Left sidebar, about 260px: server status, new session button, session list.
- Top bar, about 44px: product label, current session title, provider/model selector, agent selector, connection status.
- Main timeline: user and assistant messages with compact Codex-like spacing, readable Markdown-like plain text, streaming status.
- Bottom composer: multiline input, send/stop action, selected model/agent summary.

Visual style:

- Dark graphite background with restrained contrast.
- Compact operational UI, no decorative hero treatment.
- Square-ish controls, radius 6px or less.
- Blue accent only for focus and primary actions.
- Text sizes stay stable across viewport widths.

## Client Architecture

Files in `packages/client/src`:

- `main.tsx`: React entry.
- `App.tsx`: app composition and high-level state.
- `opencode/client.ts`: SDK creation, server config, auth header support.
- `opencode/chat.ts`: session creation, message send request building, provider/model selection helpers.
- `opencode/events.ts`: event type guards and reducer helpers for message updates.
- `components/Sidebar.tsx`: sessions and server summary.
- `components/TopBar.tsx`: model and agent controls.
- `components/Conversation.tsx`: timeline rendering.
- `components/Composer.tsx`: prompt input and send behavior.
- `styles.css`: V1 design tokens and layout.

The important boundary is that UI components receive plain state and callbacks. SDK details stay inside `opencode/*` helpers and `App.tsx`.

## State Model

V1 keeps a compact state shape:

```ts
type ChatState = {
  serverUrl: string
  directory: string
  sessions: Session[]
  activeSessionID?: string
  messages: MessageView[]
  providers: ProviderOption[]
  agents: AgentOption[]
  selectedModel?: ModelSelection
  selectedAgent?: string
  status: "idle" | "connecting" | "streaming" | "error"
  error?: string
}
```

Message rendering uses a UI-specific flattened view, derived from `session.messages()` and updated by SSE. This avoids leaking every SDK part shape into React components.

## Event Handling

V1 starts the global SSE stream after bootstrap. It only handles events needed for chat:

- message added/updated events refresh or merge the active session messages.
- message part delta/update events update the visible assistant text when possible.
- session status events update busy/idle status.

If an event shape is not recognized, V1 ignores it and keeps the polling/fetch fallback simple: after sending a prompt, refresh `session.messages()` for the active session.

## Testing

First coverage should target framework-independent helpers:

- model selection chooses the first non-deprecated available model.
- prompt request parts use a text part with a stable generated id.
- message flattening preserves user/assistant role and concatenates text-like parts.

Manual/browser verification for V1:

- app loads against `http://localhost:4096`;
- provider/model and agent selectors populate;
- new session can be created;
- prompt sends through `session.promptAsync`;
- response appears through event updates or message refresh.

## Implementation Order

1. Create `packages/client` scaffold with Bun scripts and Vite config.
2. Add tests for helper behavior.
3. Implement SDK helpers and state normalization.
4. Build the Codex-like layout and components.
5. Wire bootstrap, session selection, send, event refresh.
6. Run package typecheck/tests and start the dev server if dependencies are available.
