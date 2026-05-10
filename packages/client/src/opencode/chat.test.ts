import { describe, expect, test } from "bun:test"
import type { ProviderListResponse } from "@opencode-ai/sdk/v2/client"
import {
  applyPartDelta,
  flattenMessages,
  hasAssistantResponse,
  makeTextPart,
  mergeMessageViews,
  messageID,
  modelKey,
  selectDefaultAgent,
  selectDefaultModel,
  upsertMessagePart,
} from "./chat"

const opencodeID = /^(msg|prt)_[0-9a-f]{12}[0-9A-Za-z]{14}$/

describe("chat helpers", () => {
  test("prefers deepseek-v4-pro when available", () => {
    const selection = selectDefaultModel({
      all: [
        {
          id: "anthropic",
          name: "Anthropic",
          models: {
            sonnet: { id: "sonnet", name: "Claude Sonnet", status: "active" },
          },
        },
        {
          id: "deepseek",
          name: "DeepSeek",
          models: {
            "deepseek-v4-pro": { id: "deepseek-v4-pro", name: "DeepSeek V4 Pro", status: "active" },
          },
        },
      ],
      providers: {},
    } as unknown as ProviderListResponse)

    expect(selection).toEqual({
      providerID: "deepseek",
      modelID: "deepseek-v4-pro",
      label: "DeepSeek / DeepSeek V4 Pro",
    })
  })

  test("falls back to the first non-deprecated provider model", () => {
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

  test("creates text request parts with opencode-compatible ids", () => {
    const part = makeTextPart("msg_000000000001abcdefghijklmn", "hello")

    expect(part).toEqual({
      id: expect.stringMatching(opencodeID),
      type: "text",
      text: "hello",
    })
    expect(part.id?.startsWith("prt_")).toBe(true)
  })

  test("creates opencode-compatible message ids", () => {
    expect(messageID()).toMatch(opencodeID)
  })

  test("detects assistant responses for a submitted user message", () => {
    expect(
      hasAssistantResponse(
        [
          {
            info: { id: "msg-user", role: "user" },
            parts: [],
          },
          {
            info: { id: "msg-assistant", parentID: "msg-user", role: "assistant" },
            parts: [{ id: "part-1", messageID: "msg-assistant", sessionID: "ses-1", type: "text", text: "ok" }],
          },
        ],
        "msg-user",
      ),
    ).toBe(true)
  })

  test("applies streaming text deltas to existing message parts", () => {
    const messages = upsertMessagePart(
      [
        {
          id: "msg-assistant",
          role: "assistant",
          text: "",
          parts: [],
          created: 1,
        },
      ],
      {
        id: "prt-1",
        messageID: "msg-assistant",
        sessionID: "ses-1",
        type: "text",
        text: "he",
      },
    )

    expect(
      applyPartDelta(messages, {
        messageID: "msg-assistant",
        partID: "prt-1",
        field: "text",
        delta: "llo",
      }).at(0),
    ).toMatchObject({
      text: "hello",
      parts: [{ text: "hello" }],
    })
  })

  test("does not let stale message snapshots overwrite longer streamed text", () => {
    expect(
      mergeMessageViews(
        [
          {
            id: "msg-assistant",
            role: "assistant",
            text: "hello world",
            parts: [{ id: "prt-1", messageID: "msg-assistant", sessionID: "ses-1", type: "text", text: "hello world" }],
            created: 1,
          },
        ],
        [
          {
            id: "msg-assistant",
            role: "assistant",
            text: "hello",
            parts: [{ id: "prt-1", messageID: "msg-assistant", sessionID: "ses-1", type: "text", text: "hello" }],
            created: 1,
          },
        ],
      ).at(0),
    ).toMatchObject({
      text: "hello world",
      parts: [{ text: "hello world" }],
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
        parts: [
          { id: "part-1", messageID: "msg-1", sessionID: "ses-1", type: "text", text: "hello" },
          { id: "part-2", messageID: "msg-1", sessionID: "ses-1", type: "text", text: " world" },
        ],
        created: 1,
      },
    ])
  })
})
