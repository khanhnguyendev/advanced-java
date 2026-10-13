/** Pre-hydration script: applies the saved theme before first paint. Shared by every root layout. */
export const themeScript =
  "try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}";
