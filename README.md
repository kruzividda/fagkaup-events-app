# Fagkaup Events — vefur (Next.js)

Beinagrind með virkri innskráningu, hlutverkastýringu og route-grind ofan á
Supabase gagnagrunninn.

## Það sem er tilbúið

- **Innskráning** (netfang + lykilorð) — `/login`
- **Hlutverkastýring** í `middleware.ts`: `/dashboard` (admin), `/door` (dyravörður), `/bar` (barþjónn)
- **Admin stjórnborð** sem sýnir innskráðan notanda + hlutverk
- **Route-grind** fyrir öll svæði (admin, scan-PWA, opin skráning, miðasíða) sem stubbar
- **Supabase klientar**: vafri (RLS), server (RLS), admin (service role, server-only)
- **Dökkt þema** með Fagkaup placeholder-litum

## Uppsetning (skref fyrir skref)

### 1. Settu upp Node.js
Sæktu og settu upp **Node.js LTS** af https://nodejs.org (útgáfa 18.18+ eða 20+).
Það kemur með `npm`. Staðfestu í terminal:
```
node -v
npm -v
```

### 2. Sæktu pakka
Í möppunni þar sem þessi README er:
```
npm install
```

### 3. Stilltu umhverfisbreytur
Afritaðu sniðmátið og fylltu út:
```
cp .env.local.example .env.local
```
Gildin finnurðu í Supabase: **Project Settings → API**
- `NEXT_PUBLIC_SUPABASE_URL` → Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → anon public lykill
- `SUPABASE_SERVICE_ROLE_KEY` → service_role lykill

> ⚠️ `service_role` lykillinn er leyndarmál. Hann er aðeins notaður server-side
> (í `lib/supabase/admin.ts`) og má aldrei birtast í vafra eða fara í git.
> `.env.local` er þegar í `.gitignore`.

### 4. Keyrðu
```
npm run dev
```
Opnaðu http://localhost:3000 — þú lendir á `/login`. Skráðu þig inn með admin-
notandanum sem þú bjóst til í Supabase. Þú átt að lenda á `/dashboard` og sjá
nafnið þitt og hlutverkið „admin“.

## Að prófa hlutverkastýringu

- Admin → kemst á `/dashboard`
- Ef notandi með hlutverk `door` reynir `/dashboard` → er vísað á `/login` með villu
- `/door` og `/bar` virka eins fyrir sín hlutverk

## Mappuskipulag

```
app/
  login/                  innskráning
  (admin)/dashboard/      stjórnborð + undirsíður (stubbar)
  (scan)/door, /bar       PWA scan-svæði (stubbar)
  (public)/[orgSlug]/...  opin skráning + /t/[token] miðasíða (stubbar)
  auth/                   signout + callback
lib/supabase/             client / server / admin / middleware
lib/auth.ts               getProfile()
components/ui.tsx         einfaldir UI-hlutar
middleware.ts             hlutverkastýring
```

## Næstu skref

1. Kjarnalúppan: stofna viðburð → dýnamískt form → `create_registration` → staðfestingarpóstur
2. Scan-virkni (QR myndavél) fyrir dyravörð og barþjón
3. Tölfræði + útflutningur
4. Fullt sjónrænt útlit í Fagkaup-litum

TypeScript týpur frá gagnagrunni: sjá `types/database.ts`.

---

## Kjarnalúppan (ný virkni)

Nú er hægt að stofna viðburð, taka við skráningum og gefa út miða með QR.

### Hvernig á að prófa (heildarflæði)

1. **Sæktu nýju pakkana** (við bættum við `qrcode`):
   ```
   npm install
   ```
2. Keyrðu `npm run dev` og skráðu þig inn sem admin.
3. **Stofnaðu viðburð:** Viðburðir → „Nýr viðburður“. Fylltu út heiti, dagsetningu,
   og hakaðu við „Drykkjamiðar í boði“ (t.d. 3 á mann) til að prófa drykkjavirkni síðar.
4. **Birtu viðburðinn:** í viðburðalistanum, smelltu „Birta“. (Skráning er aðeins
   opin þegar viðburður er birtur.)
