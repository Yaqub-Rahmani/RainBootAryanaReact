import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";

const statusMap = {
  1: { color: "success", icon: CheckCircle, label: "Aktif" },
  2: { color: "warning", icon: AlertTriangle, label: "Beklemede" },
  3: { color: "danger", icon: XCircle, label: "Hata" },
  4: { color: "info", icon: Info, label: "Bilgi" },
};

export default function StatusBadge({ status = 1, label }) {
  const cfg = statusMap[status] || statusMap[4];
  const Icon = cfg.icon;

  const style = {
    background: `var(--role-${cfg.color}-soft-bg)`,
    color: `var(--role-${cfg.color}-bg)`,
    border: `1px solid var(--role-${cfg.color}-soft-border)`,
    borderRadius: "var(--badge-radius)",
    padding: `${getComputedStyle(document.documentElement)
      .getPropertyValue("--badge-py")} ${getComputedStyle(document.documentElement)
      .getPropertyValue("--badge-px")}`,
    fontSize: "var(--badge-font-size)",
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontWeight: 500,
  };

  return (
    <span style={style}>
      <Icon size={14} />
      {label || cfg.label}
    </span>
  );
}
