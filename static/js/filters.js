/* Filter logic and dropdown population. */

var AppFilters = {
  populateFilters: function(data) {
    var hoods = [...new Set(data.map(function(r) { return r.Neighborhood; }))].filter(Boolean).sort();
    var tenures = [...new Set(data.map(function(r) { return r.Tenure; }))].filter(Boolean).sort();
    var pp = [...new Set(data.map(function(r) { return r['Public/ Private']; }))].filter(Boolean).sort();

    var hoodSel = document.getElementById('neighborhood');
    hoods.forEach(function(h) { var o = document.createElement('option'); o.value = h; o.textContent = h; hoodSel.appendChild(o); });

    var tenSel = document.getElementById('tenure');
    tenures.forEach(function(t) { var o = document.createElement('option'); o.value = t; o.textContent = t; tenSel.appendChild(o); });

    var ppSel = document.getElementById('pubpriv');
    pp.forEach(function(p) { var o = document.createElement('option'); o.value = p; o.textContent = p; ppSel.appendChild(o); });
  },

  fuzzyMatch: function(record, query) {
    if (!query) return true;
    var haystack = (record.Project_Name + ' ' + record.Neighborhood + ' ' + record['Zip Code']).toLowerCase();
    var words = query.toLowerCase().split(/\s+/).filter(Boolean);
    return words.every(function(w) { return haystack.includes(w); });
  },

  getFiltered: function(data, sortCol, sortAsc) {
    var search = document.getElementById('search').value.toLowerCase();
    var hood = document.getElementById('neighborhood').value;
    var tenure = document.getElementById('tenure').value;
    var pp = document.getElementById('pubpriv').value;
    var senior = document.getElementById('senior').checked;
    var sec8 = document.getElementById('section8').checked;
    var columns = AppConfig.columns;

    var filtered = data.filter(function(r) {
      if (search && !AppFilters.fuzzyMatch(r, search)) return false;
      if (hood && r.Neighborhood !== hood) return false;
      if (tenure && r.Tenure !== tenure) return false;
      if (pp && r['Public/ Private'] !== pp) return false;
      if (senior && r['Includes Senior Units?'] !== 'Y') return false;
      if (sec8 && r['Section 8'] !== 'Y') return false;
      return true;
    });

    if (sortCol !== null) {
      var col = columns[sortCol];
      filtered.sort(function(a, b) {
        var va = a[col.key] || '', vb = b[col.key] || '';
        if (col.numeric) {
          va = AppConfig.num(va);
          vb = AppConfig.num(vb);
          return sortAsc ? va - vb : vb - va;
        }
        return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va);
      });
    }
    return filtered;
  }
};
