/* Fuzzy search panel with Fuse.js and mini-map. */

var AppFuzzy = {
  fuse: null,
  fuzzyMap: null,
  fuzzyMarkers: null,

  initFuse: function(data) {
    AppFuzzy.fuse = new Fuse(data, {
      keys: [
        { name: 'Project_Name', weight: 0.6 },
        { name: 'Neighborhood', weight: 0.3 },
        { name: 'Zip Code', weight: 0.1 }
      ],
      threshold: 0.5,
      includeScore: true,
      ignoreLocation: true,
      useExtendedSearch: false,
    });
  },

  renderFuzzyPanel: function(query) {
    var panel = document.getElementById('fuzzy-panel');
    var resultsDiv = document.getElementById('fuzzy-results');
    var num = AppConfig.num;
    var esc = AppConfig.escapeHtml;

    if (!query || !AppFuzzy.fuse) { panel.style.display = 'none'; return; }

    var results = AppFuzzy.fuse.search(query, { limit: 5 });
    if (!results.length) { panel.style.display = 'none'; return; }

    panel.style.display = 'block';

    resultsDiv.innerHTML = results.map(function(res) {
      var r = res.item;
      var conf = AppConfig.confidenceColor(res.score);
      var units = num(r['Total Income-Restricted']);
      var tags = [];
      if (r['Includes Senior Units?'] === 'Y') tags.push('Senior');
      if (r['Section 8'] === 'Y') tags.push('Sec 8');
      return '<div class="fuzzy-row" onclick="App.selectFuzzyResult(\'' + esc(r.Project_Name).replace(/'/g, "\\&#39;") + '\')">' +
        '<div class="fuzzy-confidence" style="background:' + conf.bg + '">' + conf.text + '</div>' +
        '<div class="fuzzy-details">' +
          '<div class="fuzzy-name">' + esc(r.Project_Name) + '</div>' +
          '<div class="fuzzy-meta">' + esc(r.Neighborhood) + ' &middot; ' + esc(r['Zip Code']) +
          ' &middot; ' + units + ' restricted / ' + num(r.TtlProjUnits) + ' total units' +
          ' &middot; ' + esc(r.Tenure) + ' &middot; ' + esc(r['Public/ Private']) +
          (tags.length ? ' &middot; ' + tags.join(', ') : '') +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    // Render mini fuzzy map
    if (!AppFuzzy.fuzzyMap) {
      AppFuzzy.fuzzyMap = L.map('fuzzy-map').setView([42.32, -71.08], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18,
      }).addTo(AppFuzzy.fuzzyMap);
    }
    if (AppFuzzy.fuzzyMarkers) AppFuzzy.fuzzyMap.removeLayer(AppFuzzy.fuzzyMarkers);
    AppFuzzy.fuzzyMarkers = L.layerGroup().addTo(AppFuzzy.fuzzyMap);

    var bounds = [];
    results.forEach(function(res, idx) {
      var r = res.item;
      var lat = parseFloat(r.Latitude);
      var lng = parseFloat(r.Longitude);
      if (!lat || !lng) return;
      var conf = AppConfig.confidenceColor(res.score);
      var circle = L.circleMarker([lat, lng], {
        radius: 12, fillColor: conf.bg, color: '#fff', weight: 2, opacity: 1, fillOpacity: 0.85
      });
      circle.bindPopup(
        '<strong>' + esc(r.Project_Name) + '</strong><br>' +
        esc(r.Neighborhood) + ' &middot; ' + esc(r['Zip Code']) + '<br>' +
        'Match confidence: <strong>' + conf.text + '</strong><br>' +
        'Restricted Units: ' + num(r['Total Income-Restricted']) + ' / ' + num(r.TtlProjUnits) + ' total'
      );
      circle.bindTooltip((idx + 1) + '', { permanent: true, direction: 'center', className: 'fuzzy-label' });
      circle.addTo(AppFuzzy.fuzzyMarkers);
      bounds.push([lat, lng]);
    });
    if (bounds.length) {
      AppFuzzy.fuzzyMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
    setTimeout(function() { AppFuzzy.fuzzyMap.invalidateSize(); }, 100);
  },

  selectFuzzyResult: function(name) {
    var ta = document.createElement('textarea');
    ta.innerHTML = name;
    var decoded = ta.value;
    document.getElementById('search').value = decoded;
    App.setView('map');
    App.render();
  }
};
