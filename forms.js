// Org config — patches form action, oid, and custom field name/id attributes at runtime
// Usage: add ?org=<name> (matches a file in configs/) to force a specific org.
// Default org is controlled by _config in presets.json:
//   { "sandbox": true,  "sandbox_default": "poolorg14" }  → default = poolorg14
//   { "sandbox": false, "sandbox_default": "poolorg14" }  → default = prod
(function () {
  var org = new URLSearchParams(location.search).get('org');

  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var base = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) : '../';
  var configBase = base + 'configs/';
  var presetsURL = base + 'presets.json';

  function applyOrgConfig(orgName) {
    fetch(configBase + orgName + '.json')
      .then(function (res) { return res.json(); })
      .then(function (cfg) {
        var form = document.querySelector('form');

        // Patch form action URL
        if (form) {
          if (cfg.action_lead && document.querySelector('[name="oid"]')) {
            form.action = cfg.action_lead;
          } else if (cfg.action_case && document.querySelector('[name="orgid"]')) {
            form.action = cfg.action_case;
          }
        }

        // Patch oid / orgid hidden inputs
        if (cfg.oid) {
          var oid = document.querySelector('[name="oid"]');
          if (oid) oid.value = cfg.oid;
          var orgid = document.querySelector('[name="orgid"]');
          if (orgid) orgid.value = cfg.oid;
        }

        // Patch reCAPTCHA settings — Salesforce validates the token against this orgId + keyname
        var captcha = document.querySelector('[name="captcha_settings"]');
        if (captcha && cfg.oid) {
          try {
            var captchaCfg = JSON.parse(captcha.value);
            captchaCfg.orgId = cfg.oid;
            if (cfg.captcha_keyname) captchaCfg.keyname = cfg.captcha_keyname;
            captcha.value = JSON.stringify(captchaCfg);
          } catch (e) {}
        }

        // Patch custom-ID fields via data-field attributes
        if (cfg.fields) {
          Object.keys(cfg.fields).forEach(function (key) {
            var newName = cfg.fields[key];
            var el = document.querySelector('[data-field="' + key + '"]');
            if (!el) return;
            if (!newName) {
              el.removeAttribute('name'); // gate-only: strip name so nothing is sent to SF
              return;
            }
            el.name = newName;
            el.id = newName;
          });
        }
      })
      .catch(function () {}); // silently ignore — form falls back to hardcoded defaults
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (org) {
      applyOrgConfig(org);
    } else {
      // No ?org= param — resolve default from presets.json _config
      fetch(presetsURL)
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var envCfg = data['_config'] || {};
          if (envCfg.sandbox === false) return; // prod: hardcoded HTML values are already prod — nothing to patch
          var defaultOrg = envCfg.sandbox_default || 'poolorg14';
          applyOrgConfig(defaultOrg);
        })
        .catch(function () {}); // silently ignore — form falls back to hardcoded defaults
    }
  });
})();

// Salesforce debug mode — add ?debug=1 to the form URL
// Adds the Web-to-Lead/Case debug fields: Salesforce then shows its debug page (fields received) instead of
// redirecting to retURL, and emails the details to debug_email from the active org config (configs/<org>.json).
// Without ?debug=1 nothing is added.
(function () {
  var params = new URLSearchParams(location.search);
  if (params.get('debug') !== '1') return;

  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var base = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) : '../';

  function setHidden(form, name, value) {
    var el = form.querySelector('[name="' + name + '"]');
    if (!el) {
      el = document.createElement('input');
      el.type = 'hidden';
      el.name = name;
      form.appendChild(el);
    }
    el.value = value;
  }

  // Same org resolution as the org config block: ?org= wins, else presets.json _config
  function resolveOrg() {
    if (params.get('org')) return Promise.resolve(params.get('org'));
    return fetch(base + 'presets.json')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var envCfg = data['_config'] || {};
        return envCfg.sandbox === false ? 'prod' : (envCfg.sandbox_default || 'poolorg14');
      });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('form');
    if (!form) return; // thank-you page

    setHidden(form, 'debug', '1');

    resolveOrg()
      .then(function (orgName) {
        return fetch(base + 'configs/' + orgName + '.json')
          .then(function (res) { return res.json(); })
          .then(function (cfg) {
            if (cfg.debug_email) setHidden(form, 'debugEmail', cfg.debug_email);
            console.info('[haas-forms] Salesforce debug mode on — org: ' + orgName +
              ', debugEmail: ' + (cfg.debug_email || '(none)'));
          });
      })
      .catch(function () {
        console.info('[haas-forms] Salesforce debug mode on — no debugEmail (org config unavailable)');
      });
  });
})();

