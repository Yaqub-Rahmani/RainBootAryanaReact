import React, { useState, forwardRef } from 'react';
import * as Icons from 'lucide-react';
import '../styles/buton/button.css';

/**
 * RainButton — tema uyumlu, CSS ayrı, JSX ayrı
 * Varsayılan renk: primary; basılı/aktif: secondary (tema rollerine göre)
 * Tailwind bağımlılığı yok; className ile ek sınıf verilebilir.
 */
const Button = forwardRef(function Button(
  {
    size = 'md',
    children,
    icon = null,
    iconRight = null,
    iconOnly = false,
    loading = false,
    fullWidth = false,
    as = 'button',
    href,
    type = 'button',
    disabled = false,
    className = '',
    style = {},
    ariaLabel,
    onClick,
    primaryColor, // opsiyonel override (hex) — tema kullanmak için boş bırak
    activeColor,  // opsiyonel override (hex)
    iconSize = 18,
    ...rest
  },
  ref
) {
  const [pressed, setPressed] = useState(false);

  const Comp = as === 'a' ? 'a' : 'button';
  const isDisabled = disabled || loading;

  // lucide icon çözümleyici
  const resolveIcon = (ic) => {
    if (!ic) return null;
    if (typeof ic === 'string' && Icons[ic]) return Icons[ic];
    return ic;
  };
  const LeftIcon = resolveIcon(icon);
  const RightIcon = resolveIcon(iconRight);
  const Loader = Icons.Loader2;

  // Boyutlar: sm / md / lg
  const sizeClass =
    size === 'sm' ? 'is-sm' : size === 'lg' ? 'is-lg' : 'is-md';

  const rootClass = [
    'ui-btn',
    sizeClass,
    iconOnly && 'is-icon-only',
    fullWidth && 'is-full',
    isDisabled && 'is-disabled',
    loading && 'is-loading',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // CSS değişken override (opsiyonel): doğrudan inline style üzerinden
  const colorOverrides = {};
  if (primaryColor) colorOverrides['--btn-bg'] = primaryColor;
  if (activeColor) colorOverrides['--btn-active-bg'] = activeColor;

  const commonProps =
    as === 'a'
      ? { href, role: 'button', 'aria-disabled': isDisabled }
      : { type, disabled: isDisabled };

  return (
    <Comp
      ref={ref}
      className={rootClass}
      style={{ ...colorOverrides, ...style }}
      aria-busy={loading || undefined}
      aria-label={iconOnly ? ariaLabel : undefined}
      data-pressed={pressed ? 'true' : undefined}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={isDisabled ? undefined : onClick}
      {...commonProps}
      {...rest}
    >
      {/* Spinner */}
      {loading && (
        <span className="ui-btn__icon" aria-hidden="true">
          <Loader size={iconSize} className="ui-spin" />
        </span>
      )}

      {/* Left icon */}
      {!loading && LeftIcon && (
        <span className="ui-btn__icon" aria-hidden="true">
          <LeftIcon size={iconSize} />
        </span>
      )}

      {/* Label */}
      {!iconOnly && (
        <span className="ui-btn__label">{children}</span>
      )}

      {/* Right icon */}
      {!loading && RightIcon && (
        <span className="ui-btn__icon" aria-hidden="true">
          <RightIcon size={iconSize} />
        </span>
      )}
    </Comp>
  );
});

export default Button;