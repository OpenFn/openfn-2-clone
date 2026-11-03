import { useMemo } from "react";
import { Marked } from "marked";
import { cn } from "../../utils/cn";

const escape = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const GHERKIN_KEYWORD = /^(\s*)(Feature:|Background:|Scenario Outline:|Scenario:|Examples:|Given|When|Then|And|But)(?=\s|$)/;

// Gherkin scenarios are read as prose, so lines wrap and each kind of line
// gets its own weight: keywords bold, tags small and coloured, the "# Value"
// and code-reference comments muted.
function gherkin(text: string) {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed === "") return '<span class="block h-2"></span>';
      const indent = line.length - line.trimStart().length;
      const pad = `style="padding-left:${indent}ch"`;
      if (trimmed.startsWith("@"))
        return `<span class="block mt-3 font-medium text-brand" ${pad}>${escape(trimmed)}</span>`;
      if (trimmed.startsWith("# Value:"))
        return `<span class="block italic text-muted" ${pad}>${escape(trimmed.slice(2))}</span>`;
      if (trimmed.startsWith("#"))
        return `<span class="block text-faint break-all" ${pad}>${escape(trimmed)}</span>`;
      const match = trimmed.match(GHERKIN_KEYWORD);
      if (match) {
        const keyword = match[2]!;
        const rest = trimmed.slice(keyword.length);
        const heading = /:$/.test(keyword);
        return `<span class="block text-strong" ${pad}><strong class="${heading ? "text-strong" : "text-brand"}">${keyword}</strong>${escape(rest)}</span>`;
      }
      return `<span class="block text-body" ${pad}>${escape(trimmed)}</span>`;
    })
    .join("");
}

// Annotation files are plain markdown. Raw HTML in them is shown as text
// rather than injected, and links open in a new tab.
const marked = new Marked({
  gfm: true,
  renderer: {
    html({ text }) {
      return escape(text);
    },
    code({ text, lang }) {
      if (lang === "gherkin")
        return `<div class="not-prose my-4 rounded-md border border-subtle bg-subtle p-3 text-xs leading-relaxed whitespace-pre-wrap">${gherkin(text)}</div>`;
      return `<pre><code>${escape(text)}</code></pre>`;
    },
    link({ href, tokens }) {
      const label = this.parser.parseInline(tokens);
      const safe = /^(https?:|mailto:|#)/.test(href) ? href : "#";
      return `<a href="${safe}" target="_blank" rel="noreferrer">${label}</a>`;
    },
  },
});

/** Renders a markdown string with Tailwind Typography, sized for a side panel. */
export default function Markdown({ source, className }: { source: string; className?: string }) {
  const html = useMemo(() => marked.parse(source, { async: false }), [source]);
  return (
    <div
      data-ui="markdown"
      className={cn(
        "prose prose-sm max-w-none prose-headings:font-semibold prose-h2:text-base prose-h2:mt-6 prose-h3:text-sm",
        "prose-code:before:content-none prose-code:after:content-none prose-code:bg-sunken prose-code:rounded prose-code:px-1 prose-code:font-normal",
        "prose-pre:bg-code prose-pre:text-xs [&_pre_code]:bg-transparent [&_pre_code]:p-0 prose-table:text-xs prose-a:text-link",
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
