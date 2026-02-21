export const selectTenantProfileState = (state) => state.tenantProfile;

export const selectTenantProfile = (state) => selectTenantProfileState(state).profile;
export const selectTenantContracts = (state) => selectTenantProfileState(state).contracts;

export const selectTenantProfileStatus = (state) => selectTenantProfileState(state).profileStatus;
export const selectTenantContractsStatus = (state) => selectTenantProfileState(state).contractsStatus;
export const selectTenantFingerprintStatus = (state) => selectTenantProfileState(state).fingerprintStatus;

export const selectTenantProfileError = (state) => selectTenantProfileState(state).error;
