export function cn(...args) {
  return args
    .flatMap(a => {
      if (!a) return [];
      if (typeof a === 'string') return a.split(' ');
      if (Array.isArray(a)) return a;
      if (typeof a === 'object') return Object.entries(a).filter(([,v]) => !!v).map(([k]) => k);
      return [];
    })
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
