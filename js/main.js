// AF STUDIO — entry point. Nothing of the platform is rendered until the
// session is verified by Supabase Auth on the server.
import { isConfigured } from './config.js';
import { bootstrap, auth } from './core/auth.js';
import { t, applyI18n } from './core/i18n.js';
import { initTheme, applyTheme } from './core/theme.js';
import { route, startRouter, stopRouter } from './core/router.js';
import { $, reducedMotion } from './core/ui.js';
import { applyPrefs } from './core/prefs.js';
import { initFx } from './core/fx.js';
import { loadPreferences, getPreferences, clearPreferences, applySnapshot } from './core/preferences.js';
import { clearUsage } from './core/ai-usage.js';

const ROUTES = [
  ['/overview', () => import('./views/overview.js'), 'nav.overview'],
  ['/portfolio', () => import('./views/portfolio.js'), 'nav.portfolio'],
  ['/portfolio/:id', () => import('./views/portfolio.js'), 'nav.portfolio'],
  ['/services', () => import('./views/services.js'), 'nav.services'],
  ['/ai', () => import('./views/ai.js'), 'nav.ai'],
  ['/ai/:id', () => import('./views/ai.js'), 'nav.ai'],
  ['/builder', () => import('./views/builder.js'), 'nav.builder'],
  ['/calculator', () => import('./views/calculator.js'), 'nav.calculator'],
  ['/lab', () => import('./views/lab.js'), 'nav.lab'],
  ['/projects', () => import('./views/projects.js'), 'nav.projects'],
  ['/projects/:id', () => import('./views/project-detail.js'), 'nav.projects'],
  ['/files', () => import('./views/files.js'), 'nav.files'],
  ['/messages', () => import('./views/messages.js'), 'nav.messages'],
  ['/messages/:id', () => import('./views/messages.js'), 'nav.messages'],
  ['/favorites', () => import('./views/favorites.js'), 'nav.favorites'],
  ['/moodboard', () => import('./views/moodboard.js'), 'nav.moodboard'],
  ['/moodboard/:id', () => import('./views/moodboard.js'), 'nav.moodboard'],
  ['/notifications', () => import('./views/notifications.js'), 'nav.notifications'],
  ['/settings', () => import('./views/settings.js'), 'nav.settings'],
];
ROUTES.forEach(([p, l, title]) => route(p, l, { title }));

const boot = $('#af-boot');
const authRoot = $('#af-auth');
const appRoot = $('#af-app');
let shell = null; let access = null;

function hideBoot() {
  if (!boot) return;
  boot.classList.add('is-done');
  setTimeout(() => boot.remove(), reducedMotion() ? 0 : 700);
}

async function showAccess(opts = {}) {
  appMounted = false;
  if (shell) { stopRouter(); shell.unmountShell(); shell = null; }
  appRoot.hidden = true; appRoot.innerHTML = '';
  access = access || (await import('./auth/access.js'));
  authRoot.hidden = false;
  access.mountAccess(authRoot, { ...opts, onEnter: () => showApp() });
  hideBoot();
}

let appMounted = false;
async function showApp() {
  if (!auth.user) return showAccess();
  if (appMounted) return;
  appMounted = true;
  if (access) access.unmountAccess();
  authRoot.hidden = true;
  if (auth.profile?.theme) applyTheme(auth.profile.theme);
  // 3.0: account preferences (appearance, workspace…) before the shell is painted.
  // Never blocks access: on failure/timeout defaults are used and Settings offers a retry.
  await Promise.race([loadPreferences(auth.user.id), new Promise((r) => setTimeout(r, 3500))]);
  if (!auth.user) return; // signed out meanwhile — the signedout handler already showed AF Access
  shell = shell || (await import('./app/shell.js'));
  import('./components/account-menu.js').then((m) => m.rememberAccount()).catch(() => {});
  appRoot.hidden = false;
  const view = shell.mountShell(appRoot);
  const back = sessionStorage.getItem('af.returnTo');
  sessionStorage.removeItem('af.returnTo');
  if (back && /^#\/[\w\-/?=&%.]*$/.test(back) && back !== location.hash) history.replaceState(null, '', back);
  // Start page applies ONLY when the platform is opened without an explicit route
  // (direct links, returnTo after sign-in, recovery links and reloads keep their route).
  if (!location.hash || location.hash === '#') {
    const sp = getPreferences().workspace.start_page;
    history.replaceState(null, '', '#/' + (['overview', 'projects', 'ai', 'portfolio'].includes(sp) ? sp : 'overview'));
  }
  startRouter(view, {
    onRouteChange: (r) => shell.setActive(location.hash.replace(/^#/, '').split('?')[0], r.meta.title),
    onAccessDenied: () => showAccess(),
  });
  hideBoot();
  if (window.gsap && !reducedMotion()) window.gsap.fromTo(appRoot, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
}

document.addEventListener('click', (e) => { if (e.target.closest('[data-reload]')) location.reload(); });

(async function start() {
  initTheme();
  applyPrefs();
  applySnapshot(); // visual hint only (no flash); replaced by server data after sign-in
  initFx();
  applyI18n(document);
  if (location.hash.startsWith('#/')) sessionStorage.setItem('af.returnTo', location.hash);
  $('#af-boot-text') && ($('#af-boot-text').textContent = t('boot.checking'));
  if (!isConfigured()) return showAccess({ initialMode: 'setup' });

  let res;
  try { res = await bootstrap(); }
  catch (e) { console.error(e); return showAccess({ message: { type: 'err', text: t('errors.network') } }); }

  auth.on('signedout', () => { clearPreferences(); clearUsage(); showAccess(); });
  auth.on('recovery', () => showAccess({ initialMode: 'reset' }));
  auth.on('signedin', () => { if (!shell) showApp(); });

  if (res.recovery) return showAccess({ initialMode: 'reset' });
  if (res.user) return showApp();
  if (res.urlError) return showAccess({ message: { type: 'err', text: t(res.urlError) } });
  if (res.flow === 'confirm') return showAccess({ message: { type: 'ok', text: t('access.confirmed') } });
  return showAccess();
})();
