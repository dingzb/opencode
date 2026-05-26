import { expect, test } from "bun:test"
import { Schema } from "effect"
import { ConfigMCP } from "../../src/config/mcp"
import { generateMcpProactiveHint } from "../../src/session/prompt"

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

test("generateMcpProactiveHint returns undefined when no autoApprove entries", () => {
  expect(generateMcpProactiveHint({})).toBeUndefined()
  expect(generateMcpProactiveHint({
    "no-auto": { type: "local", command: ["cmd"] },
  } as unknown as Record<string, unknown>)).toBeUndefined()
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

test("generateMcpProactiveHint skips entries with autoApprove false", () => {
  const result = generateMcpProactiveHint({
    "kb": { type: "local", command: ["node", "kb.js"], autoApprove: true },
    "other": { type: "local", command: ["node", "other.js"], autoApprove: false },
  })
  expect(result!).toContain("kb")
  expect(result!).not.toContain("other")
})
