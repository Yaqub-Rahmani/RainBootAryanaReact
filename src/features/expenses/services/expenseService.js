import { api } from "../../../shared/services/apiClient";

// Matches backend QueryOptions + CustomTableV2 legacy transport.
const serializeQuery = (q = {}) => {
  const p = new URLSearchParams();

  const page = q.Page ?? q.page ?? 1;
  const pageSize = q.PageSize ?? q.pageSize ?? 25;
  if (page) p.set("Page", String(page));
  if (pageSize) p.set("PageSize", String(pageSize));

  if (q.Sort) p.set("Sort", String(q.Sort));
  if (q.sort) p.set("Sort", String(q.sort));

  if (q.Search) p.set("Search", String(q.Search));
  if (q.search) p.set("Search", String(q.search));

  const filters = q.Filters ?? q.filters ?? [];
  if (Array.isArray(filters)) {
    for (const f of filters) p.append("Filters", String(f));
  }

  return p.toString();
};

const unwrap = (resp) => resp?.data ?? resp;

export const expenseService = {
  async getDetails(queryOptions = {}) {
    const qs = serializeQuery(queryOptions);
    const resp = await api.get(`/api/Expense/details${qs ? `?${qs}` : ""}`);
    return unwrap(resp);
  },

  async getById(id) {
    const resp = await api.get(`/api/Expense/${id}`);
    return unwrap(resp);
  },

  async create(payload) {
    const resp = await api.post(`/api/Expense`, payload);
    return unwrap(resp);
  },

  async update(id, payload) {
    const resp = await api.put(`/api/Expense/${id}`, payload);
    return unwrap(resp);
  },

  async remove(id) {
    const resp = await api.delete(`/api/Expense/${id}`);
    return unwrap(resp);
  },

  async getMoneyAccounts(includeInactive = false) {
    const resp = await api.get(`/api/MoneyAccount?includeInactive=${includeInactive ? "true" : "false"}`);
    return unwrap(resp);
  },

  async getMoneyAccountBalance(moneyAccountId) {
    const resp = await api.get(`/api/Expense/money-account-balance?moneyAccountId=${moneyAccountId}`);
    return unwrap(resp);
  },
};
