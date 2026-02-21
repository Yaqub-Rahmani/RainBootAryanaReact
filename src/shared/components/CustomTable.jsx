import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import "../styles/table/CustomTable.css";

import Button from "../components/Button";
import Input from "../components/Input";
import SmartSelect from "../components/SmartSelect";
import CustomDatePicker from "../date/CustomDatePicker";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, Columns3, Search, X } from "lucide-react";
import { CheckboxMenuPro } from "./CheckboxMenuPro";

const defaultRowKey = (row, idx) => row?.id ?? String(idx);

const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);
const ymd = (d) => {
  if (!d) return null;
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
};
const inRange = (d, start, end) => {
  const t = ymd(d);
  const s = ymd(start);
  const e = ymd(end);
  if (!t || !s) return false;
  if (!e) return t === s;
  return t >= s && t <= e;
};

export default function CustomTable({
  columns: inputColumns = [],
  data: inputData = [],
  loading = false,
  stickyFirstCol = false,
  pageSizeOptions = [10, 25, 50, 100],
  initialPageSize = 25,
  initialDensity = "comfy",
  rowKey = defaultRowKey,
  toolbarTitle = "Kayıtlar",
  emptyMessage = "Kayıt bulunamadı.",
  onSelectionChange,
  /** DEĞİŞTİ: Seçili satır OBJELERİNİ yollarım */
  onSelectedClick,
  enableSearch = true,
  showSearch = true,

  // 🔹 Yeni eklenen props
  addButtonLabel,      // string - buton yazısı
  addButtonIcon,       // isteğe bağlı ikon
  onAddClick,          // function - buton tıklama
  showAddButton = false,
  onLoadingChange,     // loading değişince çağrılacak callback
}) {
  const [density] = useState(initialDensity);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [page, setPage] = useState(0);

  // --- loading -> dışarı bildirim
  useEffect(() => {
    if (typeof onLoadingChange === "function") {
      onLoadingChange(loading);
    }
  }, [loading, onLoadingChange]);

  // --- ARAMA: hem string hem event destekle
  const [globalQuery, setGlobalQuery] = useState("");
  // const handleSearchChange = useCallback((arg) => {
  //   const next = typeof arg === "string" ? arg : arg?.target?.value;
  //   setPage(0);
  //   setGlobalQuery(next ?? "");
  // }, []);
  const handleSearchChange = useCallback((arg) => {
  const next = typeof arg === "string" ? arg : arg?.target?.value;
  setPage(0);
  setGlobalQuery(next ?? "");
}, []);

const handleClearSearch = () => {
  setPage(0);
  setGlobalQuery("");
};

  // Filtreler
  const [primaryValue, setPrimaryValue] = useState(null);
  const [secondaryValue, setSecondaryValue] = useState(null);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [warnDateOrder, setWarnDateOrder] = useState("");

  // Sütun state
  const [colState, setColState] = useState(() =>
    inputColumns.map((c) => ({
      ...c,
      visible: c.visible !== false,
      width: c.width || Math.max(c.minWidth ?? 120, 120),
      minWidth: Math.max(c.minWidth ?? 80, 80),
      searchable: c.searchable === true,
      primaryFilter: c.primaryFilter === true,
      secondaryFilter: c.secondaryFilter === true,
      dateFilter: c.dateFilter === true,
    }))
  );

  // Çoklu sıralama
  const [sortState, setSortState] = useState([]); // [{key, dir}]

  // Seçimler
  const [selected, setSelected] = useState(new Set());

  // Sütunları güncel tut
  useEffect(() => {
    setColState((prev) => {
      const next = inputColumns.map((c) => {
        const old = prev.find((p) => p.key === c.key);
        return {
          ...c,
          visible: old ? old.visible : c.visible !== false,
          width: old ? old.width : (c.width || Math.max(c.minWidth ?? 120, 120)),
          minWidth: old ? old.minWidth : Math.max(c.minWidth ?? 80, 80),
          searchable: c.searchable === true,
          primaryFilter: c.primaryFilter === true,
          secondaryFilter: c.secondaryFilter === true,
          dateFilter: c.dateFilter === true,
        };
      });
      return next;
    });
  }, [inputColumns]);

  const primaryCol = useMemo(() => colState.find((c) => c.primaryFilter), [colState]);
  const secondaryCol = useMemo(() => colState.find((c) => c.secondaryFilter), [colState]);
  const dateCol = useMemo(() => colState.find((c) => c.dateFilter), [colState]);

  const primaryOptions = useMemo(() => {
    if (!primaryCol) return [];
    const set = new Map();
    for (const r of inputData) {
      const v = r?.[primaryCol.key];
      const label = v == null ? "" : String(v);
      const id = `${primaryCol.key}::${label}`;
      if (!set.has(id)) set.set(id, { value: label, label });
    }
    return Array.from(set.values());
  }, [inputData, primaryCol]);

  const secondaryOptions = useMemo(() => {
    if (!secondaryCol) return [];
    const filtered = primaryCol && primaryValue
      ? inputData.filter((r) => String(r?.[primaryCol.key]) === String(primaryValue))
      : inputData;
    const set = new Map();
    for (const r of filtered) {
      const v = r?.[secondaryCol.key];
      const label = v == null ? "" : String(v);
      const id = `${secondaryCol.key}::${label}`;
      if (!set.has(id)) set.set(id, { value: label, label });
    }
    return Array.from(set.values());
  }, [inputData, primaryCol, primaryValue, secondaryCol]);

  // --- Arama (sadece searchable kolonlarda)
  const filteredBySearch = useMemo(() => {
    if (!enableSearch) return inputData;
    const q = globalQuery.trim().toLowerCase();
    if (!q) return inputData;
    const keys = colState.filter((c) => c.searchable).map((c) => c.key);
    if (!keys.length) return inputData;
    return inputData.filter((row) =>
      keys.some((k) => {
        const v = row[k];
        return v != null && String(v).toLowerCase().includes(q);
      })
    );
  }, [enableSearch, globalQuery, inputData, colState]);

  const hasSearchableCols = useMemo(() => colState.some((c) => c.searchable), [colState]);

  // --- Select + Tarih
  const filteredBySelects = useMemo(() => {
    let arr = filteredBySearch;

    if (primaryCol && primaryValue != null && String(primaryValue).length) {
      arr = arr.filter((r) => String(r?.[primaryCol.key]) === String(primaryValue));
    }
    if (secondaryCol && secondaryValue != null && String(secondaryValue).length) {
      arr = arr.filter((r) => String(r?.[secondaryCol.key]) === String(secondaryValue));
    }
    if (dateCol && startDate) {
      arr = arr.filter((r) => {
        const dv = toDate(r?.[dateCol.key]);
        return inRange(dv, startDate, endDate);
      });
    }
    return arr;
  }, [filteredBySearch, primaryCol, primaryValue, secondaryCol, secondaryValue, dateCol, startDate, endDate]);

  // --- Sıralama
  const sortedData = useMemo(() => {
    if (!sortState.length) return filteredBySelects;
    const arr = [...filteredBySelects];
    const getType = (key) => colState.find((c) => c.key === key)?.type;
    arr.sort((a, b) => {
      for (const s of sortState) {
        const av = a[s.key];
        const bv = b[s.key];
        const t = getType(s.key);
        let comp = 0;
        if (av == null && bv != null) comp = -1;
        else if (av != null && bv == null) comp = 1;
        else if (av == null && bv == null) comp = 0;
        else if (t === "number") comp = Number(av) - Number(bv);
        else if (t === "date") comp = (toDate(av)?.getTime() ?? 0) - (toDate(bv)?.getTime() ?? 0);
        else if (typeof av === "number" && typeof bv === "number") comp = av - bv;
        else comp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
        if (comp !== 0) return s.dir === "asc" ? comp : -comp;
      }
      return 0;
    });
    return arr;
  }, [filteredBySelects, sortState, colState]);

  // --- Sayfalama
  const total = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  useEffect(() => {
    if (page >= totalPages) setPage(totalPages - 1);
  }, [totalPages, page]);

  const pageData = useMemo(() => {
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  // --- Seçimler (ID’ler)
  const rowIdsOnPage = useMemo(
    () => pageData.map((r, i) => rowKey(r, i + page * pageSize)),
    [pageData, rowKey, page, pageSize]
  );
  const selectedCount = selected.size;
  const allChecked = rowIdsOnPage.every((id) => selected.has(id)) && rowIdsOnPage.length > 0;
  const someChecked = !allChecked && rowIdsOnPage.some((id) => selected.has(id));

  const headerCheckRef = useRef(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someChecked && !allChecked;
    }
  }, [someChecked, allChecked]);

  useEffect(() => {
    onSelectionChange?.(selected);
  }, [selected, onSelectionChange]);

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allChecked) rowIdsOnPage.forEach((id) => next.delete(id));
      else rowIdsOnPage.forEach((id) => next.add(id));
      return next;
    });
  };
  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // --- Başlığa tıkla sıra
  const onHeaderClick = (col, e) => {
    if (!col.sortable) return;
    setSortState((prev) => {
      const exists = prev.find((s) => s.key === col.key);
      const withShift = e.shiftKey;
      const cycle = (dir) => (dir === "asc" ? "desc" : dir === "desc" ? null : "asc");

      if (withShift) {
        if (!exists) return [...prev, { key: col.key, dir: "asc" }];
        const nextDir = cycle(exists.dir);
        if (!nextDir) return prev.filter((s) => s.key !== col.key);
        return prev.map((s) => (s.key === col.key ? { ...s, dir: nextDir } : s));
      } else {
        if (!exists) return [{ key: col.key, dir: "asc" }];
        const nextDir = cycle(exists.dir);
        return nextDir ? [{ key: col.key, dir: nextDir }] : [];
      }
    });
  };

  // --- Sütun genişliği sürükleme
  const startResize = (e, colKey) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const start = colState.find((c) => c.key === colKey);
    if (!start) return;

    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      setColState((cs) =>
        cs.map((c) =>
          c.key === colKey
            ? { ...c, width: Math.max(c.minWidth ?? 80, (start.width || 120) + delta) }
            : c
        )
      );
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const visibleCols = colState.filter((c) => c.visible);
  const alignStyle = (col) =>
    col.align === "right" ? { textAlign: "right" } :
    col.align === "center" ? { textAlign: "center" } : {};

  // --- Tarih kuralları
  useEffect(() => {
    if (startDate && endDate && ymd(endDate) < ymd(startDate)) {
      setWarnDateOrder("Bitiş tarihi başlangıç tarihinden önce olamaz.");
    } else {
      setWarnDateOrder("");
    }
  }, [startDate, endDate]);

  useEffect(() => { setSecondaryValue(null); }, [primaryValue]);

  useEffect(() => {
    if (!enableSearch && globalQuery) setGlobalQuery("");
  }, [enableSearch]); 

  const clearFilters = () => {
    setPrimaryValue(null);
    setSecondaryValue(null);
    setStartDate(null);
    setEndDate(null);
    setWarnDateOrder("");
  };

  // --- Sütun menüsü (click ile aç/kapa)
  const colsBtnRef = useRef(null);
  const colsMenuRef = useRef(null);
  const [colsOpen, setColsOpen] = useState(false);

  useEffect(() => {
    if (!colsOpen) return;
    const onDocMouseDown = (e) => {
      const b = colsBtnRef.current;
      const m = colsMenuRef.current;
      if (b && b.contains(e.target)) return;
      if (m && m.contains(e.target)) return;
      setColsOpen(false);
    };
    const onKey = (e) => { if (e.key === "Escape") setColsOpen(false); };

    document.addEventListener("mousedown", onDocMouseDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [colsOpen]);

  // --- SEÇİLEN SATIR OBJELERİ (global indeksle)
  const selectedRows = useMemo(() => {
    return sortedData.filter((row, i) => selected.has(rowKey(row, i)));
  }, [sortedData, selected, rowKey]);

  const handleSendSelected = () => {
    onSelectedClick?.(selectedRows);
  };

  return (
    <div className={`ct ${stickyFirstCol ? "ct--sticky-first" : ""} ct--${density}`} dir="rtl">
      {/* Toolbar */}
      <div className="ct__toolbar">
        <div className="ct__title ct__title--start">
          <strong>{toolbarTitle}</strong>
          <span className="ct__count">({total.toLocaleString("en-US")}) رکورد</span>
        </div>

        <div className="ct__inline-filters">
          {primaryCol && (
            <div className="ct__filter-inline" title="فیلتر اصلی">
              <SmartSelect
                options={primaryOptions}
                value={primaryValue}
                onChange={(val) => { setPage(0); setPrimaryValue(val); }}
                placeholder="انتخاب کنید…"
                clearable
                searchable
                dir="rtl"
                size="md"
              />
            </div>
          )}

          {secondaryCol && primaryValue && (
            <div className="ct__filter-inline" title="زیر فیلتر">
              <SmartSelect
                options={secondaryOptions}
                value={secondaryValue}
                onChange={(val) => { setPage(0); setSecondaryValue(val); }}
                placeholder="زیر گزینه را انتخاب کنید…"
                clearable
                searchable
                dir="rtl"
                size="md"
              />
            </div>
          )}

          {dateCol && (
            <div className="ct__filter-inline ct__filter-inline--date" title="فیلتر تاریخ">
              <CustomDatePicker
                mode="single"
                value={startDate}
                onChange={(d) => { setPage(0); setStartDate(d); if (endDate && d && ymd(endDate) < ymd(d)) setEndDate(null); }}
                placeholder="تاریخ را انتخاب کنید…"
                dir="rtl"
              />
              {startDate && (
                <CustomDatePicker
                  mode="single"
                  value={endDate}
                  onChange={(d) => { setPage(0); setEndDate(d); }}
                  placeholder="تاریخ پایان (اختیاری)…"
                  dir="rtl"
                />
              )}
              {warnDateOrder && (
                <div className="ct__warn" role="alert" aria-live="polite">{warnDateOrder}</div>
              )}
            </div>
          )}
        </div>

        <div className={`ct__tools ct__tools--end ${!(enableSearch && showSearch && hasSearchableCols) ? "ct__tools--no-search" : ""}`}> 
        {enableSearch && showSearch && hasSearchableCols && (
          <div className="ct__search" title="جستجو">
            <Input
              id="table-search"
              name="table-search"
              value={globalQuery}
              onChange={handleSearchChange}
              placeholder="جستجو..."
              icon={Search}
              iconRight={globalQuery ? X : null}
              onIconRightClick={handleClearSearch}
              className="ct__search-input"
              inputClassName="w-full"
              autoComplete="off"
              dir="rtl"
            />
          </div>
        )}


          <div className="ct__menu-wrapper" ref={colsMenuRef}>
            <CheckboxMenuPro
              options={colState.map((c) => ({
                value: c.key,
                label: c.header ?? c.key,
              }))}
              value={colState.filter((c) => c.visible).map((c) => c.key)}
              onChange={(selected) =>
                setColState((s) =>
                  s.map((col) => ({ ...col, visible: selected.includes(col.key) }))
                )
              }
              searchable
              align="end"
              maxHeight={300}
              display="iconCount"
              icon={Columns3}
              placeholder="ستون ها"
            />
          </div>

          {/* 🔹 Ekle butonu */}
            {showAddButton && addButtonLabel && typeof onAddClick === "function" && (
              <Button
                onClick={onAddClick}
                icon={addButtonIcon}
              >
                {addButtonLabel}
              </Button>
            )}

          {/* Seçilenler */}
          {selectedCount > 0 && (
            <Button
              className="ct__btn ct__btn--selected"
              onClick={handleSendSelected}
              aria-label="Seçilen kayıtlar işlemleri"
            >
              انتخاب شده ({selectedCount})
            </Button>
          )}
        </div>
      </div>

      <div className="ct__viewport">
        <table className="ct__table">
          <thead className="ct__thead">
            <tr>
              <th className="ct__th ct__th--sel">
                <label className={`ct__checkbox ${someChecked ? "is-indeterminate" : ""}`}>
                  <input
                    ref={headerCheckRef}
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-checked={someChecked ? "mixed" : allChecked}
                  />
                  <span className="ct__checkmark" />
                </label>
              </th>
              <th className="ct__th ct__th--rowno" title="ردیف">#</th>
              {visibleCols.map((col, idx) => (
                <th
                  key={col.key}
                  className={`ct__th ${col.sortable ? "ct__th--sortable" : ""} ${idx===0 && stickyFirstCol ? "ct__th--sticky" : ""}`}
                  style={{ width: col.width, minWidth: col.minWidth, ...alignStyle(col) }}
                  onClick={(e) => onHeaderClick(col, e)}
                >
                  <div className="ct__th-inner">
                    <span className="ct__th-text">{col.header ?? col.key}</span>
                    {col.sortable && <SortIcon sortState={sortState} colKey={col.key} />}
                  </div>
                  <div
                    className="ct__resizer"
                    onMouseDown={(e) => startResize(e, col.key)}
                    onClick={(e) => e.stopPropagation()}
                    role="separator"
                    aria-orientation="vertical"
                    aria-label={`تنظیم عرض ستون ${col.header ?? col.key}`}
                  />
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="ct__tbody">
            {loading ? (
              [...Array(Math.min(pageSize, 10))].map((_, i) => (
                <tr key={`skel-${i}`} className="ct__tr">
                  <td className="ct__td ct__td--sel"><div className="ct__skeleton ct__skeleton--check" /></td>
                  <td className="ct__td ct__td--rowno"><div className="ct__skeleton" /></td>
                  {visibleCols.map((c) => (
                    <td key={c.key} className="ct__td" style={{ ...alignStyle(c) }}>
                      <div className="ct__skeleton" />
                    </td>
                  ))}
                </tr>
              ))
            ) : pageData.length === 0 ? (
              <tr className="ct__tr ct__tr--empty">
                <td className="ct__td" colSpan={visibleCols.length + 2}>
                  <div className="ct__empty">
                    <div className="ct__empty-icon" aria-hidden>📄</div>
                    <div className="ct__empty-title">{emptyMessage || "هیچ رکوردی یافت نشد."}</div>
                  </div>
                </td>
              </tr>
            ) : (
              pageData.map((row, ri) => {
                const id = rowKey(row, ri + page * pageSize);
                const rowNo = (page * pageSize + ri + 1).toLocaleString("en-US");
                return (
                  <tr key={id} className={`ct__tr ${selected.has(id) ? "is-active" : ""}`}>
                    <td className="ct__td ct__td--sel">
                      <label className="ct__checkbox">
                        <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} />
                        <span className="ct__checkmark" />
                      </label>
                    </td>
                    <td className="ct__td ct__td--rowno" title="ردیف">{rowNo}</td>
                    {visibleCols.map((col, idx) => (
                      <td
                        key={col.key}
                        className={`ct__td ${idx===0 && stickyFirstCol ? "ct__td--sticky" : ""}`}
                        style={{ width: col.width, minWidth: col.minWidth, ...alignStyle(col) }}
                        title={row[col.key] != null ? String(row[col.key]) : ""}
                      >
                        {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "")}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="ct__footer">
        <div className="ct__pagination" aria-label="صفحه‌بندی">
          <Button className="ct__btn" onClick={() => setPage(0)} disabled={page === 0} aria-label="اولین صفحه" iconOnly icon={ChevronsLeft} />
          <Button className="ct__btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="صفحه قبلی" iconOnly icon={ChevronLeft} />
          <span className="ct__page-info">
            صفحه <strong>{(page + 1).toLocaleString("en-US")}</strong> از {totalPages.toLocaleString("en-US")}
          </span>
          <Button className="ct__btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} aria-label="صفحه بعدی" iconOnly icon={ChevronRight} />
          <Button className="ct__btn" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} aria-label="آخرین صفحه" iconOnly icon={ChevronsRight} />
        </div>

        <div className="ct__pagesize">
          <label className="ct__ps-label">اندازه صفحه</label>
          <select
            className="ct__select"
            value={pageSize}
            onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
            aria-label="اندازه صفحه"
            dir="ltr"
          >
            {pageSizeOptions.map((n) => (
              <option key={n} value={n}>{Number(n).toLocaleString("en-US")}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function SortIcon({ sortState, colKey }) {
  const idx = sortState.findIndex((s) => s.key === colKey);
  if (idx === -1) return <span className="ct__sort ct__sort--none" aria-hidden="true">↕</span>;
  const dir = sortState[idx].dir;
  return (
    <span className={`ct__sort ct__sort--${dir}`} aria-label={`Sıralama: ${dir}${sortState.length>1?` (#${idx+1})`:''}`}>
      {dir === "asc" ? "↑" : "↓"}{sortState.length>1 ? <sup>{idx+1}</sup> : null}
    </span>
  );
}


// import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
// import "../styles/table/CustomTable.css";

// import Button from "../components/Button";
// import Input from "../components/Input";
// import SmartSelect from "../components/SmartSelect";
// import CustomDatePicker from "../date/CustomDatePicker";
// import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, ChevronDown, Columns3 } from "lucide-react";
// import { CheckboxMenuPro } from "./CheckboxMenuPro";


// const defaultRowKey = (row, idx) => row?.id ?? String(idx);

// const toDate = (v) => (v instanceof Date ? v : v ? new Date(v) : null);
// const ymd = (d) => {
//   if (!d) return null;
//   const yy = d.getFullYear();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${yy}-${mm}-${dd}`;
// };
// const inRange = (d, start, end) => {
//   const t = ymd(d);
//   const s = ymd(start);
//   const e = ymd(end);
//   if (!t || !s) return false;
//   if (!e) return t === s;
//   return t >= s && t <= e;
// };

// export default function CustomTable({
//   columns: inputColumns = [],
//   data: inputData = [],
//   loading = false,
//   stickyFirstCol = false,
//   pageSizeOptions = [10, 25, 50, 100],
//   initialPageSize = 25,
//   initialDensity = "comfy",
//   rowKey = defaultRowKey,
//   toolbarTitle = "Kayıtlar",
//   emptyMessage = "Kayıt bulunamadı.",
//   onSelectionChange,
//   /** DEĞİŞTİ: Seçili satır OBJELERİNİ yollarım */
//   onSelectedClick,
//   enableSearch = true,
//   showSearch = true,
// }) {
//   const [density] = useState(initialDensity);
//   const [pageSize, setPageSize] = useState(initialPageSize);
//   const [page, setPage] = useState(0);

//   // --- ARAMA: hem string hem event destekle
//   const [globalQuery, setGlobalQuery] = useState("");
//   const handleSearchChange = useCallback((arg) => {
//     const next = typeof arg === "string" ? arg : arg?.target?.value;
//     setPage(0);
//     setGlobalQuery(next ?? "");
//   }, []);

//   // Filtreler
//   const [primaryValue, setPrimaryValue] = useState(null);
//   const [secondaryValue, setSecondaryValue] = useState(null);
//   const [startDate, setStartDate] = useState(null);
//   const [endDate, setEndDate] = useState(null);
//   const [warnDateOrder, setWarnDateOrder] = useState("");

//   // Sütun state
//   const [colState, setColState] = useState(() =>
//     inputColumns.map((c) => ({
//       ...c,
//       visible: c.visible !== false,
//       width: c.width || Math.max(c.minWidth ?? 120, 120),
//       minWidth: Math.max(c.minWidth ?? 80, 80),
//       searchable: c.searchable === true,
//       primaryFilter: c.primaryFilter === true,
//       secondaryFilter: c.secondaryFilter === true,
//       dateFilter: c.dateFilter === true,
//     }))
//   );

//   // Çoklu sıralama
//   const [sortState, setSortState] = useState([]); // [{key, dir}]

//   // Seçimler
//   const [selected, setSelected] = useState(new Set());

//   // Sütunları güncel tut
//   useEffect(() => {
//     setColState((prev) => {
//       const next = inputColumns.map((c) => {
//         const old = prev.find((p) => p.key === c.key);
//         return {
//           ...c,
//           visible: old ? old.visible : c.visible !== false,
//           width: old ? old.width : (c.width || Math.max(c.minWidth ?? 120, 120)),
//           minWidth: old ? old.minWidth : Math.max(c.minWidth ?? 80, 80),
//           searchable: c.searchable === true,
//           primaryFilter: c.primaryFilter === true,
//           secondaryFilter: c.secondaryFilter === true,
//           dateFilter: c.dateFilter === true,
//         };
//       });
//       return next;
//     });
//   }, [inputColumns]);

//   const primaryCol = useMemo(() => colState.find((c) => c.primaryFilter), [colState]);
//   const secondaryCol = useMemo(() => colState.find((c) => c.secondaryFilter), [colState]);
//   const dateCol = useMemo(() => colState.find((c) => c.dateFilter), [colState]);

//   const primaryOptions = useMemo(() => {
//     if (!primaryCol) return [];
//     const set = new Map();
//     for (const r of inputData) {
//       const v = r?.[primaryCol.key];
//       const label = v == null ? "" : String(v);
//       const id = `${primaryCol.key}::${label}`;
//       if (!set.has(id)) set.set(id, { value: label, label });
//     }
//     return Array.from(set.values());
//   }, [inputData, primaryCol]);

//   const secondaryOptions = useMemo(() => {
//     if (!secondaryCol) return [];
//     const filtered = primaryCol && primaryValue
//       ? inputData.filter((r) => String(r?.[primaryCol.key]) === String(primaryValue))
//       : inputData;
//     const set = new Map();
//     for (const r of filtered) {
//       const v = r?.[secondaryCol.key];
//       const label = v == null ? "" : String(v);
//       const id = `${secondaryCol.key}::${label}`;
//       if (!set.has(id)) set.set(id, { value: label, label });
//     }
//     return Array.from(set.values());
//   }, [inputData, primaryCol, primaryValue, secondaryCol]);

//   // --- Arama (sadece searchable kolonlarda)
//   const filteredBySearch = useMemo(() => {
//     //   const q = globalQuery.trim().toLowerCase();
//     //   if (!q) return inputData;
//     //   const keys = colState.filter((c) => c.searchable).map((c) => c.key);
//     //   if (!keys.length) return inputData;
//     //   return inputData.filter((row) =>
//     //     keys.some((k) => {
//     //       const v = row[k];
//     //       return v != null && String(v).toLowerCase().includes(q);
//     //     })
//     //   );
//     // }, [globalQuery, inputData, colState]);

//     if (!enableSearch) return inputData;
//     const q = globalQuery.trim().toLowerCase();
//     if (!q) return inputData;
//     const keys = colState.filter((c) => c.searchable).map((c) => c.key);
//     if (!keys.length) return inputData;
//     return inputData.filter((row) =>
//       keys.some((k) => {
//         const v = row[k];
//         return v != null && String(v).toLowerCase().includes(q);
//       })
//     );
//   }, [enableSearch, globalQuery, inputData, colState]);

//   const hasSearchableCols = useMemo(() => colState.some((c) => c.searchable),[colState]);
  
//   // --- Select + Tarih
//   const filteredBySelects = useMemo(() => {
//     let arr = filteredBySearch;

//     if (primaryCol && primaryValue != null && String(primaryValue).length) {
//       arr = arr.filter((r) => String(r?.[primaryCol.key]) === String(primaryValue));
//     }
//     if (secondaryCol && secondaryValue != null && String(secondaryValue).length) {
//       arr = arr.filter((r) => String(r?.[secondaryCol.key]) === String(secondaryValue));
//     }
//     if (dateCol && startDate) {
//       arr = arr.filter((r) => {
//         const dv = toDate(r?.[dateCol.key]);
//         return inRange(dv, startDate, endDate);
//       });
//     }
//     return arr;
//   }, [filteredBySearch, primaryCol, primaryValue, secondaryCol, secondaryValue, dateCol, startDate, endDate]);

//   // --- Sıralama
//   const sortedData = useMemo(() => {
//     if (!sortState.length) return filteredBySelects;
//     const arr = [...filteredBySelects];
//     const getType = (key) => colState.find((c) => c.key === key)?.type;
//     arr.sort((a, b) => {
//       for (const s of sortState) {
//         const av = a[s.key];
//         const bv = b[s.key];
//         const t = getType(s.key);
//         let comp = 0;
//         if (av == null && bv != null) comp = -1;
//         else if (av != null && bv == null) comp = 1;
//         else if (av == null && bv == null) comp = 0;
//         else if (t === "number") comp = Number(av) - Number(bv);
//         else if (t === "date") comp = (toDate(av)?.getTime() ?? 0) - (toDate(bv)?.getTime() ?? 0);
//         else if (typeof av === "number" && typeof bv === "number") comp = av - bv;
//         else comp = String(av).localeCompare(String(bv), undefined, { numeric: true, sensitivity: "base" });
//         if (comp !== 0) return s.dir === "asc" ? comp : -comp;
//       }
//       return 0;
//     });
//     return arr;
//   }, [filteredBySelects, sortState, colState]);

//   // --- Sayfalama
//   const total = sortedData.length;
//   const totalPages = Math.max(1, Math.ceil(total / pageSize));
//   useEffect(() => {
//     if (page >= totalPages) setPage(totalPages - 1);
//   }, [totalPages, page]);

//   const pageData = useMemo(() => {
//     const start = page * pageSize;
//     return sortedData.slice(start, start + pageSize);
//   }, [sortedData, page, pageSize]);

//   // --- Seçimler (ID’ler)
//   const rowIdsOnPage = useMemo(
//     () => pageData.map((r, i) => rowKey(r, i + page * pageSize)),
//     [pageData, rowKey, page, pageSize]
//   );
//   const selectedCount = selected.size;
//   const allChecked = rowIdsOnPage.every((id) => selected.has(id)) && rowIdsOnPage.length > 0;
//   const someChecked = !allChecked && rowIdsOnPage.some((id) => selected.has(id));

//   const headerCheckRef = useRef(null);
//   useEffect(() => {
//     if (headerCheckRef.current) {
//       headerCheckRef.current.indeterminate = someChecked && !allChecked;
//     }
//   }, [someChecked, allChecked]);

//   useEffect(() => {
//     onSelectionChange?.(selected);
//   }, [selected, onSelectionChange]);

//   const toggleAll = () => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       if (allChecked) rowIdsOnPage.forEach((id) => next.delete(id));
//       else rowIdsOnPage.forEach((id) => next.add(id));
//       return next;
//     });
//   };
//   const toggleOne = (id) => {
//     setSelected((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   };

//   // --- Başlığa tıkla sıra
//   const onHeaderClick = (col, e) => {
//     if (!col.sortable) return;
//     setSortState((prev) => {
//       const exists = prev.find((s) => s.key === col.key);
//       const withShift = e.shiftKey;
//       const cycle = (dir) => (dir === "asc" ? "desc" : dir === "desc" ? null : "asc");

//       if (withShift) {
//         if (!exists) return [...prev, { key: col.key, dir: "asc" }];
//         const nextDir = cycle(exists.dir);
//         if (!nextDir) return prev.filter((s) => s.key !== col.key);
//         return prev.map((s) => (s.key === col.key ? { ...s, dir: nextDir } : s));
//       } else {
//         if (!exists) return [{ key: col.key, dir: "asc" }];
//         const nextDir = cycle(exists.dir);
//         return nextDir ? [{ key: col.key, dir: nextDir }] : [];
//       }
//     });
//   };

//   // --- Sütun genişliği sürükleme
//   const startResize = (e, colKey) => {
//     e.preventDefault();
//     e.stopPropagation();
//     const startX = e.clientX;
//     const start = colState.find((c) => c.key === colKey);
//     if (!start) return;

//     const onMove = (ev) => {
//       const delta = ev.clientX - startX;
//       setColState((cs) =>
//         cs.map((c) =>
//           c.key === colKey
//             ? { ...c, width: Math.max(c.minWidth ?? 80, (start.width || 120) + delta) }
//             : c
//         )
//       );
//     };
//     const onUp = () => {
//       window.removeEventListener("mousemove", onMove);
//       window.removeEventListener("mouseup", onUp);
//     };
//     window.addEventListener("mousemove", onMove);
//     window.addEventListener("mouseup", onUp);
//   };

//   const visibleCols = colState.filter((c) => c.visible);
//   const alignStyle = (col) =>
//     col.align === "right" ? { textAlign: "right" } :
//     col.align === "center" ? { textAlign: "center" } : {};

//   // --- Tarih kuralları
//   useEffect(() => {
//     if (startDate && endDate && ymd(endDate) < ymd(startDate)) {
//       setWarnDateOrder("Bitiş tarihi başlangıç tarihinden önce olamaz.");
//     } else {
//       setWarnDateOrder("");
//     }
//   }, [startDate, endDate]);

//   useEffect(() => { setSecondaryValue(null); }, [primaryValue]);

//    useEffect(() => {
//       if (!enableSearch && globalQuery) setGlobalQuery("");
//     }, [enableSearch]); 


//   const clearFilters = () => {
//     setPrimaryValue(null);
//     setSecondaryValue(null);
//     setStartDate(null);
//     setEndDate(null);
//     setWarnDateOrder("");
//   };

//   // --- Sütun menüsü (click ile aç/kapa)
//   const colsBtnRef = useRef(null);
//   const colsMenuRef = useRef(null);
//   const [colsOpen, setColsOpen] = useState(false);

//   useEffect(() => {
//     if (!colsOpen) return;
//     const onDocMouseDown = (e) => {
//       const b = colsBtnRef.current;
//       const m = colsMenuRef.current;
//       if (b && b.contains(e.target)) return;
//       if (m && m.contains(e.target)) return;
//       setColsOpen(false);
//     };
//     const onKey = (e) => { if (e.key === "Escape") setColsOpen(false); };

//     document.addEventListener("mousedown", onDocMouseDown);
//     document.addEventListener("keydown", onKey);
//     return () => {
//       document.removeEventListener("mousedown", onDocMouseDown);
//       document.removeEventListener("keydown", onKey);
//     };
//   }, [colsOpen]);

//   // --- SEÇİLEN SATIR OBJELERİ (global indeksle)
//   const selectedRows = useMemo(() => {
//     // sortedData içindeki global indeks ile üretilen id’yi eşleştiriyoruz
//     return sortedData.filter((row, i) => selected.has(rowKey(row, i)));
//   }, [sortedData, selected, rowKey]);

//   const handleSendSelected = () => {
//     onSelectedClick?.(selectedRows);
//   };

//   return (
//     <div className={`ct ${stickyFirstCol ? "ct--sticky-first" : ""} ct--${density}`} dir="rtl">
//       {/* Toolbar */}
//       <div className="ct__toolbar">
//         <div className="ct__title ct__title--start">
//           <strong>{toolbarTitle}</strong>
//           <span className="ct__count">({total.toLocaleString("en-US")}) رکورد</span>
//         </div>

//         <div className="ct__inline-filters">
//           {primaryCol && (
//             <div className="ct__filter-inline" title="فیلتر اصلی">
//               <SmartSelect
//                 options={primaryOptions}
//                 value={primaryValue}
//                 onChange={(val) => { setPage(0); setPrimaryValue(val); }}
//                 placeholder="انتخاب کنید…"
//                 clearable
//                 searchable
//                 dir="rtl"
//                 size="md"
//               />
//             </div>
//           )}

//           {secondaryCol && primaryValue && (
//             <div className="ct__filter-inline" title="زیر فیلتر">
//               <SmartSelect
//                 options={secondaryOptions}
//                 value={secondaryValue}
//                 onChange={(val) => { setPage(0); setSecondaryValue(val); }}
//                 placeholder="زیر گزینه را انتخاب کنید…"
//                 clearable
//                 searchable
//                 dir="rtl"
//                 size="md"
//               />
//             </div>
//           )}

//           {dateCol && (
//             <div className="ct__filter-inline ct__filter-inline--date" title="فیلتر تاریخ">
//               <CustomDatePicker
//                 mode="single"
//                 value={startDate}
//                 onChange={(d) => { setPage(0); setStartDate(d); if (endDate && d && ymd(endDate) < ymd(d)) setEndDate(null); }}
//                 placeholder="تاریخ را انتخاب کنید…"
//                 dir="rtl"
//               />
//               {startDate && (
//                 <CustomDatePicker
//                   mode="single"
//                   value={endDate}
//                   onChange={(d) => { setPage(0); setEndDate(d); }}
//                   placeholder="تاریخ پایان (اختیاری)…"
//                   dir="rtl"
//                 />
//               )}
//               {warnDateOrder && (
//                 <div className="ct__warn" role="alert" aria-live="polite">{warnDateOrder}</div>
//               )}
//             </div>
//           )}
//         </div>

//         <div className={`ct__tools ct__tools--end ${!(enableSearch && showSearch && hasSearchableCols) ? "ct__tools--no-search" : ""}`}> 
//           {/* <div className="ct__tools ct__tools--end"> */}
//                     {enableSearch && showSearch && hasSearchableCols && (
//             <div className="ct__search" title="جستجو">
//               <Input
//                 value={globalQuery}
//                 onChange={handleSearchChange}
//                 placeholder="جستجو…"
//                 aria-label="جستجوی کلی"
//                 size="md"
//                 dir="rtl"
//               />
//             </div>
//           )}
//             <div className="ct__menu-wrapper" ref={colsMenuRef}>
//               <CheckboxMenuPro
//                 options={colState.map((c) => ({
//                   value: c.key,
//                   label: c.header ?? c.key,
//                 }))}
//                 value={colState.filter((c) => c.visible).map((c) => c.key)}
//                 onChange={(selected) =>
//                   setColState((s) =>
//                     s.map((col) => ({ ...col, visible: selected.includes(col.key) }))
//                   )
//                 }
//                 searchable
//                 align="end"
//                 maxHeight={300}
//                 display="iconCount"   // "iconOnly" | "icon" | "textIcon" | "iconCount"
//                 icon={Columns3}       // tetik ikonu
//                 placeholder="ستون ها"
//               />

              
//             </div>
//           {/* Seçilenler */}
//           {selectedCount > 0 && (
//             <Button
//               className="ct__btn ct__btn--selected"
//               onClick={handleSendSelected}
//               aria-label="Seçilen kayıtlar işlemleri"
//             >
//               انتخاب شده ({selectedCount})
//             </Button>
//           )}
//         </div>
//       </div>

//       <div className="ct__viewport">
//         <table className="ct__table">
//           <thead className="ct__thead">
//             <tr>
//               <th className="ct__th ct__th--sel">
//                 <label className={`ct__checkbox ${someChecked ? "is-indeterminate" : ""}`}>
//                   <input
//                     ref={headerCheckRef}
//                     type="checkbox"
//                     checked={allChecked}
//                     onChange={toggleAll}
//                     aria-checked={someChecked ? "mixed" : allChecked}
//                   />
//                   <span className="ct__checkmark" />
//                 </label>
//               </th>
//               <th className="ct__th ct__th--rowno" title="ردیف">#</th>
//               {visibleCols.map((col, idx) => (
//                 <th
//                   key={col.key}
//                   className={`ct__th ${col.sortable ? "ct__th--sortable" : ""} ${idx===0 && stickyFirstCol ? "ct__th--sticky" : ""}`}
//                   style={{ width: col.width, minWidth: col.minWidth, ...alignStyle(col) }}
//                   onClick={(e) => onHeaderClick(col, e)}
//                 >
//                   <div className="ct__th-inner">
//                     <span className="ct__th-text">{col.header ?? col.key}</span>
//                     {col.sortable && <SortIcon sortState={sortState} colKey={col.key} />}
//                   </div>
//                   <div
//                     className="ct__resizer"
//                     onMouseDown={(e) => startResize(e, col.key)}
//                     onClick={(e) => e.stopPropagation()}
//                     role="separator"
//                     aria-orientation="vertical"
//                     aria-label={`تنظیم عرض ستون ${col.header ?? col.key}`}
//                   />
//                 </th>
//               ))}
//             </tr>
//           </thead>

//           <tbody className="ct__tbody">
//             {loading ? (
//               [...Array(Math.min(pageSize, 10))].map((_, i) => (
//                 <tr key={`skel-${i}`} className="ct__tr">
//                   <td className="ct__td ct__td--sel"><div className="ct__skeleton ct__skeleton--check" /></td>
//                   <td className="ct__td ct__td--rowno"><div className="ct__skeleton" /></td>
//                   {visibleCols.map((c) => (
//                     <td key={c.key} className="ct__td" style={{ ...alignStyle(c) }}>
//                       <div className="ct__skeleton" />
//                     </td>
//                   ))}
//                 </tr>
//               ))
//             ) : pageData.length === 0 ? (
//               <tr className="ct__tr ct__tr--empty">
//                 <td className="ct__td" colSpan={visibleCols.length + 2}>
//                   <div className="ct__empty">
//                     <div className="ct__empty-icon" aria-hidden>📄</div>
//                     <div className="ct__empty-title">{emptyMessage || "هیچ رکوردی یافت نشد."}</div>
//                   </div>
//                 </td>
//               </tr>
//             ) : (
//               pageData.map((row, ri) => {
//                 const id = rowKey(row, ri + page * pageSize);
//                 const rowNo = (page * pageSize + ri + 1).toLocaleString("en-US");
//                 return (
//                   <tr key={id} className={`ct__tr ${selected.has(id) ? "is-active" : ""}`}>
//                     <td className="ct__td ct__td--sel">
//                       <label className="ct__checkbox">
//                         <input type="checkbox" checked={selected.has(id)} onChange={() => toggleOne(id)} />
//                         <span className="ct__checkmark" />
//                       </label>
//                     </td>
//                     <td className="ct__td ct__td--rowno" title="ردیف">{rowNo}</td>
//                     {visibleCols.map((col, idx) => (
//                       <td
//                         key={col.key}
//                         className={`ct__td ${idx===0 && stickyFirstCol ? "ct__td--sticky" : ""}`}
//                         style={{ width: col.width, minWidth: col.minWidth, ...alignStyle(col) }}
//                         title={row[col.key] != null ? String(row[col.key]) : ""}
//                       >
//                         {col.render ? col.render(row[col.key], row) : (row[col.key] ?? "")}
//                       </td>
//                     ))}
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       <div className="ct__footer">
//         <div className="ct__pagination" aria-label="صفحه‌بندی">
//           <Button className="ct__btn" onClick={() => setPage(0)} disabled={page === 0} aria-label="اولین صفحه" iconOnly icon={ChevronsLeft} />
//           <Button className="ct__btn" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} aria-label="صفحه قبلی" iconOnly icon={ChevronLeft} />
//           <span className="ct__page-info">
//             صفحه <strong>{(page + 1).toLocaleString("en-US")}</strong> از {totalPages.toLocaleString("en-US")}
//           </span>
//           <Button className="ct__btn" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} aria-label="صفحه بعدی" iconOnly icon={ChevronRight} />
//           <Button className="ct__btn" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1} aria-label="آخرین صفحه" iconOnly icon={ChevronsRight} />
//         </div>

//         <div className="ct__pagesize">
//           <label className="ct__ps-label">اندازه صفحه</label>
//           <select
//             className="ct__select"
//             value={pageSize}
//             onChange={(e) => { setPageSize(Number(e.target.value)); setPage(0); }}
//             aria-label="اندازه صفحه"
//             dir="ltr"
//           >
//             {pageSizeOptions.map((n) => (
//               <option key={n} value={n}>{Number(n).toLocaleString("en-US")}</option>
//             ))}
//           </select>
//         </div>
//       </div>
//     </div>
//   );
// }

// function SortIcon({ sortState, colKey }) {
//   const idx = sortState.findIndex((s) => s.key === colKey);
//   if (idx === -1) return <span className="ct__sort ct__sort--none" aria-hidden="true">↕</span>;
//   const dir = sortState[idx].dir;
//   return (
//     <span className={`ct__sort ct__sort--${dir}`} aria-label={`Sıralama: ${dir}${sortState.length>1?` (#${idx+1})`:''}`}>
//       {dir === "asc" ? "↑" : "↓"}{sortState.length>1 ? <sup>{idx+1}</sup> : null}
//     </span>
//   );
// }
