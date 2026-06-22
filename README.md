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

---

## Bókunarstjórnun (áfangi 3)

**Gestir — sjálfsafgreiðsla** (`/<org>/e/<viðburður>/min-skraning`, tengill á forsíðu viðburðar):
gestur slær inn kennitöluna sína og getur þá breytt síma/fæðuóþoli, bætt við eða afboðað maka,
endursent staðfestingu + QR, eða afboðað sig. Afboði aðalgestur sig fylgir maki sjálfkrafa.

**Kerfisstjóri**: „Afskrá“ hnappur við hvern gest í gestalistanum (með staðfestingu) afbókar skráninguna.

Afbókaðir miðar gilda ekki lengur — dyravörður og bar sýna „⛔ Afbókað“ við skönnun. Afbókaður
einstaklingur getur skráð sig aftur (tvískráningarvörnin telur aðeins virkar skráningar).

> Krefst SQL: keyrðu `0016_booking_management.sql` (eftir 0015). Svo cp + commit.
> Athugið: aðgangur að sjálfsafgreiðslu byggir á kennitölu — hún virkar fyrir viðburði sem safna kennitölu.

---

## Þemur skráningarsíðu (0017)

Hver viðburður hefur **þema** sem stýrir útliti forsíðu, skráningarforms og sjálfsafgreiðslu:

