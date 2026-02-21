import React, { useMemo, useState } from "react";
import Modal from "../../../shared/imageCrop/Modal";
import Button from "../../../shared/components/Button";
import CustomTableV2 from "../../../shared/components/CustomTableV2/CustomTableV2";
import "./PoolBreakdownModal.css";

const fmt0 = (n) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Number(n ?? 0));

export default function PoolBreakdownModal({
  open,
  onClose,
  title,
  fetcher, // (query) => PagedResult
  onRowClick,
}) {
  const columns = useMemo(() => [
    { key: "partyName", header: "نام", serverField: "partyName", minWidth: 220 },
    { key: "shareAfn", header: "سهم (AFN)", serverField: "shareAfn", render: (r) => fmt0(r.shareAfn), minWidth: 130 },
    { key: "withdrawnAfn", header: "برداشت (AFN)", serverField: "withdrawnAfn", render: (r) => fmt0(r.withdrawnAfn), minWidth: 130 },
    { key: "debtAfn", header: "قرض (AFN)", serverField: "debtAfn", render: (r) => fmt0(r.debtAfn), minWidth: 120 },
    { key: "balanceAfn", header: "باقی‌مانده", serverField: "balanceAfn", render: (r) => fmt0(r.balanceAfn), minWidth: 120 },
  ], []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title=""
      footer={
        <div className="poolFooter">
          <Button variant="secondary" onClick={onClose}>بستن</Button>
        </div>
      }
    >
      <div className="poolModal">
        <div className="poolTitle">{title}</div>

        <CustomTableV2
          key={open ? "open" : "closed"}
          columns={columns}
          fetcher={fetcher}
          transport="legacy"
          toolbarTitle="لیست"
          dir="rtl"
          initialPageSize={25}
          maxBodyHeight={520}
          onRowClick={onRowClick}
        />
      </div>
    </Modal>
  );
}
