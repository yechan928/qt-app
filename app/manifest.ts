import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'QT 나눔',
    short_name: 'QT 나눔',
    description: '교회 QT 소모임 전용 나눔 공유 웹앱',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafaf9',
    theme_color: '#d97706',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
