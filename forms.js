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