5. **Opnaðu skráningarsíðuna:** smelltu „Skoða skráningarsíðu“ — hún opnast í nýjum flipa.
   Þetta er slóðin sem þú deilir á gesti.
6. **Skráðu þig:** fylltu út formið (prófaðu að haka við „maka / +1“ — þá birtist
   reitur fyrir nafn maka, sem sýnir skilyrtu spurningarnar). Sendu inn.
7. **Miðinn:** þú ferð sjálfkrafa á miðasíðu með QR-kóða, drykkjainneign og (ef við á)
   borði/sæti. Þetta er sama slóð og gestur fær.

### Staðfesting í gagnagrunni
Í Supabase (Table Editor) sérðu nýja röð í `registrations`, `tickets` og — ef
drykkir voru virkir — `drink_accounts`. Það staðfestir að `create_registration`
RPC-ið vann rétt.

### Staðfestingarpóstur (valfrjálst)
Pósturinn er tilbúinn en sendist aðeins ef þú stillir Resend. Bættu við í `.env.local`:
```
RESEND_API_KEY=...           # af resend.com
RESEND_FROM=Fagkaup Events <events@þittlén.is>
```
Án þessa virkar allt hitt — gesturinn fær bara miðann beint á skjáinn í stað pósts.

### Það sem er meðvitað einfaldað í þessum áfanga
- Skráningarformið notar sjálfgefið reitasett (nafn, póstur, sími, fyrirtæki,
  fæðuóþol, maki, samþykki). Fullur „form builder“ þar sem admin velur og býr til
  eigin reiti og skilyrtar spurningar kemur í næsta áfanga.
- Forsíðumynd viðburðar (Storage upload) er ekki enn í stofnunarforminu.
- QR-kóðinn geymir token gestsins; scan-öppin (dyravörður/barþjónn) lesa hann í
  næsta áfanga.

---

## Scan-virkni (innritun + drykkir)

Dyravörður og barþjónn nota myndavélaskanna (eða handvirkan token-reit) til að
innrita gesti og skrá drykki. Aðgerðirnar keyra með innskráðri lotu starfsmanns,
svo gagnagrunnurinn skráir rétt hver skannaði.

### Nýr pakki
Við bættum við `html5-qrcode` — keyrðu `npm install` eftir uppfærsluna.

### Hvernig á að prófa (á tölvunni, án síma)

Auðveldast er að prófa með **handvirka token-reitnum**:

1. Stofnaðu og **birtu** viðburð (með drykkjum, t.d. 3 á mann), skráðu gest.
   Þú lendir á miðasíðu — slóðin er `…/t/LANGUR_TOKEN`.
2. **Afritaðu token-ið** úr slóðinni (allt á eftir `/t/`).
3. **Innritun:** í stjórnborðinu, smelltu „Innritun (dyr)“ → veldu viðburðinn →
   límdu token-ið í reitinn → „Skanna“. Þú sérð nafn, fyrirtæki, maka og fæðuóþol
   og „✓ Mætt skráð“. Skannaðu sama token aftur → „⚠ Miði þegar notaður“.
4. **Bar:** smelltu „Bar“ → veldu viðburðinn → límdu sama token → „Skanna“.
   Þú sérð „Drykkir eftir: 2 af 3“. Endurtaktu þar til inneignin klárast →
   „Engin inneign eftir“.

### Myndavél
Myndavélaskanninn virkar á `localhost` í tölvuvafra. Á **síma** krefst myndavél
HTTPS — það kemur þegar appið er sett í hýsingu (t.d. Vercel). Þangað til er
handvirki reiturinn besta prófunarleiðin. Þú getur líka sýnt QR (miðasíðuna) í
símanum og skannað hann með vefmyndavél tölvunnar.

### Staðfesting í gagnagrunni
Eftir innritun bætist röð í `check_ins`; eftir drykk í `drink_redemptions`.
Endurteknar/ógildar skannanir fara í `scan_attempts`. Þetta er grunnurinn að
tölfræðinni síðar (mæting, drykkjanotkun, afköst barþjóna).
