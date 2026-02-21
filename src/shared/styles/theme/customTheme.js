// ----------------------------- Helpers ------------------------------------
export const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
export const hexToRgb = (hex) => {
  const h = hex.replace('#', '');
  const s = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const bigint = parseInt(s, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};
export const rgba = (hex, a = 1) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(a)})`;
};
export const mix = (c1, c2, ratio = 0.5) => {
  const a = hexToRgb(c1), b = hexToRgb(c2);
  const r = Math.round(a.r + (b.r - a.r) * ratio);
  const g = Math.round(a.g + (b.g - a.g) * ratio);
  const bb = Math.round(a.b + (b.b - a.b) * ratio);
  return `#${[r, g, bb].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
};
export const shades = (base) => ({
  50:  mix('#ffffff', base, 0.92),
  100: mix('#ffffff', base, 0.84),
  200: mix('#ffffff', base, 0.68),
  300: mix('#ffffff', base, 0.52),
  400: mix('#ffffff', base, 0.36),
  500: base,
  600: mix('#000000', base, 0.20),
  700: mix('#000000', base, 0.40),
  800: mix('#000000', base, 0.62),
  900: mix('#000000', base, 0.78),
});

// ----------------------------- Brand & Palette -----------------------------
export const brand = {
  primary:   '#01A89E', // teal
  secondary: '#FE893C', // orange
  tertiary:  '#5B67F1', // indigo-violet (çeşitlilik)
};

const support = {
  success: '#22C55E',
  danger:  '#EF4444',
  warning: '#F59E0B',
  info:    '#3B82F6',
  purple:  '#8B5CF6',
  pink:    '#EC4899',
  cyan:    '#06B6D4',
};

const gray = {
  0: '#ffffff',
  50: '#f9fafb',
  100: '#f3f4f6',
  200: '#e5e7eb',
  300: '#d1d5db',
  400: '#9ca3af',
  500: '#6b7280',
  600: '#4b5563',
  700: '#374151',
  800: '#1f2937',
  900: '#111827',
};

export const palette = {
  primary:   { ...shades(brand.primary) },
  secondary: { ...shades(brand.secondary) },
  tertiary:  { ...shades(brand.tertiary) },
  neutral:   { ...gray },
  success:   { ...shades(support.success) },
  danger:    { ...shades(support.danger) },
  warning:   { ...shades(support.warning) },
  info:      { ...shades(support.info) },
  purple:    { ...shades(support.purple) },
  pink:      { ...shades(support.pink) },
  cyan:      { ...shades(support.cyan) },
};

// ----------------------------- Typography ---------------------------------
// Not: "BahijMidan" KALDIRILDI. Nötr, geniş kapsamlı font yığını.
export const typography = {
  fontFamily: `Inter, ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji", "Segoe UI Emoji"`,
  // Script ölçekleri (İsteğe bağlı): Latin/Arabic benzeri dillerde optik denge
  scriptScale: { default: 1.0, ar: 1.06, fa: 1.06, ps: 1.06 },
  fontSizeAdjust: { default: 0.5, ar: 0.54, fa: 0.54, ps: 0.54 },
  // 4px grid üzerinde tasarlanmış boyut skalası
  sizes: {
    xs:  '12px',
    sm:  '14px',
    base:'16px',
    md:  '18px',
    lg:  '20px',
    xl:  '24px',
    '2xl':'28px',
    '3xl':'32px',
    '4xl':'36px',
  },
  weights: { regular: 400, medium: 500, semibold: 600, bold: 700 },
  leading: {
    tight: 1.25,
    snug:  1.35,
    normal:1.5,
    relaxed:1.65,
  },
};

// ----------------------------- Layout Scales -------------------------------
// 4 tabanlı spacing: 0-64 (px)
export const spacing = {
  0:'0px', 1:'4px', 2:'8px', 3:'12px', 4:'16px', 5:'20px', 6:'24px', 7:'28px', 8:'32px',
  9:'36px', 10:'40px', 11:'44px', 12:'48px', 14:'56px', 16:'64px', 20:'80px', 24:'96px',
  28:'112px', 32:'128px', 40:'160px', 48:'192px', 56:'224px', 64:'256px',
};

