import React, { useId, useState, useRef, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import Button from '../Button';
import '../../styles/user/UserCard.css';
import { normalizeMediaPath } from '../../utils/normalizeMediaPath';
import { ArrowBigLeft, User } from 'lucide-react';

export default function UserCard({
  avatarSrc,
  name,
  address,
  phone,
  balance,
  balanceSuffix = 'AF',
  onViewProfile,
  onMenuAction,
  menuItems = [
    // { key: 'call', label: 'Ara' },
    // { key: 'message', label: 'Mesaj Gönder' },
    // { key: 'block', label: 'Engelle' },
  ],
  dir = 'rtl',
  className = '',
  style = {},
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const btnRef = useRef(null);
  const normalizedAvatar = normalizeMediaPath(avatarSrc);

  const closeMenu = useCallback(() => setOpen(false), []);

  // Dış tıklama ve ESC kapatma
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        closeMenu();
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') closeMenu(); };
    document.addEventListener('click', onDocClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('click', onDocClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open, closeMenu]);

  const onToggleMenu = () => setOpen((v) => !v);
  const onItem = (key) => { closeMenu(); onMenuAction && onMenuAction(key); };

  const balanceText = (
    <>
      <span className="user-card__balance-val">{balance}</span>
      {balanceSuffix && (
        <span className="user-card__balance-suffix">{balanceSuffix}</span>
      )}
    </>
  );



  return (
    <section
      className={`user-card user-card--elevated ${className}`}
      style={style}
      dir={dir}
      aria-labelledby={`${id}-name`}
    >
      {/* Media çerçevesi — görsel kenarlarında nefes alanı */}
      <div className="user-card__media">
        {avatarSrc ? (
          <div className="user-card__frame" aria-hidden="true">
            <img src={normalizedAvatar} alt="" className="user-card__avatar" loading="lazy" />
          </div>
        ) : (
          <div className="user-card__frame user-card__frame--placeholder" aria-hidden="true" />
        )}
      </div>

      {/* İçerik */}
      <div className="user-card__body">
        <h3 id={`${id}-name`} className="user-card__name" title={name}>{name}</h3>
        <p className="user-card__address" title={address}>{address}</p>

        <div className="user-card__meta">
          <span className="user-card__phone" title={phone}>{phone}</span>
          <span className="user-card__balance" aria-label="Bakiye">{balanceText}</span>
        </div>
      </div>

      {/* Footer + Menü */}
      <div className="user-card__footer">
        <Button
          size="md"
          fullWidth
          onClick={onViewProfile}
          ariaLabel="Profili gör"
          className="user-card__view-btn"
          icon={User}
        >
          مشاهده بیشتر
        </Button>

        <Button
          ref={btnRef}
          size="md"
          iconOnly
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={`${id}-menu`}
          ariaLabel="Daha fazla"
          className="user-card__menu-btn"
          onClick={onToggleMenu}
          icon={ArrowBigLeft}
        />

        <div
          id={`${id}-menu`}
          ref={menuRef}
          className={`user-card__menu ${open ? 'is-open' : ''}`}
          role="menu"
        >
          {menuItems.map((it) => (
            <button
              key={it.key}
              type="button"
              className="user-card__menu-item"
              onClick={() => onItem(it.key)}
              role="menuitem"
            >
              {it.label}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

UserCard.propTypes = {
  avatarSrc: PropTypes.string,
  name: PropTypes.string.isRequired,
  address: PropTypes.string.isRequired,
  phone: PropTypes.string.isRequired,
  balance: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  balanceSuffix: PropTypes.string,
  onViewProfile: PropTypes.func,
  onMenuAction: PropTypes.func,
  menuItems: PropTypes.arrayOf(PropTypes.shape({ key: PropTypes.string.isRequired, label: PropTypes.string.isRequired })),
  dir: PropTypes.oneOf(['rtl', 'ltr']),
  className: PropTypes.string,
  style: PropTypes.object,
};