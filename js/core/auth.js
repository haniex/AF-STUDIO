// AF STUDIO — centralized authentication & session state.
// A session is considered valid ONLY after Supabase Auth confirms the JWT
// on the server (auth.getUser). Mere presence of a token in storage is never trusted.
import { supabase, setRemember } from '../lib/supabase.js';
import { siteUrl } from '../config.js';
import { setLang } from './i18n.js';
import { authErrorKey } from './errors.js';

const state = { user: null, profile: null, isAdmin: false, ready: false, recovery: false };
const handlers = { signedin: new Set(), signedout: new Set(), recovery: new Set(), profile: new Set() };

export const auth = {
  get user() { return state.user; },
  get profile() { return state.profile; },
  get isAdmin() { return state.isAdmin; },
  get recovery() { return state.recovery; },
  on(evt, fn) { handlers[evt].add(fn); return () => handlers[evt].delete(fn); },
};
const emit = (evt, payload) => handlers[evt].forEach((fn) => { try { fn(payload); } catch (e) { console.error(e); } });

export { authErrorKey };

// ---------------------------------------------------------------------
// Profile & role (role is read from user_roles via server-side is_admin())
// ---------------------------------------------------------------------
async function loadProfile() {
  const uid = state.user?.id;
  if (!uid) return;
  const [{ data: profile }, { data: isAdmin }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.rpc('is_admin'),
  ]);
  state.profile = profile || { id: uid, full_name: state.user.user_metadata?.full_name || '', email: state.user.email, lang: 'ru', onboarded: false };
  state.isAdmin = isAdmin === true;
  if (profile?.lang && profile.lang !== localStorage.getItem('lang')) setLang(profile.lang);
}

export async function refreshProfile() { await loadProfile(); emit('profile', state.profile); return state.profile; }

export async function updateProfile(patch) {
  const allowed = ['full_name', 'avatar_path', 'lang', 'theme', 'notify_email', 'notify_inapp', 'onboarded'];
  const clean = Object.fromEntries(Object.entries(patch).filter(([k]) => allowed.includes(k)));
  const { data, error } = await supabase.from('profiles').update(clean).eq('id', state.user.id).select().single();
  if (error) throw error;
  state.profile = data; emit('profile', data);
  return data;
}

// ---------------------------------------------------------------------
// Boot: detect URL flows, verify session on the server, subscribe to changes
// ---------------------------------------------------------------------
export async function bootstrap() {
  const url = new URL(location.href);
  const flow = url.searchParams.get('flow');
  const urlError = url.searchParams.get('error_code') || url.searchParams.get('error') ||
    new URLSearchParams(location.hash.replace(/^#/, '')).get('error_code');

  supabase.auth.onAuthStateChange((event, session) => {
    // Defer: never await Supabase calls inside this callback (avoids client deadlocks).
    setTimeout(async () => {
      if (event === 'PASSWORD_RECOVERY') {
        state.recovery = true; state.user = session?.user || null; emit('recovery');
      } else if (event === 'SIGNED_OUT') {
        const was = !!state.user;
        state.user = null; state.profile = null; state.isAdmin = false; state.recovery = false;
        if (was) emit('signedout');
      } else if (event === 'SIGNED_IN' && session?.user && !state.recovery) {
        if (state.user?.id === session.user.id) return; // token refresh / tab focus
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) return;
        state.user = data.user; await loadProfile(); emit('signedin', { fresh: true });
      } else if (event === 'USER_UPDATED' && session?.user) {
        state.user = session.user;
      }
    }, 0);
  });

  // getSession() also completes PKCE code exchange when ?code= is present.
  const { data: { session } } = await supabase.auth.getSession();
  let user = null;
  if (session) {
    const { data, error } = await supabase.auth.getUser(); // server verification
    if (!error && data?.user) user = data.user;
    else await supabase.auth.signOut({ scope: 'local' });
  }

  // Clean auth params from the address bar
  if (url.searchParams.has('code') || flow || urlError) {
    ['code', 'flow', 'error', 'error_code', 'error_description', 'type'].forEach((k) => url.searchParams.delete(k));
    history.replaceState(null, '', url.pathname + (url.search || '') + (urlError ? '' : location.hash));
  }

  state.user = user;
  if (flow === 'recovery' && user) state.recovery = true;
  if (user && !state.recovery) await loadProfile();
  state.ready = true;
  return { user, flow, urlError: urlError ? 'errors.link_expired' : null, recovery: state.recovery };
}

// ---------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------
export async function signIn(email, password, remember = true) {
  setRemember(remember);
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) throw error;
  const { data: verified, error: vErr } = await supabase.auth.getUser();
  if (vErr || !verified?.user) throw vErr || new Error('session');
  state.user = verified.user; state.recovery = false;
  await loadProfile();
  return data;
}

export async function signUp({ name, email, password, lang }) {
  setRemember(true);
  const { data, error } = await supabase.auth.signUp({
    email: email.trim().toLowerCase(), password,
    options: { data: { full_name: name.trim(), lang }, emailRedirectTo: siteUrl('index.html?flow=confirm') },
  });
  if (error) throw error;
  // Supabase returns a user with empty identities when the email is already registered (anti-enumeration)
  if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    const e = new Error('already registered'); e.code = 'user_already_exists'; throw e;
  }
  if (data.session) {
    const { data: v } = await supabase.auth.getUser();
    state.user = v?.user || data.user; await loadProfile();
  }
  return { needsConfirmation: !data.session };
}

export async function resendConfirmation(email) {
  const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase(), options: { emailRedirectTo: siteUrl('index.html?flow=confirm') } });
  if (error) throw error;
}

export async function requestPasswordReset(email) {
  setRemember(true); // the PKCE verifier must survive opening the link in a new tab
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: siteUrl('index.html?flow=recovery') });
  if (error && authErrorKey(error) !== 'errors.generic') throw error; // don't reveal whether the email exists
}

export async function completePasswordReset(password) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw error;
  state.recovery = false;
  const { data } = await supabase.auth.getUser();
  state.user = data?.user || state.user;
  await loadProfile();
}

export async function signInWithGoogle() {
  setRemember(true);
  const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: siteUrl('index.html') } });
  if (error) throw error;
}

export async function changePassword(current, next) {
  const { error: e1 } = await supabase.auth.signInWithPassword({ email: state.user.email, password: current });
  if (e1) { const e = new Error('invalid'); e.code = 'invalid_credentials'; throw e; }
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
}

export async function changeEmail(email) {
  const { error } = await supabase.auth.updateUser({ email: email.trim().toLowerCase() }, { emailRedirectTo: siteUrl('index.html') });
  if (error) throw error;
}

export async function signOut(global = false) {
  try { await supabase.auth.signOut({ scope: global ? 'global' : 'local' }); }
  finally {
    // Defensive: wipe any AF auth tokens from both storages
    [localStorage, sessionStorage].forEach((s) => Object.keys(s).filter((k) => k.startsWith('af-studio-auth')).forEach((k) => s.removeItem(k)));
    const was = !!state.user;
    state.user = null; state.profile = null; state.isAdmin = false; state.recovery = false;
    if (was) emit('signedout');
  }
}

export const isOAuthOnly = () => {
  const p = state.user?.app_metadata?.providers || [state.user?.app_metadata?.provider];
  return Array.isArray(p) && !p.includes('email');
};