export const radius = {
  none:'0px',
  xs:'4px',
  sm:'6px',
  md:'10px',
  lg:'14px',
  xl:'18px',
  '2xl':'24px',
  pill:'999px',
};

export const shadow = {
  sm: '0 1px 2px rgba(0,0,0,.08), 0 1px 1px rgba(0,0,0,.06)',
  md: '0 6px 16px rgba(0,0,0,.10), 0 2px 6px rgba(0,0,0,.06)',
  lg: '0 16px 32px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.08)',
  xl: '0 24px 48px rgba(0,0,0,.16), 0 12px 24px rgba(0,0,0,.10)',
};

export const motion = {
  duration: {
    fast: 120,
    normal: 200,
    slow: 320,
    slower: 480,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    emphasize: 'cubic-bezier(0.3, 0, 0, 1)',
    entrance: 'cubic-bezier(0, 0, 0, 1)',
    exit: 'cubic-bezier(0.2, 0, 0, 1)',
  },
};

export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  overlay: 1200,
  modal: 1300,
  popover: 1400,
  tooltip: 1500,
  toast: 1600,
};

export const breakpoints = { sm: 480, md: 768, lg: 1024, xl: 1280, '2xl': 1536 };

// ----------------------------- Semantics -----------------------------------
const lightSemantics = {
  bg:        gray[50],
  surface:   '#ffffff',
  surfaceAlt: '#fcfcfd',
  surfaceMuted: gray[100],
  text:      gray[900],
  textMuted: gray[500],
  border:    gray[200],
  overlay:   'rgba(17,24,39,.4)',

  // Actions
  accent:          palette.primary[500],
  accentHover:     palette.primary[600],
  accentActive:    palette.primary[700],
  accentContrast:  '#ffffff',

  secondary:       palette.secondary[500],
  secondaryHover:  palette.secondary[600],
  secondaryActive: palette.secondary[700],
  secondaryContrast:'#ffffff',

  // Status
  success: palette.success[500],
  danger:  palette.danger[500],
  warning: palette.warning[500],
  info:    palette.info[500],
};

const darkSemantics = {
  ...lightSemantics,
  bg:        gray[900],
  surface:   gray[800],
  surfaceAlt: '#0f172a',
  surfaceMuted: gray[700],
  text:      gray[50],
  textMuted: gray[400],
  border:    rgba('#ffffff', .12),
  overlay:   'rgba(0,0,0,.5)',

  accent:          palette.primary[400],
  accentHover:     palette.primary[300],
  accentActive:    palette.primary[200],
  accentContrast:  '#0b1416',

  secondary:       palette.secondary[400],
  secondaryHover:  palette.secondary[300],
  secondaryActive: palette.secondary[200],
  secondaryContrast:'#0b1416',
};

