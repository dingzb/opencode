import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 4455,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**", "**/src-gtk/**", "**/target/**"],
    },
  },
})
