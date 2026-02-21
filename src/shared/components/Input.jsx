import React, { useId, useState, forwardRef } from 'react';
import * as Icons from 'lucide-react';
import { cn } from '../utils/cn';
import '../styles/imput/Input.css';

/**
 * Input.jsx — Mask'li, temaya uyumlu, saf CSS ile
 * 
 * Props
 * - type: 'text' | 'email' | 'phone' | 'number' | 'password' | 'search'
 * - value, onChange(value)
 * - placeholder, label, error
 * - multiline, rows
 * - disabled
 * - maxLength, autoCapitalize, autoComplete, name, id
 * - icon: string | ReactComponent (left icon)
 * - iconRight: string | ReactComponent (right icon)
 * - onIconRightClick: () => void
 * - className, inputClassName, style
 * - size: 'sm' | 'md' | 'lg'
 * - invalid?: boolean
 * - mask?: 'phone' | 'id' | 'card' | 'date' | 'time' | 'iban' | 'license' | 'custom'
 * - maskPattern?: string // custom için, örn: "9999-9999-99999" veya "+93 99 999 9999"
 */

// ---------------- Mask helpers ----------------
const DIGIT = /\d/;
const LETTER = /[a-zA-Z]/;
const ALNUM = /[a-zA-Z0-9]/;

// generic masker: pattern tokens
// 9: digit, A: letter, *: alnum, #: digit (keeps), X: any (keeps)
function maskWithPattern(raw, pattern) {
  if (!pattern) return raw;
  const arr = (raw || '').toString().split('');
  const out = [];
  let ai = 0;
  for (let i = 0; i < pattern.length; i++) {
    const p = pattern[i];
    if (p === '9' || p === '#') {
      // digit
      while (ai < arr.length && !DIGIT.test(arr[ai])) ai++;
      if (ai < arr.length) { out.push(arr[ai]); ai++; } else break;
    } else if (p === 'A') {
      while (ai < arr.length && !LETTER.test(arr[ai])) ai++;
      if (ai < arr.length) { out.push(arr[ai]); ai++; } else break;
    } else if (p === '*') {
      while (ai < arr.length && !ALNUM.test(arr[ai])) ai++;
      if (ai < arr.length) { out.push(arr[ai]); ai++; } else break;
    } else if (p === 'X') {
      if (ai < arr.length) { out.push(arr[ai]); ai++; } else break;
    } else {
      // static char
      out.push(p);
    }
  }
  return out.join('');
}

// Afghanistan mobile: 07XX XXX XXX (10 digits; always starts with 0)
function maskPhoneAF(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 10);
  const d = digits.padEnd(1, '');
  let s = d;
  if (s && s[0] !== '0') s = '0' + s; // ensure leading 0
  const m = s.match(/^(\d{0,4})(\d{0,3})(\d{0,3})$/);
  if (!m) return s;
  return [m[1], m[2], m[3]].filter(Boolean).join(' ').trim();
}

// National ID style: xxxx-xxxx-xxxxx (digits)
function maskNationalId(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 13);
  const m = digits.match(/^(\d{0,4})(\d{0,4})(\d{0,5})$/);
  if (!m) return digits;
  return [m[1], m[2], m[3]].filter(Boolean).join('-');
}

// Credit Card: #### #### #### #### (16)
function maskCard(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 19);
  return digits.replace(/(.{4})/g, '$1 ').trim();
}

// Date: YYYY-MM-DD
function maskDate(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 8);
  const m = digits.match(/^(\d{0,4})(\d{0,2})(\d{0,2})$/);
  if (!m) return digits;
  return [m[1], m[2], m[3]].filter(Boolean).join('-');
}

// Time: HH:MM
function maskTime(v) {
  const digits = (v || '').replace(/\D/g, '').slice(0, 4);
  const m = digits.match(/^(\d{0,2})(\d{0,2})$/);
  if (!m) return digits;
  return [m[1], m[2]].filter(Boolean).join(':');
}

// IBAN (basic formatting groups of 4)
function maskIban(v) {
  const up = (v || '').replace(/\s+/g, '').toUpperCase().slice(0, 34);
  return up.replace(/(.{4})/g, '$1 ').trim();
}

// License plate simple example: XXX-999
function maskLicense(v) {
  const raw = (v || '').toUpperCase();
  return maskWithPattern(raw, 'AAA-999');
}

// Phone international example: +93 7X XXX XXXX
function maskIntlAF(v) {
  const digits = (v || '').replace(/\D/g, '');
  const pref = digits.startsWith('93') ? digits : (digits.startsWith('0') ? '93' + digits.slice(1) : '93' + digits);
  const m = pref.slice(0, 12).match(/^(93)(\d{0,1})(\d{0,3})(\d{0,4})$/);
  if (!m) return '+' + pref;
  return ['+'+m[1], m[2] ? '7'+m[2] : '', m[3], m[4]].filter(Boolean).join(' ').replace(' 7', ' 7');
}

