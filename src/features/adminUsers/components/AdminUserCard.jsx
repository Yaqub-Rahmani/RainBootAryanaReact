import React, { useMemo, useState } from "react";
import Button from "../../../shared/components/Button";
import { Pencil, Ban } from "lucide-react";

const roleLabel = (r) => {
  const v = String(r || "").toLowerCase();
  if (v === "superadmin") return "مدیر کل";
  if (v === "accountant") return "حسابدار";
  if (v === "viewer") return "ناظر";
  return "ادمین";
};

const getInitials = (name) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? "";
  const s = (a + b).toUpperCase();
  return s || "A";
};

export default function AdminUserCard({ row, onEdit, onDisable }) {
  const [hover, setHover] = useState(false);

  const name = row?.name ?? row?.Name ?? "—";
  const role = row?.role ?? row?.Role ?? "admin";
  const status = row?.status ?? row?.Status;

  const initials = useMemo(() => getInitials(name), [name]);

  const isInactive = status === false;

  return (
    <div
      dir="rtl"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        border: `1px solid ${hover ? "var(--role-primary-bg)" : "var(--border)"}`,
        background: "var(--surface)",
        borderRadius: 16,
        padding: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        boxShadow: hover ? "var(--shadow-md)" : "var(--shadow-sm)",
        transform: hover ? "translateY(-1px)" : "translateY(0px)",
        transition: "all 160ms ease",
      }}
    >
      {/* Left: Avatar + Text */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        {/* Avatar */}
        <div
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 999,
            display: "grid",
            placeItems: "center",
            fontWeight: 800,
            letterSpacing: 0.5,
            color: "var(--text)",
            background: "var(--role-neutral-soft-bg)",
            border: "1px solid var(--border)",
            flexShrink: 0,
          }}
        >
          {initials}
        </div>

        {/* Name + Role */}
        <div style={{ minWidth: 0, display: "grid", gap: 6 }}>
          <div
            style={{
              fontWeight: 900,
              color: "var(--text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              lineHeight: 1.1,
            }}
            title={name}
          >
            {name}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                background: "var(--role-neutral-soft-bg)",
                color: "var(--text)",
                border: "1px solid var(--border)",
                whiteSpace: "nowrap",
              }}
            >
              {roleLabel(role)}
            </span>

            <span
              style={{
                fontSize: 12,
                padding: "4px 10px",
                borderRadius: 999,
                color: "white",
                background: isInactive ? "var(--role-danger-bg)" : "var(--role-primary-bg)",
                whiteSpace: "nowrap",
              }}
            >
              {isInactive ? "غیرفعال" : "فعال"}
            </span>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <Button
          size="md"
          icon={Pencil}
          iconOnly
          title="ویرایش"
          onClick={() => onEdit?.(row)}
          primaryColor={"var(--role-neutral-soft-bg)"}
          activeColor={"var(--role-neutral-soft-bg)"}
        />

        <Button
          size="md"
          icon={Ban}
          iconOnly
          title="غیرفعال"
          onClick={() => onDisable?.(row)}
          primaryColor={"var(--role-danger-bg)"}
          activeColor={"var(--role-danger-bg)"}
        />
      </div>
    </div>
  );
}
