# JIH Marketing Forms

Standalone Salesforce Web-to-Lead contact form for [johnihaas.com](https://www.johnihaas.com).
Hosted at: `https://jih-marketing-forms.vercel.app`

---

## Quick Start

The simplest embed — a standard iframe with no customisation:

```html
<iframe
  src="https://jih-marketing-forms.vercel.app/LeadForm/index.html"
  frameborder="0"
  style="width: 100%; min-height: 920px; border: none;"
></iframe>
```

All parameters below are appended as query strings to that URL.

---

## URL Parameters

### `?template=`

Selects the visual theme. Applies a CSS layer on top of the base styles.

| Value | Description |
|---|---|
| *(none)* | Default — cream background `#fdf6ef`, dark charcoal text |
| `transparent` | Transparent background, white text. Use when embedding over a background image or coloured section. |
| `dark` | Deep navy background `#1a2530`, light text. |
| `light` | Pure white background, warm cream inputs with subtle borders. |

**Example:**
```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?template=dark
```

---

### `?campaign=`

Loads a **preset** — pre-fills the hidden Salesforce fields (`lead_source`, `lead_source_detail`, `campaign_name`) and the visible `description` textarea with context-relevant copy.

Use this to identify where the lead came from when embedding the form on different pages.

| Value | Context |
|---|---|
| `contact-us` | General contact page |
| `products` | Products overview page |
| `how-to-buy` | How to Buy page |
| `news-views` | News & Views page |
| `harvest` | Hop Harvest campaign — also sets `lead_source: Marketing` |
| `lupomax` | LupoMax® product page |
| `lupocore` | LupoCore® product page |
| `euphorics` | Euphorics™ hop variety page |
| `incognito` | Incognito® hop extract page |
| `spectrum` | Spectrum™ hop variety page |
| `flex` | Flex™ hop variety page |
| `prysma` | Prysma™ hop variety page |
| `pha` | Pure Hop Alpha page |
| `australian-hops` | Australian Hops page |
| `termsandconditions` | Terms & Conditions page |

**Example:**
```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?campaign=lupomax
```

---

### Field pre-population

Any visible form field can be pre-filled by passing its `name` attribute as a query parameter. Accepted field types: `text`, `email`, `tel`, `textarea`, `select`.

| Parameter | Field |
|---|---|
| `first_name` | First Name |
| `last_name` | Last Name |
| `email` | Email |
| `company` | Company |
| `phone` | Phone |
| `country_code` | Country (ISO 2-letter code, e.g. `US`) |
| `industry` | Industry |
| `description` | Message textarea |

> **Note:** `campaign` is a reserved parameter (handled separately) and cannot be used to fill a visible field directly.

**Example — pre-fill company and country:**
```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?company=Acme+Brewing&country_code=DE
```

---

### Combining parameters

All parameters can be combined freely:

```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?template=dark&campaign=harvest&company=Acme+Brewing&country_code=US
```

---

## Embedding as an iframe

### Basic embed

```html
<iframe
  src="https://jih-marketing-forms.vercel.app/LeadForm/index.html?campaign=contact-us"
  frameborder="0"
  style="width: 100%; min-height: 920px; border: none; display: block;"
></iframe>
```

### Transparent embed (over a background image or coloured section)

To make the iframe background invisible so the parent page's background shows through, two conditions must be met:

1. The **iframe element** on the parent page must have `allowtransparency="true"` and `background: transparent` in its style.
2. The **form itself** must use `?template=transparent` so its own `body` background is set to `transparent`.

```html
<iframe
  src="https://jih-marketing-forms.vercel.app/LeadForm/index.html?template=transparent&campaign=contact-us"
  frameborder="0"
  allowtransparency="true"
  scrolling="no"
  style="
    background: transparent;
    border: none;
    width: 100%;
    max-width: 720px;
    min-height: 920px;
    display: block;
    margin: 0 auto;
  "
></iframe>
```

> **Cross-origin note:**
> CSS transparency works cross-origin without any issues. The browser's same-origin policy restricts JavaScript from reading another domain's DOM — it does not affect visual rendering or compositing. `allowtransparency` + `background: transparent` will work whether the parent page and the form are on the same domain or different domains.
>
> The only cross-origin limitation is that JavaScript on the parent page cannot read the iframe's content height. This is why a fixed `min-height` is used. For dynamic auto-resizing, see the **Iframe height** section below.

---

### Real-world example — parallax section

The file `parent.html` in this repo demonstrates embedding the form inside a parallax hero section. The relevant HTML structure is:

```html
<section class="parallax-section">
  <div class="parallax-overlay"></div>  <!-- semi-transparent dark overlay -->
  <div class="parallax-content">
    <iframe
      src="https://jih-marketing-forms.vercel.app/LeadForm/index.html?template=transparent&campaign=contact-us"
      frameborder="0"
      allowtransparency="true"
      scrolling="no"
      style="background: transparent; border: none; width: 100%; max-width: 720px; min-height: 920px; display: block; margin: 0 auto;"
    ></iframe>
  </div>
</section>
```

The corresponding CSS for the parallax container:

```css
.parallax-section {
  position: relative;
  background-image: url('your-background-image.jpg');
  background-attachment: fixed;  /* creates the parallax scroll effect */
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.parallax-overlay {
  position: absolute;
  inset: 0;
  background: rgba(50, 62, 72, 0.62);  /* dark tint over the image */
}

.parallax-content {
  position: relative;
  z-index: 2;
  width: 100%;     /* must be 100% so the iframe can expand to its max-width */
  padding: 60px 48px;
}
```

> **Mobile note:** `background-attachment: fixed` is not supported on iOS Safari. Add a media query fallback: `@media (max-width: 768px) { .parallax-section { background-attachment: scroll; } }`

---

### Iframe height

The form has no fixed height — it grows with its content. Set `min-height` on the iframe to avoid a scrollbar appearing inside it. A value of **`920px`** covers the full form at desktop width.

For dynamic height (auto-resize as content changes), JavaScript on the parent page cannot read a cross-origin iframe's height directly. The solution is `postMessage` — the form reports its own height and the parent adjusts the iframe. The [iframeResizer](https://github.com/davidjbradshaw/iframe-resizer) library handles this with minimal setup and works cross-origin.

The 2-column field layout activates when the **iframe's rendered width** exceeds `420px`. Ensure the container gives the iframe enough room to reach that width, otherwise all fields will stack in a single column.

```css
/* Ensure the iframe container does not constrain its width */
.your-container {
  width: 100%;
}
```

---

## File structure

```
LeadForm/
  index.html              ← The form (single file, all variants via URL params)
  transparent_index.html  ← Legacy alias — loads same form with transparent template

forms.css                 ← Base styles (typography, layout, inputs)
forms.js                  ← Template injection + field pre-population + preset loading
presets.json              ← Preset definitions (campaign copy & Salesforce hidden field values)

templates/
  transparent.css         ← ?template=transparent
  dark.css                ← ?template=dark
  light.css               ← ?template=light

parent.html               ← Reference/test page: full-page layout with parallax + embedded iframe
```

---

## Adding a new template

1. Create `templates/your-name.css` with CSS overrides on top of `forms.css`.
2. Deploy. It is immediately available via `?template=your-name` — no code changes needed.

---

## Adding a new preset

Open `presets.json` and add an entry. All fields are optional — omit any that should not be pre-filled.

```json
"my-page": {
  "description": "Pre-filled message shown in the textarea.",
  "campaign_name": "Salesforce_Campaign_ID",
  "lead_source": "Marketing",
  "lead_source_detail": "JIH_Marketing_Forms"
}
```

Access via `?campaign=my-page`.

Valid `lead_source` values: `YVH`, `Webshop`, `Website signups`, `Marketing`, `Customer portal`, `CBC Attendee`.

---

## Production vs Sandbox

The form currently posts to the **Salesforce sandbox** endpoint. To switch to production, change only the `action` URL in `LeadForm/index.html`:

| Environment | Action URL |
|---|---|
| Sandbox | `https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D9M00000Ki5V8` |
| Production | `https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D9M00000Ki5V8` |

No other changes are needed — field IDs and the org ID are identical across both environments.
