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

### `?org=`

Switches the Salesforce org the form submits to at runtime. This swaps the form `action` URL, the hidden org ID (`oid`/`orgid`), and all custom field IDs without any changes to the HTML.

Config files live in `configs/{org}.json`. Available values:

| Value | Org | Notes |
|---|---|---|
| *(none)* | **poolorg14** (hardcoded default) | Development sandbox — IDs are baked into the HTML |
| `prod` | Production org (`00D2p0000012FXy`) | **Use for go-live** |
| `poolorg14` | BarthHaas poolorg14 sandbox | Same as the hardcoded defaults |
| `uat` | BarthHaas UAT (`barthhaas--uat`) | UAT sandbox |
| `poolorg1` | BarthHaas poolorg1 sandbox | Partial field mapping |

> **Go-live:** The default org is controlled by `_config` in `presets.json` — no code change needed:
> ```json
> "_config": { "sandbox": true,  "sandbox_default": "poolorg14" }  // → default = poolorg14
> "_config": { "sandbox": false, "sandbox_default": "poolorg14" }  // → default = prod
> ```

**Example:**
```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?org=prod
https://jih-marketing-forms.vercel.app/LeadForm/index.html?org=uat
```

---

### Combining parameters

All parameters can be combined freely:

```
https://jih-marketing-forms.vercel.app/LeadForm/index.html?org=uat&template=dark&campaign=harvest&company=Acme+Brewing&country_code=US
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
  index.html              ← Lead form (single file, all variants via URL params)
  transparent_index.html  ← Legacy alias — loads same form with transparent template

CaseForm/
  index.html              ← Case / contact form

forms.css                 ← Base styles (typography, layout, inputs)
forms.js                  ← Org config + template injection + field pre-population + preset loading
presets.json              ← Preset definitions (campaign copy & Salesforce hidden field values)

templates/
  transparent.css         ← ?template=transparent
  dark.css                ← ?template=dark
  light.css               ← ?template=light

configs/
  prod.json               ← Production org (00D2p0000012FXy)
  poolorg14.json          ← BarthHaas poolorg14 sandbox (matches hardcoded defaults)
  uat.json                ← BarthHaas UAT sandbox
  poolorg1.json           ← BarthHaas poolorg1 sandbox (partial field mapping)

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

## Org environments

### How org switching works

The HTML files have field IDs and action URLs **hardcoded** as their default. When `?org=` is present, `forms.js` fetches `configs/{org}.json` and patches the DOM before the form renders — replacing the `name`/`id` attributes on custom fields, the hidden org ID, and the form `action` URL.

If `?org=` is absent, nothing is patched and the hardcoded defaults are used.

### Current default (no `?org=` param)

The hardcoded defaults in the HTML currently point to **poolorg14** (development sandbox):

| Field | Value |
|---|---|
| Org ID | `00D9M00000Ki5V8` |
| Lead action | `https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId=00D9M00000Ki5V8` |
| Case action | `https://barthhaas--poolorg14.sandbox.my.salesforce.com/servlet/servlet.WebToCase?encoding=UTF-8&orgId=00D9M00000Ki5V8` |

To make production the default at go-live, set `"sandbox": false` in `presets.json` — see the `?org=` section above.

### Adding a new org config

1. Copy `configs/poolorg14.json` as a starting point.
2. Fill in the `oid`, `action_lead`, `action_case`, and all `fields` values for the new org.
3. Save as `configs/{name}.json`.
4. Access via `?org={name}` — no code changes needed.

### WebToLead endpoint: sandbox vs production

| Environment | Lead action URL |
|---|---|
| Any sandbox | `https://test.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId={oid}` |
| Production | `https://webto.salesforce.com/servlet/servlet.WebToLead?encoding=UTF-8&orgId={oid}` |

The WebToCase endpoint uses the org's My Domain URL and differs per environment — see `configs/*.json`.

---

## Salesforce Field Reference

### Standard fields (all orgs)

Built-in Salesforce fields — no custom ID needed, same `name` attribute everywhere.

**Lead object**

