import { useState, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import {
  Bell,
  Check,
  Loader2,
  X,
  MessageSquare,
} from "lucide-react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchNotificationsData = createAsyncThunk(
  "notifications/fetchNotificationsData",
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get("/notifications");
      const data = res.data;
      const list = Array.isArray(data) ? data : data.data || data.notifications || [];

      const normalized = list.map((n) => ({
        id: n.id ?? n._id,
        message: n.message || "New activity on your post",
        ideaId: n.ideaId || null,
        readAt: n.readAt || null,
        createdAt: n.createdAt || Date.now(),
      }));

      const totalUnread = typeof data.totalUnread === "number"
        ? data.totalUnread
        : normalized.filter((n) => !n.readAt).length;

      return { notifications: normalized, totalUnread };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not load notifications.");
    }
  }
);

export const markNotificationAsRead = createAsyncThunk(
  "notifications/markNotificationAsRead",
  async (id, { rejectWithValue }) => {
    try {
      await api.put(`/notifications/${id}/read`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to mark as read");
    }
  }
);

export const markAllNotificationsAsRead = createAsyncThunk(
  "notifications/markAllNotificationsAsRead",
  async (_, { rejectWithValue }) => {
    try {
      await api.put("/notifications/read-all");
      return new Date().toISOString();
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to mark all as read");
    }
  }
);

export const notificationsSlice = createSlice({
  name: "notifications",
  initialState: {
    notifications: [],
    unreadCount: 0,
    loading: false,
    error: "",
    actionLoading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationsData.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications = action.payload.notifications;
        state.unreadCount = action.payload.totalUnread;
      })
      .addCase(markNotificationAsRead.fulfilled, (state, action) => {
        const id = action.payload;
        state.notifications = state.notifications.filter((n) => n.id !== id);
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      })
      .addCase(markAllNotificationsAsRead.fulfilled, (state) => {
        state.notifications = [];
        state.unreadCount = 0;
      });
  },
});

function formatRelativeTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const seconds = Math.floor((new Date() - date) / 1000);
  
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function Notifications() {
  const dispatch = useDispatch();
  const { notifications, unreadCount, loading } = useSelector(
    (state) => state.notifications || { notifications: [], unreadCount: 0, loading: false }
  );

  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    dispatch(fetchNotificationsData());

    const interval = setInterval(() => {
      dispatch(fetchNotificationsData());
    }, 10000);

    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAll = () => {
    if (unreadCount === 0) return;
    dispatch(markAllNotificationsAsRead());
  };

  const unreadNotifications = notifications.filter((n) => !n.readAt);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center size-10 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
      >
        <Bell className="size-4 text-slate-600" />
        
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-xs animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200/80 bg-white shadow-xl z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              NOTIFICATIONS
            </span>
            
            <div className="flex items-center gap-3">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                >
                  Mark read
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {loading && unreadNotifications.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="size-5 animate-spin text-indigo-600" />
              </div>
            ) : unreadNotifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                No new notifications.
              </div>
            ) : (
              unreadNotifications.map((n) => (
                <div
                  key={n.id}
                  className="flex items-start justify-between gap-3 p-3.5 bg-indigo-50/40 hover:bg-indigo-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border bg-indigo-600 text-white border-indigo-600">
                      <MessageSquare className="size-3.5" />
                    </span>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <p className="text-xs leading-relaxed font-semibold text-slate-900">
                        {n.message}
                      </p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => dispatch(markNotificationAsRead(n.id))}
                    title="Mark as read"
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded-md hover:bg-white transition-all shrink-0 cursor-pointer"
                  >
                    <Check className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}