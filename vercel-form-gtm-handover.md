# Handover: Track Successful Vercel Form Submissions in Parent-Site GTM

## 1. Objective

Notify the parent website when the Vercel-hosted form has been **successfully accepted by Salesforce**, so the parent website's Google Tag Manager (GTM) container can trigger GA4 and/or Google Ads conversion tracking.

The form is embedded in external websites, including WordPress and Webflow. Because the form runs in a cross-origin iframe, the parent page cannot reliably observe the form's internal submission state directly.

## 2. Recommended architecture

1. The visitor submits the form inside the Vercel-hosted iframe.
2. The form sends the submission to Salesforce.
3. Only after the application confirms Salesforce accepted the submission, the form sends a structured `window.postMessage()` event to the parent page.
4. The parent page validates the message's origin, source window, and payload.
5. The parent page pushes a custom event into its own `window.dataLayer`.
6. GTM handles the event and fires the configured GA4 event and/or Google Ads conversion tag.

**Important:** Do not emit the success event merely because the visitor clicked Submit or because a request was started. Emit it only after the existing Salesforce request/response logic definitively confirms acceptance.

## 3. Message contract

Use a small, versioned message contract so the form and parent-site listener can evolve independently.

Example payload:

```javascript
{
  source: "haas-marketing-forms",
  message_type: "form_submission",
  version: 1,
  status: "success",
  form_id: "form-id-from-query-string",
  form_type: "lead", // or "case"
  campaign: "campaign-value-or-null",
  submission_id: "unique-notification-id"
}
```

Field definitions:

| Field | Meaning |
| --- | --- |
| `source` | Identifies this integration. |
| `message_type` | Event type; currently `form_submission`. |
| `version` | Contract version. Start with `1`. |
| `status` | Must be `success` for a successful submission notification. |
| `form_id` | Form identifier read from the `form_id` query parameter. |
| `form_type` | `case` for paths containing `/CaseForm/`; otherwise `lead`, unless the project has a more authoritative form-type mapping. |
| `campaign` | Campaign query parameter, or `null` if absent. |
| `submission_id` | Unique notification identifier. Prefer a stable Salesforce submission/record ID if one is available and safe to expose; otherwise a UUID can identify this notification. |

Do not include form contents, personal information, Salesforce credentials, access tokens, or other sensitive values in this message unless there is a documented need and an approved data-handling design.

## 4. Vercel form implementation

### 4.1 Configuration and metadata

The implementation proposal supplied for review uses:

```javascript
const TARGET_PARENT_ORIGIN = "https://www.johnihaas.com";

const params = new URLSearchParams(window.location.search);
const formId = params.get("form_id");
const campaign = params.get("campaign") || null;

const formType = window.location.pathname.includes("/CaseForm/")
  ? "case"
  : "lead";
```

**Environment configuration:** The production target above is valid only when the parent page's origin is exactly `https://www.johnihaas.com`. Use the approved staging origin in staging. If the form is embedded on multiple approved parent origins, use an explicit allowlist and choose the appropriate origin for the current environment. Do not use `"*"` as a production workaround.

If the application can be embedded by multiple origins, verify `document.referrer` against the approved allowlist or otherwise determine the intended parent origin using a project-approved mechanism. Do not blindly echo an arbitrary origin supplied by a URL parameter.

### 4.2 Notify after confirmed acceptance

Integrate this helper into the existing form code. Adapt naming and environment configuration to the project's actual conventions:

```javascript
const TARGET_PARENT_ORIGIN = "https://www.johnihaas.com";

const params = new URLSearchParams(window.location.search);
const formId = params.get("form_id");
const campaign = params.get("campaign") || null;

const formType = window.location.pathname.includes("/CaseForm/")
  ? "case"
  : "lead";

let successMessageSent = false;

function notifyParentOfSuccessfulSubmission() {
  if (successMessageSent || !formId) return;

  successMessageSent = true;

  window.parent.postMessage(
    {
      source: "haas-marketing-forms",
      message_type: "form_submission",
      version: 1,
      status: "success",
      form_id: formId,
      form_type: formType,
      campaign,
      submission_id: crypto.randomUUID()
    },
    TARGET_PARENT_ORIGIN
  );
}
```

Call it only in the branch that already knows Salesforce accepted the submission:

```javascript
// Pseudocode only: adapt to the existing request/response contract.
submitToSalesforce(formPayload).then((result) => {
  if (!result.accepted) {
    showSubmissionError();
    return;
  }

  showThankYouState();
  notifyParentOfSuccessfulSubmission();
});
```

