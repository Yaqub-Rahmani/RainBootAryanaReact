import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authApi } from '../services/authService';
import { authInitialState } from '../dto/initialValues';
import { getTokens } from '../../../shared/services/apiClient';

// --- Küçük bir JWT decode (kütüphanesiz) ---
function parseJwt(token) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function userFromClaims(p) {
  if (!p) return null;

  const id =
    p.sub ||
    p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
    p.nameid ||
    null;

  const email =
    p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
    p.email ||
    p.unique_name ||
    null;

  const fullName = p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || null;
  let firstName = null, lastName = null;
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    firstName = parts[0] || null;
    lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
  }

  const roles = p.role ? (Array.isArray(p.role) ? p.role : [p.role]) : [];
  return { id, email, firstName, lastName, roles, claims: p };
}

// ⬇️ BOOTSTRAP — token varsa /me → yoksa JWT'den kur
export const bootstrapAuth = createAsyncThunk(
  'auth/bootstrap',
  async (_, { rejectWithValue }) => {
    try {
      const tokens = getTokens();

      // Token yoksa: kesin logout state
      if (!tokens?.accessToken) {
        return { user: null, isAuthenticated: false };
      }

      // Token var ama exp yok / süresi geçmiş: logout state
      const payload = parseJwt(tokens.accessToken);
      const expMs = payload?.exp ? payload.exp * 1000 : 0;
      if (!expMs || expMs < Date.now()) {
        // İstersen burada authApi.logout() da çağırabilirsin (token temizlemek için)
        try { authApi.logout(); } catch {}
        return { user: null, isAuthenticated: false };
      }

      // 1) /me varsa dene
      let user = null;
      try {
        user = await authApi.me();
      } catch {
        // /me yok ya da hata — JWT fallback
      }

      // 2) /me dönmediyse JWT'den kur
      if (!user) {
        user = userFromClaims(payload);
      }

      return { user, isAuthenticated: true };
    } catch (e) {
      return rejectWithValue(e?.message || 'Auth bootstrap failed');
    }
  }
);

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const user = await authApi.login(payload); // service: token kaydeder, user döndürebilir
    return user; // user null olabilir
  } catch (e) {
    return rejectWithValue(e?.message || 'Login failed');
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const user = await authApi.register(payload);
    return user;
  } catch (e) {
    return rejectWithValue(e?.message || 'Register failed');
  }
});

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await authApi.me();
  } catch (e) {
    return rejectWithValue(e?.message || 'Fetch me failed');
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  authApi.logout(); // token temizlenir
  return true;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: authInitialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // bootstrap
    builder
      .addCase(bootstrapAuth.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(bootstrapAuth.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.user = a.payload.user;
        s.isAuthenticated = a.payload.isAuthenticated;
        s.bootstrapped = true;
      })
      .addCase(bootstrapAuth.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.payload || String(a.error?.message || 'Error');

        // ✅ kritik: rejected durumda auth kapat
        s.user = null;
        s.isAuthenticated = false;

        s.bootstrapped = true;
      });

    // login
    builder
      .addCase(login.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(login.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.user = a.payload ?? null;
        s.isAuthenticated = true;
      })
      .addCase(login.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.payload || String(a.error?.message || 'Error');
        s.user = null;
        s.isAuthenticated = false;
      });

    // register
    builder
      .addCase(register.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(register.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.user = a.payload ?? null;
        s.isAuthenticated = true;
      })
      .addCase(register.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.payload || String(a.error?.message || 'Error');
        s.user = null;
        s.isAuthenticated = false;
      });

    // me
    builder
      .addCase(fetchMe.pending, (s) => {
        s.status = 'loading';
        s.error = null;
      })
      .addCase(fetchMe.fulfilled, (s, a) => {
        s.status = 'succeeded';
        s.user = a.payload;
        s.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (s, a) => {
        s.status = 'failed';
        s.error = a.payload || String(a.error?.message || 'Error');

        // ✅ kritik: /me başarısızsa auth kapat (401 vs.)
        s.user = null;
        s.isAuthenticated = false;
      });

    // logout
    builder.addCase(logout.fulfilled, (s) => {
      s.user = null;
      s.isAuthenticated = false;
      s.status = 'idle';
      s.error = null;

      // İsteğe bağlı: app açılışında bekleme ekranı vs. için iyi olur
      s.bootstrapped = true;
    });
  },
});

export const { clearAuthError } = authSlice.actions;
export default authSlice.reducer;


// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import { authApi } from '../services/authService';
// import { authInitialState } from '../dto/initialValues';
// import { getTokens } from '../../../shared/services/apiClient';

// // --- Küçük bir JWT decode (kütüphanesiz) ---
// function parseJwt(token) {
//   try {
//     const base64Url = token.split('.')[1];
//     const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
//     const json = decodeURIComponent(
//       atob(base64)
//         .split('')
//         .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
//         .join('')
//     );
//     return JSON.parse(json);
//   } catch {
//     return null;
//   }
// }

// function userFromClaims(p) {
//   if (!p) return null;

