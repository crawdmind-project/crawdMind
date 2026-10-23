import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import { leaderboardSlice } from "../pages/Leaderboard";
import { adminUsersSlice } from "../pages/AdminUsers";
import { ideasSlice } from "../pages/IdeasDashboard";
import { moderationSlice } from "../pages/ModerationQueue";
import { notificationsSlice } from "../components/Notifications";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    leaderboard: leaderboardSlice.reducer,
    adminUsers: adminUsersSlice.reducer,
    ideas: ideasSlice.reducer,
    moderation: moderationSlice.reducer,
    notifications: notificationsSlice.reducer,
  },
});
