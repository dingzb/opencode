import { marked } from "marked"
import { useMemo } from "react"

marked.setOptions({
  gfm: true,
  breaks: true,
})

export function Markdown(props: { text: string }) {
  const html = useMemo(() => marked.parse(props.text || ""), [props.text])
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />
}
