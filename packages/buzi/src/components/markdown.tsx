import { cjk } from "@streamdown/cjk"
import { code } from "@streamdown/code"
import { Streamdown, type CodeHighlighterPlugin } from "streamdown"

const streamdownCode = code as unknown as CodeHighlighterPlugin

export function Markdown(props: { text: string; streaming?: boolean }) {
  return (
    <Streamdown
      animated={props.streaming === true}
      className="markdown"
      controls={{
        code: { copy: true, download: false },
        table: { copy: true, download: true, fullscreen: true },
      }}
      isAnimating={props.streaming === true}
      linkSafety={{ enabled: true }}
      mode={props.streaming === true ? "streaming" : "static"}
      plugins={{ cjk, code: streamdownCode }}
      skipHtml
    >
      {props.text || ""}
    </Streamdown>
  )
}