- **Glamúr** (sjálfgefið): dökkt með gylltum brass-blæ og sandblásnu gleri yfir hero-mynd. Hentar árshátíðum og skemmtunum.
- **Fagkaup ljóst**: hvítur grunnur, Fagkaup-rautt (#EB2331) og svart skv. hönnunarstaðli, fyrirsagnir í sans/medium og vinstrijafnaðar. Hentar golfmótum og fl.

Þema er valið í viðburðastofnun og undir „Breyta viðburði“. Stjórnborðið sjálft helst alltaf í Glamúr-útliti.

> Letrið Neue Serie57 er leyfisbundið og er ekki vafið inn; ljósa þemað notar nálægt sans-letur (Helvetica Neue/Arial). Litir og uppsetning fylgja staðlinum.
> Krefst SQL: keyrðu `0017_event_theme.sql` (eftir 0016). Svo cp + commit.

---

## Sérsniðin svör, golf-form og tölfræði

- **Sérsniðnar spurningar birtast núna** í gestalistanum, Excel-skránni og tölfræðinni. Áður voru svör við eigin spurningum vistuð (í `registration_answers`) en hvergi sýnd — það er lagað: hver virk sérsniðin spurning fær eigin dálk og er tekin með í útflutning og sundurliðun.
- **Golfmót fær sjálfgefið form**: þegar tegundin „Golfmót“ er valin í viðburðastofnun verður formið Nafn, Kennitala, Forgjöf, Golfklúbbur, Golfbox númer, Netfang, Símanúmer, Fyrirtæki, Annað (t.d. fæðuóþol) og Vantar golfbíl? (Já/Nei) — enginn maki.
- **Tölfræði tekur mark á sérsniðnum reitum**: sundurliðun birtist sjálfkrafa fyrir flokkaða reiti (Já/Nei, val) og fyrir frítexta með fá ólík svör (t.d. Golfklúbbur). Háklassa frítexti (t.d. Golfbox-númer) fær ekki sundurliðun en sést í gestalista/Excel.

> Engin SQL-breyting fyrir þennan hluta.

---

## Líftími viðburðar (0018)

- **Hero myndir strax í stofnun**: nýja viðburðaformið er með myndareiti (tölva 16:9 og sími 9:16). Myndum er hlaðið upp um leið og viðburður er stofnaður — ekki þarf lengur að fara í „Breyta viðburði“ fyrst. (Má samt enn breyta þeim þar síðar.)
- **Fella niður viðburð**: „Fella niður viðburð“ á viðburðasíðunni (með staðfestingu) aflýsir viðburðinum. Skráningarsíðan sýnir þá „Þessum viðburði hefur verið aflýst“ og engar nýjar skráningar berast. „Virkja viðburð aftur“ afturkallar. Listinn sýnir „Felld niður“ merki.
- **Upphafstími skráningar**: valfrjáls reitur „Skráning opnar“. Fram að þeim tíma sýnir forsíða/skráningarsíða niðurtalningu og „Skrá mig“ er óvirkt; opnast sjálfkrafa þegar tíminn rennur upp.

> Krefst SQL: keyrðu `0018_event_cancel.sql` (eftir 0017). `registration_opens_at` var þegar til.

---

## Bakendavörn skráninga (0019)

`create_registration` hafnar nú skráningu þegar viðburður er **aflýstur** (`cancelled`), til viðbótar við þær varnir sem voru þegar til staðar: viðburður ekki birtur, skráning ekki hafin (`registration_opens_at`) eða skráningu lokið (`registration_closes_at`). Þetta gildir óháð viðmótinu — ekki er hægt að senda inn skráningu fram hjá forminu.

> Krefst SQL: keyrðu `0019_reject_cancelled_registration.sql` (eftir 0018).

---

## Live gestalisti og tölfræði (0020)

Gestalistinn og tölfræðisíðan uppfærast nú **sjálfkrafa** þegar breytingar verða — ný skráning, afbókun, innritun við dyr eða drykkur á bar — án þess að smella á endurhlaða. Lítill „● Lifandi“ vísir sýnir að tengingin sé virk.

Þetta byggir á Supabase Realtime: vefurinn áskrifist að breytingum á `registrations`, `check_ins`, `tickets`, `drink_redemptions`, `drink_accounts` og `invitations` (síað á viðburðinn) og endurhleður gögnin þegar eitthvað breytist. Realtime virðir RLS, svo aðeins er hlustað á það sem notandinn má sjá.

> Krefst SQL: keyrðu `0020_realtime_publication.sql` (eftir 0019). Það bætir töflunum við `supabase_realtime` publication (idempotent).

---

## Afskráðir hverfa ekki — endurskráning (0021)

Þegar gestur er afskráður (af honum sjálfum eða kerfisstjóra) er hann **ekki eyddur** heldur sýndur **grár** í gestalistanum með stöðunni „⛔ Afskráð“. Í stað „Afskrá“ takkans kemur **„Endurskrá“**. Nýr „Afskráð“ flipi telur þá; þeir teljast ekki með í mætingu eða tölfræði fyrr en þeir eru endurskráðir.

Í sjálfsafgreiðslu (`/min-skraning`) getur sá sem afbókaði sig slegið inn kennitöluna á sama stað og fengið **„Endurskrá mig“** — og svo uppfært upplýsingar (t.d. fjarlægt maka sem kemur ekki). Endurskráning virðir sömu varnir og nýskráning (aflýstur/lokaður/fullur viðburður hafnar).

> Krefst SQL: keyrðu `0021_reactivate_registration.sql` (eftir 0020).

---

## Lokatími skráningar

Viðburðir hafa nú valfrjálsan reit **„Skráning lokar“** (við hlið „Skráning opnar“) í stofnun og breytingu. Eftir þann tíma lokast fyrir nýjar skráningar: forsíða og skráningarsíða sýna „Skráningu er lokið“, og bakendinn hafnar skráningu/endurskráningu (var þegar varið — `registration_closes_at`). Þegar opið er sést „Skráning er opin til …“. Engin SQL-breyting þurfti.

---

## Þema stjórnborðs (ljóst / dökkt)

Stjórnborðið styður nú **ljóst** (Fagkaup — hvítt/rautt/svart, *sjálfgefið*) og **dökkt** (núverandi gyllta útlitið). Lítill rofi efst í hægra horni skiptir á milli; valið geymist í vafraköku (`dashboard-theme`) og helst milli heimsókna. Server les kökuna, svo ekkert flökt verður við hleðslu.

Litir, skuggar, fókus-hringir og raða-rendur eru drifin af þema-breytum (CSS variables) svo bæði þemu líti heilstætt út. Innskráning og skönnunarsíður (dyr/bar) eru áfram dökkar.

> Engin SQL-breyting.

---

## Sýnilegri aukatakkar

Útlínu-takkar (allir sem eru ekki rauðir/gylltir — t.d. „Tölfræði“, „Skoða skráningarsíðu“, „Afrita hlekk“, „Til baka“) voru of daufir, sérstaklega í ljósa þemanu. Þeir eru nú **fylltir með sýnilegri brún og sterkari texta** í báðum þemum, í gegnum sameiginlega stíla `.btn-secondary` og `.btn-secondary-danger` (drifnir af `--btn-bg/--btn-border/--btn-bg-hover` breytum). Hættu-takkar (Afskrá, fjarlægja, afboða) halda rauða yfirsvifinu. Engin SQL-breyting.

---

## Sýnilegri aukatakkar

Útlínu-takkar sem voru ekki rauðir/gylltir (t.d. „Tölfræði“, „Skoða skráningarsíðu“, „Afrita hlekk“, „Til baka“, flipar) voru of daufir — sérstaklega í ljósa þemanu. Nú nota þeir sameiginlega stíla `.btn-secondary` og `.btn-secondary-danger`: fylltir með sýnilegri brún og sterkum texta, drifnir af þema-breytum (`--btn-bg`, `--btn-border`, `--btn-bg-hover`) svo þeir séu áberandi í bæði ljósu og dökku þema. Rauðu og gylltu aðaltakkarnir eru óbreyttir.

---

## Viðburðalisti = yfirlit með tölum

Viðburðalistinn er **myndakortagrid**: hero-mynd (16:9) efst, svo nafn viðburðar, svo tölur (skráðir með sætanýtingar-súlu + gestir). Staða birtist sem merki ofan á myndinni. Öll kortið er smellanlegt og opnar viðburðinn. Aðgerðirnar (**Birta/Afbirta**, **Skoða skráningarsíðu**, **Afrita hlekk**) búa inni á viðburðinum sjálfum, hjá hinum stillingunum.

---

## Ónettengur dyraskanni (0022)

Dyraskanninn virkar nú þótt símasamband detti út. Þegar hann opnast sækir hann **afrit** af öllum miðum viðburðarins (`door_snapshot`) og geymir í tækinu (localStorage). Eftir það getur dyravörður skannað án nets: skanninn þekkir miðann, sýnir nafn/fyrirtæki/fæðuóþol, hafnar afbókuðum eða röngum miðum, og skráir mætingu í **biðröð** sem sendist sjálfkrafa í Supabase þegar netið kemur aftur (`sync_checkin` — heldur upprunalega skönnunartímanum, idempotent á miða).

Efst er vísir: **● Nettengt / ⚠ Ónettengt**, fjöldi miða í afriti, fjöldi „í biðröð“, og „Samstilla“ takki. Innritun við dyr er örugg ónettengt því hver miði er aðeins innritaður einu sinni (tvöföld skönnun verður mjúk viðvörun).

**Athugið:** Barinn er enn nettengdur. Ef dyrnar eru ónettengdar sér barinn ekki innritun gestsins fyrr en dyraskanninn hefur samstillt. Realtime þarf ekki fyrir þetta. Tækið verður að vera opið (skanninn hlaðinn) til að vinna ónettengt.

> Krefst SQL: keyrðu `0022_offline_door.sql` (eftir 0021).

---

## Service worker — skothelt offline (skanni eftir endurhleðslu)

`public/sw.js` geymir "skel" appsins (HTML + JS/CSS) í tækinu svo dyraskanninn virki **líka eftir að síðan er endurhlaðin án nets**. Skráð sjálfvirkt af `components/ServiceWorkerRegister.tsx` (aðeins í production-byggingu).

Stefna: static eignir (`_next/static`, leturgerðir, myndir) = cache-first; flakk undir `/door` og `/bar` = network-first með afriti til vara; Supabase-köll og POST eru aldrei geymd (fara beint á netið — ónettengt er meðhöndlað af biðröðinni í skannanum).

**Mikilvægt:**
- Virkar í **production** (`npm run build && npm start`) yfir **HTTPS** (eða `localhost`). Ekki virkt í `npm run dev`.
- Opnaðu skannann **einu sinni nettengt** svo skelin geymist; eftir það þolir hann endurhleðslu án nets.
- Þegar `sw.js` er breytt: hækkaðu `CACHE` útgáfuna (`fk-shell-v1` → `-v2`) svo gömul afrit hreinsist.
- Til að setja upp sem app í síma (heimaskjár, án vafraramma) þarf að bæta `icon-192.png` og `icon-512.png` í `public/` og skrá þau í `app/manifest.ts`.

---

## PWA — uppsetning í síma

Appið er nú fullbúið sem PWA og hægt að setja á heimaskjá og keyra sem sjálfstætt app (án vafraramma):

- **Tákn** í `public/`: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` (Android adaptive) og `apple-touch-icon.png` (iOS). Fagkaup-rauð með hvítu „F“.
- **Manifest** (`app/manifest.ts`): nafn, tákn, `display: standalone`, lóðrétt, dökk splash.
- **iOS-stillingar** í `app/layout.tsx` (`appleWebApp`): apple-touch-icon, heimaskjár-titill „Fagkaup“, stöðustika.
- **Uppsetningar-hjálpari** (`app/(scan)/InstallPrompt.tsx`): á dyra-/barsíðum birtist „Setja upp“ takki (Android/Chrome) eða leiðbeining „Deila → Bæta á heimaskjá“ (iOS). Felst þegar appið er þegar uppsett eða notandi lokar.

Saman við service worker (0022-hluta) þýðir þetta: uppsett app sem opnast strax, virkar ónettengt og þolir endurhleðslu án nets. Krefst HTTPS í production (táknin/manifest virka líka á `localhost`). Til að skipta um tákn: skiptu út PNG-skránum í `public/`.

---

## PWA — uppsetjanlegt app í síma

Táknin eru komin (`public/icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `apple-touch-icon.png` — Fagkaup-rauð með hvítu „F“) og skráð í `app/manifest.ts` + `app/layout.tsx`. Manifestið skilgreinir `standalone` ham, þemalit, og flýtileiðir á **Innritun (dyr)** og **Bar**.

