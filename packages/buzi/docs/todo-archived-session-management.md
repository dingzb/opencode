# Archived Session Management TODO

Buzi currently supports archiving active chats from the project sidebar. Archived sessions are removed from the active session list by setting `session.time.archived` through the opencode session update API.

The archive management UI is intentionally not implemented yet. Archived chats cannot currently be listed, previewed, unarchived, or permanently deleted from within Buzi.

## Implemented

- Add an archive button on each sidebar session row.
- Hide archived sessions from the active project session tree.
- Treat `session.updated` events with `time.archived` as removal from active state.
- Move away from the archived active session by clearing `activeSessionID`.

## Deferred Work

- Add a full-screen settings view controlled from `app.tsx`.
- Add a settings sidebar item for archived chats.
- Load archived sessions by project using the experimental session list API with `archived: true`, then filter for `session.time.archived`.
- Show archived chats as a project-grouped tree.
- Preview a selected archived chat with `MessageTimeline` without changing the active chat.
- Support unarchive by calling `session.update({ time: { archived: null } })`; the current generated SDK type only allows `number`, so keep the `null` cast isolated.
- Support permanent delete with a confirmation dialog.

## API Notes

- Normal `session.list()` excludes archived sessions.
- `experimental.session.list({ archived: true })` includes archived sessions, but it does not return only archived sessions.
- The server supports clearing `time.archived` with `null`, even though the generated JS SDK type does not currently expose `null`.
