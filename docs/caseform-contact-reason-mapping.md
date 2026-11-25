# Contact Us form — Contact Reason mapping

| | |
|---|---|
| **Form** | Contact Us (`CaseForm/index.html`) → creates a **Case** in Salesforce |
| **Field** | Contact Reason (`JIH_ContactReason__c`) |
| **Version** | v4.9 |
| **Date** | 2026-11-25 |

## Why this changed

Salesforce only accepts Contact Reason values from a fixed list, and rejects any other value. Three options on the form sent values that weren't on that list (in production or in UAT), so **Cases created with those options were rejected by Salesforce**. The visitor still saw the thank-you page, so nobody noticed.

To avoid changing Salesforce, those three options now send the closest existing Salesforce value. **Visitors see the same labels as before.**

## What the visitor picks → what Salesforce stores

| Option shown on the form | Stored in Salesforce | Changed? |
|---|---|---|
| Purchase hops (contract or spot) | Buy Hops | — |
| Purchase advanced products | Buy Hops | — |
| Request contract modification | Request Modification / Inventory Exchange | — |
| Request sales call | Sales Call | — |
| Request technical support | Technical Support | — |
| File a complaint | Complaint | — |
| General product inquiry | Other | — |
| **Marketing or press inquiry** | **Collaboration** | **New** (was rejected) |
| **Human Resources inquiry** | **Employment** | **New** (was rejected) |
| **Finance inquiry** | **Other** | **New** (was rejected) |

## Points to review with Marketing

1. **Finance inquiries land in "Other"** together with general product inquiries. If Finance needs its own routing or reporting, a "Finance" value has to be added in Salesforce. That's the only way to separate them.
2. **"Collaboration" for marketing/press:** confirm this is where those requests should go, or whether "Sponsoring" fits better.
3. **Salesforce values not used by the form:** Charity, Product Inquiries/Return, Sponsoring. Should any of them be offered as an option?
4. **Two form options store the same value** ("Buy Hops"), so reports can't tell hop purchases from advanced-product purchases.

## If Salesforce gets new values later

Add the value to the picklist in Salesforce (production, then refresh or copy it to UAT). Then change the `value="…"` of that option in `CaseForm/index.html` back to the new value. The label doesn't need to change.

Salesforce values checked on 2026-11-25 (production and UAT): Buy Hops, Charity, Collaboration, Complaint, Employment, Other, Product Inquiries/Return, Request Modification / Inventory Exchange, Sales Call, Sponsoring, Technical Support.
