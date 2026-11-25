// Classic (non-module) script: if the platform modules fail to load (CDN/network),
// replace the endless spinner with a clear message. Never reveals any content.
(function () {
  setTimeout(function () {
    var boot = document.getElementById('af-boot');
    if (!boot || boot.classList.contains('is-done')) return;
    var en = (localStorage.getItem('af.lang') || 'ru') === 'en';
    var p = boot.querySelector('.af-boot__text');
    if (p) p.textContent = en ? 'Could not load the platform. Check your connection.' : 'Не удалось загрузить платформу. Проверьте соединение.';
    var b = document.createElement('button');
    b.type = 'button'; b.textContent = en ? 'Reload' : 'Обновить';
    b.style.cssText = 'margin-top:14px;padding:10px 20px;border-radius:999px;background:#f5f2ed;color:#0a0908;font:600 13px Inter,sans-serif;border:0;cursor:pointer';
    b.onclick = function () { location.reload(); };
    boot.querySelector('.af-boot__core').appendChild(b);
  }, 15000);
})();
