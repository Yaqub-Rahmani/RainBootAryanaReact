export const authInitialState = {
  user: null,
  isAuthenticated: false,
  status: 'idle',     // 'idle' | 'loading' | 'succeeded' | 'failed'
  error: null,
  bootstrapped: false, // storage okundu mu
};

export const loginInitialValues = { email: '', password: '' };
export const registerInitialValues = {
  firstName: '',
  lastName: '',
  email: '',
  password: '',
};