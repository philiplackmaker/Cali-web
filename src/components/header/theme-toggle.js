// <theme-toggle>: the light/dark switch in the header. Until it's pressed, the site follows
// the device (prefers-color-scheme). Pressing it picks the other mode and remembers it in
// localStorage ("ds-theme"); the inline script in base.njk applies that before first paint.
// Colours themselves are design tokens: tokens/themes/dark.json → tokens-dark.css.
const KEY = 'ds-theme';
const deviceDark = matchMedia('(prefers-color-scheme: dark)');

function saved() {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

const isDark = () => {
  const choice = document.documentElement.dataset.theme;
  return choice ? choice === 'dark' : deviceDark.matches;
};

class ThemeToggle extends HTMLElement {
  connectedCallback() {
    this.button = this.querySelector('button');
    this.button.addEventListener('click', () => this.choose(isDark() ? 'light' : 'dark'));
    deviceDark.addEventListener('change', () => this.render());
    this.hidden = false;
    this.render();
  }

  choose(theme) {
    document.documentElement.dataset.theme = theme;
    try {
      // Matching the device again? Then just follow the device from now on.
      if ((theme === 'dark') === deviceDark.matches) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, theme);
    } catch {
      // Private mode: works for this page only.
    }
    if (!saved()) delete document.documentElement.dataset.theme;
    this.render();
  }

  render() {
    this.button.setAttribute('aria-pressed', String(isDark()));
  }
}

customElements.define('theme-toggle', ThemeToggle);
