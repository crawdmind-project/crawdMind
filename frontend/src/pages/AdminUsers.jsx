import { useCallback, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  User,
  Trash2,
  Loader2,
  RefreshCw,
  Search,
  AlertTriangle,
  X,
} from "lucide-react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchAdminUsers = createAsyncThunk(
  "adminUsers/fetchAdminUsers",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/auth/admin/users');
      const data = res.data;
      const list = Array.isArray(data) ? data : data.users || data.data || [];

      return list.map((u) => ({
        id: u.id ?? u._id,
        fullName: u.fullName || u.name || "User",
        email: u.email || "",
        role: String(u.role || "MEMBER").toUpperCase(),
        createdAt: u.createdAt || null,
      }));
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not load users list.");
    }
  }
);

export const updateAdminUserRole = createAsyncThunk(
  "adminUsers/updateAdminUserRole",
  async ({ userId, newRole }, { rejectWithValue }) => {
    try {
      await api.put(`/auth/admin/users/${userId}`, { role: newRole });
      return { userId, newRole };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to update user role");
    }
  }
);

export const deleteAdminUser = createAsyncThunk(
  "adminUsers/deleteAdminUser",
  async (userId, { rejectWithValue }) => {
    try {
      await api.delete(`/auth/admin/users/${userId}`);
      return userId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to delete user");
    }
  }
);

export const adminUsersSlice = createSlice({
  name: "adminUsers",
  initialState: {
    users: [],
    loading: true,
    error: "",
    actionLoadingId: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAdminUsers.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchAdminUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload;
      })
      .addCase(fetchAdminUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Could not load users list.";
      })
      .addCase(updateAdminUserRole.pending, (state, action) => {
        state.actionLoadingId = action.meta.arg.userId;
      })
      .addCase(updateAdminUserRole.fulfilled, (state, action) => {
        state.actionLoadingId = null;
        const { userId, newRole } = action.payload;
        state.users = state.users.map((u) => (u.id === userId ? { ...u, role: newRole } : u));
      })
      .addCase(updateAdminUserRole.rejected, (state, action) => {
        state.actionLoadingId = null;
        alert(action.payload);
      })
      .addCase(deleteAdminUser.pending, (state, action) => {
        state.actionLoadingId = action.meta.arg;
      })
      .addCase(deleteAdminUser.fulfilled, (state, action) => {
        state.actionLoadingId = null;
        const userId = action.payload;
        state.users = state.users.filter((u) => u.id !== userId);
      })
      .addCase(deleteAdminUser.rejected, (state, action) => {
        state.actionLoadingId = null;
        alert(action.payload);
      });
  },
});

const ROLE_STYLES = {
  ADMIN: {
    label: "ADMIN",
    badge: "bg-purple-100 text-purple-800 border-purple-200",
    Icon: ShieldCheck,
    iconColor: "text-purple-600",
  },
  MODERATOR: {
    label: "MODERATOR",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: ShieldAlert,
    iconColor: "text-blue-600",
  },
  MEMBER: {
    label: "MEMBER",
    badge: "bg-slate-100 text-slate-700 border-slate-200",
    Icon: User,
    iconColor: "text-slate-500",
  },
};

function initials(name = "User") {
  return name
    .split(" ")
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name }) {
  return (
    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-sm font-semibold text-indigo-600">
      {initials(name)}
    </span>
  );
}

export default function AdminUsers() {
  const dispatch = useDispatch();
  const { users, loading, error, actionLoadingId } = useSelector(
    (state) => state.adminUsers || { users: [], loading: false, error: "", actionLoadingId: null }
  );
  
  const [searchQuery, setSearchQuery] = useState("");
  const [userToDelete, setUserToDelete] = useState(null); 

  const loadUsers = useCallback(() => {
    dispatch(fetchAdminUsers());
  }, [dispatch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleRoleChange = (userId, newRole) => {
    dispatch(updateAdminUserRole({ userId, newRole }));
  };

  const confirmDeleteUser = () => {
    if (userToDelete) {
      dispatch(deleteAdminUser(userToDelete.id));
      setUserToDelete(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased py-8 px-6 relative">
      <main className="mx-auto max-w-5xl space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-purple-50 px-3.5 py-1 text-xs font-medium text-purple-700 border border-purple-100">
              <Users className="size-3.5 text-purple-600" />
              Admin Access Only
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
              User Management
            </h1>
            <p className="text-sm text-slate-500">
              Manage team roles, access permissions, and user accounts.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search user or email..."
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none shadow-xs"
            />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-2">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="text-sm text-slate-500 font-medium">Loading user accounts...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center space-y-3">
            <AlertTriangle className="size-8 text-red-500 mx-auto" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button
              onClick={() => loadUsers()}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-700 transition-all"
            >
              <RefreshCw className="size-4" /> Retry
            </button>
          </div>
        )}

        {/* Users Table */}
        {!loading && !error && (
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-10 text-slate-400 text-sm">
                        No user accounts found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleObj = ROLE_STYLES[u.role] || ROLE_STYLES.MEMBER;
                      const RoleIcon = roleObj.Icon;
                      const isWorking = actionLoadingId === u.id;

                      return (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                          {/* User Avatar & Name */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <Avatar name={u.fullName} />
                              <span className="font-semibold text-slate-900">{u.fullName}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="px-6 py-4 text-slate-500">{u.email}</td>

                          {/* Role Badge & Selector */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border ${roleObj.badge}`}
                              >
                                <RoleIcon className={`size-3.5 ${roleObj.iconColor}`} />
                                {roleObj.label}
                              </span>

                              <select
                                value={u.role}
                                disabled={isWorking}
                                onChange={(e) => handleRoleChange(u.id, e.target.value)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50"
                              >
                                <option value="MEMBER">MEMBER</option>
                                <option value="MODERATOR">MODERATOR</option>
                                <option value="ADMIN">ADMIN</option>
                              </select>
                            </div>
                          </td>

                          {/* Action Buttons */}
                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() => setUserToDelete(u)}
                              disabled={isWorking}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50/50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 hover:border-red-300 transition-all disabled:opacity-50 cursor-pointer"
                            >
                              {isWorking ? (
                                <Loader2 className="size-4 animate-spin text-red-500" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* CUSTOM DELETE CONFIRMATION MODAL */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex size-10 items-center justify-center rounded-full bg-red-100 text-red-600">
                <AlertTriangle className="size-5" />
              </div>
              <button
                onClick={() => setUserToDelete(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold text-slate-900">Delete User Account</h3>
              <p className="text-sm text-slate-500">
                Are you sure you want to delete <span className="font-semibold text-slate-800">"{userToDelete.fullName}"</span>? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-red-700 transition-colors cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}