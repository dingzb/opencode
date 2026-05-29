# Buzi GTK Shell

Linux/GNOME native shell experiment for Buzi.

This uses GTK4, libadwaita, and WebKitGTK:

- `AdwApplicationWindow` for the native GNOME window.
- `AdwHeaderBar` for the native header bar.
- `WebKitWebView` to load the Buzi web UI.

## System Dependencies

Ubuntu package names vary by release. On recent Ubuntu versions, install the GTK4, libadwaita, and WebKitGTK development packages, for example:

```bash
sudo apt install libgtk-4-dev libadwaita-1-dev libwebkitgtk-6.0-dev
```

If `libwebkitgtk-6.0-dev` is not available on your release, check the available WebKitGTK development package:

```bash
apt search webkitgtk | grep dev
```

## Run

From `packages/buzi`, run the GTK shell and the Linux frontend together:

```bash
bun run gtk:dev
```

Or start the Buzi Linux frontend first:

```bash
bun run dev:linux
```

Then run the native shell:

```bash
bun run gtk:run
```

The GTK shell loads `http://localhost:4455`.
