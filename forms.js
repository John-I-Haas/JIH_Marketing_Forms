// Org config — patches form action, oid, and custom field name/id attributes at runtime
// Usage: add ?org=poolorg14 (or any name matching a file in configs/) to the URL
(function () {
  var org = new URLSearchParams(location.search).get('org');
  if (!org) return;

  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var configBase = scriptSrc
    ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) + 'configs/'
    : '../configs/';

  document.addEventListener('DOMContentLoaded', function () {
    fetch(configBase + org + '.json')
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

        // Patch custom-ID fields via data-field attributes
        if (cfg.fields) {
          Object.keys(cfg.fields).forEach(function (key) {
            var newName = cfg.fields[key];
            if (!newName) return;
            var el = document.querySelector('[data-field="' + key + '"]');
            if (!el) return;
            el.name = newName;
            el.id = newName;
          });
        }
      })
      .catch(function () {}); // silently ignore — form falls back to hardcoded defaults
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
    'campaign_name':      '00N9M00000XtQID'
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
