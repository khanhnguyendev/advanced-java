import { Be_Vietnam_Pro, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';

// next/font needs literal option values: subsets cannot be spread from a shared constant
// serif/ui: only the latin subset is preloaded; next/font still emits @font-face for the other subsets, which are
// fetched lazily (unicode-range) only when latin-ext/vietnamese glyphs render
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif', display: 'swap' });
const ui = Be_Vietnam_Pro({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-ui', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin', 'latin-ext', 'vietnamese'], preload: false, variable: '--font-mono', display: 'swap' });
export const fontVariables = [serif.variable, ui.variable, mono.variable].join(' ');