Þá geta dyraverðir/barþjónar **sett appið á heimaskjáinn** og keyrt það án vafraramma:
- **iOS (Safari):** Deila → „Setja á heimaskjá“.
- **Android (Chrome):** Valmynd → „Setja upp app“ / „Bæta á heimaskjá“.

Saman við service worker (0022-skannann + skel-geymslu) þýðir þetta: appið opnast eins og venjulegt app, og dyraskanninn virkar þótt sambandið detti út og þótt síðan sé endurhlaðin. Krefst HTTPS í production (uppsetjanlegt app + myndavél).

---

## Lagfæring: endurhleðsla án nets hendir ekki í innskráningu

Dyra-/barsíður eru server-rendraðar með innskráningarvörn. Áður gat endurhleðsla í lélegu/engu sambandi náð innskráningar-svari frá þjóninum. Nú ber service worker (**v2**) fram **geymdu skelina fyrst** (cache-first) fyrir `/door` og `/bar`, uppfærir í bakgrunni, og geymir aldrei innskráningar-svar (redirect). Skanninn biður líka SW að geyma dyrasíðuna strax við opnun. Niðurstaða: endurhleðsla án nets heldur skannanum opnum.

> Eftir þessa uppfærslu: opnaðu skannann **einu sinni nettengt** svo nýi SW (v2) taki yfir og geymi síðuna. (SW v2 hreinsar líka gömul afrit sjálfkrafa.)

