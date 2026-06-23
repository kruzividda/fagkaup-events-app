"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { savePrivacyPolicy } from "./actions";

const TEMPLATE = `Persónuverndarstefna fyrir viðburði

Ábyrgðaraðili
[Nafn fyrirtækis/einingar], kt. [kennitala], [heimilisfang]. Fyrirspurnir um persónuvernd: [netfang].

Hvaða upplýsingum er safnað
Þegar þú skráir þig á viðburð söfnum við þeim upplýsingum sem þú gefur upp í skráningarforminu, t.d. nafni, netfangi, símanúmeri, fyrirtæki/rekstrareiningu, fæðuóþoli og upplýsingum um maka ef við á.

Í hvaða tilgangi
Upplýsingarnar eru notaðar til að skipuleggja og halda viðburðinn: skráning, mætingarskráning, borðaskipan, drykkjamiðar og samskipti við þig vegna viðburðarins (t.d. staðfesting og áminningar).

Lagagrundvöllur
Vinnslan byggir á samþykki þínu, sem þú veitir með því að haka við í skráningu. Þú getur dregið samþykkið til baka hvenær sem er (sjá „Réttindi þín").

Varðveislutími
Upplýsingum er eytt eða þær gerðar nafnlausar [X mánuðum] eftir að viðburði lýkur, nema lög krefjist lengri varðveislu.

Aðgangur og miðlun
Aðeins starfsfólk [fyrirtækis] sem kemur að skipulagningu viðburðarins hefur aðgang að upplýsingunum. Þeim er ekki miðlað til þriðju aðila nema slíkt sé nauðsynlegt vegna viðburðarins eða skylt að lögum.

Réttindi þín
Þú átt rétt á að fá aðgang að upplýsingum um þig, fá þær leiðréttar eða þeim eytt, og að draga samþykki til baka. Sendu beiðni á [netfang] og við bregðumst við án ástæðulausrar tafar.

Síðast uppfært: [dagsetning].`;

export function PolicyEditor({ initial, publicUrl }: { initial: string; publicUrl: string }) {
  const [text, setText] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function save() {
    setBusy(true);
    setMsg(null);
    const res = await savePrivacyPolicy(text);
    setBusy(false);
    setMsg(res.ok ? { kind: "ok", text: "Vistað. Stefnan er nú birt á opinberu síðunni." } : { kind: "err", text: "Vistun mistókst." });
  }

  function useTemplate() {
    if (text.trim() && !confirm("Skrifa yfir núverandi texta með sniðmáti?")) return;
    setText(TEMPLATE);
    setMsg(null);
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-text">Persónuverndarstefna</p>
          <p className="mt-0.5 text-xs text-muted">
            Þessi texti birtist gestum þegar þeir smella á „Lesa persónuverndarstefnu" í skráningu. Yfirfarðu sniðmátið og fylltu
            inn í hornklofana — láttu helst lögfróðan aðila lesa yfir áður en það er birt.
          </p>
        </div>
        <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 text-xs text-accent underline underline-offset-2">
          Skoða opinberu síðuna →
        </a>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={16}
        placeholder="Engin stefna hefur verið skrifuð enn — smelltu á sniðmáts-takkann fyrir neðan til að byrja."
        className="w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-sm leading-relaxed text-text outline-none transition focus:border-accent"
      />

      {msg && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${msg.kind === "ok" ? "border-border bg-surface text-text" : "border-danger bg-surface text-danger"}`}>
          {msg.text}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button onClick={useTemplate} className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-text transition hover:border-accent">
          Nota sniðmát
        </button>
        <button
          onClick={save}
          disabled={busy}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition hover:brightness-105 disabled:opacity-50"
        >
          {busy ? "Vista…" : "Vista stefnu"}
        </button>
      </div>
    </Card>
  );
}
