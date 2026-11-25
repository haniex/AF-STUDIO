// Redirect legacy / unknown URLs into the protected SPA (the auth guard runs there).
(function () {
  var p = new URLSearchParams(location.search);
  var id = (p.get('id') || '').replace(/[^a-z0-9_-]/gi, '');
  var base = location.pathname.replace(/[^/]*$/, '');
  location.replace(base + 'index.html' + (id ? '#/portfolio/' + id : ''));
})();
