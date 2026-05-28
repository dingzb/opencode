# Sidebar and Title Bar Redesign

## Background

This change moves Buzi away from an activity-bar-driven layout and toward a workspace shell:

```text
AppShell
├── TitleBar
└── WorkspaceFrame
    ├── LeftSidebar
    ├── ChatView
    └── RightInspector
```

The goal is to keep conversations as the primary workflow without making the product feel like a chat-only application.

## Decisions

### 1. TitleBar Is Top Level

`RichTitleBar` belongs to the shell level. It should sit above the sidebar, chat area, and future inspector.

It is responsible for:

- Current context title supplied by the active workspace feature.
- Current project path and current conversation title in the conversations feature.
- Global shell actions such as server configuration status, inspector toggle, and application menu.
- Desktop window controls in the desktop shell.

It should not be implemented as a header inside the chat view.

### 2. Remove ActivityBar

The current standalone activity bar should be removed.

Future navigation should not reintroduce a separate VSCode-like vertical strip unless there is a clear product need. Buzi should feel more like a focused desktop workspace than a multi-pane IDE clone.

### 3. LeftSidebar Owns Local Workspace Navigation

The left sidebar is the place for workspace-local navigation and conversation access.

Default mode:

```text
Conversations
├── Search
├── New Session
└── Session List grouped by time
```

Bottom dock:

```text
Projects  Plugins  Knowledge  Settings  Help  More
```

The bottom dock is intentionally compact and icon-only. It should not compete with the conversation list.

Project creation and workspace switching are title-bar title-menu responsibilities. The conversations panel should not expose a project creation flow or organize sessions around project management concepts.

For the conversations feature, the title bar title is centered and uses two lines:

```text
project path
conversation title
```

The project path line is primary. The conversation title is smaller and lighter, acting as a subtitle. Clicking the centered title opens the project selector menu with the current project, show-all, and add-project actions.

### 4. Conversations Are a Sidebar Region

Conversations are no longer treated as a top-level page. They are the default functional region inside the left sidebar.

This means a session list can be replaced by another sidebar panel when needed, for example:

```ts
type SidebarPanel = "conversations" | "projects" | "plugins" | "knowledge" | "settings" | "help"
```

Switching panels changes the content of the left sidebar. It should not switch the whole application into a new page.

### 5. Global Status Does Not Belong in the Sidebar

Connection status, sync status, and server availability are global runtime state.

They should live in:

- Title bar server icon status.
- Workspace menu details.
- Main-area warning banner for errors.

They should not be placed at the top of the left sidebar.

## First Implementation Scope

The first pass should:

- Add a top-level `TitleBar`.
- Remove `ActivityBar`.
- Replace `SidePanel` with `LeftSidebar`.
- Keep conversations as the default sidebar panel.
- Keep new-session actions in the conversations sidebar.
- Move project selection and project creation into the centered title menu.
- Keep the title bar right side for server status, inspector toggle, and application menu.
- Add a compact bottom dock for future workspace features.
- Add a placeholder `RightInspector` with show/hide behavior.

The first pass does not need to implement real Projects, Plugins, Knowledge, Settings, or Help views. Placeholder sidebar panels are enough to establish the navigation model.
