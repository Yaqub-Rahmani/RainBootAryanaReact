import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CustomTableV2.css";
import Button from "../Button";
import Input from "../Input";
import FilterModal from "../modal/FilterModal";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Filter,
  Search,
  Trash,
  Plus,
  RefreshCcw,
  X,
  Columns2,
  ListChecks,
} from "lucide-react";

/* ---------------- Helpers ---------------- */
const defaultRowKey = (row, idx) => row?.id ?? String(idx);

const isEmpty = (v) =>
  v == null || v === "" || (Array.isArray(v) && v.length === 0);

// DateObject / Date -> "YYYY-MM-DD"
const ymd = (val) => {
  if (!val) return "";
  try {
    const d = new Date(val);
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  } catch {
    return "";
  }
};

export const getInputValue = (eOrValue) => {
  if (eOrValue && typeof eOrValue === "object") {
    if ("target" in eOrValue) return eOrValue?.target?.value ?? "";
    if ("value" in eOrValue) return eOrValue?.value ?? "";
  }
  return eOrValue ?? "";
};

function getVisibleColumns(columns) {
  return (columns || []).filter((c) => c?.visible !== false);
}

function getFilterableColumns(columns) {
  // ✅ visibility’den bağımsız; gizli kolon da filtrelenebilir
  return (columns || []).filter((c) => {
    return (
      c.filterable === true ||
      c.filter === true ||
      c.primaryFilter === true ||
      c.secondaryFilter === true ||
      c.dateFilter === true ||
      !!c.filterType ||
      typeof c.buildFilter === "function" ||
      typeof c.renderFilter === "function"
    );
  });
}

function getServerField(col) {
  return col.serverField || col.key;
}

function getServerSortField(col) {
  return col.serverSortField || col.serverField || col.key;
}

/* ------------- Query serialization ------------- */
function serializeSortLegacy(sortArr) {
  if (!Array.isArray(sortArr) || sortArr.length === 0) return "";
  const s = sortArr[0];
  if (!s?.field || !s?.dir) return "";
  return `${s.field}:${s.dir}`;
}

// legacy: AND-only flatten (mevcut backend uyumu)
function serializeFilterGroupLegacy(filterGroup) {
  const out = [];
  const walk = (node) => {
    if (!node) return;

    // group
    if (node.logic && Array.isArray(node.rules)) {
      node.rules.forEach(walk);
      return;
    }

    const r = node;
    if (!r.field || !r.op) return;

    if (r.op === "between") {
      if (r.from) out.push(`${r.field}:from:${String(r.from)}`);
      if (r.to) out.push(`${r.field}:to:${String(r.to)}`);
      return;
    }

    if (r.op === "in") {
      const vals = Array.isArray(r.value) ? r.value : [];
      if (vals.length) out.push(`${r.field}:in:${vals.map(String).join(",")}`);
      return;
    }

    if (!isEmpty(r.value)) out.push(`${r.field}:${r.op}:${String(r.value)}`);
  };

  walk(filterGroup);
  return out;
}

function defaultSerializeQuery({
  transport,
  page,
  pageSize,
  sort,
  search,
  filter,
  includes,
}) {
  if (transport === "modern") {
    return {
      page,
      pageSize,
      sort,
      search, // { q, fields: [] }
      filter, // nested groups supported
      includes: includes || [],
    };
  }

  return {
    page,
    pageSize,
    sort: serializeSortLegacy(sort),
    search: search?.q || "",
    filters: serializeFilterGroupLegacy(filter),
    includes: includes || [],
  };
}

