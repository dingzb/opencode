# Buzi Tauri Desktop Packaging

Buzi uses Tauri as a thin desktop frame around the existing workspace UI.

## Structure

```text
App
└── AppFrame
    ├── WebFrame
    └── DesktopFrame
        └── WindowControls
└── WorkspaceShell
    ├── Workspace title bar
    ├── Left sidebar
    ├── Chat workspace
    └── Right inspector
```

The desktop frame owns platform window behavior. The workspace shell owns Buzi layout and product actions.

## Files

```text
src/runtime/platform.ts        Runtime and OS detection
src/runtime/window-actions.ts  Safe window action wrappers
src/shell/app-frame.tsx        Web/Desktop frame selection
src/shell/window-controls.tsx  macOS/Windows/Linux controls
src-tauri/                     Tauri application source and config
```

## Commands

```bash
bun run desktop:dev
bun run desktop:build
bun run desktop:build:mac
bun run desktop:build:win
bun run desktop:build:linux
```

Platform-specific bundle commands must be run on the matching OS unless a dedicated cross-compilation setup is added later.

## Window Layout

- macOS renders traffic-light controls on the left.
- Windows and Linux render standard controls on the right.
- The right inspector toggle remains part of the workspace title bar, not the desktop frame.
- Tauri drag region is enabled only for the desktop title bar frame.