| Label | `name` attribute |
|---|---|
| First Name | `first_name` |
| Last Name | `last_name` |
| Email | `email` |
| Company | `company` |
| Phone | `phone` |
| Country Code | `country_code` |
| State/Province | `state` |
| Industry | `industry` |
| Lead Source | `lead_source` |
| Description | `description` |

Valid `lead_source` values (prod): `JIH Marketing Forms`, `YVH`, `Webshop`, `Website signups`, `Marketing`, `Customer portal`, `CBC Attendee`.

**Case object**

| Label | `name` attribute |
|---|---|
| Contact Name | `name` |
| Email | `email` |
| Phone | `phone` |
| Subject | `subject` |
| Description | `description` |
| Case Reason | `reason` |

---

### Custom fields — by org

These IDs (`00N…`) are org-specific and stored in `configs/<org>.json`. The `data-field` key is how `forms.js` identifies which element to patch at runtime.

When a field value is empty (`""`) in the config, `forms.js` **removes the `name` attribute** from that element — it renders and still blocks submission if `required`, but nothing is sent to Salesforce.

#### Production — `configs/prod.json` — Org `00D2p0000012FXy`

| Label | `data-field` key | Salesforce ID | Object |
|---|---|---|---|
| JIH Campaign | `campaign_field` | `00NVi00000F3KbC` | Lead |
| Customer Tier | `customer_tier` | `00N2p000009T9yk` | Lead |
| Position | `position` | `00N2p0000096ZVY` | Lead |
| Lead Source Detail | `lead_source_detail` | `00N2p0000097UMz` | Lead |
| Data Consent | `data_consent_lead` | _(not used — gate only)_ | Lead |
| Newsletter Consent | `newsletter_consent_lead` | `00NVi00000F3KbD` | Lead |
| Newsletter Consent | `newsletter_consent_case` | `00NVi00000F3KbA` | Case |

#### poolorg14 sandbox — `configs/poolorg14.json` — Org `00D9M00000Ki5V8`

| Label | `data-field` key | Salesforce ID | Object |
|---|---|---|---|
| JIH Campaign | `campaign_field` | `00N9M00000XtQID` | Lead |
| Customer Tier | `customer_tier` | `00N2p000009T9yk` | Lead |
| Position | `position` | `00N2p0000096ZVY` | Lead |
| Lead Source Detail | `lead_source_detail` | `00N2p0000097UMz` | Lead |
| Data Consent | `data_consent_lead` | `00N9M00000Xl7Pd` | Lead |
| Newsletter Consent | `newsletter_consent_lead` | `00N9M00000Xl7EL` | Lead |
| Newsletter Consent | `newsletter_consent_case` | `00N9M00000XlFv3` | Case |

#### UAT sandbox — `configs/uat.json` — Org `00DFg00000CpaYn`

| Label | `data-field` key | Salesforce ID | Object |
|---|---|---|---|
| JIH Campaign | `campaign_field` | `00NFg00000WMCbD` | Lead |
| Customer Tier | `customer_tier` | `00N2p000009T9yk` | Lead |
| Position | `position` | `00N2p0000096ZVY` | Lead |
| Lead Source Detail | `lead_source_detail` | `00N2p0000097UMz` | Lead |
| Data Consent | `data_consent_lead` | _(not used)_ | Lead |
| Newsletter Consent | `newsletter_consent_lead` | `00NFg00000WMCbE` | Lead |
| Newsletter Consent | `newsletter_consent_case` | `00NFg00000WMCbB` | Case |

---

## Pre-Go-Live Checklist

- [ ] Verify all `configs/prod.json` field IDs in Salesforce Setup → Object Manager → Lead → Fields & Relationships
- [ ] Test `?org=prod` on LeadForm — confirm Lead is created in prod with correct field values
- [ ] Test `?org=prod` on CaseForm — confirm Case is created in prod
- [ ] Confirm data consent checkbox: must block submission when unchecked; must NOT appear in POST payload for prod (no `name` attribute)
- [ ] Replace shortened country list in HTML with the full country list
- [ ] Update `retURL` in all HTML files to the final hosted domain
- [ ] Remove or comment out `debug` / `debugEmail` hidden fields in all HTML files
- [ ] Flip `"sandbox": false` in `presets.json` `_config` to route all unparameterised traffic to prod
