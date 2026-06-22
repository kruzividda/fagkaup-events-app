// Öruggur Markdown-teiknari fyrir viðburðalýsingu.
// Escape-ar allan HTML fyrst, svo aðeins leyfð snið verða til (engin XSS-hætta).
// Styður: fyrirsagnir (#, ##, ###), **feitletrun**, *skáletrun* / _skáletrun_,
// lista (- eða 1.), hlekki [texti](https://...), línubil og málsgreinar.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inline(s: string): string {
  // Hlekkir — aðeins http(s) og mailto leyfðir
  s = s.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
    (_m, text, url) => `<a href="${url}" target="_blank" rel="noopener noreferrer nofollow">${text}</a>`
  );
  // Feitletrun
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Skáletrun
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/_([^_\n]+)_/g, "<em>$1</em>");
  return s;
}

export function renderMarkdown(src: string | null | undefined): string {
  if (!src) return "";
  const lines = escapeHtml(src.replace(/\r\n/g, "\n")).split("\n");
  const out: string[] = [];
  let para: string[] = [];
  let i = 0;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${inline(para.join("<br/>"))}</p>`);
      para = [];
    }
  };

  while (i < lines.length) {
    const raw = lines[i];
    const t = raw.trim();

    if (t === "") {
      flushPara();
      i++;
      continue;
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(t);
    if (h) {
      flushPara();
      const lvl = Math.min(h[1].length + 1, 3); // # -> h2, ## -> h3, ### -> h3
      out.push(`<h${lvl}>${inline(h[2])}</h${lvl}>`);
      i++;
      continue;
    }

    if (/^[-*]\s+/.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(t)) {
      flushPara();
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^\d+\.\s+/, ""))}</li>`);
        i++;
      }
      out.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    para.push(t);
    i++;
  }
  flushPara();
  return out.join("");
}