//   // id: JWT standard "sub" veya .NET NameIdentifier
//   const id =
//     p.sub ||
//     p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
//     p.nameid ||
//     null;

//   // email: .NET emailaddress
//   const email =
//     p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'] ||
//     p.email ||
//     p.unique_name ||
//     null;

//   // isim: .NET name (tam ad)
//   const fullName = p['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || null;
//   let firstName = null, lastName = null;
//   if (fullName) {
//     const parts = fullName.trim().split(/\s+/);
//     firstName = parts[0] || null;
//     lastName = parts.length > 1 ? parts.slice(1).join(' ') : null;
//   }

//   const roles = p.role ? (Array.isArray(p.role) ? p.role : [p.role]) : [];
//   return { id, email, firstName, lastName, roles, claims: p };
// }

// // ⬇️ BOOTSTRAP — token varsa /me → yoksa JWT'den kur
// export const bootstrapAuth = createAsyncThunk('auth/bootstrap', async (_, { rejectWithValue }) => {
//   try {
//     const tokens = getTokens();
//     if (!tokens?.accessToken) {
//       return { user: null, isAuthenticated: false };
//     }

//     // 1) /me varsa dene
//     let user = null;
//     try {
//       user = await authApi.me();
//     } catch {
//       /* /me yok ya da hata — JWT fallback'e geçeceğiz */
//     }

//     // 2) /me dönmediyse JWT'den kur
//     if (!user) {
//       const payload = parseJwt(tokens.accessToken);
//       user = userFromClaims(payload);
//     }

//     return { user, isAuthenticated: true };
//   } catch (e) {
//     return rejectWithValue(e.message || 'Auth bootstrap failed');
//   }
// });

// export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
//   try {
//     const user = await authApi.login(payload); // service: token kaydeder, user döndürebilir
//     return user; // user null gelebilir — component'te fetchMe fallback'i öneriyoruz
//   } catch (e) {
//     return rejectWithValue(e.message || 'Login failed');
//   }
// });

// export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
//   try {
//     const user = await authApi.register(payload);
//     return user;
//   } catch (e) {
//     return rejectWithValue(e.message || 'Register failed');
//   }
// });

// export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
//   try {
//     return await authApi.me();
//   } catch (e) {
//     return rejectWithValue(e.message || 'Fetch me failed');
//   }
// });

// export const logout = createAsyncThunk('auth/logout', async () => {
//   authApi.logout(); // token temizlenir
//   return true;
// });

// const authSlice = createSlice({
//   name: 'auth',
//   initialState: authInitialState,
//   reducers: {
//     clearAuthError(state) { state.error = null; },
//   },
//   extraReducers: (builder) => {
//     // bootstrap
//     builder
//       .addCase(bootstrapAuth.pending, (s) => { s.status = 'loading'; })
//       .addCase(bootstrapAuth.fulfilled, (s, a) => {
//         s.status = 'succeeded';
//         s.user = a.payload.user;
//         s.isAuthenticated = a.payload.isAuthenticated;
//         s.bootstrapped = true;
//       })
//       .addCase(bootstrapAuth.rejected, (s, a) => {
//         s.status = 'failed';
//         s.error = a.payload || String(a.error?.message || 'Error');
//         s.bootstrapped = true;
//       });

//     // login
//     builder
//       .addCase(login.pending, (s) => { s.status = 'loading'; s.error = null; })
//       .addCase(login.fulfilled, (s, a) => {
//         s.status = 'succeeded';
//         s.user = a.payload;        // null olabilir — aşağıda fetchMe ile tamamlayacağız
//         s.isAuthenticated = true;  // token set edildiği için true
//       })
//       .addCase(login.rejected, (s, a) => {
//         s.status = 'failed';
//         s.error = a.payload || String(a.error?.message || 'Error');
//         s.isAuthenticated = false;
//       });

//     // register
//     builder
//       .addCase(register.pending, (s) => { s.status = 'loading'; s.error = null; })
//       .addCase(register.fulfilled, (s, a) => {
//         s.status = 'succeeded';
//         s.user = a.payload;        // null gelebilir
//         s.isAuthenticated = true;
//       })
//       .addCase(register.rejected, (s, a) => {
//         s.status = 'failed';
//         s.error = a.payload || String(a.error?.message || 'Error');
//       });

//     // me
//     builder
//       .addCase(fetchMe.pending, (s) => { s.status = 'loading'; s.error = null; })
//       .addCase(fetchMe.fulfilled, (s, a) => {
//         s.status = 'succeeded';
//         s.user = a.payload;
//         s.isAuthenticated = true;
//       })
//       .addCase(fetchMe.rejected, (s, a) => {
//         s.status = 'failed';
//         s.error = a.payload || String(a.error?.message || 'Error');
//       });

//     // logout
//     builder
//       .addCase(logout.fulfilled, (s) => {
//         s.user = null;
//         s.isAuthenticated = false;
//         s.status = 'idle';
//         s.error = null;
//       });
//   },
// });

// export const { clearAuthError } = authSlice.actions;
// export default authSlice.reducer;
