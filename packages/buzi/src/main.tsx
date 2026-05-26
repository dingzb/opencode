import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { App } from "./app"
import "streamdown/styles.css"
import "./styles.css"

const root = document.getElementById("root")

if (!root) throw new Error("Root element not found")

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: {
              refetchOnWindowFocus: false,
              retry: 1,
            },
          },
        })
      }
    >
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
