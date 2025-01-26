import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiService } from '../services/ApiService';

const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  loading: false,
  error: null,
};

// Async thunk for login
export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: { email: string; password: string }, { rejectWithValue }) => {
    try {
      const data = await ApiService.login(credentials);
      localStorage.setItem('token', data.token);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

// Async thunk for signup
export const signupAsync = createAsyncThunk(
  'auth/signup',
  async (credentials, { rejectWithValue }) => {
    try {
      const data = await ApiService.signup(credentials);
      const { token, user } = data;
      localStorage.setItem('token', token);
      return { user, token };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Signup failed');
    }
  }
);

// export const verifyTokenAsync = createAsyncThunk(
//   'auth/verifyToken',
//   async (_, { rejectWithValue }) => {
//     const token = localStorage.getItem('token');
//     if (token) {
//       try {
//         const response = await axiosInstance.get('/auth/verify-token', {
//           headers: { Authorization: `Bearer ${token}` }
//         });
//         return { user: response.data.user, token };
//       } catch (err) {
//         localStorage.removeItem('token');
//         return rejectWithValue('Token verification failed');
//       }
//     } else {
//       return rejectWithValue('No token found');
//     }
//   }
// );

const authSlice = createSlice({
  name: 'auth',
  initialState: initialState,
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      localStorage.setItem('token', action.payload.token);
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      localStorage.removeItem('token');
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(signupAsync.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupAsync.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(signupAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // .addCase(verifyTokenAsync.pending, (state) => {
      //   state.loading = true;
      //   state.error = null;
      // })
      // .addCase(verifyTokenAsync.fulfilled, (state, action) => {
      //   state.loading = false;
      //   state.user = action.payload.user;
      //   state.token = action.payload.token;
      // })
      // .addCase(verifyTokenAsync.rejected, (state, action) => {
      //   state.loading = false;
      //   state.error = action.payload;
      // });
  }
});

export const { setUser, logout, setError } = authSlice.actions;

export default authSlice.reducer;
