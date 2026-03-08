/* Main application entry point. */

var App = {
  data: [],
  sortCol: null,
  sortAsc: true,
  currentView: 'map',

  init: function() {
    fetch('/api/housing')
      .then(function(res) { return res.json(); })
      .then(function(rows) {
        App.data = rows;
        AppFilters.populateFilters(rows);
        AppFuzzy.initFuse(rows);
        AppTable.renderHeader(App.sortCol, App.sortAsc);
        App.render();
      });

    // Wire up filter events
    document.querySelectorAll('.filters input[type=text], .filters select').forEach(function(el) {
      el.addEventListener('input', App.render);
    });
    document.querySelectorAll('.toggle-btn').forEach(function(label) {
      label.addEventListener('click', function() {
        var cb = label.querySelector('input[type=checkbox]');
        cb.checked = !cb.checked;
        label.classList.toggle('active', cb.checked);
        App.render();
      });
    });
  },

  render: function() {
    var filtered = AppFilters.getFiltered(App.data, App.sortCol, App.sortAsc);
    var search = document.getElementById('search').value.trim();

    App.renderStats(filtered);
    document.getElementById('result-count').textContent = 'Showing ' + filtered.length + ' of ' + App.data.length + ' projects';

    // Show fuzzy suggestions when search has no exact matches
    if (filtered.length === 0 && search.length > 0) {
      document.getElementById('table-view').style.display = 'none';
      document.getElementById('map').style.display = 'none';
      AppFuzzy.renderFuzzyPanel(search);
      return;
    } else {
      document.getElementById('fuzzy-panel').style.display = 'none';
      if (App.currentView === 'table') {
        document.getElementById('table-view').style.display = 'block';
        document.getElementById('map').style.display = 'none';
      } else {
        document.getElementById('table-view').style.display = 'none';
        document.getElementById('map').style.display = 'block';
      }
    }

    if (App.currentView === 'map') {
      AppMap.renderMap(filtered);
    } else {
      AppTable.renderTable(filtered);
    }
  },

  renderStats: function(rows) {
    var num = AppConfig.num;
    var totalProjects = rows.length;
    var totalUnits = rows.reduce(function(s, r) { return s + num(r.TtlProjUnits); }, 0);
    var restrictedUnits = rows.reduce(function(s, r) { return s + num(r['Total Income-Restricted']); }, 0);
    var neighborhoods = new Set(rows.map(function(r) { return r.Neighborhood; })).size;
    document.getElementById('stats').innerHTML =
      '<div class="stat-card"><div class="label">Projects</div><div class="value">' + totalProjects.toLocaleString() + '</div></div>' +
      '<div class="stat-card"><div class="label">Total Units</div><div class="value">' + totalUnits.toLocaleString() + '</div></div>' +
      '<div class="stat-card"><div class="label">Income-Restricted</div><div class="value">' + restrictedUnits.toLocaleString() + '</div></div>' +
      '<div class="stat-card"><div class="label">Neighborhoods</div><div class="value">' + neighborhoods + '</div></div>';
  },

  setView: function(view) {
    App.currentView = view;
    document.getElementById('btn-table').classList.toggle('active', view === 'table');
    document.getElementById('btn-map').classList.toggle('active', view === 'map');
    document.getElementById('table-view').style.display = view === 'table' ? 'block' : 'none';
    document.getElementById('map').style.display = view === 'map' ? 'block' : 'none';
    App.render();
  },

  sortBy: function(i) {
    if (App.sortCol === i) App.sortAsc = !App.sortAsc;
    else { App.sortCol = i; App.sortAsc = true; }
    AppTable.renderHeader(App.sortCol, App.sortAsc);
    App.render();
  },

  selectFuzzyResult: function(name) {
    AppFuzzy.selectFuzzyResult(name);
  }
};

document.addEventListener('DOMContentLoaded', App.init);
