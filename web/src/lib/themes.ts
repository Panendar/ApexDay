export const THEMES = [
  { id: 'apex', name: 'Apex', bg: '#0b0b0c', surface: '#151517', accent: '#c6f432', text: '#fff' },
  { id: 'light', name: 'Light', bg: '#f5f5f0', surface: '#ffffff', accent: '#c6f432', text: '#0b0b0c' },
  { id: 'amoled', name: 'AMOLED', bg: '#000000', surface: '#0c0c0d', accent: '#c6f432', text: '#fff' },
  { id: 'sunrise', name: 'Sunrise', bg: '#140c08', surface: '#21140d', accent: '#ffa94d', text: '#fff' },
  { id: 'forest', name: 'Forest', bg: '#08110c', surface: '#101e16', accent: '#4ade80', text: '#fff' },
  { id: 'midnight', name: 'Midnight', bg: '#090b1c', surface: '#121631', accent: '#8fa0ff', text: '#fff' },
  { id: 'sakura', name: 'Sakura', bg: '#150a10', surface: '#23121b', accent: '#ff8fba', text: '#fff' },
  { id: 'ocean', name: 'Ocean', bg: '#06121a', surface: '#0e2230', accent: '#3cd8ff', text: '#fff' },
  { id: 'mono', name: 'Mono', bg: '#0c0c0c', surface: '#171717', accent: '#ededed', text: '#fff' },
] as const;
export const resolveTheme = (id: string) => (id === 'auto' ? (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'apex') : id);
