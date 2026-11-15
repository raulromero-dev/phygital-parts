const STORAGE_KEY = 'phygital-theme';

// Theme is a browser preference, separate from exported hardware projects.
// Follow the OS until the user chooses; storage can be unavailable in private tabs.
export function mountThemeToggle(button, onChange) {
  const system = matchMedia('(prefers-color-scheme: dark)');
  let preference;
  try { preference = localStorage.getItem(STORAGE_KEY); } catch { /* use OS */ }
  const valid = value => value === 'dark' || value === 'light';
  function apply() {
    const theme = valid(preference) ? preference : system.matches ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#000000' : '#ffffff';
    const action = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;
    button.setAttribute('aria-label', action);
    button.title = action;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    onChange(theme);
  }
  button.onclick = () => {
    preference = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem(STORAGE_KEY, preference); } catch { /* still apply */ }
    apply();
  };
  system.addEventListener('change', () => { if (!valid(preference)) apply(); });
  window.addEventListener('storage', event => {
    if (event.key === STORAGE_KEY || event.key === null) { preference = event.newValue; apply(); }
  });
  apply();
}
