// features/shopFranchiseShares/utils/queryOptions.js
export const buildQueryOptions = (opt = {}) => {
  // örnek: { page:1, pageSize:20, sort:"effectiveFrom desc", search:"" }
  const q = {};
  if (opt.page != null) q.page = opt.page;
  if (opt.pageSize != null) q.pageSize = opt.pageSize;
  if (opt.sort) q.sort = opt.sort;
  if (opt.search) q.search = opt.search;
  return q;
};
