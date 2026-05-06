import { describe, expect, test } from "bun:test"
import type { ProviderListResponse } from "@opencode-ai/sdk/v2/client"
import {
  flattenMessages,
  makeTextPart,
  modelKey,
  selectDefaultAgent,
  selectDefaultModel,
} from "./chat"

describe("chat helpers", () => {
  test("selects the first non-deprecated provider model", () => {
    const selection = selectDefaultModel({
      all: [
        {
          id: "anthropic",
          name: "Anthropic",
          models: {
            old: { id: "old", name: "Old", status: "deprecated" },
            sonnet: { id: "sonnet", name: "Claude Sonnet", status: "active" },
          },
        },
      ],
      providers: {},
    } as unknown as ProviderListResponse)

    expect(selection).toEqual({
      providerID: "anthropic",
      modelID: "sonnet",
      label: "Anthropic / Claude Sonnet",
    })
    expect(modelKey(selection)).toBe("anthropic/sonnet")
  })

  test("selects the primary agent when available", () => {
    expect(
      selectDefaultAgent([
        { name: "reviewer", mode: "subagent" },
        { name: "build", mode: "primary" },
      ]),
    ).toBe("build")
  })

  test("creates text request parts with a supplied id", () => {
    expect(makeTextPart("message-1", "hello")).toEqual({
      id: "message-1-text",
      type: "text",
      text: "hello",
    })
  })

  test("flattens text-like message parts for rendering", () => {
    expect(
      flattenMessages([
        {
          info: {
            id: "msg-1",
            sessionID: "ses-1",
            role: "assistant",
            time: { created: 1 },
          },
          parts: [
            { id: "part-1", messageID: "msg-1", sessionID: "ses-1", type: "text", text: "hello" },
            { id: "part-2", messageID: "msg-1", sessionID: "ses-1", type: "text", text: " world" },
          ],
        },
      ]),
    ).toEqual([
      {
        id: "msg-1",
        role: "assistant",
        text: "hello world",
        created: 1,
      },
    ])
  })
})
