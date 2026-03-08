/* Leaflet map initialization and rendering. */

var AppMap = {
  map: null,
  markers: null,
  boundaryLoaded: false,

  initMap: function() {
    if (AppMap.map) return;
    AppMap.map = L.map('map').setView([42.32, -71.08], 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 18,
    }).addTo(AppMap.map);

    // Load boundary from API
    fetch('/api/boundary')
      .then(function(res) { return res.json(); })
      .then(function(bostonHoles) {
        var maskRings = [[-90, -180], [90, -180], [90, 180], [-90, 180]];
        var allRings = [maskRings, bostonHoles[0], bostonHoles[1]];
        L.polygon(allRings, { stroke: false, fillColor: '#f5f7fa', fillOpacity: 0.6, interactive: false }).addTo(AppMap.map);
        L.polyline(bostonHoles[0], { color: '#1a3a5c', weight: 2.5, opacity: 0.7, interactive: false }).addTo(AppMap.map);
        L.polyline(bostonHoles[1], { color: '#1a3a5c', weight: 2.5, opacity: 0.7, interactive: false }).addTo(AppMap.map);
        AppMap.boundaryLoaded = true;
      });
  },

  renderMap: function(filtered) {
    var num = AppConfig.num;
    var esc = AppConfig.escapeHtml;
    var fractionColor = AppConfig.fractionColor;

    AppMap.initMap();

    if (AppMap.markers) AppMap.map.removeLayer(AppMap.markers);
    AppMap.markers = L.markerClusterGroup({
      maxClusterRadius: 40,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: function(cluster) {
        var count = cluster.getChildCount();
        var dim = 36;
        if (count > 50) dim = 52;
        else if (count > 20) dim = 44;
        return L.divIcon({
          html: '<div style="background:#1a3a5c;color:#fff;border-radius:50%;width:' + dim + 'px;height:' + dim + 'px;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">' + count + '</div>',
          className: '',
          iconSize: [dim, dim]
        });
      }
    });

    filtered.forEach(function(r) {
      var lat = parseFloat(r.Latitude);
      var lng = parseFloat(r.Longitude);
      if (!lat || !lng) return;

      var restricted = num(r['Total Income-Restricted']);
      var total = num(r.TtlProjUnits);
      var frac = total > 0 ? restricted / total : 0;
      var size = Math.max(6, Math.min(20, 6 + Math.sqrt(restricted)));
      var color = fractionColor(frac);

      var circle = L.circleMarker([lat, lng], {
        radius: size, fillColor: color, color: '#fff', weight: 1.5, opacity: 1, fillOpacity: 0.85
      });

      var pct = Math.round(frac * 100);
      var pp = r['Public/ Private'] || '';
      var ppLabel = pp.indexOf('/') >= 0 ? 'Public-Private' : pp;
      var ppBg = pp === 'Public' ? '#e3f2fd' : pp === 'Private' ? '#e0e0e0' : '#e8eaf6';
      var ppFg = pp === 'Public' ? '#1565c0' : pp === 'Private' ? '#555' : '#283593';
      var tagHtml = '<span style="display:inline-block;background:' + ppBg + ';color:' + ppFg + ';font-size:11px;font-weight:600;padding:1px 6px;border-radius:8px;margin-right:4px;">' + esc(ppLabel) + '</span>';
      if (r['Includes Senior Units?'] === 'Y') tagHtml += '<span style="display:inline-block;background:#fff8e1;color:#f57f17;font-size:11px;font-weight:600;padding:1px 6px;border-radius:8px;margin-right:4px;">Senior</span>';
      if (r['Section 8'] === 'Y') tagHtml += '<span style="display:inline-block;background:#fce4ec;color:#c62828;font-size:11px;font-weight:600;padding:1px 6px;border-radius:8px;">Section 8</span>';

      var barColor = fractionColor(frac);
      circle.bindPopup(
        '<strong>' + esc(r.Project_Name) + '</strong><br>' +
        '<span style="color:#666;">' + esc(r.Neighborhood) + ' &middot; ' + esc(r.Tenure) + '</span><br>' +
        '<div style="background:#e0e0e0;border-radius:4px;height:8px;margin:6px 0 4px;overflow:hidden;">' +
          '<div style="background:' + barColor + ';height:100%;width:' + pct + '%;border-radius:4px;"></div>' +
        '</div>' +
        '<strong>' + pct + '%</strong> restricted (' + restricted + ' of ' + total + ' units)' +
        (tagHtml ? '<br style="margin-top:4px;">' + tagHtml : '')
      );
      AppMap.markers.addLayer(circle);
    });

    AppMap.map.addLayer(AppMap.markers);

    if (filtered.length <= 10) {
      var bounds = [];
      AppMap.markers.eachLayer(function(layer) {
        if (layer.getLatLng) bounds.push(layer.getLatLng());
      });
      if (bounds.length) AppMap.map.fitBounds(bounds, { padding: [60, 60], maxZoom: 15 });
    }
    setTimeout(function() { AppMap.map.invalidateSize(); }, 100);
  }
};
