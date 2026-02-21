import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import Button from "../../../shared/components/Button";
import "../styles/EntriesModal.css";

export default function EntriesModal({
  open,
  title = "جزئیات",
  onClose,
  columns = [],
  fetcher,
  maxBodyHeight = 560,
}) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    setTimeout(() => closeRef.current?.focus?.(), 0);

    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const stop = (e) => e.stopPropagation();

  return (
    <div
      className="entriesModal__overlay"
      dir="rtl"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div className="entriesModal__card" role="dialog" aria-modal="true" onMouseDown={stop}>
        <div className="entriesModal__body">
          <CustomTableV2
            transport="legacy"
            dir="rtl"
            toolbarTitle={title}
            columns={columns}
            fetcher={fetcher}
            initialPageSize={25}
            pageSizeOptions={[10, 25, 50, 100]}
            showSearchBar
            showRefreshButton
            maxBodyHeight={maxBodyHeight}
            emptyMessage="هیچ رکوردی یافت نشد."
          />
        </div>
      </div>
    </div>
  );
}
