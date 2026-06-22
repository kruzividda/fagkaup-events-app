"use client";

import { useRef, useState } from "react";
import { renderMarkdown } from "@/lib/markdown";

export function RichTextField({
  value,
  onChange,
  rows = 6,
}: {
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [preview, setPreview] = useState(false);

  function focusBack() {
    requestAnimationFrame(() => ref.current?.focus());
  }

  function surround(mark: string, placeholder: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || placeholder;
    const next = value.slice(0, start) + mark + sel + mark + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + mark.length;
      ta.setSelectionRange(pos, pos + sel.length);
    });
  }

  function linePrefix(prefix: string) {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    const block = value.slice(lineStart, end) || "";
    const prefixed = block
      .split("\n")
      .map((l) => prefix + l)
      .join("\n");
    const next = value.slice(0, lineStart) + prefixed + value.slice(end);
    onChange(next);
    focusBack();
  }

  function insertLink() {
    const ta = ref.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const sel = value.slice(start, end) || "tengill";
    const next = value.slice(0, start) + `[${sel}](https://)` + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      ta.focus();
      const urlPos = start + sel.length + 3; // eftir "](" 
      ta.setSelectionRange(urlPos, urlPos + 8); // velja "https://"
    });
  }

  const btn =
    "rounded-lg border border-border bg-elevated px-2.5 py-1 text-xs text-text transition hover:border-accent disabled:opacity-40";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <button type="button" onClick={() => surround("**", "feitletrað")} disabled={preview} className={`${btn} font-bold`}>
          B
        </button>
        <button type="button" onClick={() => surround("*", "skáletrað")} disabled={preview} className={`${btn} italic`}>
          I
        </button>
        <button type="button" onClick={() => linePrefix("## ")} disabled={preview} className={btn}>
          Fyrirsögn
        </button>
        <button type="button" onClick={() => linePrefix("- ")} disabled={preview} className={btn}>
          • Listi
        </button>
        <button type="button" onClick={insertLink} disabled={preview} className={btn}>
          Hlekkur
        </button>
        <div className="ml-auto">
          <button type="button" onClick={() => setPreview((p) => !p)} className={`${btn} ${preview ? "border-accent text-accent" : ""}`}>
            {preview ? "Breyta" : "Forskoðun"}
          </button>
        </div>
      </div>

      {preview ? (
        value.trim() ? (
          <div
            className="richtext min-h-[8rem] rounded-xl border border-border bg-elevated px-3 py-2"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(value) }}
          />
        ) : (
          <div className="min-h-[8rem] rounded-xl border border-border bg-elevated px-3 py-2 text-sm text-muted">
            Engin lýsing enn.
          </div>
        )
      ) : (
        <textarea
          ref={ref}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-border bg-elevated px-3 py-2 text-sm leading-relaxed text-text outline-none focus:border-accent"
        />
      )}
      <p className="text-[12px] text-muted">
        Styður <strong>**feitletrun**</strong>, <em>*skáletrun*</em>, fyrirsagnir (##), lista (-) og hlekki [texti](slóð).
      </p>
    </div>
  );
}
