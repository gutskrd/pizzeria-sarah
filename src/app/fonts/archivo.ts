import localFont from 'next/font/local';

// Archivo (variable weight and width): the condensed cuts echo the printed menu.
// Used by the public site and by the website preview in the admin.
export const archivo = localFont({
  src: './archivo.woff2',
  weight: '100 900',
  declarations: [{ prop: 'font-stretch', value: '62% 125%' }],
  variable: '--font-archivo',
  display: 'swap',
  fallback: ['Arial Narrow', 'Arial', 'sans-serif'],
});
