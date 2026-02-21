import { fetchPdfBlob } from "./serverPdfClient";

// Payment
export async function generatePaymentReceiptA6(collectionId) {
  const blob = await fetchPdfBlob(`/api/Reports/GeneratePaymentReceiptA6/${collectionId}`, {
    method: "GET",
  });
  return { blob, filename: `payment-receipt-${collectionId}.pdf` };
}

export async function generatePaymentReceiptsA6(collectionIds) {
  const blob = await fetchPdfBlob(`/api/Reports/GeneratePaymentReceiptsA6`, {
    method: "POST",
    body: { collectionIds },
  });
  return { blob, filename: `payment-receipts-${collectionIds.length}.pdf` };
}

// Contract debt
export async function generateContractDebtA6(contractId) {
  // Body göndermiyoruz => controller options=null => default A6 landscape
  const blob = await fetchPdfBlob(`/api/Reports/contract-debt-a6/${contractId}`, { method: "POST" });
  return { blob, filename: `contract-debt-${contractId}.pdf` };
}

export async function generateContractDebtA6Batch(contractIds) {
  const blob = await fetchPdfBlob(`/api/Reports/contract-debt-a6/batch`, {
    method: "POST",
    body: { contractIds }, // Options yok => controller default A4 N-Up
  });
  return { blob, filename: `contract-debt-batch-${contractIds.length}.pdf` };
}

export async function generateContractPeriodA6(contractId, req) {
  const blob = await fetchPdfBlob(`/api/Reports/contract-period-a6/${contractId}`, {
    method: "POST",
    body: req, // { startDate, endDate }
  });
  return { blob, filename: `contract-period-${contractId}.pdf` };
}

export async function generateContractPeriodA6Batch(contractIds, req) {
  const blob = await fetchPdfBlob(`/api/Reports/contract-period-a6/batch`, {
    method: "POST",
    body: { ...req, contractIds }, // { startDate, endDate, contractIds }
  });
  return { blob, filename: `contract-period-batch-${contractIds.length}.pdf` };
}