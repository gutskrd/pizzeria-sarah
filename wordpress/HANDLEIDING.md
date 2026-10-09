# Menukaart-folder en 360°-foto op je WordPress-website

Deze plugin zet twee dingen op je bestaande WordPress-website:

- **De menukaart-folder**: de gedrukte menukaart ligt dichtgevouwen op de pagina en tilt af en toe een hoekje op. Wie erop tikt, ziet hem in 3D openvouwen, kan hem omdraaien naar de buitenkant en inzoomen.
- **360° rondkijken**: een brede foto van de pizzeria die langzaam ronddraait. Wie erop tikt, kijkt rond alsof hij binnen staat: met de vinger slepen, knijpen om te zoomen, of op een telefoon de telefoon zelf bewegen.

Beide werken op telefoon, tablet en computer, en met elk WordPress-thema. Er komen geen maandelijkse kosten bij.

## Wat je nodig hebt

- Een WordPress-website waarop je **plugins kunt installeren**. Kijk links in het WordPress-menu: staat daar **Plugins → Nieuwe plugin**? Dan kan het.
  - Zie je geen Plugins? Dan is het een gratis of goedkope WordPress.com-website. Daar kunnen plugins niet op.
- Het bestand **`pizzeria-sarah.zip`** (in deze map).
- Twee afbeeldingen van de folder (binnen- en buitenkant). Kant-en-klare versies staan in de map [`afbeeldingen`](afbeeldingen):
  - `menukaart-binnenkant.jpg`
  - `menukaart-buitenkant.jpg`
- Je **360°-foto**: de originele foto van de 360°-camera of telefoon. Een 360°-foto is twee keer zo breed als hoog, bijvoorbeeld 6000 × 3000 pixels.
  - De huidige foto staat ook in de map `afbeeldingen`: `pizzeria-sarah-360.jpg` (2576 × 1288). Dat is genoeg voor telefoons. Op een groot scherm is hij wat zacht.
  - Heb je de foto ergens in een groter formaat, bijvoorbeeld rechtstreeks uit de app van de camera? Gebruik dan die.

## 1. Plugin installeren (eenmalig, 2 minuten)

1. Log in op WordPress.
2. Ga naar **Plugins → Nieuwe plugin** en klik bovenaan op **Plugin uploaden**.
3. Kies `pizzeria-sarah.zip` en klik op **Nu installeren**.
4. Klik op **Plugin activeren**.

Links in het menu staat nu **Folder & 360°**.

## 2. De folder instellen

1. Ga naar **Folder & 360°**.
2. Klik bij *Binnenkant* op **Kies de binnenkant** en kies `menukaart-binnenkant.jpg`. Je kunt de afbeelding ook in het venster slepen om hem te uploaden.
3. Doe hetzelfde bij *Buitenkant* met `menukaart-buitenkant.jpg`.
4. De gele lijnen zijn de vouwen. Ze worden vanzelf gezocht. Staan ze niet precies op de vouw? Versleep ze met de muis.
5. Vul eventueel in:
   - **Naam of datum** (bijvoorbeeld *november 2025*).
   - **Link naar de menukaart als tekst**: dan staat er een knop „Als tekst lezen” in de folder.
   - **Pdf van de menukaart**: dan kunnen bezoekers hem downloaden.
6. Klik op **Bekijk zoals bezoekers hem zien** om het resultaat te zien.
7. Klik onderaan op **Wijzigingen opslaan**.

## 3. De 360°-foto instellen

1. Klik bij *360°-foto* op **Kies een 360°-foto** en upload je foto.
2. De foto wordt meteen klaargemaakt voor telefoon, tablet en computer. **Laat de pagina open** tot er „Klaar voor telefoon, tablet en computer” staat (meestal 10 à 30 seconden).
3. Kijk rond in het voorbeeld: sleep met de muis en scroll om te zoomen. Draai naar het mooiste beeld en klik op **Gebruik dit als beginbeeld**.
   - Bij de huidige foto werkt de toonbank het best: de koelkast met drinken, het menubord en de letters SARAH, met een plant links in beeld.