The above `.then()` is illustrative only. Use the project's actual asynchronous pattern and its definitive Salesforce acceptance condition. Handle thrown errors and rejected requests as failures; do not send the success event in those branches.

**Implementation notes:**

- Keep the `successMessageSent` guard to prevent duplicate messages from repeated calls in one iframe page instance.
- `crypto.randomUUID()` creates a notification ID; it is not a Google Analytics client ID, GA4 session ID, or Google Ads click ID.
- If Salesforce returns a stable submission or record ID and it is appropriate to expose, consider using it as the event's stable deduplication key. A new UUID on each page load cannot deduplicate the same underlying submission across reloads.
- If `form_id` is missing, the example intentionally does not notify the parent. Confirm this is the desired behavior and log/monitor the configuration problem without exposing personal data.
- The origin supplied to `postMessage` must be an origin only (scheme + host + optional port), with no path or trailing route.

## 5. Parent-site listener

Install a listener on each parent website that needs to track form submissions. It may be installed through GTM Custom HTML or site-level custom code, but it must execute early enough that the message is not missed. A site-level script loaded before the iframe is initialized is often the most reliable arrangement.

Replace `FORM_ORIGIN` with the exact origin serving the Vercel form, for example `https://your-form.vercel.app`. If a custom domain is used, use that exact origin instead.

```javascript
(function () {
  const FORM_ORIGIN = "https://your-form.vercel.app";
  const EXPECTED_SOURCE = "haas-marketing-forms";

  window.dataLayer = window.dataLayer || [];

  window.addEventListener("message", function (event) {
    // Validate the sender's origin.
    if (event.origin !== FORM_ORIGIN) return;

    // If the iframe element is known, validate the sender window too.
    // Replace "#haas-marketing-form-iframe" with the actual iframe selector.
    const iframe = document.querySelector("#haas-marketing-form-iframe");
    if (iframe && event.source !== iframe.contentWindow) return;

    const data = event.data;

    // Validate the message contract.
    if (!data || typeof data !== "object") return;
    if (data.source !== EXPECTED_SOURCE) return;
    if (data.message_type !== "form_submission") return;
    if (data.version !== 1) return;
    if (data.status !== "success") return;
    if (typeof data.form_id !== "string" || !data.form_id) return;
    if (data.form_type !== "lead" && data.form_type !== "case") return;

    // Prevent repeat processing of the same notification in this page instance.
    // This is a convenience guard, not durable cross-page deduplication.
    window.__haasFormSubmissionIds = window.__haasFormSubmissionIds || {};
    if (
      data.submission_id &&
      window.__haasFormSubmissionIds[data.submission_id]
    ) {
      return;
    }
    if (data.submission_id) {
      window.__haasFormSubmissionIds[data.submission_id] = true;
    }

    window.dataLayer.push({
      event: "form_submission",
      form_id: data.form_id,
      form_type: data.form_type,
      campaign: data.campaign || null,
      submission_id: data.submission_id || null
    });
  });
})();
```

### Parent listener considerations

- The `FORM_ORIGIN` must match the actual iframe origin exactly.
- If the page has multiple instances of the form, give each iframe a stable identifier and validate against the correct iframe's `contentWindow`. Do not rely on a hard-coded frame index.
- If the listener is placed in GTM, verify that it is registered before a visitor can submit the form. If GTM loads late or consent settings delay it, a fast submission could occur before the listener exists. A small site-level listener loaded before the iframe is more reliable; it can push into `dataLayer` for GTM to consume.
- For multiple approved form origins, explicitly allowlist them rather than accepting arbitrary origins.
- The example uses a simple object for page-lifetime deduplication. If IDs can be attacker-controlled or numerous, use a `Set` with a sensible limit/cleanup. This guard is optional and does not replace backend idempotency.

## 6. GTM configuration

In each relevant parent-site GTM container:

1. **Create Data Layer Variables** for:
   - `form_id`
   - `form_type`
   - `campaign`
   - `submission_id`
2. **Create a Custom Event trigger**:
   - Event name: `form_submission`
3. **Create a GA4 Event tag**, if required:
   - Event name: usually `generate_lead` for lead generation, or a separately agreed event name for case submissions.
   - Add approved parameters such as `form_id`, `form_type`, and `campaign`.
   - Trigger it with the `form_submission` Custom Event trigger, optionally filtered by `form_type`.
4. **Create a Google Ads conversion tag**, if required:
   - Use the correct conversion ID and label from the Google Ads account.
   - Trigger it from the same event, with filters where appropriate.