// Template CSS injection — runs immediately when script is parsed in <head>
(function () {
  var template = new URLSearchParams(location.search).get('template');
  if (!template) return;
  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var base = scriptSrc ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) : '../';
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = base + 'templates/' + template + '.css';
  document.head.appendChild(link);

  // Append template param to retURL so the thank-you page uses the same theme
  document.addEventListener('DOMContentLoaded', function () {
    var retInput = document.querySelector('[name="retURL"]');
    if (retInput && retInput.value) {
      var sep = retInput.value.indexOf('?') >= 0 ? '&' : '?';
      retInput.value = retInput.value + sep + 'template=' + encodeURIComponent(template);
    }
  });
})();

(function () {
  var allowedTypes = ['text', 'email', 'tel', 'textarea', 'select-one'];

  // Capture the script's own URL now (currentScript is only available during parse)
  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var presetsURL = scriptSrc
    ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) + 'presets.json'
    : '../presets.json';

  // Maps human-readable preset keys to Salesforce field name attributes
  var fieldAliases = {
    'lead_source_detail': '00N2p0000097UMz',
    'campaign_name':      '00NVi00000F3KbC'
  };

  function applyPreset(preset) {
    Object.keys(preset).forEach(function (key) {
      var value = preset[key];
      if (!value) return;
      var sfName = fieldAliases[key] || key;
      var field = document.querySelector('[name="' + sfName + '"]');
      if (field) field.value = value;
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var params = new URLSearchParams(window.location.search);

    // 1. Pre-populate visible fields from individual URL query params
    params.forEach(function (value, key) {
      if (key === 'campaign') return; // reserved — handled below
      var field = document.querySelector('[name="' + key + '"]');
      if (field && allowedTypes.includes(field.type)) {
        field.value = value;
      }
    });

    // 2. Resolve preset key: ?campaign=X takes priority, then last URL path segment
    var pathSegments = window.location.pathname.split('/').filter(function (s) {
      return s && s !== 'index.html';
    });
    var lastSegment = pathSegments[pathSegments.length - 1] || '';
    var presetKey = params.get('campaign') || lastSegment;

    if (!presetKey) return;

    fetch(presetsURL)
      .then(function (res) { return res.json(); })
      .then(function (presets) {
        var preset = presets[presetKey];
        if (!preset) return; // unknown slug — do nothing
        applyPreset(preset);
      })
      .catch(function () {}); // silently ignore if presets.json unavailable
  });
})();

// Branch config — patches privacy policy checkbox label at runtime
// Usage: add ?branch=betatech (or any key defined under "_branches" in presets.json)
(function () {
  var company = new URLSearchParams(location.search).get('branch') || 'jih';

  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var presetsURL = scriptSrc
    ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) + 'presets.json'
    : '../presets.json';

  document.addEventListener('DOMContentLoaded', function () {
    fetch(presetsURL)
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var companies = data['_branches'];
        if (!companies) return;
        var cfg = companies[company];
        if (!cfg) return;

        // Find privacy checkbox label: first .checkbox-label that contains an <a>
        var privacyLabel = null;
        var labels = document.querySelectorAll('.checkbox-label');
        for (var i = 0; i < labels.length; i++) {
          if (labels[i].querySelector('a')) { privacyLabel = labels[i]; break; }
        }
        if (!privacyLabel) return;

        var legend   = cfg.legend    || '';
        var linkText = cfg.link_text || 'Privacy Policy';
        var linkUrl  = cfg.link_url  || '#';
        privacyLabel.innerHTML =
          legend +
          '<a href="' + linkUrl + '" target="_blank">' + linkText + '</a>. *';
      })
      .catch(function () {});
  });
})();

