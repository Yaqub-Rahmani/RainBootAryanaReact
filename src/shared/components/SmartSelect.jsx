import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useId,
} from "react";
import { createPortal } from "react-dom";
import "../styles/select/SmartSelect.css";
import Button from "./Button";
import { ChevronDown, X, Loader2 } from "lucide-react";

function useDebounce(val, ms) {
  const [v, setV] = useState(val);
  useEffect(() => {
    const t = setTimeout(() => setV(val), ms);
    return () => clearTimeout(t);
  }, [val, ms]);
  return v;
}

const toKey = (v) => (v == null ? "" : String(v));

export default function SmartSelect(props) {
  const {
    options: rawOptions = [],
    value,
    onChange,
    multiple = false,
    placeholder = "انتخاب کنید...",
    searchable = true,
    clearable = true,
    creatable = false,
    onCreateOption,
    asyncLoadOptions,
    loading: loadingProp = false,
    disabled = false,
    noOptionsText = "گزینه‌ای یافت نشد",
    loadingText = "در حال بارگذاری…",
    dir = "rtl",
    size = "md", // xs/sm/md/lg/xl
    error,
    helperText,
    renderOption,
    getOptionLabel = (o) =>
      o && (o.label ?? o.text ?? o.name ?? o.title),
    getOptionValue = (o) =>
      o && (o.value ?? o.id ?? o.key ?? o.code ?? o),
    maxHeight = 320,
    debounceMs = 200,
    closeOnSelect = !multiple,

    // Ana ikon (Lucide component)
    icon: Icon,
    iconSize = 18,
    iconPosition = "right", // "left" | "right"
    iconOnly = false,

    // İç ikonlar (Lucide)
    caretIcon: CaretIcon = ChevronDown,
    clearIcon: ClearIcon = X,
    loadingIcon: LoadingIcon = Loader2,

    // Görsel
    elevated = true,
    usePortal = true,
  } = props;

  const isControlled = typeof value !== "undefined";
  const [innerValue, setInnerValue] = useState(
    multiple ? [] : null
  );
  const selectedValue = isControlled ? value : innerValue;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asyncOpts, setAsyncOpts] = useState([]);
  const [asyncHasMore, setAsyncHasMore] = useState(false);
  const [asyncPage, setAsyncPage] = useState(1);
  const [asyncLoading, setAsyncLoading] = useState(false);

  const [menuPos, setMenuPos] = useState(null);

  const id =
    typeof useId === "function"
      ? useId()
      : Math.random().toString(36).slice(2);

  const containerRef = useRef(null);
  const controlRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);
  const listRef = useRef(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  // Dış tıklama
  useEffect(() => {
    const handler = (e) => {
      const container = containerRef.current;
      const menu = menuRef.current;
      const path = e.composedPath ? e.composedPath() : [];

      if (
        container &&
        (path.includes(container) || container.contains(e.target))
      ) {
        return;
      }
      if (menu && (path.includes(menu) || menu.contains(e.target))) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener("pointerdown", handler, true);
    return () => {
      document.removeEventListener("pointerdown", handler, true);
    };
  }, []);

  // Açılınca search input fokus
  useEffect(() => {
    if (open && searchable) {
      requestAnimationFrame(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      });
    }
  }, [open, searchable]);

  // Menü pozisyonu (portal)
  const calculateMenuPosition = useCallback(() => {
    if (!usePortal) return null;

    const controlEl = controlRef.current || containerRef.current;
    if (!controlEl) return null;

    const rect = controlEl.getBoundingClientRect();
    const vw =
      window.innerWidth || document.documentElement.clientWidth;
    const vh =
      window.innerHeight || document.documentElement.clientHeight;
    const margin = 8;
    const minWidth = 220;

    let width = Math.max(rect.width, minWidth);
    let left = rect.left;

    if (left < margin) left = margin;
    if (left + width + margin > vw) {
      left = Math.max(margin, vw - width - margin);
    }

    const maxAvailableHeight = vh - rect.bottom - margin;
    const safeMaxHeight = Math.min(
      maxHeight,
      Math.max(120, vh - 2 * margin)
    );

    const top = rect.bottom + margin;
    const finalMaxHeight =
      maxAvailableHeight > 0
        ? Math.min(safeMaxHeight, maxAvailableHeight)
        : safeMaxHeight;

    return {
      top,
      left,
      width,
      maxHeight: finalMaxHeight,
    };
  }, [usePortal, maxHeight]);

  useEffect(() => {
    if (!open || !usePortal) {
      setMenuPos(null);
      return;
    }
    const pos = calculateMenuPosition();
    if (pos) {
      setMenuPos(pos);
    }
  }, [open, usePortal, calculateMenuPosition]);

  useEffect(() => {
    if (!usePortal || !open) return;

    const reflow = () => {
      const pos = calculateMenuPosition();
      if (pos) setMenuPos(pos);
    };

    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
    return () => {
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
    };
  }, [open, usePortal, calculateMenuPosition]);

  // Gruplu opsiyonlar
  const isGrouped =
    Array.isArray(rawOptions) &&
    rawOptions[0] &&
    rawOptions[0].options;

  const flatOptions = useMemo(() => {
    if (!isGrouped) return rawOptions;
    const out = [];
    for (const g of rawOptions) {
      for (const o of g.options) {
        out.push({ ...o, group: g.label });
      }
    }
    return out;
  }, [rawOptions, isGrouped]);

  const baseOptions = asyncLoadOptions ? asyncOpts : flatOptions;

  // Filtre
  const filtered = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q || asyncLoadOptions) return baseOptions;
    return baseOptions.filter((o) =>
      (getOptionLabel(o) || "").toLowerCase().includes(q)
    );
  }, [baseOptions, debouncedQuery, asyncLoadOptions, getOptionLabel]);

  // Async yükleme
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!asyncLoadOptions || !open) return;
      setAsyncLoading(true);
      try {
        const { options: newOpts = [], hasMore = false } =
          await asyncLoadOptions(debouncedQuery, 1);
        if (ignore) return;
        setAsyncOpts(newOpts);
        setAsyncHasMore(!!hasMore);
        setAsyncPage(1);
      } finally {
        if (!ignore) setAsyncLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [asyncLoadOptions, debouncedQuery, open]);

  const loadMore = async () => {
    if (!asyncLoadOptions || !asyncHasMore || asyncLoading) return;
    setAsyncLoading(true);
    try {
      const nextPage = asyncPage + 1;
      const { options: newOpts = [], hasMore = false } =
        await asyncLoadOptions(debouncedQuery, nextPage);

      setAsyncOpts((prev) => [...prev, ...newOpts]);
      setAsyncHasMore(!!hasMore);
      setAsyncPage(nextPage);
    } finally {
      setAsyncLoading(false);
    }
  };

  // Seçili anahtarlar
  const selectedKeys = useMemo(() => {
    const arr = multiple
      ? Array.isArray(selectedValue)
        ? selectedValue
        : []
      : selectedValue != null
      ? [selectedValue]
      : [];
    return new Set(arr.map(toKey));
  }, [selectedValue, multiple]);

  // Görünen metin
  const display = useMemo(() => {
    const labels = [...selectedKeys].map((k) => {
      const o = baseOptions.find(
        (x) => toKey(getOptionValue(x)) === k
      );
      if (!o) return k;
      const raw = getOptionLabel(o);
      const safe =
        raw == null || raw === ""
          ? String(getOptionValue(o) ?? k)
          : String(raw);
      return safe;
    });

    if (labels.length === 0) return "";
    if (!multiple) return labels[0];
    if (labels.length === 1) return labels[0];
    return `${labels[0]} +${labels.length - 1}`;
  }, [selectedKeys, baseOptions, multiple, getOptionLabel, getOptionValue]);

  const commitChange = (next) => {
    if (isControlled) {
      onChange && onChange(next);
    } else {
      setInnerValue(next);
      onChange && onChange(next);
    }
  };

  const selectOption = (opt) => {
    if (!opt || opt.disabled) return;
    const v = getOptionValue(opt);

    if (multiple) {
      const prevArr = Array.isArray(selectedValue)
        ? selectedValue
        : [];
      const has = new Set(prevArr.map(toKey));
      const key = toKey(v);
      const nextArr = has.has(key)
        ? prevArr.filter((x) => toKey(x) !== key)
        : [...prevArr, v];
      commitChange(nextArr);
      if (closeOnSelect) setOpen(false);
    } else {
      const cur = [...selectedKeys][0];
      const next = cur === toKey(v) ? null : v;
      commitChange(next);
      if (closeOnSelect) setOpen(false);
    }
  };

  const clearSelection = () => {
    commitChange(multiple ? [] : null);
    setQuery("");
    if (searchable && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  // Keyboard navigation
  const [activeIndex, setActiveIndex] = useState(-1);
  useEffect(() => {
    if (open) setActiveIndex(-1);
  }, [open, debouncedQuery]);

  const moveActive = (dirStep) => {
    const arr = filtered;
    if (!arr.length) return;
    let i = activeIndex + dirStep;
    if (i < 0) i = arr.length - 1;
    if (i >= arr.length) i = 0;
    setActiveIndex(i);
    const el =
      listRef.current &&
      listRef.current.children &&
      listRef.current.children[i];
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "nearest" });
    }
  };

  const textDir = dir === "rtl" ? "rtl" : "ltr";

  const rootClasses = [
    "ss",
    `ss--${size}`,
    disabled ? "ss--disabled" : "",
    iconOnly ? "ss--icon-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Menü render koşulu (flicker/scroll sorunu için kritik)
  const shouldRenderMenu =
    open && (!usePortal || !!menuPos);

  const menu = shouldRenderMenu ? (
    <div
      ref={menuRef}
      id={`ss-list-${id}`}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      className={[
        "ss__menu",
        usePortal ? "" : "ss__menu--inline",
        elevated ? "ss__menu--elevated" : "ss__menu--flat",
      ]
        .filter(Boolean)
        .join(" ")}
      style={
        usePortal && menuPos
          ? {
              position: "fixed",
              top: menuPos.top,
              left: menuPos.left,
              width: menuPos.width,
              maxHeight: menuPos.maxHeight,
              zIndex: 9999,
            }
          : { maxHeight }
      }
    >
      {searchable && (
        <div className="ss__search">
          <input
            ref={searchInputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="ss__search-input"
            placeholder={dir === "rtl" ? "جستجو..." : "Search..."}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                moveActive(1);
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                moveActive(-1);
              } else if (e.key === "Enter") {
                if (activeIndex > -1) {
                  selectOption(filtered[activeIndex]);
                }
              } else if (e.key === "Escape") {
                setOpen(false);
              }
            }}
          />
        </div>
      )}

      <div
        className="ss__list"
        ref={listRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          if (
            el.scrollTop + el.clientHeight >=
            el.scrollHeight - 8
          ) {
            if (asyncLoadOptions && asyncHasMore && !asyncLoading) {
              loadMore();
            }
          }
        }}
      >
        {(loadingProp || asyncLoading) && (
          <div className="ss__meta ss__meta--loading">
            {LoadingIcon && (
              <LoadingIcon
                className="ss__meta-icon"
                size={14}
              />
            )}
            <span>{loadingText}</span>
          </div>
        )}

        {creatable &&
          query &&
          !filtered.some(
            (o) =>
              (getOptionLabel(o) || "")
                .toLowerCase()
                .trim() === query.trim().toLowerCase()
          ) && (
            <div
              role="option"
              aria-selected={false}
              className="ss__option"
              onMouseDown={(e) => e.preventDefault()}
              onClick={async () => {
                if (!onCreateOption) return;
                const created = await onCreateOption(query.trim());
                if (!created) return;
                selectOption(created);
                setQuery("");
              }}
            >
              {dir === "rtl"
                ? `+ افزودن "${query.trim()}"`
                : `+ Add "${query.trim()}"`}
            </div>
          )}

        {filtered.length === 0 &&
          !(loadingProp || asyncLoading) && (
            <div className="ss__meta">{noOptionsText}</div>
          )}

        {filtered.map((opt, idx) => {
          const key = toKey(getOptionValue(opt));
          const selected = selectedKeys.has(key);
          const className = [
            "ss__option",
            selected ? "is-selected" : "",
            opt.disabled ? "ss__option--disabled" : "",
            activeIndex === idx ? "is-active" : "",
          ]
            .filter(Boolean)
            .join(" ");

          const defaultContent = (
            <div className="ss__option-content">
              {multiple && (
                <input
                  type="checkbox"
                  readOnly
                  checked={selected}
                />
              )}
              <span className="ss__option-label">
                {(() => {
                  const raw = getOptionLabel(opt);
                  const safe =
                    raw == null || raw === ""
                      ? String(getOptionValue(opt) ?? "")
                      : String(raw);
                  return safe;
                })()}
              </span>
              {opt.group && (
                <span className="ss__group">{opt.group}</span>
              )}
            </div>
          );

          const content = renderOption
            ? renderOption(opt)
            : defaultContent;

          return (
            <div
              key={key}
              role="option"
              aria-selected={selected}
              className={className}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectOption(opt)}
              onMouseEnter={() => setActiveIndex(idx)}
            >
              {content}
            </div>
          );
        })}

        {asyncLoadOptions &&
          asyncHasMore &&
          !asyncLoading && (
            <button
              type="button"
              className="ss__option ss__option--more"
              onMouseDown={(e) => e.preventDefault()}
              onClick={loadMore}
            >
              {dir === "rtl" ? "بیشتر نشان بده" : "Show more"}
            </button>
          )}
      </div>
    </div>
  ) : null;

  const handleControlKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      moveActive(-1);
    } else if (e.key === "Enter") {
      if (open && activeIndex > -1) {
        selectOption(filtered[activeIndex]);
      } else {
        setOpen((o) => !o);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const hasSelection = selectedKeys.size > 0;

  return (
    <div
      ref={containerRef}
      dir={dir}
      className={rootClasses}
    >
      {/* CONTROL */}
      {iconOnly ? (
        <Button
          ref={controlRef}
          as="button"
          type="button"
          icon={Icon || CaretIcon}
          iconOnly
          size="sm"
          ariaLabel={
            placeholder ||
            (dir === "rtl" ? "باز کردن منو" : "Open menu")
          }
          disabled={disabled}
          className="ss__control ss__control--icon-only"
          onClick={(e) => {
            if (disabled) return;
            e.preventDefault();
            setOpen((o) => !o);
          }}
          onKeyDown={handleControlKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`ss-list-${id}`}
        />
      ) : (
        <div
          ref={controlRef}
          className="ss__control"
          onPointerDown={(e) => {
            if (disabled) return;
            e.preventDefault();
            setOpen(true);
          }}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`ss-list-${id}`}
          tabIndex={0}
          onKeyDown={handleControlKeyDown}
        >
          {Icon && iconPosition === "left" && (
            <span className="ss__icon ss__icon--left">
              <Icon size={iconSize} />
            </span>
          )}

          <div
            className="ss__value"
            style={{
              textAlign: textDir === "rtl" ? "right" : "left",
            }}
          >
            {multiple ? (
              display ? (
                <>
                  <span className="ss__chip">
                    {display.includes("+")
                      ? display.split(" +")[0]
                      : display}
                  </span>
                  {display.includes("+") && (
                    <span className="ss__chip">
                      +{display.split(" +")[1]}
                    </span>
                  )}
                </>
              ) : (
                <span className="ss__placeholder">
                  {placeholder}
                </span>
              )
            ) : display ? (
              <span className="truncate">{display}</span>
            ) : (
              <span className="ss__placeholder">
                {placeholder}
              </span>
            )}
          </div>

          {Icon && iconPosition === "right" && (
            <span className="ss__icon ss__icon--right">
              <Icon size={iconSize} />
            </span>
          )}

          {clearable && hasSelection && (
            <button
              type="button"
              className="ss__clear"
              onPointerDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                clearSelection();
              }}
              aria-label={dir === "rtl" ? "پاک کردن" : "Clear"}
            >
              <ClearIcon size={14} />
            </button>
          )}

          <span className="ss__caret">
            <CaretIcon size={14} />
          </span>
        </div>
      )}

      {/* MENÜ: portal / inline */}
      {usePortal
        ? menu && createPortal(menu, document.body)
        : menu}

      {(error || helperText) && (
        <div
          className={`ss__help ${
            error ? "ss__help--error" : ""
          }`}
        >
          {error || helperText}
        </div>
      )}
    </div>
  );
}

export { SmartSelect };
