# Buzii Core Build Plan

## Goal

Build a Buzii-owned opencode sidecar that keeps the upstream server behavior needed by Buzii, while avoiding conflicts with a separately installed upstream opencode on the same machine.

This plan intentionally keeps the upstream opencode build pipeline as the base. The current evidence shows that a separate minimal Bun entrypoint does not meaningfully reduce binary size, because most size comes from the Bun runtime and the server dependency graph rather than the web/TUI entry commands.

## Identity And Storage Isolation

Buzii core should not share default config/data/cache/state paths with a user's existing `opencode` installation.

Recommended source change:

- In `packages/core/src/global.ts`, change the internal app id from `opencode` to `buzii-core`.

Expected effect:

- XDG data path becomes `buzii-core` instead of `opencode`.
- XDG config path becomes `buzii-core` instead of `opencode`.
- XDG cache path becomes `buzii-core` instead of `opencode`.
- XDG state path becomes `buzii-core` instead of `opencode`.
- Default sqlite database no longer collides with upstream opencode's `opencode.db`.

Desktop can still additionally set `OPENCODE_DB` to an app-data path, but changing the source-level app id is the cleaner default isolation.

## Binary And Artifact Naming

Package/artifact names should be Buzii-owned:

- Package name: `buzii-core`
- Binary name: `buzii-core`
- Artifact prefix: `buzii-core-<platform>-<arch>`

This avoids ambiguity with an installed upstream `opencode` binary and makes sidecar staging explicit.

## Build Strategy

Use upstream `packages/opencode/script/build.ts` as the base build path instead of maintaining a separate custom compiler path.

Build with:

```sh
bun run --cwd packages/opencode build --single --skip-embed-web-ui
```

For release builds, use the same upstream release flow, but keep the `--skip-embed-web-ui` behavior in the Buzii build invocation.

Reasoning:

- Upstream build already handles Bun compile targets, platform naming, worker packaging, release archives, and smoke testing.
- Removing CLI/web/TUI entry behavior does not materially reduce the binary size while the full server graph remains.
- Keeping the upstream build path lowers maintenance risk.

## Web UI Handling

There are two separate web UI concerns.

### Do Not Embed Web UI Assets

Use upstream build flag:

```sh
--skip-embed-web-ui
```

This avoids building `packages/app/dist` and avoids embedding `opencode-web-ui.gen.ts` assets into the binary.

### Disable Web Fallback

`--skip-embed-web-ui` alone is not enough. Upstream `serveUIEffect` falls back to proxying `https://app.opencode.ai` when embedded assets are unavailable.

Recommended source change:

- In `packages/opencode/src/server/shared/ui.ts`, when no embedded UI is available, return 404 instead of proxying `app.opencode.ai`.

Expected behavior:

- `GET /` returns 404 or a small JSON not found response.
- The server no longer serves or proxies the upstream web application.
- API routes remain available.

## Web Command Handling

Disable the explicit `web` CLI command.

Recommended source change:

- In `packages/opencode/src/index.ts`, remove the import and registration of `WebCommand`.

Expected behavior:

- `buzii-core web` is not a supported command.
- The sidecar cannot be used to intentionally open the upstream web interface.

## TUI Handling

Do not attempt to remove all TUI code from the binary at this stage. The size savings are uncertain, and upstream build currently packages TUI worker/parser pieces explicitly.

Instead, disable only the default TUI launch behavior.

Recommended source change:

- In `packages/opencode/src/index.ts`, remove registration of `TuiThreadCommand`, whose command is `$0 [project]`.

Expected behavior:

- Running `buzii-core` without a command does not start the TUI.
- Running `buzii-core some/path` does not start the TUI.
- `buzii-core serve` remains the intended sidecar entry.

This is a behavioral safety change, not a size reduction strategy.

## Intended Runtime Behavior

Supported:

```sh
buzii-core serve --hostname 127.0.0.1 --port <port>
```

Not supported:

```sh
buzii-core
buzii-core web
buzii-core some/project/path
```

HTTP behavior:

- Buzii-required API routes are served.
- Web UI root fallback is disabled.
- Embedded web assets are not included.

## Validation Checklist

After implementing the source changes:

```sh
bun run --cwd packages/opencode typecheck
bun run --cwd packages/opencode build --single --skip-embed-web-ui --skip-install
```

Then verify the built binary:

```sh
dist/buzii-core-<platform>-<arch>/bin/buzii-core --help
dist/buzii-core-<platform>-<arch>/bin/buzii-core serve --hostname 127.0.0.1 --port 0
dist/buzii-core-<platform>-<arch>/bin/buzii-core web
```

Expected:

- Help does not advertise `web`.
- Help does not advertise default TUI behavior.
- `serve` starts the HTTP server.
- `/` does not return the opencode web HTML.
- Buzii's session/event/question/permission API flows still work.