// ----------------------------- Components ----------------------------------
export const components = {
  // ---- Button (variants + state) ----
  button: {
    height: '40px',
    radius: 'var(--radius-sm)',
    px: spacing[4],
    gap: spacing[2],
    fontSize: 'var(--font-sm)',
    weight: typography.weights.medium,
    bg: 'var(--accent)',
    color: 'var(--accent-contrast)',
    borderWidth: '1px',
    borderColor: 'transparent',
    focusRing: `0 0 0 4px ${rgba(brand.primary, .20)}`,
    disabledBg: 'rgba(0,0,0,.06)',
    disabledColor: 'var(--text-muted)',
    disabledBorderColor: 'rgba(0,0,0,.06)',
    // Variant şablonları (renk rolleri role-*-* değişkenleri ile eşleşir)
    variants: {
      solid:   { bg: 'var(--role-primary-bg)', hoverBg: 'var(--role-primary-hover)', activeBg: 'var(--role-primary-active)', color: 'var(--role-primary-contrast)', borderColor: 'transparent' },
      soft:    { bg: 'var(--role-primary-soft-bg)', hoverBg: 'var(--role-primary-soft-hover)', activeBg: 'var(--role-primary-soft-active)', color: 'var(--text)', borderColor: 'var(--role-primary-soft-border)' },
      outline: { bg: 'transparent', color: 'var(--text)', borderColor: 'var(--role-primary-border)', hoverBg: 'var(--role-primary-soft-bg)', activeBg: 'var(--role-primary-soft-active)' },
      ghost:   { bg: 'transparent', color: 'var(--text)', borderColor: 'transparent', hoverBg: 'var(--role-primary-soft-bg)', activeBg: 'var(--role-primary-soft-active)' },
      link:    { bg: 'transparent', color: 'var(--role-primary-bg)', borderColor: 'transparent', hoverBg: 'transparent', activeBg: 'transparent', textDecoration: 'underline' },
    },
  },

  // ---- Input / Textarea ----
  input: {
    height: '44px',
    radius: 'var(--radius-sm)',
    bg: 'var(--surface-muted)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
    px: spacing[3],
    py: spacing[2],
    placeholder: 'var(--text-muted)',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .18)}`,
    invalidBorderColor: palette.danger[500],
    disabledBg: 'rgba(0,0,0,.04)',
    disabledColor: 'var(--text-muted)',
  },
  textarea: {
    minHeight: '96px',
    radius: 'var(--radius-sm)',
    bg: 'var(--surface-muted)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
    px: spacing[3],
    py: spacing[3],
    placeholder: 'var(--text-muted)',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .18)}`,
  },

  // ---- Selection Controls ----
  checkbox: {
    size: '18px',
    radius: '4px',
    bg: 'var(--surface)',
    borderWidth: '1.5px',
    borderColor: 'var(--border)',
    checkColor: 'var(--accent-contrast)',
    checkedBg: 'var(--accent)',
    checkedBorderColor: 'var(--accent)',
    indeterminateBg: 'var(--accent)',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .20)}`,
    disabledBg: 'rgba(0,0,0,.04)',
    disabledBorderColor: 'rgba(0,0,0,.08)',
  },
  radio: {
    size: '18px',
    bg: 'var(--surface)',
    dotColor: 'var(--accent-contrast)',
    borderWidth: '1.5px',
    borderColor: 'var(--border)',
    checkedBg: 'var(--accent)',
    checkedBorderColor: 'var(--accent)',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .20)}`,
  },
  switch: {
    width: '38px',
    height: '22px',
    trackRadius: '999px',
    trackBg: 'rgba(0,0,0,.12)',
    trackCheckedBg: 'var(--accent)',
    thumbSize: '18px',
    thumbBg: '#fff',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .20)}`,
  },

  // ---- Select / Combobox ----
  select: {
    height: '44px',
    radius: 'var(--radius-sm)',
    bg: 'var(--surface-muted)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
    px: spacing[3],
    py: spacing[2],
    caretColor: 'var(--text)',
    focusRing: `0 0 0 4px ${rgba(palette.primary[500], .18)}`,
    menuRadius: 'var(--radius-md)',
    menuShadow: 'var(--shadow-lg)',
    menuBg: 'var(--surface)',
    menuBorderWidth: '1px',
    menuBorderColor: 'var(--border)',
    optionHeight: '36px',
    optionGap: spacing[2],
    optionPaddingX: spacing[3],
    optionPaddingY: '6px',
    optionHoverBg: rgba(palette.primary[500], .06),
    optionActiveBg: rgba(palette.primary[500], .10),
    optionSelectedBg: rgba(palette.primary[500], .12),
    optionSelectedColor: 'var(--text)',
  },

  // ---- Dropdown / Menu ----
  dropdown: {
    radius: 'var(--radius-md)',
    shadow: 'var(--shadow-lg)',
    bg: 'var(--surface)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
    padding: spacing[2],
    itemHeight: '36px',
    itemRadius: '8px',
    itemPx: spacing[3],
    itemGap: spacing[2],
    itemHoverBg: rgba(palette.neutral[900], .04),
    itemActiveBg: rgba(palette.primary[500], .10),
  },

  // ---- Surfaces ----
  card: {
    radius: 'var(--radius-lg)',
    bg: 'var(--surface)',
    color: 'var(--text)',
    shadow: 'var(--shadow-lg)',
    borderWidth: '1px',
    borderColor: rgba('#000000', 0.06),
    padding: spacing[6],
  },
  modal: {
    radius: 'var(--radius-xl)',
    shadow: 'var(--shadow-xl)',
    backdrop: 'var(--overlay)',
    bg: 'var(--surface)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: rgba('#000000', 0.12),
    padding: spacing[8],
  },
  tooltip: {
    radius: '6px',
    bg: 'rgba(17,24,39,.92)',
    color: '#fff',
    px: spacing[2],
    py: '6px',
    shadow: 'var(--shadow-md)',
  },

  // ---- Content bits ----
  badge: {
    radius: '999px',
    px: spacing[2],
    py: '2px',
    fontSize: 'var(--font-xs)',
    bg: 'var(--surface-muted)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
  },
  chip: {
    radius: '999px',
    px: spacing[2],
    py: '4px',
    gap: spacing[1],
    fontSize: 'var(--font-xs)',
    bg: 'var(--role-neutral-soft-bg)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--role-neutral-soft-border)',
  },
  avatar: {
    size: '32px',
    radius: '999px',
    ring: `0 0 0 2px #fff, 0 0 0 4px ${rgba(palette.primary[500], .25)}`,
  },

  // ---- Navigation / Tabs ----
  tabs: {
    height: '38px',
    radius: '10px',
    gap: spacing[2],
    px: spacing[1],
    itemPx: spacing[3],
    itemRadius: '8px',
    itemHoverBg: 'var(--role-primary-soft-bg)',
    itemActiveBg: 'var(--role-primary-soft-active)',
    itemActiveColor: 'var(--role-primary-bg)',
    indicatorHeight: '2px',
    indicatorColor: 'var(--role-primary-bg)',
  },

  // ---- Data Display ----
  table: {
    radius: 'var(--radius-md)',
    headerBg: 'var(--surface-muted)',
    rowHoverBg: rgba(palette.neutral[900], .03),
    rowActiveBg: rgba(palette.primary[500], .06),
    borderWidth: '1px',
    borderColor: 'var(--border)',
    cellPx: spacing[3],
    cellPy: spacing[2],
  },
  progress: {
    height: '8px',
    radius: '999px',
    trackBg: 'rgba(0,0,0,.08)',
    barBg: 'var(--accent)',
  },
  slider: {
    height: '4px',
    radius: '999px',
    trackBg: 'rgba(0,0,0,.12)',
    thumbSize: '16px',
    thumbBg: '#fff',
    activeBg: 'var(--accent)',
  },
  toast: {
    radius: '12px',
    shadow: 'var(--shadow-lg)',
    bg: 'var(--surface)',
    color: 'var(--text)',
    borderWidth: '1px',
    borderColor: 'var(--border)',
    gap: spacing[2],
    px: spacing[4],
    py: spacing[3],
  },
  skeleton: {
    radius: '8px',
    from: rgba('#000', .06),
    to: rgba('#000', .12),
  },
};

