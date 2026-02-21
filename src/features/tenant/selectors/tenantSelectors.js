// Root
export const selectTenantState = (state) => state.tenant;

// Basit seçiciler
export const selectTenants = (state) => selectTenantState(state).list;
export const selectTenantDetails = (state) => selectTenantState(state).details;
export const selectTenantById = (id) => (state) => selectTenantState(state).byId[id];
export const selectTenantStatus = (state) => selectTenantState(state).status;
export const selectTenantDetailsStatus = (state) => selectTenantState(state).detailsStatus;
export const selectTenantError = (state) => selectTenantState(state).error;
export const selectOnlyActiveFilter = (state) => selectTenantState(state).filters.onlyActive;

// Türetilmiş — filtre aktifse listeden süz
export const selectFilteredTenants = (state) => {
  const onlyActive = selectOnlyActiveFilter(state);
  const list = selectTenants(state);
  if (onlyActive === undefined || onlyActive === null) return list;
  return list.filter(x => !!x.status === !!onlyActive);
};
