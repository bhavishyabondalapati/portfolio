// Picks the colour theme before the first paint, so the page never flashes the wrong one.
// Order: ?theme=light|dark in the address, then the visitor's last choice, then the system setting.
// The same string is inlined into <head>.

export const THEME_KEY = "survey-theme";

export const themeScript =
  "(function(){var d=document.documentElement;try{" +
  "var theme=null;try{theme=localStorage.getItem('" + THEME_KEY + "')}catch(e){}" +
  "var t=/[?&]theme=(light|dark)/.exec(location.search);if(t)theme=t[1];" +
  "d.dataset.theme=theme||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');" +
  "}catch(e){d.dataset.theme='light'}})();";