// Parent-site conversion tracking (GTM) — see vercel-form-gtm-handover.md
// Form page: when the iframe URL has ?form_id=, tracking params are appended to retURL on submit.
// Thank-you page: when those params are present and we're inside an iframe, notify the parent via postMessage.
// Without ?form_id= nothing changes: same Salesforce payload, same retURL, no message.
(function () {
  // PRE-RELEASE: trim to production parent origins only (www.johnihaas.com + confirmed Webflow/WordPress prod domains)
  var ALLOWED_PARENT_ORIGINS = [
    'https://www.johnihaas.com',
    'https://johnihaas.com',
    'https://jih-marketing-forms.vercel.app',                     // parent.html test page
    'https://jih-marketing-forms-git-staging-john-i-haas.vercel.app',
    'https://haasstage.wpengine.com',                               // client WordPress staging
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:8080',
    'http://127.0.0.1:5501',
    'http://localhost:3000'
    // TODO: add WordPress / Webflow staging origins once confirmed
  ];
  var MESSAGE_SOURCE = 'haas-marketing-forms';

  var params = new URLSearchParams(location.search);

  function newSubmissionId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // ── Form page: point retURL at this deployment's own thank-you page ──
  // The HTML hard-codes the prod host; on staging/preview/localhost the visitor should land on
  // the thank-you page of the same instance. Only rewrites our own /thankyou.html, keeps path + query.
  function useSameOriginThankYou() {
    var retInput = document.querySelector('[name="retURL"]');
    if (!retInput || !retInput.value) return;
    if (location.protocol !== 'https:' && location.protocol !== 'http:') return; // file:// — keep hard-coded value
    var url = new URL(retInput.value);
    if (!/\/thankyou\.html$/.test(url.pathname)) return;
    if (url.origin === location.origin) return;
    retInput.value = location.origin + url.pathname + url.search + url.hash;
  }

  // ── Form page: carry tracking metadata through the Salesforce redirect ──
  function attachRetURLTracking() {
    var form = document.querySelector('form');
    var retInput = document.querySelector('[name="retURL"]');
    if (!form || !retInput) return; // not a form page (e.g. thankyou.html)

    var formId = params.get('form_id');
    if (!formId) {
      console.warn('[haas-forms] No ?form_id= in the iframe URL — parent conversion tracking is disabled for this form.');
      return;
    }

    var formType = document.querySelector('[name="orgid"]') ? 'case' : 'lead';
    var campaign = params.get('campaign');

    form.addEventListener('submit', function () {
      try {
        var url = new URL(retInput.value);
        url.searchParams.set('form_id', formId);
        url.searchParams.set('form_type', formType);
        if (campaign) url.searchParams.set('campaign', campaign);
        url.searchParams.set('sid', newSubmissionId());
        retInput.value = url.toString();
      } catch (e) {
        console.warn('[haas-forms] Could not add tracking params to retURL — submitting without tracking.', e);
      }
    });
  }

  // ── Thank-you page: notify the parent site ──
  function pickTargetOrigins() {
    // Prefer the real parent origin where the browser exposes it (Chrome, Safari, Edge)
    if (location.ancestorOrigins && location.ancestorOrigins.length) {
      var parentOrigin = location.ancestorOrigins[0];
      if (ALLOWED_PARENT_ORIGINS.indexOf(parentOrigin) >= 0) return [parentOrigin];
      console.warn('[haas-forms] Parent origin ' + parentOrigin + ' is not in the allowlist — no conversion message sent.');
      return [];
    }
    // Firefox: post to every allowed origin — the browser only delivers to the one that matches
    return ALLOWED_PARENT_ORIGINS;
  }

  function notifyParentOfSubmission() {
    var sid = params.get('sid');
    var formId = params.get('form_id');
    if (!sid || !formId) return; // untracked submission or direct visit
    if (window.parent === window) return; // not embedded

    var sentKey = 'haas-forms-sent-' + sid;
    try { if (sessionStorage.getItem(sentKey)) return; } catch (e) {} // reload of thank-you page

    var formType = params.get('form_type');
    var message = {
      source: MESSAGE_SOURCE,
      message_type: 'form_submission',
      version: 1,
      status: 'success',
      form_id: formId,
      form_type: formType === 'case' ? 'case' : 'lead',
      campaign: params.get('campaign') || null,
      submission_id: sid
    };

    pickTargetOrigins().forEach(function (origin) {
      try { window.parent.postMessage(message, origin); } catch (e) {}
    });

    try { sessionStorage.setItem(sentKey, '1'); } catch (e) {}
  }

  document.addEventListener('DOMContentLoaded', function () {
    try {
      useSameOriginThankYou();
      attachRetURLTracking();
      notifyParentOfSubmission();
    } catch (e) {
      console.warn('[haas-forms] Conversion tracking error — form behaviour is unaffected.', e);
    }
  });
})();
