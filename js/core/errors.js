// ---------------------------------------------------------------------
// Error mapping: never show raw Supabase/GoTrue messages to users
// ---------------------------------------------------------------------
export function authErrorKey(err) {
  if (!err) return 'errors.generic';
  const code = String(err.code || err.error_code || '').toLowerCase();
  const msg = String(err.message || err.error_description || err).toLowerCase();
  const status = err.status;
  if (code === 'invalid_credentials' || msg.includes('invalid login')) return 'errors.invalid_credentials';
  if (code === 'email_not_confirmed' || msg.includes('not confirmed')) return 'errors.email_not_confirmed';
  if (code === 'user_already_exists' || code === 'email_exists' || msg.includes('already registered')) return 'errors.user_already_exists';
  if (code === 'weak_password' || msg.includes('weak') || msg.includes('password should')) return 'errors.weak_password';
  if (code === 'same_password' || msg.includes('different from the old')) return 'errors.same_password';
  if (code.startsWith('over_') || status === 429 || msg.includes('rate limit') || msg.includes('too many')) return 'errors.rate_limited';
  if (code === 'signup_disabled') return 'errors.signup_disabled';
  if (code === 'otp_expired' || code === 'flow_state_expired' || code === 'flow_state_not_found' || msg.includes('expired') || msg.includes('code verifier')) return 'errors.link_expired';
  if (code === 'session_not_found' || code === 'refresh_token_not_found' || msg.includes('jwt')) return 'errors.session_expired';
  if (msg.includes('fetch') || msg.includes('network') || msg.includes('failed to send')) return 'errors.network';
  if (code === '42501' || msg.includes('forbidden') || msg.includes('row-level security')) return 'errors.forbidden';
  if (msg.includes('rate_limited')) return 'errors.rate_limited';
  return 'errors.generic';
}
