export default function manifest() {
  return {
    name: '169Pi Good First Alpie',
    short_name: 'Good First Alpie',
    description: 'Make your first open-source contribution — we’ll walk you through every step.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F4F1E9',
    theme_color: '#132B33',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
