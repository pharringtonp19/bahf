/* Shared configuration and helper functions. */

var AppConfig = {
  columns: [
    { key: 'Project_Name', label: 'Project Name' },
    { key: 'Neighborhood', label: 'Neighborhood' },
    { key: 'Zip Code', label: 'Zip' },
    { key: 'TtlProjUnits', label: 'Total Units', numeric: true },
    { key: 'Total Income-Restricted', label: 'Restricted Units', numeric: true },
    { key: 'TtlMarket', label: 'Market Units', numeric: true },
    { key: 'Tenure', label: 'Tenure' },
    { key: 'Public/ Private', label: 'Public/Private' },
    { key: 'Includes Senior Units?', label: 'Senior' },
    { key: 'Section 8', label: 'Sec. 8' },
  ],

  num: function(v) {
    var n = parseInt(v, 10);
    return isNaN(n) ? 0 : n;
  },

  escapeHtml: function(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },

  badgeFor: function(tenure) {
    if (tenure.includes('/')) return 'badge-both';
    if (tenure.toLowerCase().includes('own')) return 'badge-ownership';
    return 'badge-rental';
  },

  fractionColor: function(frac) {
    var r = Math.round(206 + (49 - 206) * frac);
    var g = Math.round(191 + (27 - 191) * frac);
    var b = Math.round(237 + (146 - 237) * frac);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  },

  confidenceColor: function(score) {
    var pct = Math.round((1 - score) * 100);
    if (pct >= 80) return { bg: '#2e7d32', text: pct + '%' };
    if (pct >= 60) return { bg: '#558b2f', text: pct + '%' };
    if (pct >= 40) return { bg: '#f9a825', text: pct + '%' };
    if (pct >= 20) return { bg: '#ef6c00', text: pct + '%' };
    return { bg: '#c62828', text: pct + '%' };
  }
};