/* ------------- Build filters from modal draft ------------- */
function safeNumber(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function buildFilterGroupFromDraft(columns, draft) {
  const filterableCols = getFilterableColumns(columns);
  const rules = [];

  for (const col of filterableCols) {
    const draftVal = draft?.[col.key];
    const field = getServerField(col);

    // custom builder
    if (typeof col.buildFilter === "function") {
      const built = col.buildFilter(draftVal, draft);
      if (Array.isArray(built))
        built.filter(Boolean).forEach((x) => rules.push(x));
      else if (built) rules.push(built);
      continue;
    }

    // dateRange
    if (col.dateFilter || col.filterType === "dateRange") {
      const from = ymd(draftVal?.from);
      const to = ymd(draftVal?.to);
      if (from || to)
        rules.push({
          field,
          op: "between",
          from: from || undefined,
          to: to || undefined,
        });
      continue;
    }

    // numberRange
    if (col.filterType === "numberRange") {
      const min = safeNumber(draftVal?.min);
      const max = safeNumber(draftVal?.max);
      if (min != null) rules.push({ field, op: "gte", value: min });
      if (max != null) rules.push({ field, op: "lte", value: max });
      continue;
    }

    // select / multiSelect
    if (col.filterType === "select") {
      if (!isEmpty(draftVal))
        rules.push({
          field,
          op: col.filterOp || "eq",
          value: String(draftVal),
        });
      continue;
    }

    if (col.filterType === "multiSelect") {
      const arr = Array.isArray(draftVal) ? draftVal : [];
      if (arr.length)
        rules.push({ field, op: "in", value: arr.map((x) => String(x)) });
      continue;
    }

    // checkboxGroup
    if (col.filterType === "checkboxGroup") {
      const arr = Array.isArray(draftVal) ? draftVal : [];
      if (arr.length)
        rules.push({ field, op: "in", value: arr.map((x) => String(x)) });
      continue;
    }

    // checkbox
    if (col.filterType === "checkbox") {
      if (draftVal === true)
        rules.push({ field, op: col.filterOp || "eq", value: true });
      if (draftVal === false && col.allowFalse === true)
        rules.push({ field, op: col.filterOp || "eq", value: false });
      continue;
    }

    // text default
    if (!isEmpty(draftVal))
      rules.push({
        field,
        op: col.filterOp || "contains",
        value: String(draftVal),
      });
  }

  return { logic: "and", rules };
}

function normalizeResult(res) {
  // destek: {items, totalCount, totalPages} | {data, totalCount, totalPages} | array
  if (Array.isArray(res))
    return { items: res, totalCount: res.length, totalPages: 1 };
  const items = res?.items ?? res?.data ?? res?.rows ?? [];
  const totalCount =
    Number(res?.totalCount ?? res?.count ?? items?.length ?? 0) || 0;
  const totalPages =
    Number(res?.totalPages ?? res?.pages ?? (totalCount ? 1 : 1)) || 1;
  return { items, totalCount, totalPages };
}

/* ================= Component ================= */
export default function CustomTableV2({
  columns = [],
  fetcher, // async (query) => result
  extraParams,

  rowKey = defaultRowKey,
  dir = "rtl",

  toolbarTitle = "جدول",
  emptyMessage = "هیچ معلومات یافت نشد.",

  // paging
  initialPageSize = 25,
  pageSizeOptions = [10, 25, 50, 100],
  autoFetchOnMount = true,

  // server transport
  transport = "modern",
  serializeQuery = defaultSerializeQuery,
  includes = [],

  // search
  showSearchBar = true,
  searchMode = "server", // "server" | "local"
  showServerSearchButton = true, // server mod: button ile uygula
  searchPlaceholder = "جستجو...",
  searchButtonLabel = "جستجو",

  // toolbar buttons
  showFilterButton = true,
  showClearAllButton = true,
  showRefreshButton = true,
  showAddButton = false,
  addButtonLabel = "افزودن",
  onAddClick,

  // ✅ columns visibility
  showColumnsButton = true,
  columnsButtonLabel = "ستون ها",
  onColumnsChange, // (nextColumns)=>void

  // ✅ button colors (Button primaryColor/activeColor)
  primaryColor = "var(--role-primary-bg)",
  secondaryColor = "var(--role-secondary-bg)",
  infoColor = "var(--role-info-bg)",
  warningColor = "var(--role-warning-bg)",
  dangerColor = "var(--role-danger-bg)",
  activeColor = "var(--accent)",

  // table ui
  maxBodyHeight = 520,
  showRowNumbers = true,

  // selection
  selectable = false,
  onSelectionChange,
  onSelectedClick,

  // row click
  onRowClick,

  // external loading
  loading: externalLoading,
}) {
  /* ---------- Column visibility + Columns Menu ---------- */
  const colsWrapRef = useRef(null);     // buton sarıcısı (toolbar içinde)
  const colsBtnRef = useRef(null);      // buton wrapper (ref forward yoksa span)
  const colsPanelRef = useRef(null);    // ✅ portal panel ref (click-outside fix)

  const [colsOpen, setColsOpen] = useState(false);
  const [colsPos, setColsPos] = useState({
    top: 0,
    left: 0,
    width: 260,
    maxHeight: 320,
  });

  const initVisibility = (cols) => {
    const map = {};
    (cols || []).forEach((c) => {
      map[c.key] = c?.visible !== false; // undefined => true
    });
    return map;
  };

  const [colVisibility, setColVisibility] = useState(() =>
    initVisibility(columns)
  );

  useEffect(() => {
    setColVisibility(initVisibility(columns));
  }, [columns]);

  const computeColsPosition = useCallback(() => {
    const el = colsBtnRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();

    const panelWidth = 260;
    const panelMaxHeight = 320;
    const gap = 10;

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceBelow = vh - rect.bottom;
    const spaceAbove = rect.top;

    const openUp = spaceBelow < panelMaxHeight + gap && spaceAbove > spaceBelow;

    const top = openUp
      ? Math.max(8, rect.top - gap - panelMaxHeight)
      : Math.min(vh - 8 - panelMaxHeight, rect.bottom + gap);

    // RTL: sağdan hizala
    let left = rect.right - panelWidth;
    left = Math.min(Math.max(8, left), vw - 8 - panelWidth);

    setColsPos({
      top,
      left,
      width: panelWidth,
      maxHeight: panelMaxHeight,
    });
  }, []);

  // ✅ Portal olduğu için click-outside kontrolünü panel ref ile de yapıyoruz
  useEffect(() => {
    const onDoc = (e) => {
      if (!colsOpen) return;

      const inWrap = colsWrapRef.current?.contains(e.target);
      const inPanel = colsPanelRef.current?.contains(e.target);

      if (inWrap || inPanel) return;
      setColsOpen(false);
    };

    const onEsc = (e) => {
      if (!colsOpen) return;
      if (e.key === "Escape") setColsOpen(false);
    };

    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [colsOpen]);

  useEffect(() => {
    if (!colsOpen) return;

    computeColsPosition();

    const onReflow = () => computeColsPosition();
    window.addEventListener("resize", onReflow, { passive: true });
    window.addEventListener("scroll", onReflow, true);

    return () => {
      window.removeEventListener("resize", onReflow);
      window.removeEventListener("scroll", onReflow, true);
    };
  }, [colsOpen, computeColsPosition]);

  const columnsEffective = useMemo(() => {
    return (columns || []).map((c) => ({
      ...c,
      visible: colVisibility[c.key] ?? (c?.visible !== false),
    }));
  }, [columns, colVisibility]);

  const visibleCols = useMemo(
    () => getVisibleColumns(columnsEffective),
    [columnsEffective]
  );

  const filterableCols = useMemo(
    () => getFilterableColumns(columnsEffective),
    [columnsEffective]
  );

  const searchableCols = useMemo(
    () => (columnsEffective || []).filter((c) => c?.searchable === true),
    [columnsEffective]
  );

  const toggleColumn = (key) => {
    setColVisibility((prev) => {
      const next = { ...prev, [key]: !prev[key] };

      // ✅ en az 1 kolon açık kalsın (istersen kaldır)
      const openCount = Object.values(next).filter(Boolean).length;
      if (openCount === 0) return prev;

      onColumnsChange?.(
        (columns || []).map((c) => ({
          ...c,
          visible: next[c.key] ?? (c?.visible !== false),
        }))
      );

      return next;
    });
  };

  const resetColumnsVisibility = () => {
    const base = initVisibility(columns);
    setColVisibility(base);
    onColumnsChange?.(
      (columns || []).map((c) => ({ ...c, visible: base[c.key] }))
    );
  };

  /* ---------- state ---------- */
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [sort, setSort] = useState([]); // [{field, dir}]
  const [result, setResult] = useState({
    items: [],
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);

  // search
  const [searchDraft, setSearchDraft] = useState("");
  const [searchServer, setSearchServer] = useState("");

  // filter modal
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState({});
  const [filter, setFilter] = useState({ logic: "and", rules: [] });

  // selection
  const [selected, setSelected] = useState(new Set());
  const headerCheckRef = useRef(null);

  const totalPages = Math.max(1, Number(result.totalPages || 1));
  const totalCount = Number(result.totalCount || 0);

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  const allItems = result.items || [];

  const handleFilterClose = useCallback(() => setFilterOpen(false), []);

  // ✅ local arama: input yazıldıkça çalışır
  const locallyFilteredItems = useMemo(() => {
    const q = (searchDraft || "").trim().toLowerCase();
    if (!q) return allItems;

    const keys =
      searchableCols.length
        ? searchableCols.map((c) => c.key)
        : visibleCols.map((c) => c.key);

    return allItems.filter((row) =>
      keys.some((k) => String(row?.[k] ?? "").toLowerCase().includes(q))
    );
  }, [allItems, searchDraft, searchableCols, visibleCols]);

  // selection derived
  const selectedRows = useMemo(() => {
    if (!selectable) return [];
    const map = new Map();
    locallyFilteredItems.forEach((r, i) => map.set(rowKey(r, i), r));
    return [...selected].map((id) => map.get(id)).filter(Boolean);
  }, [selectable, selected, locallyFilteredItems, rowKey]);

  const someChecked =
    selectable &&
    selected.size > 0 &&
    selected.size < locallyFilteredItems.length;
  const allChecked =
    selectable &&
    locallyFilteredItems.length > 0 &&
    selected.size === locallyFilteredItems.length;

  useEffect(() => {
    if (!headerCheckRef.current) return;
    headerCheckRef.current.indeterminate = someChecked;
  }, [someChecked]);

  /* ---------- toolbar visibility rules ---------- */
  const hasActiveFilter = (filter?.rules?.length ?? 0) > 0;
  const hasActiveSort = (sort?.length ?? 0) > 0;
  const hasServerSearch = !!(searchServer || "").trim();

  const canShowClearAll = hasActiveFilter || hasActiveSort || hasServerSearch;

  const searchDraftTrim = (searchDraft || "").trim();
  const canShowSearchButton =
    searchMode === "server" &&
    showServerSearchButton &&
    !!searchDraftTrim &&
    searchDraftTrim !== (searchServer || "").trim();

  /* ---------- filters ---------- */
  const resetDraftFilters = () => {
    const next = {};
    for (const c of filterableCols) {
      if (c.dateFilter || c.filterType === "dateRange")
        next[c.key] = { from: null, to: null };
      else if (c.filterType === "numberRange")
        next[c.key] = { min: "", max: "" };
      else if (c.filterType === "multiSelect" || c.filterType === "checkboxGroup")
        next[c.key] = [];
      else if (c.filterType === "checkbox") next[c.key] = false;
      else next[c.key] = c.filterDefault ?? "";
    }
    setDraftFilters(next);
  };

  useEffect(() => {
    resetDraftFilters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnsEffective]);

  const applyDraftFilters = () => {
    const nextGroup = buildFilterGroupFromDraft(columnsEffective, draftFilters);
    setPage(1);
    setFilter(nextGroup);
    setFilterOpen(false);
  };

  const clearAll = () => {
    setPage(1);
    setSort([]);
    setSearchDraft("");
    setSearchServer("");
    resetDraftFilters();
    setFilter({ logic: "and", rules: [] });
    setSelected(new Set());
  };

  const applyServerSearch = () => {
    const q = (searchDraft || "").trim();
    if (!q) return;
    setPage(1);
    setSearchServer(q);
  };

  const onHeaderSort = (col) => {
    if (!col.sortable) return;
    const field = getServerSortField(col);

    setPage(1);
    setSort((prev) => {
      const cur = prev?.[0];
      if (!cur || cur.field !== field) return [{ field, dir: "asc" }];
      if (cur.dir === "asc") return [{ field, dir: "desc" }];
      return [];
    });
  };

  const sortBadge = (col) => {
    const field = getServerSortField(col);
    const cur = sort?.[0];
    if (!cur || cur.field !== field) return "";
    return cur.dir === "asc" ? "↑" : "↓";
  };

  const buildSearchPayload = () => {
    const q = (searchMode === "server" ? searchServer : "")?.trim();
    if (!q) return { q: "", fields: [] };

    const fields = searchableCols.length
      ? searchableCols.map((c) => getServerField(c))
      : [];

    return { q, fields };
  };

  const runFetch = async () => {
    if (typeof fetcher !== "function") return;

    const search = buildSearchPayload();

    let finalFilter = filter;
    if (
      transport === "modern" &&
      search.q &&
      Array.isArray(search.fields) &&
      search.fields.length
    ) {
      const orGroup = {
        logic: "or",
        rules: search.fields.map((f) => ({
          field: f,
          op: "contains",
          value: search.q,
        })),
      };
      finalFilter = {
        logic: "and",
        rules: [orGroup, ...(filter?.rules || [])],
      };
    }

    const queryObj = serializeQuery({
      transport,
      page,
      pageSize,
      sort,
      search,
      filter: finalFilter,
      includes,
    });

    const finalQuery = { ...queryObj, ...(extraParams || {}) };

    setLoading(true);
    try {
      const res = await fetcher(finalQuery);
      setResult(normalizeResult(res));
      setSelected(new Set());
      onSelectionChange?.([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoFetchOnMount) return;
    runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    runFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize, JSON.stringify(sort), JSON.stringify(filter), searchServer]);

  const effectiveLoading = externalLoading ?? loading;

  /* ---------- selection ---------- */
  const toggleAll = () => {
    if (!selectable) return;
    if (allChecked) {
      setSelected(new Set());
      onSelectionChange?.([]);
      return;
    }
    const next = new Set(locallyFilteredItems.map((r, i) => rowKey(r, i)));
    setSelected(next);
    onSelectionChange?.(locallyFilteredItems);
  };

  const toggleOne = (id) => {
    if (!selectable) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);

      const rows = locallyFilteredItems
        .map((r, i) => ({ id: rowKey(r, i), row: r }))
        .filter((x) => next.has(x.id))
        .map((x) => x.row);

      onSelectionChange?.(rows);
      return next;
    });
  };

  /* ---------- pager ---------- */
  const goFirst = () => setPage(1);
  const goPrev = () => setPage((p) => Math.max(1, p - 1));
  const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
  const goLast = () => setPage(totalPages);

  return (
    <div className="ctv2" dir={dir}>
      {/* Toolbar */}
      <div className="ctv2__toolbar">
        <div className="ctv2__toolbarGrid">
          {/* Title */}
          <div className="ctv2__title">
            <strong className="ctv2__titleText">{toolbarTitle}</strong>
            <span className="ctv2__count">
              ({totalCount.toLocaleString("en-US")})
            </span>
          </div>

          {/* Search */}
          {showSearchBar ? (
            <div className="ctv2__search">
              <Input
                value={searchDraft}
                onChange={(v) => setSearchDraft(getInputValue(v))}
                placeholder={searchPlaceholder}
                label={null}
                icon={Search}
                iconRight={searchDraft ? X : null}
                onIconRightClick={() => setSearchDraft("")}
                className="ctv2__searchGrow"
                inputClassName="ctv2__searchInput"
                autoComplete="off"
                onKeyDown={(e) => {
                  if (searchMode === "server" && e.key === "Enter") {
                    applyServerSearch();
                  }
                }}
              />

              {searchMode === "server" && showServerSearchButton && (
                <>
                  {canShowSearchButton && (
                    <Button
                      size="md"
                      variant="soft"
                      icon={Search}
                      iconOnly
                      ariaLabel={searchButtonLabel}
                      onClick={applyServerSearch}
                      title={searchButtonLabel}
                      primaryColor={infoColor}
                      activeColor={activeColor}
                    />
                  )}
                </>
              )}
            </div>
          ) : (
            <div />
          )}

          {/* Actions */}
          <div className="ctv2__actions">
            {/* Columns */}
            {showColumnsButton && (
              <div className="ctv2__colsWrap" ref={colsWrapRef}>
                {/* Button ref forward edilmezse diye wrapper */}
                <span ref={colsBtnRef} style={{ display: "inline-flex" }}>
                  <Button
                    size="md"
                    variant="soft"
                    icon={Columns2}
                    iconOnly
                    ariaLabel={columnsButtonLabel}
                    onClick={() => {
                      setColsOpen((s) => {
                        const next = !s;
                        if (next) requestAnimationFrame(() => computeColsPosition());
                        return next;
                      });
                    }}
                    title={columnsButtonLabel}
                    primaryColor={secondaryColor}
                    activeColor={activeColor}
                  />
                </span>

                {colsOpen &&
                  createPortal(
                  <div
                      ref={colsPanelRef}
                      dir={dir}
                      className="ctv2__colsPanel ctv2__colsPanel--fixed"
                      style={{
                        top: `${colsPos.top}px`,
                        left: `${colsPos.left}px`,
                        width: `${colsPos.width}px`,
                        maxHeight: `${colsPos.maxHeight}px`,
                      }}
                    >
                      <div className="ctv2__colsTitle">{columnsButtonLabel}</div>

                      <div className="ctv2__colsList">
                        {(columnsEffective || [])
                          // ✅ menuVisible: false ise menüde hiç gösterme
                          .filter((c) => c?.menuVisible !== false)
                          .map((c) => {
                            const checked = c?.visible !== false; // tablo görünürlüğü
                            const label = c.header ?? c.key;
                            const lock = c.hideable === false; // checkbox disable

                            return (
                              <label
                                key={c.key}
                                className={`ctv2__colItem ${lock ? "is-locked" : ""}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={lock}
                                  onChange={() => !lock && toggleColumn(c.key)}
                                />
                                <span>{label}</span>
                              </label>
                            );
                          })}
                      </div>

                      <div className="ctv2__colsActions">
                        <Button
                          size="sm"
                          variant="soft"
                          onClick={resetColumnsVisibility}
                          primaryColor={warningColor}
                          activeColor={activeColor}
                          icon={ListChecks}
                        >
                          پیش فرض
                        </Button>

                        <Button
                          size="sm"
                          variant="soft"
                          onClick={() => setColsOpen(false)}
                          primaryColor={dangerColor}
                          activeColor={activeColor}
                          icon={X}
                          iconOnly
                        />
                      </div>
                    </div>,
                    document.body
                  )}
              </div>
            )}

            {showAddButton && (
              <Button
                size="md"
                variant="soft"
                icon={Plus}
                onClick={onAddClick}
                primaryColor={primaryColor}
                activeColor={activeColor}
              >
                {addButtonLabel}
              </Button>
            )}

            {showRefreshButton && (
              <Button
                size="md"
                variant="soft"
                icon={RefreshCcw}
                iconOnly
                ariaLabel="بازخوانی"
                onClick={() => runFetch()}
                title="بازخوانی"
                primaryColor={secondaryColor}
                activeColor={activeColor}
              />
            )}

            {showClearAllButton && canShowClearAll && (
              <Button
                size="md"
                variant="soft"
                icon={Trash}
                iconOnly
                ariaLabel="پاک کردن (sort + search + filter)"
                onClick={clearAll}
                title="پاک کردن (sort + search + filter)"
                primaryColor={dangerColor}
                activeColor={activeColor}
              />
            )}

            {showFilterButton && filterableCols.length > 0 && (
              <Button
                size="md"
                variant="soft"
                icon={Filter}
                iconOnly
                ariaLabel="فیلتر"
                onClick={() => setFilterOpen(true)}
                title="فیلتر"
                primaryColor={secondaryColor}
                activeColor={activeColor}
              />
            )}

            {selectable && selected.size > 0 && (
              <Button
                size="md"
                variant="soft"
                onClick={() => onSelectedClick?.(selectedRows)}
                title="نمایش انتخاب شده‌ها"
                primaryColor={primaryColor}
                activeColor={activeColor}
              >
                انتخاب شده ({selected.size})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table viewport (scroll) */}
      <div className="ctv2__viewport" style={{ maxHeight: maxBodyHeight }}>
        <table className="ctv2__table">
          <thead>
            <tr>
              {selectable && (
                <th className="ctv2__th ctv2__th--sel">
                  <input
                    ref={headerCheckRef}
                    className="ctv2__check"
                    type="checkbox"
                    checked={allChecked}
                    onChange={toggleAll}
                    aria-checked={someChecked ? "mixed" : allChecked}
                    aria-label="انتخاب همه"
                  />
                </th>
              )}

              {showRowNumbers && (
                <th className="ctv2__th ctv2__th--rownum">#</th>
              )}

              {visibleCols.map((col) => (
                <th
                  key={col.key}
                  className={`ctv2__th ${col.sortable ? "is-sortable" : ""}`}
                  onClick={() => onHeaderSort(col)}
                  title={col.sortable ? "مرتب‌سازی" : ""}
                >
                  <span className="ctv2__thText">{col.header ?? col.key}</span>
                  {col.sortable && (
                    <span className="ctv2__sort">{sortBadge(col)}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {effectiveLoading ? (
              [...Array(Math.min(pageSize, 25))].map((_, i) => (
                <tr key={`sk-${i}`}>
                  {selectable && (
                    <td className="ctv2__td">
                      <div className="ctv2__skel" />
                    </td>
                  )}
                  {showRowNumbers && (
                    <td className="ctv2__td">
                      <div className="ctv2__skel" />
                    </td>
                  )}
                  {visibleCols.map((c) => (
                    <td key={c.key} className="ctv2__td">
                      <div className="ctv2__skel" />
                    </td>
                  ))}
                </tr>
              ))
            ) : locallyFilteredItems.length === 0 ? (
              <tr>
                <td
                  className="ctv2__td ctv2__empty"
                  colSpan={
                    visibleCols.length +
                    (selectable ? 1 : 0) +
                    (showRowNumbers ? 1 : 0)
                  }
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              locallyFilteredItems.map((row, ri) => {
                const id = rowKey(row, ri);
                const absoluteIndex = (page - 1) * pageSize + ri + 1;

                return (
                  <tr
                    key={id}
                    className={selectable && selected.has(id) ? "is-active" : ""}
                    onClick={() => onRowClick?.(row)}
                    style={{ cursor: onRowClick ? "pointer" : "default" }}
                  >
                    {selectable && (
                      <td
                        className="ctv2__td ctv2__td--sel"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          className="ctv2__check"
                          type="checkbox"
                          checked={selected.has(id)}
                          onChange={() => toggleOne(id)}
                          aria-label="انتخاب ردیف"
                        />
                      </td>
                    )}

                    {showRowNumbers && (
                      <td className="ctv2__td ctv2__td--rownum">
                        {String(absoluteIndex)}
                      </td>
                    )}

                    {visibleCols.map((col) => {
                      const cell = row?.[col.key];

                      const content =
                        typeof col.render === "function"
                          ? col.render(cell, row, ri)
                          : cell == null
                          ? "—"
                          : String(cell);

                      return (
                        <td
                          key={col.key}
                          className="ctv2__td"
                          title={cell != null ? String(cell) : ""}
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="ctv2__footer">
        <div className="ctv2__meta">
          نمایش {String(rangeStart)} تا {String(rangeEnd)} از{" "}
          {totalCount.toLocaleString("en-US")}
        </div>

        <div className="ctv2__pager">
          <div className="ctv2__pageSize">
            <span className="ctv2__label">تعداد در صفحه</span>
            <select
              className="ctv2__select"
              value={pageSize}
              onChange={(e) => {
                setPage(1);
                setPageSize(Number(getInputValue(e)));
              }}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {String(n)}
                </option>
              ))}
            </select>
          </div>

          <div className="ctv2__nav">
            <Button
              size="md"
              variant="soft"
              icon={ChevronsRight}
              iconOnly
              ariaLabel="اول"
              onClick={goFirst}
              disabled={page <= 1}
              title="اول"
              primaryColor={secondaryColor}
              activeColor={activeColor}
            />
            <Button
              size="md"
              variant="soft"
              icon={ChevronRight}
              iconOnly
              ariaLabel="قبلی"
              onClick={goPrev}
              disabled={page <= 1}
              title="قبلی"
              primaryColor={secondaryColor}
              activeColor={activeColor}
            />
            <span className="ctv2__pageInfo">
              {String(page)} / {String(totalPages)}
            </span>
            <Button
              size="md"
              variant="soft"
              icon={ChevronLeft}
              iconOnly
              ariaLabel="بعدی"
              onClick={goNext}
              disabled={page >= totalPages}
              title="بعدی"
              primaryColor={secondaryColor}
              activeColor={activeColor}
            />
            <Button
              size="md"
              variant="soft"
              icon={ChevronsLeft}
              iconOnly
              ariaLabel="آخر"
              onClick={goLast}
              disabled={page >= totalPages}
              title="آخر"
              primaryColor={secondaryColor}
              activeColor={activeColor}
            />
          </div>
        </div>
      </div>

      {/* Filter Modal */}
      {filterOpen && (
        <FilterModal
          open={filterOpen}
          onClose={() => setFilterOpen(false)}
          columns={columnsEffective}
          filterableCols={filterableCols}
          draft={draftFilters}
          setDraft={setDraftFilters}
          onApply={applyDraftFilters}
          onReset={resetDraftFilters}
          title="فیلترها"
        />
      )}
    </div>
  );
}


// import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
// import "./CustomTableV2.css";
// import Button from "../Button";
// import Input from "../Input";
// import FilterModal from "../modal/FilterModal";
// import {
//   ChevronLeft,
//   ChevronRight,
//   ChevronsLeft,
//   ChevronsRight,
//   Filter,
//   Search,
//   Trash,
//   Plus,
//   RefreshCcw,
//   X,
//   Columns2,
// } from "lucide-react";

// /* ---------------- Helpers ---------------- */
// const defaultRowKey = (row, idx) => row?.id ?? String(idx);

// const isEmpty = (v) =>
//   v == null || v === "" || (Array.isArray(v) && v.length === 0);

// // DateObject / Date -> "YYYY-MM-DD"
// const ymd = (val) => {
//   if (!val) return "";
//   try {
//     const d = new Date(val);
//     const yy = d.getFullYear();
//     const mm = String(d.getMonth() + 1).padStart(2, "0");
//     const dd = String(d.getDate()).padStart(2, "0");
//     return `${yy}-${mm}-${dd}`;
//   } catch {
//     return "";
//   }
// };

// export const getInputValue = (eOrValue) => {
//   if (eOrValue && typeof eOrValue === "object") {
//     if ("target" in eOrValue) return eOrValue?.target?.value ?? "";
//     if ("value" in eOrValue) return eOrValue?.value ?? "";
//   }
//   return eOrValue ?? "";
// };

// function getVisibleColumns(columns) {
//   return (columns || []).filter((c) => c?.visible !== false);
// }

// function getFilterableColumns(columns) {
//   // ✅ visibility’den bağımsız; gizli kolon da filtrelenebilir
//   return (columns || []).filter((c) => {
//     return (
//       c.filterable === true ||
//       c.filter === true ||
//       c.primaryFilter === true ||
//       c.secondaryFilter === true ||
//       c.dateFilter === true ||
//       !!c.filterType ||
//       typeof c.buildFilter === "function" ||
//       typeof c.renderFilter === "function"
//     );
//   });
// }

// function getServerField(col) {
//   return col.serverField || col.key;
// }

// function getServerSortField(col) {
//   return col.serverSortField || col.serverField || col.key;
// }

// /* ------------- Query serialization ------------- */
// function serializeSortLegacy(sortArr) {
//   if (!Array.isArray(sortArr) || sortArr.length === 0) return "";
//   const s = sortArr[0];
//   if (!s?.field || !s?.dir) return "";
//   return `${s.field}:${s.dir}`;
// }

// // legacy: AND-only flatten (mevcut backend uyumu)
// function serializeFilterGroupLegacy(filterGroup) {
//   const out = [];
//   const walk = (node) => {
//     if (!node) return;

//     // group
//     if (node.logic && Array.isArray(node.rules)) {
//       node.rules.forEach(walk);
//       return;
//     }

//     const r = node;
//     if (!r.field || !r.op) return;

//     if (r.op === "between") {
//       if (r.from) out.push(`${r.field}:from:${String(r.from)}`);
//       if (r.to) out.push(`${r.field}:to:${String(r.to)}`);
//       return;
//     }

//     if (r.op === "in") {
//       const vals = Array.isArray(r.value) ? r.value : [];
//       if (vals.length) out.push(`${r.field}:in:${vals.map(String).join(",")}`);
//       return;
//     }

//     if (!isEmpty(r.value)) out.push(`${r.field}:${r.op}:${String(r.value)}`);
//   };

//   walk(filterGroup);
//   return out;
// }

// function defaultSerializeQuery({
//   transport,
//   page,
//   pageSize,
//   sort,
//   search,
//   filter,
//   includes,
// }) {
//   if (transport === "modern") {
//     return {
//       page,
//       pageSize,
//       sort,
//       search, // { q, fields: [] }
//       filter, // nested groups supported
//       includes: includes || [],
//     };
//   }

//   return {
//     page,
//     pageSize,
//     sort: serializeSortLegacy(sort),
//     search: search?.q || "",
//     filters: serializeFilterGroupLegacy(filter),
//     includes: includes || [],
//   };
// }

// /* ------------- Build filters from modal draft ------------- */
// function safeNumber(v) {
//   if (v == null || v === "") return null;
//   const n = Number(v);
//   return Number.isFinite(n) ? n : null;
// }

// function buildFilterGroupFromDraft(columns, draft) {
//   const filterableCols = getFilterableColumns(columns);
//   const rules = [];

//   for (const col of filterableCols) {
//     const draftVal = draft?.[col.key];
//     const field = getServerField(col);

//     // custom builder
//     if (typeof col.buildFilter === "function") {
//       const built = col.buildFilter(draftVal, draft);
//       if (Array.isArray(built))
//         built.filter(Boolean).forEach((x) => rules.push(x));
//       else if (built) rules.push(built);
//       continue;
//     }

//     // dateRange
//     if (col.dateFilter || col.filterType === "dateRange") {
//       const from = ymd(draftVal?.from);
//       const to = ymd(draftVal?.to);
//       if (from || to)
//         rules.push({
//           field,
//           op: "between",
//           from: from || undefined,
//           to: to || undefined,
//         });
//       continue;
//     }

//     // numberRange
//     if (col.filterType === "numberRange") {
//       const min = safeNumber(draftVal?.min);
//       const max = safeNumber(draftVal?.max);
//       if (min != null) rules.push({ field, op: "gte", value: min });
//       if (max != null) rules.push({ field, op: "lte", value: max });
//       continue;
//     }

//     // select / multiSelect
//     if (col.filterType === "select") {
//       if (!isEmpty(draftVal))
//         rules.push({
//           field,
//           op: col.filterOp || "eq",
//           value: String(draftVal),
//         });
//       continue;
//     }

//     if (col.filterType === "multiSelect") {
//       const arr = Array.isArray(draftVal) ? draftVal : [];
//       if (arr.length)
//         rules.push({ field, op: "in", value: arr.map((x) => String(x)) });
//       continue;
//     }

//     // checkboxGroup
//     if (col.filterType === "checkboxGroup") {
//       const arr = Array.isArray(draftVal) ? draftVal : [];
//       if (arr.length)
//         rules.push({ field, op: "in", value: arr.map((x) => String(x)) });
//       continue;
//     }

//     // checkbox
//     if (col.filterType === "checkbox") {
//       if (draftVal === true)
//         rules.push({ field, op: col.filterOp || "eq", value: true });
//       if (draftVal === false && col.allowFalse === true)
//         rules.push({ field, op: col.filterOp || "eq", value: false });
//       continue;
//     }

//     // text default
//     if (!isEmpty(draftVal))
//       rules.push({
//         field,
//         op: col.filterOp || "contains",
//         value: String(draftVal),
//       });
//   }

//   return { logic: "and", rules };
// }

// function normalizeResult(res) {
//   // destek: {items, totalCount, totalPages} | {data, totalCount, totalPages} | array
//   if (Array.isArray(res))
//     return { items: res, totalCount: res.length, totalPages: 1 };
//   const items = res?.items ?? res?.data ?? res?.rows ?? [];
//   const totalCount =
//     Number(res?.totalCount ?? res?.count ?? items?.length ?? 0) || 0;
//   const totalPages =
//     Number(res?.totalPages ?? res?.pages ?? (totalCount ? 1 : 1)) || 1;
//   return { items, totalCount, totalPages };
// }

// /* ================= Component ================= */
// export default function CustomTableV2({
//   columns = [],
//   fetcher, // async (query) => result
//   extraParams,

//   rowKey = defaultRowKey,
//   dir = "rtl",

//   toolbarTitle = "جدول",
//   emptyMessage = "هیچ معلومات یافت نشد.",

//   // paging
//   initialPageSize = 25,
//   pageSizeOptions = [10, 25, 50, 100],
//   autoFetchOnMount = true,

//   // server transport
//   transport = "modern",
//   serializeQuery = defaultSerializeQuery,
//   includes = [],

//   // search
//   showSearchBar = true,
//   searchMode = "server", // "server" | "local"
//   showServerSearchButton = true, // server mod: button ile uygula
//   searchPlaceholder = "جستجو...",
//   searchButtonLabel = "جستجو",

//   // toolbar buttons
//   showFilterButton = true,
//   showClearAllButton = true,
//   showRefreshButton = true,
//   showAddButton = false,
//   addButtonLabel = "افزودن",
//   onAddClick,

//   // ✅ columns visibility
//   showColumnsButton = true,
//   columnsButtonLabel = "ستون‌ها",
//   onColumnsChange, // (nextColumns)=>void

//   // ✅ button colors (Button primaryColor/activeColor)
//   primaryColor = "var(--role-primary-bg)",
//   secondaryColor = "var(--role-secondary-bg)",
//   infoColor = "var(--role-info-bg)",
//   warningColor = "var(--role-warning-bg)",
//   dangerColor = "var(--role-danger-bg)",
//   activeColor = "var(--accent)",

//   // table ui
//   maxBodyHeight = 520,
//   showRowNumbers = true,

//   // selection
//   selectable = false,
//   onSelectionChange,
//   onSelectedClick,

//   // row click
//   onRowClick,

//   // external loading
//   loading: externalLoading,
// }) {
//   /* ---------- Column visibility state ---------- */
//   const colsRef = useRef(null);
//   const [colsOpen, setColsOpen] = useState(false);

//   const initVisibility = (cols) => {
//     const map = {};
//     (cols || []).forEach((c) => {
//       map[c.key] = c?.visible !== false; // undefined => true
//     });
//     return map;
//   };

//   const [colVisibility, setColVisibility] = useState(() =>
//     initVisibility(columns)
//   );

//   useEffect(() => {
//     setColVisibility(initVisibility(columns));
//   }, [columns]);

//   useEffect(() => {
//     const onDoc = (e) => {
//       if (!colsOpen) return;
//       if (!colsRef.current) return;
//       if (!colsRef.current.contains(e.target)) setColsOpen(false);
//     };
//     document.addEventListener("mousedown", onDoc);
//     return () => document.removeEventListener("mousedown", onDoc);
//   }, [colsOpen]);

//   const columnsEffective = useMemo(() => {
//     return (columns || []).map((c) => ({
//       ...c,
//       visible: colVisibility[c.key] ?? (c?.visible !== false),
//     }));
//   }, [columns, colVisibility]);

//   const visibleCols = useMemo(
//     () => getVisibleColumns(columnsEffective),
//     [columnsEffective]
//   );

//   const filterableCols = useMemo(
//     () => getFilterableColumns(columnsEffective),
//     [columnsEffective]
//   );

//   const searchableCols = useMemo(
//     () => (columnsEffective || []).filter((c) => c?.searchable === true),
//     [columnsEffective]
//   );

//   const toggleColumn = (key) => {
//     setColVisibility((prev) => {
//       const next = { ...prev, [key]: !prev[key] };

//       // ✅ en az 1 kolon açık kalsın (istersen kaldır)
//       const openCount = Object.values(next).filter(Boolean).length;
//       if (openCount === 0) return prev;

//       onColumnsChange?.(
//         (columns || []).map((c) => ({
//           ...c,
//           visible: next[c.key] ?? (c?.visible !== false),
//         }))
//       );

//       return next;
//     });
//   };

//   const resetColumnsVisibility = () => {
//     const base = initVisibility(columns);
//     setColVisibility(base);
//     onColumnsChange?.((columns || []).map((c) => ({ ...c, visible: base[c.key] })));
//   };

//   /* ---------- state ---------- */
//   const [page, setPage] = useState(1);
//   const [pageSize, setPageSize] = useState(initialPageSize);
//   const [sort, setSort] = useState([]); // [{field, dir}]
//   const [result, setResult] = useState({
//     items: [],
//     totalCount: 0,
//     totalPages: 1,
//   });
//   const [loading, setLoading] = useState(false);

//   // search
//   const [searchDraft, setSearchDraft] = useState("");
//   const [searchServer, setSearchServer] = useState("");

//   // filter modal
//   const [filterOpen, setFilterOpen] = useState(false);
//   const [draftFilters, setDraftFilters] = useState({});
//   const [filter, setFilter] = useState({ logic: "and", rules: [] });

//   // selection
//   const [selected, setSelected] = useState(new Set());
//   const headerCheckRef = useRef(null);

//   const totalPages = Math.max(1, Number(result.totalPages || 1));
//   const totalCount = Number(result.totalCount || 0);

//   const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
//   const rangeEnd = Math.min(page * pageSize, totalCount);

//   const allItems = result.items || [];

//   const handleFilterClose = useCallback(() => setFilterOpen(false), []);

//   // ✅ local arama: input yazıldıkça çalışır
//   const locallyFilteredItems = useMemo(() => {
//     const q = (searchDraft || "").trim().toLowerCase();
//     if (!q) return allItems;

//     // hangi kolonlarda local arama yapılacak?
//     const keys =
//       searchableCols.length
//         ? searchableCols.map((c) => c.key)
//         : visibleCols.map((c) => c.key);

//     return allItems.filter((row) =>
//       keys.some((k) => String(row?.[k] ?? "").toLowerCase().includes(q))
//     );
//   }, [allItems, searchDraft, searchableCols, visibleCols]);

//   // selection derived
//   const selectedRows = useMemo(() => {
//     if (!selectable) return [];
//     const map = new Map();
//     locallyFilteredItems.forEach((r, i) => map.set(rowKey(r, i), r));
//     return [...selected].map((id) => map.get(id)).filter(Boolean);
//   }, [selectable, selected, locallyFilteredItems, rowKey]);

//   const someChecked =
//     selectable &&
//     selected.size > 0 &&
//     selected.size < locallyFilteredItems.length;
//   const allChecked =
//     selectable &&
//     locallyFilteredItems.length > 0 &&
//     selected.size === locallyFilteredItems.length;

//   useEffect(() => {
//     if (!headerCheckRef.current) return;
//     headerCheckRef.current.indeterminate = someChecked;
//   }, [someChecked]);

//   /* ---------- toolbar visibility rules ---------- */
//   const hasActiveFilter = (filter?.rules?.length ?? 0) > 0;
//   const hasActiveSort = (sort?.length ?? 0) > 0;
//   const hasServerSearch = !!(searchServer || "").trim();

//   const canShowClearAll = hasActiveFilter || hasActiveSort || hasServerSearch;

//   const searchDraftTrim = (searchDraft || "").trim();
//   const canShowSearchButton =
//     searchMode === "server" &&
//     showServerSearchButton &&
//     !!searchDraftTrim &&
//     searchDraftTrim !== (searchServer || "").trim();

//   /* ---------- filters ---------- */
//   const resetDraftFilters = () => {
//     const next = {};
//     for (const c of filterableCols) {
//       if (c.dateFilter || c.filterType === "dateRange")
//         next[c.key] = { from: null, to: null };
//       else if (c.filterType === "numberRange")
//         next[c.key] = { min: "", max: "" };
//       else if (c.filterType === "multiSelect" || c.filterType === "checkboxGroup")
//         next[c.key] = [];
//       else if (c.filterType === "checkbox") next[c.key] = false;
//       else next[c.key] = c.filterDefault ?? "";
//     }
//     setDraftFilters(next);
//   };

//   useEffect(() => {
//     resetDraftFilters();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [columnsEffective]);

//   const applyDraftFilters = () => {
//     const nextGroup = buildFilterGroupFromDraft(columnsEffective, draftFilters);
//     setPage(1);
//     setFilter(nextGroup);
//     setFilterOpen(false);
//   };

//   const clearAll = () => {
//     setPage(1);
//     setSort([]);
//     setSearchDraft("");
//     setSearchServer("");
//     resetDraftFilters();
//     setFilter({ logic: "and", rules: [] });
//     setSelected(new Set());
//   };

//   const applyServerSearch = () => {
//     const q = (searchDraft || "").trim();
//     if (!q) return;
//     setPage(1);
//     setSearchServer(q);
//   };

//   const clearServerSearch = () => {
//     setPage(1);
//     setSearchDraft("");
//     setSearchServer("");
//   };

//   const onHeaderSort = (col) => {
//     if (!col.sortable) return;
//     const field = getServerSortField(col);

//     setPage(1);
//     setSort((prev) => {
//       const cur = prev?.[0];
//       if (!cur || cur.field !== field) return [{ field, dir: "asc" }];
//       if (cur.dir === "asc") return [{ field, dir: "desc" }];
//       return [];
//     });
//   };

//   const sortBadge = (col) => {
//     const field = getServerSortField(col);
//     const cur = sort?.[0];
//     if (!cur || cur.field !== field) return "";
//     return cur.dir === "asc" ? "↑" : "↓";
//   };

//   const buildSearchPayload = () => {
//     const q = (searchMode === "server" ? searchServer : "")?.trim();
//     if (!q) return { q: "", fields: [] };

//     // server-side: hangi alanlarda arama yapılacağı net olsun
//     const fields = searchableCols.length
//       ? searchableCols.map((c) => getServerField(c))
//       : [];

//     return { q, fields };
//   };

//   const runFetch = async () => {
//     if (typeof fetcher !== "function") return;

//     const search = buildSearchPayload();

//     // modern: search'i filter içine OR grup olarak da ekleyebilirsin (backend destekliyorsa)
//     let finalFilter = filter;
//     if (
//       transport === "modern" &&
//       search.q &&
//       Array.isArray(search.fields) &&
//       search.fields.length
//     ) {
//       const orGroup = {
//         logic: "or",
//         rules: search.fields.map((f) => ({
//           field: f,
//           op: "contains",
//           value: search.q,
//         })),
//       };
//       finalFilter = {
//         logic: "and",
//         rules: [orGroup, ...(filter?.rules || [])],
//       };
//     }

//     const queryObj = serializeQuery({
//       transport,
//       page,
//       pageSize,
//       sort,
//       search,
//       filter: finalFilter,
//       includes,
//     });

//     const finalQuery = { ...queryObj, ...(extraParams || {}) };

//     setLoading(true);
//     try {
//       const res = await fetcher(finalQuery);
//       setResult(normalizeResult(res));
//       setSelected(new Set());
//       onSelectionChange?.([]);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     if (!autoFetchOnMount) return;
//     runFetch();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   useEffect(() => {
//     // server-side tetikleyiciler
//     runFetch();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [page, pageSize, JSON.stringify(sort), JSON.stringify(filter), searchServer]);

//   const effectiveLoading = externalLoading ?? loading;

//   /* ---------- selection ---------- */
//   const toggleAll = () => {
//     if (!selectable) return;
//     if (allChecked) {
//       setSelected(new Set());
//       onSelectionChange?.([]);
//       return;
//     }
//     const next = new Set(locallyFilteredItems.map((r, i) => rowKey(r, i)));
//     setSelected(next);
//     onSelectionChange?.(locallyFilteredItems);
//   };

//   const toggleOne = (id) => {
//     if (!selectable) return;
//     setSelected((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);

//       const rows = locallyFilteredItems
//         .map((r, i) => ({ id: rowKey(r, i), row: r }))
//         .filter((x) => next.has(x.id))
//         .map((x) => x.row);

//       onSelectionChange?.(rows);
//       return next;
//     });
//   };

//   /* ---------- pager ---------- */
//   const goFirst = () => setPage(1);
//   const goPrev = () => setPage((p) => Math.max(1, p - 1));
//   const goNext = () => setPage((p) => Math.min(totalPages, p + 1));
//   const goLast = () => setPage(totalPages);

//   return (
//     <div className="ctv2" dir={dir}>
//       {/* Toolbar */}
//       <div className="ctv2__toolbar">
//         <div className="ctv2__toolbarGrid">
//           {/* Title */}
//           <div className="ctv2__title">
//             <strong className="ctv2__titleText">{toolbarTitle}</strong>
//             <span className="ctv2__count">
//               ({totalCount.toLocaleString("en-US")})
//             </span>
//           </div>

//           {/* Search */}
//           {showSearchBar ? (
//             <div className="ctv2__search">
//               <Input
//                 value={searchDraft}
//                 onChange={(v) => setSearchDraft(getInputValue(v))}
//                 placeholder={searchPlaceholder}
//                 label={null}
//                 icon={Search}
//                 iconRight={searchDraft ? X : null}
//                 onIconRightClick={() => setSearchDraft("")}
//                 className="ctv2__searchGrow"
//                 inputClassName="ctv2__searchInput"
//                 autoComplete="off"
//                 onKeyDown={(e) => {
//                   if (searchMode === "server" && e.key === "Enter") {
//                     applyServerSearch();
//                   }
//                 }}
//               />

//               {/* ✅ "Ara" butonu: input boşsa veya değişmediyse görünmesin */}
//               {searchMode === "server" && showServerSearchButton && (
//                 <>
//                   {canShowSearchButton && (
//                     <Button
//                       size="md"
//                       variant="soft"
//                       icon={Search}
//                       iconOnly
//                       ariaLabel={searchButtonLabel}
//                       onClick={applyServerSearch}
//                       title={searchButtonLabel}
//                       primaryColor={infoColor}
//                       activeColor={activeColor}
//                     />
//                   )}

//                   {/* {!!searchServer && (
//                     <Button
//                       size="md"
//                       variant="soft"
//                       icon={Trash}
//                       iconOnly
//                       ariaLabel="پاک کردن جستجو"
//                       onClick={clearServerSearch}
//                       title="پاک کردن جستجو"
//                       primaryColor={dangerColor}
//                       activeColor={activeColor}
//                     />
//                   )} */}
//                 </>
//               )}
//             </div>
//           ) : (
//             <div />
//           )}

//           {/* Actions */}
//           <div className="ctv2__actions">
//             {/* ✅ Columns */}
//             {showColumnsButton && (
//               <div className="ctv2__colsWrap" ref={colsRef}>
//                 <Button
//                   size="md"
//                   variant="soft"
//                   icon={Columns2}
//                   iconOnly
//                   ariaLabel={columnsButtonLabel}
//                   onClick={() => setColsOpen((s) => !s)}
//                   title={columnsButtonLabel}
//                   primaryColor={secondaryColor}
//                   activeColor={activeColor}
//                 />

//                 {colsOpen && (
//                   <div className="ctv2__colsPanel">
//                     <div className="ctv2__colsTitle">{columnsButtonLabel}</div>

//                     <div className="ctv2__colsList">
//                       {(columnsEffective || []).map((c) => {
//                         const checked = c?.visible !== false;
//                         const label = c.header ?? c.key;
//                         const lock = c.hideable === false;

//                         return (
//                           <label
//                             key={c.key}
//                             className={`ctv2__colItem ${
//                               lock ? "is-locked" : ""
//                             }`}
//                           >
//                             <input
//                               type="checkbox"
//                               checked={checked}
//                               disabled={lock}
//                               onChange={() => !lock && toggleColumn(c.key)}
//                             />
//                             <span>{label}</span>
//                           </label>
//                         );
//                       })}
//                     </div>

//                     <div className="ctv2__colsActions">
//                       <Button
//                         size="sm"
//                         variant="soft"
//                         onClick={resetColumnsVisibility}
//                         primaryColor={warningColor}
//                         activeColor={activeColor}
//                       >
//                         پیش فرض
//                       </Button>

//                       <Button
//                         size="sm"
//                         variant="soft"
//                         onClick={() => setColsOpen(false)}
//                         primaryColor={secondaryColor}
//                         activeColor={activeColor}
//                       >
//                         بستن
//                       </Button>
//                     </div>
//                   </div>
//                 )}
//               </div>
//             )}

//             {showAddButton && (
//               <Button
//                 size="md"
//                 variant="soft"
//                 icon={Plus}
//                 onClick={onAddClick}
//                 primaryColor={primaryColor}
//                 activeColor={activeColor}
//               >
//                 {addButtonLabel}
//               </Button>
//             )}

//             {showRefreshButton && (
//               <Button
//                 size="md"
//                 variant="soft"
//                 icon={RefreshCcw}
//                 iconOnly
//                 ariaLabel="بازخوانی"
//                 onClick={() => runFetch()}
//                 title="بازخوانی"
//                 primaryColor={secondaryColor}
//                 activeColor={activeColor}
//               />
//             )}

//             {/* ✅ ClearAll: iş yoksa görünmesin */}
//             {showClearAllButton && canShowClearAll && (
//               <Button
//                 size="md"
//                 variant="soft"
//                 icon={Trash}
//                 iconOnly
//                 ariaLabel="پاک کردن (sort + search + filter)"
//                 onClick={clearAll}
//                 title="پاک کردن (sort + search + filter)"
//                 primaryColor={dangerColor}
//                 activeColor={activeColor}
//               />
//             )}

//             {/* ✅ Filter: filtre kolonu yoksa hiç görünmesin */}
//             {showFilterButton && filterableCols.length > 0 && (
//               <Button
//                 size="md"
//                 variant="soft"
//                 icon={Filter}
//                 iconOnly
//                 ariaLabel="فیلتر"
//                 onClick={() => setFilterOpen(true)}
//                 title="فیلتر"
//                 primaryColor={secondaryColor}
//                 activeColor={activeColor}
//               />
//             )}

//             {selectable && selected.size > 0 && (
//               <Button
//                 size="md"
//                 variant="soft"
//                 onClick={() => onSelectedClick?.(selectedRows)}
//                 title="نمایش انتخاب شده‌ها"
//                 primaryColor={primaryColor}
//                 activeColor={activeColor}
//               >
//                 انتخاب شده ({selected.size})
//               </Button>
//             )}
//           </div>
//         </div>
//       </div>

//       {/* Table viewport (scroll) */}
//       <div className="ctv2__viewport" style={{ maxHeight: maxBodyHeight }}>
//         <table className="ctv2__table">
//           <thead>
//             <tr>
//               {selectable && (
//                 <th className="ctv2__th ctv2__th--sel">
//                   <input
//                     ref={headerCheckRef}
//                     className="ctv2__check"
//                     type="checkbox"
//                     checked={allChecked}
//                     onChange={toggleAll}
//                     aria-checked={someChecked ? "mixed" : allChecked}
//                     aria-label="انتخاب همه"
//                   />
//                 </th>
//               )}

//               {showRowNumbers && (
//                 <th className="ctv2__th ctv2__th--rownum">#</th>
//               )}

//               {visibleCols.map((col) => (
//                 <th
//                   key={col.key}
//                   className={`ctv2__th ${col.sortable ? "is-sortable" : ""}`}
//                   onClick={() => onHeaderSort(col)}
//                   title={col.sortable ? "مرتب‌سازی" : ""}
//                 >
//                   <span className="ctv2__thText">{col.header ?? col.key}</span>
//                   {col.sortable && (
//                     <span className="ctv2__sort">{sortBadge(col)}</span>
//                   )}
//                 </th>
//               ))}
//             </tr>
//           </thead>

//           <tbody>
//             {effectiveLoading ? (
//               [...Array(Math.min(pageSize, 25))].map((_, i) => (
//                 <tr key={`sk-${i}`}>
//                   {selectable && (
//                     <td className="ctv2__td">
//                       <div className="ctv2__skel" />
//                     </td>
//                   )}
//                   {showRowNumbers && (
//                     <td className="ctv2__td">
//                       <div className="ctv2__skel" />
//                     </td>
//                   )}
//                   {visibleCols.map((c) => (
//                     <td key={c.key} className="ctv2__td">
//                       <div className="ctv2__skel" />
//                     </td>
//                   ))}
//                 </tr>
//               ))
//             ) : locallyFilteredItems.length === 0 ? (
//               <tr>
//                 <td
//                   className="ctv2__td ctv2__empty"
//                   colSpan={
//                     visibleCols.length + (selectable ? 1 : 0) + (showRowNumbers ? 1 : 0)
//                   }
//                 >
//                   {emptyMessage}
//                 </td>
//               </tr>
//             ) : (
//               locallyFilteredItems.map((row, ri) => {
//                 const id = rowKey(row, ri);
//                 const absoluteIndex = (page - 1) * pageSize + ri + 1;

//                 return (
//                   <tr
//                     key={id}
//                     className={selectable && selected.has(id) ? "is-active" : ""}
//                     onClick={() => onRowClick?.(row)}
//                     style={{ cursor: onRowClick ? "pointer" : "default" }}
//                   >
//                     {selectable && (
//                       <td
//                         className="ctv2__td ctv2__td--sel"
//                         onClick={(e) => e.stopPropagation()}
//                       >
//                         <input
//                           className="ctv2__check"
//                           type="checkbox"
//                           checked={selected.has(id)}
//                           onChange={() => toggleOne(id)}
//                           aria-label="انتخاب ردیف"
//                         />
//                       </td>
//                     )}

//                     {showRowNumbers && (
//                       <td className="ctv2__td ctv2__td--rownum">
//                         {String(absoluteIndex)}
//                       </td>
//                     )}

//                     {visibleCols.map((col) => {
//                       const cell = row?.[col.key];

//                       const content =
//                         typeof col.render === "function"
//                           ? col.render(cell, row, ri)
//                           : cell == null
//                           ? "—"
//                           : String(cell);

//                       return (
//                         <td
//                           key={col.key}
//                           className="ctv2__td"
//                           title={cell != null ? String(cell) : ""}
//                         >
//                           {content}
//                         </td>
//                       );
//                     })}
//                   </tr>
//                 );
//               })
//             )}
//           </tbody>
//         </table>
//       </div>

//       {/* Footer */}
//       <div className="ctv2__footer">
//         <div className="ctv2__meta">
//           نمایش {String(rangeStart)} تا {String(rangeEnd)} از{" "}
//           {totalCount.toLocaleString("en-US")}
//         </div>

//         <div className="ctv2__pager">
//           <div className="ctv2__pageSize">
//             <span className="ctv2__label">تعداد در صفحه</span>
//             <select
//               className="ctv2__select"
//               value={pageSize}
//               onChange={(e) => {
//                 setPage(1);
//                 setPageSize(Number(getInputValue(e)));
//               }}
//             >
//               {pageSizeOptions.map((n) => (
//                 <option key={n} value={n}>
//                   {String(n)}
//                 </option>
//               ))}
//             </select>
//           </div>

//           <div className="ctv2__nav">
//             <Button
//               size="md"
//               variant="soft"
//               icon={ChevronsRight}
//               iconOnly
//               ariaLabel="اول"
//               onClick={goFirst}
//               disabled={page <= 1}
//               title="اول"
//               primaryColor={secondaryColor}
//               activeColor={activeColor}
//             />
//             <Button
//               size="md"
//               variant="soft"
//               icon={ChevronRight}
//               iconOnly
//               ariaLabel="قبلی"
//               onClick={goPrev}
//               disabled={page <= 1}
//               title="قبلی"
//               primaryColor={secondaryColor}
//               activeColor={activeColor}
//             />
//             <span className="ctv2__pageInfo">
//               {String(page)} / {String(totalPages)}
//             </span>
//             <Button
//               size="md"
//               variant="soft"
//               icon={ChevronLeft}
//               iconOnly
//               ariaLabel="بعدی"
//               onClick={goNext}
//               disabled={page >= totalPages}
//               title="بعدی"
//               primaryColor={secondaryColor}
//               activeColor={activeColor}
//             />
//             <Button
//               size="md"
//               variant="soft"
//               icon={ChevronsLeft}
//               iconOnly
//               ariaLabel="آخر"
//               onClick={goLast}
//               disabled={page >= totalPages}
//               title="آخر"
//               primaryColor={secondaryColor}
//               activeColor={activeColor}
//             />
//           </div>
//         </div>
//       </div>

//       {/* Filter Modal */}
//       {filterOpen && (
//         <FilterModal
//           open={filterOpen}
//           onClose={handleFilterClose}
//           columns={columnsEffective}
//           filterableCols={filterableCols}
//           draft={draftFilters}
//           setDraft={setDraftFilters}
//           onApply={applyDraftFilters}
//           onReset={resetDraftFilters}
//           title="فیلترها"
//         />
//       )}
//     </div>
//   );
// }
