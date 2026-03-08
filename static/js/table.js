/* Table rendering and sorting. */

var AppTable = {
  renderHeader: function(sortCol, sortAsc) {
    var columns = AppConfig.columns;
    document.getElementById('thead').innerHTML = '<tr>' + columns.map(function(c, i) {
      var sorted = sortCol === i;
      var arrow = sorted ? (sortAsc ? ' &#9650;' : ' &#9660;') : ' &#9650;';
      return '<th class="' + (sorted ? 'sorted' : '') + '" onclick="App.sortBy(' + i + ')">' +
        c.label + '<span class="sort-arrow">' + arrow + '</span></th>';
    }).join('') + '</tr>';
  },

  renderTable: function(filtered) {
    var tbody = document.getElementById('tbody');
    var num = AppConfig.num;
    var esc = AppConfig.escapeHtml;

    if (!filtered.length) {
      tbody.innerHTML = '<tr><td colspan="10" class="no-results">No matching projects found.</td></tr>';
      return;
    }

    tbody.innerHTML = filtered.map(function(r) {
      return '<tr>' +
        '<td><strong>' + esc(r.Project_Name) + '</strong></td>' +
        '<td>' + esc(r.Neighborhood) + '</td>' +
        '<td>' + esc(r['Zip Code']) + '</td>' +
        '<td>' + num(r.TtlProjUnits).toLocaleString() + '</td>' +
        '<td>' + num(r['Total Income-Restricted']).toLocaleString() + '</td>' +
        '<td>' + num(r.TtlMarket).toLocaleString() + '</td>' +
        '<td><span class="badge ' + AppConfig.badgeFor(r.Tenure) + '">' + esc(r.Tenure) + '</span></td>' +
        '<td><span class="badge ' + (r['Public/ Private'] === 'Public' ? 'badge-public' : 'badge-private') + '">' + esc(r['Public/ Private']) + '</span></td>' +
        '<td>' + (r['Includes Senior Units?'] === 'Y' ? '<span class="badge badge-senior">Senior</span>' : '') + '</td>' +
        '<td>' + (r['Section 8'] === 'Y' ? '<span class="badge badge-section8">Sec 8</span>' : '') + '</td>' +
        '</tr>';
    }).join('');
  }
};