---

## Gestaaðgangur á viðburð (0023) — fyrri hluti

Hægt er að stofna aðgang fyrir utanaðkomandi dyraverði og barþjóna á hverjum viðburði (á viðburðasíðunni, „Aðgangur að viðburði“): hlutverk (dyravörður/barþjónn), nafn, **PIN** (4–8 tölustafir) og valfrjáls **tímamörk** (frá/til). Hver aðgangur fær einstakan **hlekk** (`/s/<token>`). PIN er geymt sem bcrypt-hash; það sést aðeins einu sinni við stofnun.

Skanna-hlekkurinn verður **opinn** (engin Supabase-innskráning): viðkomandi opnar hann, slær inn PIN, og fær session sem skannar með (`open_scanner` → `sync_checkin_s` o.fl.). Þetta er líka lagfæringin á offline — skannasíðan þarf þá enga server-innskráningu sem getur fallið án nets.

> Þessi áfangi: gagnagrunnur (0023) + stjórnborðsviðmót til að stofna/stýra aðgangi. **Næst:** opinberi `/s/<token>` skannahlekkurinn með PIN-skjá + endurbætt dyraskanni (sem klárar offline-lagfæringuna), svo barþjóna-skanninn, og loks bakenda-aðgangur fyrir viðburðarfyrirtæki.

> Krefst SQL: keyrðu `0023_event_access.sql` (eftir 0022).

---

