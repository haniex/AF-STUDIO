// =====================================================================
// AF STUDIO — public runtime config.
// The anon key is PUBLIC by design (protected by RLS). NEVER put the
// service_role key or any AI key here.
// =====================================================================
export const CONFIG = {
  SUPABASE_URL: 'https://iotgzyfqvsuefpqyhvrn.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_FZ7S_BL2m511mfRwRydFOg_uQHKtnCO',
  // Public URL of THIS site (email confirmation / reset links). Empty = detected automatically
  // from the address the site is opened at, so it works under any repository name or domain.
  SITE_URL: '',
  FEATURES: {
    googleOAuth: false,       // set true after enabling Google provider in Supabase Auth
  },
  LIMITS: {
    uploadMB: 50,
    avatarMB: 2,
    imageMB: 15,
  },
  CONTACTS: {
    email: 'enemy1032@gmail.com',
    telegram: 'uguro',
    phone: '+7 902 902-67-69',
  },
};

export const isConfigured = () =>
  !CONFIG.SUPABASE_URL.includes('YOUR-PROJECT') && !CONFIG.SUPABASE_ANON_KEY.includes('YOUR-');

const detectedBase = () => location.origin + location.pathname.replace(/[^/]*$/, '');
export const siteUrl = (path = '') => (CONFIG.SITE_URL || detectedBase()).replace(/\/$/, '') + '/' + path.replace(/^\//, '');
