// Lítill, háður-laus .xlsx rafall (xlsx = ZIP með XML).
// Styður íslenska stafi (UTF-8) — ólíkt CSV í Excel.

export type CellValue = string | number | null;

function crc32(buf: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    let c = (crc ^ buf[i]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const enc = new TextEncoder();
const u16 = (n: number) => [n & 0xff, (n >>> 8) & 0xff];
const u32 = (n: number) => [n & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff];

// Föst, gild DOS dagsetning (1. jan 2024) til að forðast skrýtnar dagsetningar.
const DOS_DATE = ((2024 - 1980) << 9) | (1 << 5) | 1;
const DOS_TIME = 0;

function zipStore(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const central: number[][] = [];
  let offset = 0;
  for (const f of files) {
    const name = enc.encode(f.name);
    const data = f.data;
    const crc = crc32(data);
    const local = [
      ...u32(0x04034b50), ...u16(20), ...u16(0), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE),
      ...u32(crc), ...u32(data.length), ...u32(data.length), ...u16(name.length), ...u16(0),
    ];
    chunks.push(new Uint8Array(local), name, data);
    const localLen = local.length + name.length + data.length;
    central.push(
      [
        ...u32(0x02014b50), ...u16(20), ...u16(20), ...u16(0), ...u16(0), ...u16(DOS_TIME), ...u16(DOS_DATE),
        ...u32(crc), ...u32(data.length), ...u32(data.length),
        ...u16(name.length), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...u32(0), ...u32(offset),
      ].concat([...name])
    );
    offset += localLen;
  }
  const cdStart = offset;
  let cdSize = 0;
  for (const c of central) {
    chunks.push(new Uint8Array(c));
    cdSize += c.length;
  }
  chunks.push(
    new Uint8Array([
      ...u32(0x06054b50), ...u16(0), ...u16(0), ...u16(files.length), ...u16(files.length),
      ...u32(cdSize), ...u32(cdStart), ...u16(0),
    ])
  );
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function colName(n: number): string {
  let s = "";
  n++;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetXml(rows: CellValue[][]): string {
  const body = rows
    .map((row, ri) => {
      const cells = row
        .map((val, ci) => {
          const ref = colName(ci) + (ri + 1);
          if (typeof val === "number" && isFinite(val)) return `<c r="${ref}"><v>${val}</v></c>`;
          const t = val == null ? "" : String(val);
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(t)}</t></is></c>`;
        })
        .join("");
      return `<row r="${ri + 1}">${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${body}</sheetData></worksheet>`;
}

function buildXlsx(headers: string[], rows: CellValue[][], sheetName: string): Uint8Array {
  const all: CellValue[][] = [headers, ...rows];
  const files = [
    {
      name: "[Content_Types].xml",
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`),
    },
    {
      name: "_rels/.rels",
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`),
    },
    {
      name: "xl/workbook.xml",
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="${esc(sheetName)}" sheetId="1" r:id="rId1"/></sheets></workbook>`),
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: enc.encode(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`),
    },
    { name: "xl/worksheets/sheet1.xml", data: enc.encode(sheetXml(all)) },
  ];
  return zipStore(files);
}

export function downloadXlsx(filename: string, headers: string[], rows: CellValue[][], sheetName = "Gögn") {
  const bytes = buildXlsx(headers, rows, sheetName);
  const blob = new Blob([bytes], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