## Opinber skanna-hlekkur `/s/<token>` + PIN (klárar offline-lagfæringuna)

Skanna-hlekkurinn (`/s/<token>`) er nú til. Hann er **opinn** — engin Supabase-innskráning. Viðkomandi opnar hlekkinn, slær inn **PIN**, og fær session sem skannar með (`open_scanner` → `sync_checkin_s`). Lotan geymist í tækinu og helst þar til hún rennur út (eða er afturkölluð). Dyraskanninn nýtir áfram afritið + biðröðina (nú lyklað á aðgangs-token svo það helst þótt PIN sé slegið aftur).

**Þetta lagar endurhleðslu án nets:** síðan þarf enga server-innskráningu, svo hún getur ekki lengur hent þér í innskráningu. SW (v3) geymir líka `/s/`-síður (cache-first). Ef lotan rennur út á meðan ónettengt er tapast innritun ekki — hún bíður í biðröð og sendist þegar opnað er aftur með PIN.

Barþjóna-hlutverkið opnar skannann en sýnir „á leiðinni“ í bili (barskanninn kemur næst). Dyraskanninn er fullvirkur.

---

## Barþjóna-skanni um PIN-hlekk (0025)

Barþjóna-aðgangur (role `bar`) opnar nú virkan skanna um `/s/<token>` + PIN, alveg eins og dyraskanninn. Barskanninn **krefst nettengingar**: úttektin (`redeem_drink_s`) keyrir á þjóninum með atómískri læsingu, svo aldrei er hægt að draga sama drykkinn tvisvar — óháð því hve mörg tæki/barþjónar skanna samtímis. Skanninn dregur einn drykk frá við hverja skönnun og sýnir „Drykkir eftir: N af M“. Sömu varnir og áður: innritun krafist fyrst, aldursmörk (20 ára fyrir áfengi, aðalhandhafi), afbókaðir miðar hafnað. Úttektir PIN-barþjóna eru rekjanlegar gegnum `access_id`.

> Krefst SQL: keyrðu `0025_bar_scanner_session.sql` (eftir 0024).

---

## Bakendi viðburðarfyrirtækja (0026) — viðmót

Viðburðarstjóri (role `organizer`) opnar sama `/s/<token>` + PIN og skannararnir, en lendir á **takmörkuðu bakenda fyrir einn viðburð** (`OrganizerBackend`) með fjórum köflum:
- **Yfirlit** — skráðir, gestir, mættir, drykkir nýttir/leyfðir.
- **Gestir** — fullur gestalisti með leit, tengiliðum, fæðuóþoli og mætingarstöðu.
- **Starfsfólk** — stofna/kveikja/slökkva/eyða dyravörðum og barþjónum (fær hlekk + PIN). Getur ekki búið til fleiri viðburðarstjóra.
- **Drykkir** — beita inneign á alla, og +1/−1 lifandi um kvöldið.

Allt keyrir um session-vottuðu `org_*` föllin (engin Supabase-innskráning), njörvað við þennan eina viðburð. Admin stofnar organizer-aðganginn í „Aðgangur að viðburði“ (nú með valkostinum „Viðburðarstjóri (bakendi)“).

> Krefst SQL: `0026_organizer_backend.sql` (eftir 0025).

---

## Ríkari viðburðalýsing (Markdown)

Viðburðalýsingin styður nú einfalt Markdown: **feitletrun**, *skáletrun*, fyrirsagnir (`##`), lista (`-` eða `1.`) og hlekki (`[texti](slóð)`). Ritillinn (`RichTextField`) hefur litla tækjaslá og „Forskoðun“. Lýsingin geymist sem texti og er birt með öruggum Markdown-teiknara (`lib/markdown.ts`) — allur HTML er escape-aður fyrst og aðeins leyfð snið mynduð, svo engin XSS-hætta. Engir nýir pakkar.

---

## Alvöru Fagkaup-tákn + iOS splash