4. Pas eventueel de tekst op de foto aan (standaard: *Kijk binnen bij Pizzeria Sarah*).
5. Klik op **Wijzigingen opslaan**.

> Tip: doe dit op een computer met Chrome, Edge of Firefox. Op een telefoon lukt het klaarmaken van een heel grote foto soms niet; de foto werkt dan wel, maar laadt trager.

## 4. Op een pagina zetten

**Met de blok-editor** (de standaard-editor van WordPress):

1. Open de pagina, bijvoorbeeld de homepage, en klik op **Bewerken**.
2. Klik op het **plusje (+)** en typ **Menukaart-folder** of **360° rondkijken**.
3. Klik erop. Het blok staat er meteen in, precies zoals bezoekers het zien. Je kunt het verslepen naar de plek die je wilt.
4. Rechts bij *Weergave* kun je nog kiezen:
   - waar de folder staat;
   - witte tekst als de achtergrond donker is;
   - hoe hoog de 360°-foto is.
5. Klik op **Bijwerken**.

**Met Elementor, Divi, WPBakery of de klassieke editor**: plak een van deze codes in een tekst- of shortcode-blok:

| Code | Wat |
| --- | --- |
| `[sarah_folder]` | de menukaart-folder |
| `[sarah_folder kleur="donker"]` | de folder op een donkere achtergrond (witte tekst) |
| `[sarah_360]` | de 360°-foto |
| `[sarah_360 hoogte="laag"]` of `[sarah_360 hoogte="hoog"]` | een lagere of hogere 360°-foto |
| `[sarah_360 titel="Kom binnen!"]` | andere tekst op de foto |

## Iets veranderen

- **Nieuwe folder of andere foto**: ga naar **Folder & 360°**, klik op **Andere afbeelding** of **Andere foto** en sla op. Op de website verandert hij overal vanzelf mee.
- **Even niet tonen**: zet *Folder tonen op de website* of *360°-foto tonen op de website* uit en sla op. Je instellingen blijven bewaard.

## Goed om te weten

- **Snelheid**: de 360°-viewer en de grote foto worden pas geladen als iemand op de foto tikt, zodat de pagina snel blijft. Telefoons krijgen een lichtere versie (4096 pixels breed), grote schermen een extra scherpe (tot 8192 pixels).
- **Rondkijken door de telefoon te bewegen**:
  - Dit werkt alleen als de website met `https://` begint.
  - Op een iPhone vraagt Safari eerst toestemming.
  - De knop staat rechtsonder (het telefoontje).
- **Privacy**: maak de 360°-foto als de zaak dicht is, zodat er geen gasten of medewerkers herkenbaar op staan.
- **Ook op Google Maps**: upload dezelfde 360°-foto via de Google Maps-app (Bijdragen → foto toevoegen) of via Street View Studio. Dan zien mensen hem ook als ze de pizzeria op Google zoeken.
- **Plugin verwijderen**: de instellingen en de klaargemaakte 360°-versies worden opgeruimd. Je afbeeldingen in de mediabibliotheek blijven staan.

## Voor de ontwikkelaar

- **Broncode**: [`wordpress/pizzeria-sarah/`](pizzeria-sarah). Er is geen build-stap nodig.
- **Zip opnieuw maken**: `npm run wordpress:zip`.
- **Vereisten**: WordPress 6.5 of nieuwer (getest op 7.1.3) en PHP 7.4 of nieuwer.
- **Meegeleverde viewer**: Pannellum 2.5.7 (MIT-licentie), alleen geladen bij openen.
- **Opslag**:
  - Alle instellingen staan in de optie `psarah_settings`.
  - De klaargemaakte 360°-versies staan in `wp-content/uploads/pizzeria-sarah/`. De browser van de beheerder maakt ze en uploadt ze via `admin-ajax` (actie `psarah_pano_variant`, met nonce en controle op `manage_options`).