5. Use GTM Preview/Tag Assistant to confirm the event and tag behavior before publishing.

Use the event name agreed with the analytics owner. Do not send both a custom event and `generate_lead` as separate conversion events unless the measurement design calls for both; that can lead to double-counting.

## 7. Attribution and Google identifiers

The `postMessage` event signals that a submission succeeded. It does not by itself guarantee session or campaign attribution.

If attribution to the visitor's existing GA4 session or Google Ads click is required, confirm the measurement design with the analytics owner and preserve the necessary identifiers through the journey.

- A GA4 `client_id` identifies a browser/client, not a submission.
- A GA4 `session_id` identifies a GA4 session.
- A Google Ads `gclid` is a click identifier when present.
- `campaign` from the form URL is application metadata; it is not automatically equivalent to a GA4 campaign attribution value.
- Do not assume that passing `client_id` as a custom data-layer parameter makes GA4 associate the event with the original session.
- Do not expose GA4 Measurement Protocol API secrets in frontend code.

### Alternative: server-side GA4 Measurement Protocol

If there is a specific requirement to send events directly from the Vercel backend to GA4, evaluate GA4 Measurement Protocol separately. The backend needs the appropriate Measurement ID and API secret, and correct identifiers (including client/session identifiers where required) must be collected and persisted in accordance with Google's documentation and the site's consent/privacy requirements. This is a separate integration from the recommended parent-GTM event path and should not be added unless there is a clear need.

Reference: https://developers.google.com/analytics/devguides/collection/protocol/ga4/sending-events

## 8. Security, privacy, and reliability checklist

- [ ] Use an explicit approved parent-origin configuration per environment.
- [ ] Use an exact target origin in `postMessage`, never `"*"` in production.
- [ ] Validate `event.origin` on the parent.
- [ ] Validate `event.source` against the expected iframe when feasible.
- [ ] Validate `source`, `message_type`, `version`, `status`, and required fields.
- [ ] Emit only after confirmed Salesforce acceptance.
- [ ] Do not include form payloads, personal data, credentials, or secrets in the message.
- [ ] Confirm the listener is active before the iframe can submit.
- [ ] Confirm consent requirements and GTM consent settings before firing marketing/analytics tags.
- [ ] Decide whether `lead` and `case` submissions should trigger different analytics/conversion tags.
- [ ] Decide how retries and duplicate conversions should be handled.
- [ ] Confirm staging and production origins separately.

## 9. Test plan

Test in staging first.

1. **Successful lead submission:** Salesforce accepts it; the iframe sends one message; parent `dataLayer` receives one `form_submission` event; expected GTM tag fires.
2. **Successful case submission:** Verify `form_type` is `case` and the correct tag/configuration is used.
3. **Salesforce rejection:** No success message and no conversion event.
4. **Network/API failure:** No success message and no conversion event.
5. **Missing `form_id`:** No message according to the proposed guard; verify monitoring or diagnostics.
6. **Duplicate handler invocation:** Only one message from that iframe page instance.
7. **Unexpected message origin:** Parent listener ignores it.
8. **Malformed or unsupported payload:** Parent listener ignores it.
9. **Wrong iframe/source window:** Parent listener ignores it when source-window validation is enabled.
10. **Consent denied or analytics blocked:** Behavior follows the site's documented consent policy.
11. **Production deployment:** Verify exact production origins and test with GTM Preview/Tag Assistant before publishing.

## 10. Acceptance criteria

The implementation is ready when:

- A confirmed Salesforce acceptance produces exactly one intended `form_submission` data-layer event in the parent page during normal operation.
- A rejected or failed submission produces no success event.
- Untrusted origins and malformed messages are ignored.
- GTM fires the intended GA4 and/or Google Ads tag with the expected form metadata.
- The analytics owner has confirmed attribution requirements, consent behavior, and deduplication expectations.

## 11. Implementation ownership / open decisions

Confirm before release:

- [ ] Exact Vercel form origin(s), including staging.
- [ ] Exact parent origin(s), including WordPress/Webflow staging and production.
- [ ] Actual iframe selector or mechanism for validating `event.source`.
- [ ] Salesforce response property that definitively indicates acceptance.
- [ ] Whether a stable Salesforce submission/record ID is available for deduplication.
- [ ] Whether the target is GA4, Google Ads, or both.
- [ ] Event naming and conversion definitions agreed with the analytics owner.
- [ ] Required attribution identifiers and consent/privacy handling.
