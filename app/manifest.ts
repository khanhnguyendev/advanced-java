import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'advanced-java',
    short_name: 'advanced-java',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f8fc',
    theme_color: '#f4f8fc',
    icons: [
      { src: '/icon.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
