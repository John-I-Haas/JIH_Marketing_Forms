(function () {
  var allowedTypes = ['text', 'email', 'tel', 'textarea', 'select-one'];

  // Capture the script's own URL now (currentScript is only available during parse)
  var scriptSrc = document.currentScript ? document.currentScript.src : '';
  var presetsURL = scriptSrc
    ? scriptSrc.substring(0, scriptSrc.lastIndexOf('/') + 1) + 'presets.json'
    : '../presets.json';

  function applyPreset(preset) {
    Object.keys(preset).forEach(function (key) {
      var value = preset[key];
      if (!value) return;

      if (key === 'Campaign_ID') {
        // Dynamically inject a hidden Campaign_ID field — only when preset defines one
        var existing = document.querySelector('[name="Campaign_ID"]');
        if (!existing) {
          var hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.name = 'Campaign_ID';
          document.querySelector('form').appendChild(hidden);
          existing = hidden;
        }
        existing.value = value;
      } else {
        var field = document.querySelector('[name="' + key + '"]');
        if (field) field.value = value;
      }
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
