export const selectAuth = (state) => state.auth;

// Temel alanlar
export const selectAuthUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthStatus = (state) => state.auth.status;
export const selectAuthError = (state) => state.auth.error;
export const selectAuthBootstrapped = (state) => state.auth.bootstrapped;

// Ergonomi amaçlı yardımcı selector'lar
export const selectAuthIsLoading = (state) => state.auth.status === 'loading';
export const selectAuthSucceeded = (state) => state.auth.status === 'succeeded';
export const selectAuthFailed = (state) => state.auth.status === 'failed';