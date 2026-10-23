import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../api/axios";

export const fetchCurrentUser = createAsyncThunk(
  "auth/fetchCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get("/auth/me");
      const profile =
        response.data?.data || response.data?.user || response.data;
      return {
        id: profile.id || profile._id || profile.userId,
        fullName: profile.fullName || profile.name || "User",
        email: profile.email || "",
        role: String(profile.role || "MEMBER").toUpperCase(),
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message);
    }
  },
);

const initialToken =
  localStorage.getItem("token") || sessionStorage.getItem("token") || null;

const authSlice = createSlice({
  name: "auth",
  initialState: {
    token: initialToken,
    isAuthenticated: !!initialToken,
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    setLogin: (state, action) => {
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.user = action.payload.user;
      localStorage.setItem("token", action.payload.token);
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setLogout: (state) => {
      state.token = null;
      state.isAuthenticated = false;
      state.user = null;
      localStorage.removeItem("token");
      sessionStorage.removeItem("token");
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state) => {
        state.user = null;
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem("token");
        sessionStorage.removeItem("token");
      });
  },
});

export const { setLogin, setUser, setLogout } = authSlice.actions;
export default authSlice.reducer;