// ----------------------------- Themes --------------------------------------
export const themeLight = {
  mode: 'light',
  brand,
  palette,
  typography,
  spacing,
  radius,
  shadow,
  motion,
  zIndex,
  breakpoints,
  semantic: lightSemantics,
  surfaces: {
    gradient: `linear-gradient(135deg, ${palette.primary[400]}, ${palette.secondary[400]})`,
    surface:  lightSemantics.surface,
    surfaceAlt: lightSemantics.surfaceAlt,
    surfaceMuted: lightSemantics.surfaceMuted,
  },
  components,
};

export const themeDark = {
  ...themeLight,
  mode: 'dark',
  semantic: darkSemantics,
  surfaces: {
    gradient: `linear-gradient(135deg, ${palette.primary[700]}, ${palette.secondary[700]})`,
    surface:  darkSemantics.surface,
    surfaceAlt: darkSemantics.surfaceAlt,
    surfaceMuted: darkSemantics.surfaceMuted,
  },
};

// ----------------------------- CSS Var Injector ----------------------------
export const cssVar = (name, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
};

const setVars = (root, obj, prefix) => {
  Object.entries(obj).forEach(([k, v]) => {
    const key = `${prefix}-${k}`;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      setVars(root, v, key);
    } else {
      root.style.setProperty(key, String(v));
    }
  });
};

