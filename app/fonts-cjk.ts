import { Noto_Serif_SC } from 'next/font/google';

// CJK: Noto Serif SC ships ~186 KB of @font-face slices. Only ever import this module through CjkFont (zh layout),
// so en/vi never link the sheet. Not preloaded; slices are requested (unicode-range) when Han glyphs render.
export const cjk = Noto_Serif_SC({ weight: ['400', '600'], preload: false, display: 'swap' });