function validateEmail(v) {
  if (!v) return true;
  return /^(?=[^@]{1,64}@)[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function coerceType(type) {
  if (type === 'phone') return 'tel';
  if (type === 'number') return 'text'; // we mask ourselves
  return type;
}

const Input = forwardRef(function Input(
  {
    type = 'text',
    value,
    onChange = () => {},
    placeholder,
    label,
    error,
    multiline = false,
    rows = 3,
    disabled = false,
    maxLength,
    autoCapitalize = 'none',
    autoComplete,
    icon = null,
    iconRight = null,
    onIconRightClick,
    className = '',
    inputClassName = '',
    style,
    size = 'md',
    name,
    id,
    invalid = false,
    mask, // ek
    maskPattern, // ek
    ...rest
  },
  ref
) {
  const htmlId = id || useId();
  const [showPw, setShowPw] = useState(false);

  const resolveIcon = (ic) => {
    if (!ic) return null;
    if (typeof ic === 'string' && Icons[ic]) return Icons[ic];
    return ic;
  };

  const LeftIcon = resolveIcon(icon);
  let RightIcon = resolveIcon(iconRight);

  const isPassword = type === 'password';
  const Eye = Icons.Eye;
  const EyeOff = Icons.EyeClosed || Icons.EyeOff;

  const resolvedType = isPassword ? (showPw ? 'text' : 'password') : coerceType(type);

  const formatters = {
    phone: maskPhoneAF,
    id: maskNationalId,
    card: maskCard,
    date: maskDate,
    time: maskTime,
    iban: maskIban,
    license: maskLicense,
    intlPhone: maskIntlAF,
    number: (v) => (v || '').replace(/[^\d.-]/g, ''),
    custom: (v) => maskWithPattern(v, maskPattern || ''),
  };

  const doMask = (raw) => {
    const m = mask || (type === 'phone' ? 'phone' : type === 'number' ? 'number' : undefined);
    if (!m) return raw;
    const fn = formatters[m];
    return fn ? fn(raw) : raw;
  };

  const handleChange = (e) => {
    const v = e.target.value ?? '';
    const masked = doMask(v);
    onChange(masked);
  };

  const sizeCls = size === 'sm' ? 'ui-input__field--sm' : size === 'lg' ? 'ui-input__field--lg' : 'ui-input__field--md';
  const hasLeft = !!LeftIcon;
  const hasRight = !!RightIcon || isPassword;
  const showPwToggle = isPassword && !RightIcon;
  if (showPwToggle) RightIcon = showPw ? Eye : EyeOff;

  const resolvedPlaceholder = placeholder ?? (
    type === 'email' ? 'email@example.com'
    : (mask === 'phone' || type === 'phone') ? '07XX XXX XXX'
    : mask === 'id' ? 'XXXX-XXXX-XXXXX'
    : isPassword ? '••••••••' : 'Metin girin...'
  );

  return (
    <div className={cn('ui-input', className)} style={style}>
      {label && (
        <label htmlFor={htmlId} className="ui-input__label">{label}</label>
      )}

      <div className={cn('ui-input__slot', multiline ? 'ui-input__slot--multiline' : '')}>
        {LeftIcon && (
          <span className="ui-input__icon" aria-hidden="true"><LeftIcon size={18} /></span>
        )}

        {multiline ? (
          <textarea
            ref={ref}
            id={htmlId}
            name={name}
            rows={rows}
            maxLength={maxLength}
            disabled={disabled}
            data-disabled={disabled ? 'true' : undefined}
            data-invalid={invalid ? 'true' : undefined}
            className={cn('ui-input__field ui-input__textarea', sizeCls, hasLeft && 'ui-input__field--pl', hasRight && 'ui-input__field--pr', inputClassName)}
            placeholder={resolvedPlaceholder}
            value={value ?? ''}
            onChange={handleChange}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            aria-invalid={invalid || undefined}
            aria-disabled={disabled || undefined}
            {...rest}
          />
        ) : (
          <input
            ref={ref}
            id={htmlId}
            name={name}
            type={resolvedType}
            maxLength={maxLength}
            disabled={disabled}
            data-disabled={disabled ? 'true' : undefined}
            data-invalid={invalid ? 'true' : undefined}
            className={cn('ui-input__field', sizeCls, hasLeft && 'ui-input__field--pl', hasRight && 'ui-input__field--pr', inputClassName)}
            placeholder={resolvedPlaceholder}
            value={value ?? ''}
            onChange={handleChange}
            autoCapitalize={autoCapitalize}
            autoComplete={autoComplete}
            inputMode={type === 'number' || type === 'phone' ? 'numeric' : undefined}
            aria-invalid={invalid || undefined}
            aria-disabled={disabled || undefined}
            {...rest}
          />)
        }

        {RightIcon && (
          <button
            type="button"
            onClick={showPwToggle ? () => setShowPw((s) => !s) : onIconRightClick}
            className="ui-input__rightbtn"
            aria-label={isPassword ? (showPw ? 'Şifreyi gizle' : 'Şifreyi göster') : 'Action'}
            tabIndex={-1}
          >
            <RightIcon size={18} />
          </button>
        )}
      </div>

      {error && (
        <p className="ui-input__error">{error}</p>
      )}
    </div>
  );
});

export default Input;

// Named exports for mask helpers (isteğe bağlı dış kullanım)
export const masks = {
  phone: maskPhoneAF,
  intlPhone: maskIntlAF,
  id: maskNationalId,
  card: maskCard,
  date: maskDate,
  time: maskTime,
  iban: maskIban,
  license: maskLicense,
  pattern: maskWithPattern,
};

export function isEmailValid(v){ return validateEmail(v); }
