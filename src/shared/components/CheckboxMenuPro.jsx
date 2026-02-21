import { Check } from "lucide-react";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

// ======================= PRO VERSION =======================
// CheckboxMenuPro: animasyonlu, tema-uyumlu, çoklu tetik varyasyonları
// display: "iconOnly" | "icon" | "textIcon" | "iconCount"
export function CheckboxMenuPro({
  options = [],              // [{ value, label }]
  value = [],                // array of selected values
  onChange,
  placeholder = "Seçiniz",
  maxHeight = 320,
  menuWidth,
  disabled = false,
  align = "start",          // "start" | "end"
  searchable = false,
  display = "textIcon",
  icon: ButtonIcon,          // optional icon component for the trigger (e.g., Columns3)
  ariaLabel = "Seçim menüsü",
}) {
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, placement: "bottom" });
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);

  const selectedSet = useMemo(() => new Set(value), [value]);
  const totalCount = options.length;
  const selectedCount = value.length;

  const filtered = useMemo(() => {
    if (!searchable || !query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => (o.label ?? String(o.value)).toLowerCase().includes(q));
  }, [options, searchable, query]);

  const labelText = useMemo(() => {
    if (display === "iconOnly") return "";
    if (display === "iconCount") return `(${selectedCount}/${totalCount})`;
    if (!value?.length) return placeholder;
    const map = new Map(options.map((o) => [o.value, o.label ?? String(o.value)]));
    const names = value.map((v) => map.get(v) ?? v);
    return names.length > 2 ? `${names.slice(0,2).join(", ")} +${names.length-2}` : names.join(", ");
  }, [value, options, placeholder, selectedCount, totalCount, display]);

  // ------- Positioning / Layout -------
  const recalc = () => {
    const btn = btnRef.current;
    const menu = menuRef.current;
    if (!btn || !menu) return;

    const b = btn.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - b.bottom;
    const spaceAbove = b.top;
    const placeBottom = spaceBelow >= Math.min(maxHeight, 200) || spaceBelow >= spaceAbove;

    const width = menuWidth || Math.max(240, b.width);
    let left = align === "end" ? b.right - width : b.left;
    left = Math.max(8, Math.min(left, vw - width - 8));

    const top = placeBottom ? b.bottom + 6 : b.top - 6;

    setPosition({ top, left, placement: placeBottom ? "bottom" : "top" });

    const available = placeBottom ? Math.max(160, vh - b.bottom - 12) : Math.max(160, b.top - 12);
    menu.style.maxHeight = Math.min(maxHeight, available) + "px";
    menu.style.width = width + "px";
  };

  // ------- Event wiring -------
  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      const b = btnRef.current;
      const m = menuRef.current;
      if ((b && b.contains(e.target)) || (m && m.contains(e.target))) return;
      setOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    const onScroll = () => recalc();
    const onResize = () => recalc();

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    recalc();

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!btnRef.current) return;
    const ro = new ResizeObserver(recalc);
    ro.observe(btnRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => { if (open) setHighlight(0); }, [open]);

  // ------- Styling -------
  const btnStyle = {
    height: "var(--select-height)",
    borderRadius: "var(--select-radius)",
    background: "var(--select-bg)",
    color: "var(--select-color)",
    border: `var(--select-border-width) solid var(--select-border-color)`,
    padding: `0 var(--select-px)`,
    display: "inline-flex",
    alignItems: "center",
    gap: "var(--space-2)",
    minWidth: display === "iconOnly" ? 40 : 180,
    boxShadow: "none",
    transition: `box-shadow var(--motion-duration-fast) var(--motion-easing-standard), transform var(--motion-duration-fast) var(--motion-easing-standard)`,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
  };

  const menuStyle = {
    position: "fixed",
    top: position.top,
    left: position.left,
    zIndex: "var(--z-popover)",
    background: "var(--select-menu-bg)",
    color: "var(--text)",
    borderRadius: "var(--select-menu-radius)",
    boxShadow: "var(--select-menu-shadow)",
    border: `var(--select-menu-border-width) solid var(--select-menu-border-color)`,
    overflow: "auto",
    transformOrigin: position.placement === "bottom" ? "top center" : "bottom center",
    animation: `${open ? "mcx-menu-in" : ""} var(--motion-duration-normal) var(--motion-easing-emphasize) both`,
  };

  const itemStyle = {
    height: "var(--select-option-height)",
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    gap: "var(--select-option-gap)",
    padding: `0 var(--select-option-px)`,
    fontSize: "var(--font-sm)",
    cursor: "pointer",
  };

  const toggleValue = (v) => {
    const set = new Set(value);
    if (set.has(v)) set.delete(v); else set.add(v);
    onChange && onChange(Array.from(set));
  };

  // ------- Button content variations -------
  const ButtonContent = () => {
    const countText = `(${selectedCount}/${totalCount})`;
    const iconEl = ButtonIcon ? <ButtonIcon size={16} /> : <ChevronDown size={16} />;

    if (display === "iconOnly") return iconEl;
    if (display === "icon") return (<>{iconEl}</>);
    if (display === "iconCount") return (<><span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{countText}</span>{iconEl}</>);
    // default: textIcon
    return (
      <>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {labelText}
        </span>
        {iconEl}
      </>
    );
  };

  return (
    <div style={{ display: "inline-block", position: "relative" }}>
      <button
        type="button"
        ref={btnRef}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen(true);
            setTimeout(recalc, 0);
          }
        }}
        style={btnStyle}
        onFocus={(e) => (e.currentTarget.style.boxShadow = `0 0 0 4px var(--select-focus-ring)`)}
        onBlur={(e) => (e.currentTarget.style.boxShadow = "none")}
      >
        <ButtonContent />
      </button>

      {open && createPortal(
        <div
          ref={menuRef}
          role="listbox"
          aria-multiselectable="true"
          style={menuStyle}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); const opt = filtered[highlight]; if (opt) toggleValue(opt.value); }
          }}
        >
          <div style={{ padding: "var(--space-2)" }}>
            {searchable && (
              <div style={{ marginBottom: "var(--space-2)" }}>
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ara..."
                  style={{
                    width: "100%",
                    height: "var(--input-height)",
                    borderRadius: "var(--input-radius)",
                    background: "var(--input-bg)",
                    color: "var(--input-color)",
                    border: `var(--input-border-width) solid var(--input-border-color)`,
                    padding: `0 var(--input-px)`,
                  }}
                />
              </div>
            )}
            {filtered.length === 0 && (
              <div style={{ padding: "var(--space-3)", color: "var(--text-muted)" }}>موجود نیست</div>
            )}
            {filtered.map((opt, idx) => {
              const active = selectedSet.has(opt.value);
              return (
                <div
                  key={String(opt.value)}
                  role="option"
                  aria-selected={active}
                  onMouseEnter={() => setHighlight(idx)}
                  onClick={() => toggleValue(opt.value)}
                  style={{
                    ...itemStyle,
                    background: highlight === idx ? "var(--select-option-hover-bg)" : "transparent",
                    transition: `background var(--motion-duration-fast) var(--motion-easing-standard)`,
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "var(--space-2)" }}>
                    {/* Animated checkbox icon */}
                    <span
                      aria-hidden
                      style={{
                        width: "var(--checkbox-size)",
                        height: "var(--checkbox-size)",
                        borderRadius: "var(--checkbox-radius)",
                        border: `var(--checkbox-border-width) solid var(--checkbox-border-color)`,
                        background: active ? "var(--checkbox-checked-bg)" : "var(--checkbox-bg)",
                        color: "var(--checkbox-check-color)",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transform: active ? "scale(1)" : "scale(0.96)",
                        transition: `transform var(--motion-duration-fast) var(--motion-easing-emphasize), background var(--motion-duration-fast) var(--motion-easing-standard), border-color var(--motion-duration-fast) var(--motion-easing-standard)`,
                        boxShadow: active ? `0 0 0 2px rgba(0,0,0,.02)` : "none",
                      }}
                    >
                      <div style={{
                        width: 14,
                        height: 14,
                        opacity: active ? 1 : 0,
                        transform: active ? "scale(1)" : "scale(0.6)",
                        transition: `opacity var(--motion-duration-fast) var(--motion-easing-standard), transform var(--motion-duration-fast) var(--motion-easing-emphasize)`,
                      }}>
                        <Check size={14} />
                      </div>
                    </span>
                    <span>{opt.label ?? String(opt.value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>,
        document.body
      )}

      {/* Keyframes injected once */}
      <style>{`
        @keyframes mcx-menu-in {
          from { opacity: 0; transform: scale(0.98); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}

