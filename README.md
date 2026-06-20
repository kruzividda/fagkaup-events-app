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

---

## Tölfræði-mælaborð

Hver viðburður er með tölfræðisíðu sem reiknast úr gögnunum sem kerfið safnar
(engin sérstök uppsetning þarf).

### Hvar
- Stjórnborð → Viðburðir → smelltu „Tölfræði“ við viðburð (eða á heiti hans → „Skoða tölfræði“).
- Forsíða stjórnborðs sýnir nú heildartölur yfir alla viðburði.

### Hvað er sýnt
- **Skráningar:** boðaðir, skráðir, mættir, ómættir, mætingarhlutfall.
- **Drykkir:** í boði, nýttir, eftir, nýtingarhlutfall, og hverjir nýttu alla/hluta/enga.
- **Tímalína:** drykkjanotkun yfir kvöldið (30 mín bil).
- **Mæting eftir hópum:** fyrirtækjum, rekstrareiningum, staðsetningum.
- **Afköst barþjóna:** drykkir og afgreiðslur á hvern barþjón.

### Að prófa
Stofnaðu viðburð með drykkjum, skráðu nokkra gesti (mismunandi fyrirtæki/rekstrareiningar
gefa fjölbreyttari mælaborð), innritaðu suma í „Innritun (dyr)“ og skráðu drykki í „Bar“.
Opnaðu svo „Tölfræði“ — tölurnar uppfærast eftir því sem þú innritar og afgreiðir.

---

## Veggur milli viðburða (lagfæring)

Áður gat miði af einum viðburði verið skannaður inn á annan. Nú hafna
`process_checkin` og `redeem_drink` miða sem tilheyrir öðrum viðburði en þeim
sem starfsmaðurinn valdi — skanninn sýnir „⚠ Rangur viðburður“.

> Þessi lagfæring krefst SQL-uppfærslu: keyrðu `0008_scan_event_guard.sql` í
> Supabase SQL editor (á undan því að uppfæra appið), síðan venjulega cp + commit.

---

## Maki fær eigin miða (lagfæring)

Áður deildu gestur og maki einum miða með samanlagðri drykkjainneign (t.d. „10 af 10“),
sem var ruglandi við barinn því talningin virtist endurstillast þegar fyrri potturinn kláraðist.

Nú býr skráning með maka til **tvo aðskilda miða** — gestur og maki — hvorn með eigin QR,
eigin „X af 5“ talningu og eigin innritun við dyr. Miðasíðan sýnir nafn handhafa og tengil á
hinn miðann; staðfestingarpósturinn inniheldur báða QR; og dyravörður sér rétt nafn (maki fær
sitt eigið nafn, merkt „· maki“).

> Krefst SQL-uppfærslu: keyrðu `0009_spouse_ticket.sql` í Supabase SQL editor (eftir 0008),
> síðan venjulega cp + commit.

---

## Form builder (skráningarform)

Admin getur nú stýrt skráningarforminu fyrir hvern viðburð.

### Hvar
Stjórnborð → Viðburðir → smelltu á heiti viðburðar → „Skráningarform“.

### Hvað er hægt
- **Grunnreitir:** kveiktu/slökktu á nafni, pósti, síma, fyrirtæki, rekstrareiningu,
  staðsetningu, starfsheiti, maka, fæðuóþoli, athugasemdum og samþykki.
- **Skylda / valfrjálst / falinn** fyrir hvern reit.
- **Eigin spurningar:** texti, langur texti, val (eitt), fjölval, já/nei.
- **Valkostir** fyrir val/fjölval.
- **Skilyrtar undirspurningar:** „Sýna aðeins ef …“ — t.d. „Nafn maka“ birtist
  aðeins ef hakað er við maka, eða undirspurning birtist ef svar við „Mætir þú í golf?“ er Já.
- **Röðun** með ↑/↓ og eyðing reita.

Smelltu „Vista form“ til að vista. Opna skráningarsíðan endurspeglar breytingarnar strax.

> Athugið: ef þú eyðir reit sem þegar hefur söfnuð svör, eyðast þau svör með honum.
> Til að fela reit án þess að tapa gögnum skaltu velja „Falinn“ í stað þess að eyða.

---

## Rekstrareiningar, smellanlegir reitir, póstur maka

### Rekstrareiningar (nýtt)
Stjórnborð → **Rekstrareiningar**. Stofnaðu deildir (t.d. Aðföng, Bónus, Hagkaup, Olís)
og útibú undir hverri. Þetta er gert einu sinni og nýtist í öllum viðburðum.

### Smellanlegir reitir í forminu
- Reiturinn **Rekstrareining** birtist sem smellanlegar „pillur“ ef þú hefur stofnað deildir.
- Reiturinn **Staðsetning** sýnir útibú **þeirrar deildar sem var valin** (deild → útibú).
- Ef engar deildir eru stofnaðar, eða undir „Annað“, er reiturinn frjáls texti — t.d. fyrir
  golfmót þar sem viðskiptavinir skrifa eigin fyrirtæki.
- Val/fjölval-spurningar birtast líka sem pillur.

### Form builder strax við stofnun
Þegar þú stofnar nýjan viðburð lendirðu beint í skráningarforminu hans.