PWA-táknin (heimaskjár í síma) eru nú með alvöru Fagkaup-merkinu: **rauða „G“-ið á dökkum premium-grunni** (#0B121C) — `icon-192/512`, `icon-maskable-512`, `apple-touch-icon`, auk `favicon.ico` + `favicon-32` fyrir vafraflipa. iOS splash-skjáir (`/public/splash/…`, 8 algengar iPhone-stærðir) sýna hvíta FAGKAUP-merkið á sama dökka grunni meðan appið hleðst; tengt í gegnum `AppleSplash` (apple-touch-startup-image). Service worker bumpaður í v4 svo táknin uppfærist.

---

## Notendastjórnun (0027 + 0028)

Stjórnendur (owner/admin) geta boðið inn starfsfólki á „Notendur → Starfsfólk“ og úthlutað hlutverki:
- **Stjórnandi (admin):** fullur aðgangur, þ.m.t. notendastjórnun.
- **Notandi (staff):** fullur rekstrar-aðgangur (viðburðir, skráningar, skannar, útflutningur) en EKKI notendastjórnun.

Öryggi: `is_admin()` nær nú yfir owner/admin/staff (rekstur), en `is_account_admin()` (owner/admin) læsir notendastjórnun. „Notendur“ í valmynd og sjálf síðan eru falin/læst fyrir staff.

Boðsflæði: admin býr til boð (`auth.admin.generateLink` invite) — kerfið sýnir **hlekk** sem admin sendir á viðkomandi (engin SMTP-uppsetning nauðsynleg). Notandinn smellir, lendir á `/welcome`, setur sitt eigið lykilorð og fær aðgang. Prófíll verður til sjálfkrafa úr boðsgögnunum (`handle_new_user`). Að fjarlægja notanda eyðir auth-aðgangi + prófíl (cascade).

> Krefst SQL: keyrðu `0027_add_staff_role.sql` EITT OG SÉR fyrst, svo `0028_user_management.sql`.

### Breyta notanda + endurstilla lykilorð (0029)

Á notendalistanum opnar **„Breyta“** spjald fyrir hvern notanda: breyta **nafni**, breyta **hlutverki** (ekki fyrir eiganda/sjálfan þig), **fjarlægja**, og **endurstilla lykilorð**. Lykilorðs-endurstilling býr til `recovery`-hlekk (`auth.admin.generateLink`) sem þú sendir á notandann — hann velur nýtt lykilorð sjálfur á `/welcome`. Krefst `0029_set_user_name.sql` (eftir 0028).

### Lagfæring: boðsflæði + staff-aðgangur

- **Middleware:** `/dashboard` (og `/door`,`/bar`) hleypa nú `staff` inn — áður voru aðeins owner/admin leyfð, sem læsti venjulega notendur úti með „forbidden“.
- **Boðs-/endurstillingarhlekkir** vísa nú beint á `/welcome` (client-síðu) sem les session-token úr URL-hash (`#access_token=…`) og setur session. Áður fór hlekkurinn í gegnum server-`/auth/callback` sem las aðeins `?code=`, svo hash-token tapaðist og notandinn lenti á innskráningu.

### Skanna-öruggt boðsflæði (Teams/SafeLinks)

Tölvupóstur/Teams skannar hlekki sjálfkrafa og notar einnota token upp. Því fer boðs-/endurstillingarhlekkurinn nú á **millisíðu** (`/welcome?token_hash=…`) sem staðfestir EKKERT við hleðslu — hún sýnir „Halda áfram“-hnapp. Aðeins við alvöru smell fer notandinn á `/auth/confirm` sem staðfestir token-ið. Skannar gera bara GET og smella ekki á hnappa, svo token-ið lifir þar til manneskja smellir.

## Borðaskipan (stjórnborð)

Þegar „Nota borðaskipan“ er virkt á viðburði birtist **Borðaskipan**-hlekkur á viðburðar-síðunni (`/dashboard/events/[id]/seating`). Þar má:
- Skilgreina **borð** (númer, heiti, sætafjöldi) og eyða þeim.
- **Úthluta gestum** (hverjum miða — aðal + maka/+1) á borð og sæti. Sýnir hve margir eru á hverju borði (af sætafjölda).
Úthlutun vistast á `tickets.table_number/seat_number` og birtist sjálfkrafa á miða gestsins („Borð / Sæti“). Uppfærist live. Notar RLS sem er þegar til — engin ný SQL.

### Bakteinn / næstu liðir
- **Ekki senda QR kóða**: valkostur per viðburð að sleppa QR-kóða (fyrir smærri viðburði án dyravarðar) — svo þátttakendur haldi ekki að þeir þurfi að sýna kóða við inngang. (Á eftir að útfæra.)