export function applyTheme(theme, root = (typeof document !== 'undefined' ? document.documentElement : null)) {
  if (!root) return;
  const t = theme;
  const set = (k, v) => root.style.setProperty(k, v);

  // Script/dil ölçekleri (lang attribute üzerinden)
  const lang = (root.lang || (typeof document !== 'undefined' ? document.documentElement.lang : '') || '').toLowerCase();
  const isAR = ['ar', 'fa', 'prs', 'ps'].some((code) => lang.startsWith(code));
  const scale = isAR ? (t.typography.scriptScale.fa ?? t.typography.scriptScale.ar ?? 1.06) : (t.typography.scriptScale.default ?? 1);
  const fsa   = isAR ? (t.typography.fontSizeAdjust.fa ?? t.typography.fontSizeAdjust.ar ?? 0.54) : (t.typography.fontSizeAdjust.default ?? 0.5);

  // ---------- Typography
  set('--font', t.typography.fontFamily);
  Object.entries(t.typography.sizes).forEach(([k, v]) => set(`--font-${k}`, v));
  set('--leading-tight', t.typography.leading.tight);
  set('--leading-snug', t.typography.leading.snug);
  set('--leading-normal', t.typography.leading.normal);
  set('--leading-relaxed', t.typography.leading.relaxed);
  set('--font-scale', String(scale));
  set('--font-size-adjust', String(fsa));

  // ---------- Palette (ana anahtarlar düz olarak yazılır)
  set('--primary', t.palette.primary[500]);
  set('--secondary', t.palette.secondary[500]);
  set('--tertiary', t.palette.tertiary[500]);

  // ---------- Semantics
  set('--bg', t.semantic.bg);
  set('--surface', t.surfaces.surface);
  set('--surface-alt', t.surfaces.surfaceAlt);
  set('--surface-muted', t.surfaces.surfaceMuted);
  set('--text', t.semantic.text);
  set('--text-muted', t.semantic.textMuted);
  set('--border', t.semantic.border);
  set('--overlay', t.semantic.overlay);

  set('--accent', t.semantic.accent);
  set('--accent-hover', t.semantic.accentHover);
  set('--accent-active', t.semantic.accentActive);
  set('--accent-contrast', t.semantic.accentContrast);

  set('--secondary-accent', t.semantic.secondary);
  set('--secondary-hover', t.semantic.secondaryHover);
  set('--secondary-active', t.semantic.secondaryActive);
  set('--secondary-contrast', t.semantic.secondaryContrast);

  set('--success', t.semantic.success);
  set('--danger', t.semantic.danger);
  set('--warning', t.semantic.warning);
  set('--info', t.semantic.info);

  // ---------- Role color değişkenleri (renk çeşitliliği için)
  const roleKeys = ['primary','secondary','tertiary','success','danger','warning','info','purple','pink','cyan'];
  const contrastLight = '#ffffff';
  const contrastDark = '#0b1416';
  roleKeys.forEach((k) => {
    const p = t.palette[k];
    if (!p) return;
    const isDark = t.mode === 'dark';
    const main   = isDark ? p[400] : p[500];
    const hover  = isDark ? p[300] : p[600];
    const active = isDark ? p[200] : p[700];
    const softBg = isDark ? rgba(p[400], .16) : rgba(p[500], .10);
    const softHv = isDark ? rgba(p[400], .22) : rgba(p[500], .16);
    const softAc = isDark ? rgba(p[400], .28) : rgba(p[500], .22);
    const softBd = isDark ? rgba(p[400], .28) : rgba(p[500], .18);
    const border = isDark ? p[300] : p[600];

    set(`--role-${k}-bg`, main);
    set(`--role-${k}-hover`, hover);
    set(`--role-${k}-active`, active);
    set(`--role-${k}-contrast`, isDark ? contrastDark : contrastLight);
    set(`--role-${k}-soft-bg`, softBg);
    set(`--role-${k}-soft-hover`, softHv);
    set(`--role-${k}-soft-active`, softAc);
    set(`--role-${k}-soft-border`, softBd);
    set(`--role-${k}-border`, border);
  });
  // Neutral rolü (gri)
  const g = t.palette.neutral;
  if (g) {
    const isDark = t.mode === 'dark';
    const main   = isDark ? g[300] : g[800];
    const hover  = isDark ? g[200] : g[900];
    const active = isDark ? g[100] : '#0b0f14';
    const softBg = isDark ? rgba(g[700], .34) : rgba(g[200], .6);
    const softHv = isDark ? rgba(g[600], .40) : rgba(g[300], .5);
    const softAc = isDark ? rgba(g[500], .48) : rgba(g[400], .44);
    const softBd = isDark ? rgba(g[500], .50) : rgba(g[300], .55);
    const border = isDark ? g[300] : g[700];
    set('--role-neutral-bg', main);
    set('--role-neutral-hover', hover);
    set('--role-neutral-active', active);
    set('--role-neutral-contrast', isDark ? contrastDark : contrastLight);
    set('--role-neutral-soft-bg', softBg);
    set('--role-neutral-soft-hover', softHv);
    set('--role-neutral-soft-active', softAc);
    set('--role-neutral-soft-border', softBd);
    set('--role-neutral-border', border);
  }

  // ---------- Scales
  setVars(root, t.spacing, '--space');
  setVars(root, t.radius, '--radius');
  setVars(root, t.shadow, '--shadow');
  setVars(root, t.motion.duration, '--motion-duration');
  setVars(root, t.motion.easing, '--motion-easing');
  setVars(root, t.zIndex, '--z');
  setVars(root, t.breakpoints, '--bp');

  // ---------- Components
  set('--btn-height', t.components.button.height);
  set('--btn-radius', t.components.button.radius);
  set('--btn-px', t.components.button.px);
  set('--btn-gap', t.components.button.gap);
  set('--btn-font-size', t.components.button.fontSize);
  set('--btn-weight', t.components.button.weight);
  set('--btn-bg', t.components.button.bg);
  set('--btn-color', t.components.button.color);
  set('--btn-border-width', t.components.button.borderWidth);
  set('--btn-border-color', t.components.button.borderColor);
  set('--btn-focus-ring', t.components.button.focusRing);
  set('--btn-disabled-bg', t.components.button.disabledBg);
  set('--btn-disabled-color', t.components.button.disabledColor);
  set('--btn-disabled-border-color', t.components.button.disabledBorderColor);

  // Input
  set('--input-height', t.components.input.height);
  set('--input-radius', t.components.input.radius);
  set('--input-bg', t.components.input.bg);
  set('--input-color', t.components.input.color);
  set('--input-border-width', t.components.input.borderWidth);
  set('--input-border-color', t.components.input.borderColor);
  set('--input-px', t.components.input.px);
  set('--input-py', t.components.input.py);
  set('--input-placeholder', t.components.input.placeholder);
  set('--input-focus-ring', t.components.input.focusRing);
  set('--input-invalid-border-color', t.components.input.invalidBorderColor);
  set('--input-disabled-bg', t.components.input.disabledBg);
  set('--input-disabled-color', t.components.input.disabledColor);

  // Textarea
  set('--textarea-min-height', t.components.textarea.minHeight);
  set('--textarea-radius', t.components.textarea.radius);
  set('--textarea-bg', t.components.textarea.bg);
  set('--textarea-color', t.components.textarea.color);
  set('--textarea-border-width', t.components.textarea.borderWidth);
  set('--textarea-border-color', t.components.textarea.borderColor);
  set('--textarea-px', t.components.textarea.px);
  set('--textarea-py', t.components.textarea.py);
  set('--textarea-placeholder', t.components.textarea.placeholder);
  set('--textarea-focus-ring', t.components.textarea.focusRing);

  // Card
  set('--card-radius', t.components.card.radius);
  set('--card-bg', t.components.card.bg);
  set('--card-color', t.components.card.color);
  set('--card-shadow', t.components.card.shadow);
  set('--card-border-width', t.components.card.borderWidth);
  set('--card-border-color', t.components.card.borderColor);
  set('--card-padding', t.components.card.padding);

  // Modal
  set('--modal-radius', t.components.modal.radius);
  set('--modal-shadow', t.components.modal.shadow);
  set('--modal-backdrop', t.components.modal.backdrop);
  set('--modal-bg', t.components.modal.bg);
  set('--modal-color', t.components.modal.color);
  set('--modal-border-width', t.components.modal.borderWidth);
  set('--modal-border-color', t.components.modal.borderColor);
  set('--modal-padding', t.components.modal.padding);

  // Tooltip
  set('--tooltip-radius', t.components.tooltip.radius);
  set('--tooltip-bg', t.components.tooltip.bg);
  set('--tooltip-color', t.components.tooltip.color);
  set('--tooltip-px', t.components.tooltip.px);
  set('--tooltip-py', t.components.tooltip.py);
  set('--tooltip-shadow', t.components.tooltip.shadow);

  // Badge / Chip / Avatar
  set('--badge-radius', t.components.badge.radius);
  set('--badge-px', t.components.badge.px);
  set('--badge-py', t.components.badge.py);
  set('--badge-font-size', t.components.badge.fontSize);
  set('--badge-border-width', t.components.badge.borderWidth);
  set('--badge-border-color', t.components.badge.borderColor);

  set('--chip-radius', t.components.chip.radius);
  set('--chip-px', t.components.chip.px);
  set('--chip-py', t.components.chip.py);
  set('--chip-gap', t.components.chip.gap);
  set('--chip-font-size', t.components.chip.fontSize);
  set('--chip-bg', t.components.chip.bg);
  set('--chip-color', t.components.chip.color);
  set('--chip-border-width', t.components.chip.borderWidth);
  set('--chip-border-color', t.components.chip.borderColor);

  set('--avatar-size', t.components.avatar.size);
  set('--avatar-radius', t.components.avatar.radius);
  set('--avatar-ring', t.components.avatar.ring);

  // Checkbox
  set('--checkbox-size', t.components.checkbox.size);
  set('--checkbox-radius', t.components.checkbox.radius);
  set('--checkbox-bg', t.components.checkbox.bg);
  set('--checkbox-border-width', t.components.checkbox.borderWidth);
  set('--checkbox-border-color', t.components.checkbox.borderColor);
  set('--checkbox-check-color', t.components.checkbox.checkColor);
  set('--checkbox-checked-bg', t.components.checkbox.checkedBg);
  set('--checkbox-checked-border-color', t.components.checkbox.checkedBorderColor);
  set('--checkbox-focus-ring', t.components.checkbox.focusRing);
  set('--checkbox-disabled-bg', t.components.checkbox.disabledBg);
  set('--checkbox-disabled-border-color', t.components.checkbox.disabledBorderColor);

  // Radio
  set('--radio-size', t.components.radio.size);
  set('--radio-bg', t.components.radio.bg);
  set('--radio-dot-color', t.components.radio.dotColor);
  set('--radio-border-width', t.components.radio.borderWidth);
  set('--radio-border-color', t.components.radio.borderColor);
  set('--radio-checked-bg', t.components.radio.checkedBg);
  set('--radio-checked-border-color', t.components.radio.checkedBorderColor);
  set('--radio-focus-ring', t.components.radio.focusRing);

  // Switch
  set('--switch-width', t.components.switch.width);
  set('--switch-height', t.components.switch.height);
  set('--switch-track-radius', t.components.switch.trackRadius);
  set('--switch-track-bg', t.components.switch.trackBg);
  set('--switch-track-checked-bg', t.components.switch.trackCheckedBg);
  set('--switch-thumb-size', t.components.switch.thumbSize);
  set('--switch-thumb-bg', t.components.switch.thumbBg);
  set('--switch-focus-ring', t.components.switch.focusRing);

  // Select / Combobox
  set('--select-height', t.components.select.height);
  set('--select-radius', t.components.select.radius);
  set('--select-bg', t.components.select.bg);
  set('--select-color', t.components.select.color);
  set('--select-border-width', t.components.select.borderWidth);
  set('--select-border-color', t.components.select.borderColor);
  set('--select-px', t.components.select.px);
  set('--select-py', t.components.select.py);
  set('--select-caret-color', t.components.select.caretColor);
  set('--select-focus-ring', t.components.select.focusRing);
  set('--select-menu-radius', t.components.select.menuRadius);
  set('--select-menu-shadow', t.components.select.menuShadow);
  set('--select-menu-bg', t.components.select.menuBg);
  set('--select-menu-border-width', t.components.select.menuBorderWidth);
  set('--select-menu-border-color', t.components.select.menuBorderColor);
  set('--select-option-height', t.components.select.optionHeight);
  set('--select-option-gap', t.components.select.optionGap);
  set('--select-option-px', t.components.select.optionPaddingX);
  set('--select-option-py', t.components.select.optionPaddingY);
  set('--select-option-hover-bg', t.components.select.optionHoverBg);
  set('--select-option-active-bg', t.components.select.optionActiveBg);
  set('--select-option-selected-bg', t.components.select.optionSelectedBg);
  set('--select-option-selected-color', t.components.select.optionSelectedColor);

  // Dropdown / Menu
  set('--dropdown-radius', t.components.dropdown.radius);
  set('--dropdown-shadow', t.components.dropdown.shadow);
  set('--dropdown-bg', t.components.dropdown.bg);
  set('--dropdown-color', t.components.dropdown.color);
  set('--dropdown-border-width', t.components.dropdown.borderWidth);
  set('--dropdown-border-color', t.components.dropdown.borderColor);
  set('--dropdown-padding', t.components.dropdown.padding);
  set('--dropdown-item-height', t.components.dropdown.itemHeight);
  set('--dropdown-item-radius', t.components.dropdown.itemRadius);
  set('--dropdown-item-px', t.components.dropdown.itemPx);
  set('--dropdown-item-gap', t.components.dropdown.itemGap);
  set('--dropdown-item-hover-bg', t.components.dropdown.itemHoverBg);
  set('--dropdown-item-active-bg', t.components.dropdown.itemActiveBg);

  // Table
  set('--table-radius', t.components.table.radius);
  set('--table-header-bg', t.components.table.headerBg);
  set('--table-row-hover-bg', t.components.table.rowHoverBg);
  set('--table-row-active-bg', t.components.table.rowActiveBg);
  set('--table-border-width', t.components.table.borderWidth);
  set('--table-border-color', t.components.table.borderColor);
  set('--table-cell-px', t.components.table.cellPx);
  set('--table-cell-py', t.components.table.cellPy);

  // Progress & Slider
  set('--progress-height', t.components.progress.height);
  set('--progress-radius', t.components.progress.radius);
  set('--progress-track-bg', t.components.progress.trackBg);
  set('--progress-bar-bg', t.components.progress.barBg);

  set('--slider-height', t.components.slider.height);
  set('--slider-radius', t.components.slider.radius);
  set('--slider-track-bg', t.components.slider.trackBg);
  set('--slider-thumb-size', t.components.slider.thumbSize);
  set('--slider-thumb-bg', t.components.slider.thumbBg);
  set('--slider-active-bg', t.components.slider.activeBg);

  // Toast
  set('--toast-radius', t.components.toast.radius);
  set('--toast-shadow', t.components.toast.shadow);
  set('--toast-bg', t.components.toast.bg);
  set('--toast-color', t.components.toast.color);
  set('--toast-border-width', t.components.toast.borderWidth);
  set('--toast-border-color', t.components.toast.borderColor);
  set('--toast-gap', t.components.toast.gap);
  set('--toast-px', t.components.toast.px);
  set('--toast-py', t.components.toast.py);

  // Tabs
  set('--tabs-height', t.components.tabs.height);
  set('--tabs-radius', t.components.tabs.radius);
  set('--tabs-gap', t.components.tabs.gap);
  set('--tabs-px', t.components.tabs.px);
  set('--tabs-item-px', t.components.tabs.itemPx);
  set('--tabs-item-radius', t.components.tabs.itemRadius);
  set('--tabs-item-hover-bg', t.components.tabs.itemHoverBg);
  set('--tabs-item-active-bg', t.components.tabs.itemActiveBg);
  set('--tabs-item-active-color', t.components.tabs.itemActiveColor);
  set('--tabs-indicator-height', t.components.tabs.indicatorHeight);
  set('--tabs-indicator-color', t.components.tabs.indicatorColor);

  // Skeleton
  set('--skeleton-radius', t.components.skeleton.radius);
  set('--skeleton-from', t.components.skeleton.from);
  set('--skeleton-to', t.components.skeleton.to);

  set('--gradient', t.surfaces.gradient);

  // ---------- Mode flag
  root.dataset.theme = t.mode;
}

// ----------------------------- Public Export -------------------------------
export const customTheme = {
  light: themeLight,
  dark: themeDark,
  utils: { rgba, mix, shades },
};