### Tölvupóstur maka
Þegar maki er valinn birtist reitur fyrir **tölvupóst maka**. Hann er notaður til að senda
maka sinn eigin miða: aðalgestur fær sinn miða á sitt netfang og maki sinn á netfang maka
(þegar Resend er tengt). Ef netfang maka vantar fá báðir miðar á netfang aðalgests.

> Krefst SQL: keyrðu `0010_business_units.sql` í Supabase SQL editor (eftir 0009), svo cp + commit.

---

## Premium útlit

Heildræn sjónræn yfirferð: dýpra navy þema með mjúkum brass-bjarma í bakgrunni,
serif fyrirsagnir (Fraunces) á móti hreinum texta (Manrope), fáguð spjöld með skugga
og hárfínni brass-línu, stærri og mýkri inntaksreitir með brass-fókus, sérsmíðaðir
gátreitir, og pillur/hnappar með brass-gradient. Gestasíða, miðasíða og innskráning
fengu sérstaka fínpússun. Engin SQL-breyting.

---

## Breyta viðburði + drykkjastjórnun

### Breyta viðburði
Viðburður → **Breyta viðburði**. Hægt að breyta öllu eftirá — líka að kveikja á
drykkjamiðum eða borðaskipan sem ekki var hakað við í upphafi. Breytingar á drykkjafjölda
hér gilda fyrir *nýjar* skráningar.

### Drykkjastjórnun (á viðburðasíðunni)
- **Beita á alla gesti** — setur inneign hjá öllum sem þegar eru skráðir (líka þeim sem
  skráðu sig áður en drykkir voru virkir). Notuðum drykkjum er haldið. Notaðu þetta þegar
  ákveðið er eftirá að bjóða drykki.
- **Lifandi +1 / −1 á alla** — bætir við eða fækkar einum drykk hjá öllum gestum samstundis
  um kvöldið. Inneign fer aldrei undir 0.

> Krefst SQL: keyrðu `0011_drink_management.sql` í Supabase SQL editor (eftir 0010), svo cp + commit.

---

## Innritun skylda fyrir bar

Gestur verður nú að vera **innritaður við dyr** áður en hægt er að afgreiða honum drykk.
Skanni barþjónn QR sem hefur ekki verið innritaður birtist „⛔ Ekki innritaður“ með nafni
gestsins og leiðbeiningu um að vísa honum á dyravörð fyrst. Á við hvern miða fyrir sig —
maki þarf líka að vera innritaður á sínum eigin miða.

> Krefst SQL: keyrðu `0012_require_checkin_for_drinks.sql` í Supabase SQL editor (eftir 0011), svo cp + commit.

---

## Hero mynd á skráningarsíðu

Hver viðburður getur haft hero mynd í **16:9** sem birtist efst á skráningarsíðunni.
Hún er hlaðin upp undir **Breyta viðburði** og geymd í Supabase Storage (bucket `event-media`, opið).
Aðeins kerfisstjórar mega hlaða upp; myndin birtist öllum á opinberu skráningarsíðunni.

> Krefst SQL: keyrðu `0013_event_media_storage.sql` í Supabase SQL editor (eftir 0012) til að búa til `event-media` bucket + reglur. Svo cp + commit.

---

## Endurhönnuð skráningarsíða + tvær hero myndir

Forsíða viðburðar og skráningarformið hafa fengið nýtt útlit (innblásið af miðasölusíðum):
fastur „Skrá mig“ takki efst, fljótandi takki neðst á síma, og á skráningarforminu er hero
myndin föst í bakgrunni og sést í gegnum „sandblásið gler“ (backdrop-blur) þegar skrollað er.

Hver viðburður getur haft **tvær** hero myndir: breiða (16:9) fyrir tölvuskjá og háa (9:16)
fyrir síma. Sé aðeins önnur sett er hún notuð fyrir báðar. Hlaðið upp undir **Breyta viðburði**.

> Krefst SQL: keyrðu `0014_cover_mobile.sql` (eftir 0013). Svo cp + commit.

---

## Kennitölur (áfangi 2)

- Kennitala er nú **sjálfgefinn** reitur í nýjum viðburðum (skyldureitur). Hægt að fela/fjarlægja í forsmiðnum.
- Innsláttur leyfir aðeins **10 tölustafi**.
- **Tvískráningarvörn**: sami einstaklingur kemst ekki tvisvar á viðburð. Kerfið ber saman nafn,
  kennitölu og tölvupóst — passi eitthvað þeirra birtist „þú ert þegar skráð(ur)“.
- **Aldursmörk á áfengi**: ef viðburður er merktur með áfengi (gátreitur við drykkjamiða), hafnar
  barinn áfengi til þeirra sem eru undir 20 ára (reiknað út frá kennitölu). Ekkert um þetta birtist í
  skráningu (svo ekki sé hægt að plata kerfið). Á við aðalhandhafa; maki/lögaðili/óþekkt → engin hindrun.
- Kennitala fylgir með í **Excel-útflutningi** gestalista (fyrir skattskil) þegar reiturinn er í forminu.

> Krefst SQL: keyrðu `0015_kennitala.sql` (eftir 0014). Svo cp + commit.
