import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { Streamdown, type CodeHighlighterPlugin, type ControlsConfig, type LinkSafetyConfig } from "streamdown"

const streamdownCode = code as unknown as CodeHighlighterPlugin
const staticPlugins = { cjk, code: streamdownCode }
const streamingPlugins = { cjk }
const staticControls: ControlsConfig = {
  code: { copy: true, download: false },
  table: { copy: true, download: true, fullscreen: true },
}
const streamingControls: ControlsConfig = {
  code: false,
  table: false,
}
const linkSafety: LinkSafetyConfig = { enabled: true }

export function Markdown(props: { text: string; streaming?: boolean }) {
  const streaming = props.streaming === true

  return (
    <Streamdown
      animated={streaming}
      className="markdown"
      controls={streaming ? streamingControls : staticControls}
      isAnimating={streaming}
      linkSafety={linkSafety}
      mode={streaming ? "streaming" : "static"}
      plugins={streaming ? streamingPlugins : staticPlugins}
      skipHtml
    >
      {props.text || ""}
    </Streamdown>
  )
}
