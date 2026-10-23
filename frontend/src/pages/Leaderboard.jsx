import { useCallback, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import {
  Trophy,
  Award,
  Medal,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchLeaderboardData = createAsyncThunk(
  "leaderboard/fetchLeaderboardData",
  async (signal) => {
    try {
      const res = await api.get("/ideas", { signal });
      const data = res.data;
      const list = Array.isArray(data) ? data : data.ideas || data.data || [];

      const mappedList = list.map((item) => ({
        id: item.id ?? item._id,
        title: item.title ?? "",
        description: item.description ?? "",
        authorName: item.author?.name || item.author?.fullName || item.authorName || "Anonymous",
        votes: Number(item.totalScore ?? item.votes ?? item.score ?? 0) || 0,
        commentsCount: Array.isArray(item.comments)
          ? item.comments.length
          : Number(item._count?.comments ?? item.commentsCount ?? 0) || 0,
        status: String(item.status || "UNDER_REVIEW").toUpperCase().replace(/[\s-]+/g, "_"),
        tags: (item.tags || []).map((t) => String(t).replace(/^#/, "")),
      }));

      return mappedList.sort((a, b) => b.votes - a.votes).slice(0, 10);
    } catch {
      return [];
    }
  }
);

export const leaderboardSlice = createSlice({
  name: "leaderboard",
  initialState: {
    ideas: [],
    loading: false,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchLeaderboardData.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchLeaderboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.ideas = action.payload;
      })
      .addCase(fetchLeaderboardData.rejected, (state) => {
        state.loading = false;
        state.ideas = [];
      });
  },
});

const STATUS_STYLES = {
  UNDER_REVIEW: {
    label: "Under Review",
    badge: "bg-amber-100 text-amber-800 border-amber-200",
    Icon: AlertTriangle,
    iconColor: "text-amber-500",
  },
  PLANNED: {
    label: "Planned",
    badge: "bg-blue-100 text-blue-800 border-blue-200",
    Icon: Clock,
    iconColor: "text-blue-500",
  },
  DONE: {
    label: "Completed",
    badge: "bg-emerald-100 text-emerald-800 border-emerald-200",
    Icon: CheckCircle2,
    iconColor: "text-emerald-600",
  },
};

function getRankBadge(index) {
  switch (index) {
    case 0:
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-xs border border-amber-200">
          <Trophy className="size-3.5" />
        </div>
      );
    case 1:
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-700 shadow-xs border border-slate-300">
          <Award className="size-3.5" />
        </div>
      );
    case 2:
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-orange-100 text-orange-600 shadow-xs border border-orange-200">
          <Medal className="size-3.5" />
        </div>
      );
    default:
      return (
        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-50 text-slate-500 font-bold text-xs border border-slate-200 shadow-xs">
          #{index + 1}
        </div>
      );
  }
}

export default function Leaderboard() {
  const dispatch = useDispatch();
  const { ideas, loading } = useSelector((state) => state.leaderboard || { ideas: [], loading: false });

  const loadLeaderboard = useCallback((signal) => {
    dispatch(fetchLeaderboardData(signal));
  }, [dispatch]);

  useEffect(() => {
    const controller = new AbortController();
    loadLeaderboard(controller.signal);
    return () => controller.abort();
  }, [loadLeaderboard]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 antialiased py-8 px-6 text-left">
      <main className="mx-auto max-w-3xl space-y-6 text-left">
        
        {/* Header Section */}
        <div className="space-y-1 text-left">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Community Leaderboard
          </h1>
          <p className="text-xs text-slate-500">
            Top 10 highest-voted ideas across the entire platform
          </p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 space-y-3">
            <RefreshCw className="size-6 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">Loading rankings...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && ideas.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center space-y-3 shadow-xs">
            <Trophy className="size-8 text-slate-300 mx-auto" />
            <p className="text-sm font-semibold text-slate-800">No Ideas Ranked Yet</p>
            <p className="text-xs text-slate-500">
              Be the first to submit an idea and gather votes!
            </p>
          </div>
        )}

        {/* Leaderboard List */}
        {!loading && ideas.length > 0 && (
          <div className="space-y-3 text-left">
            {ideas.map((idea, index) => {
              const statusObj = STATUS_STYLES[idea.status] || STATUS_STYLES.UNDER_REVIEW;
              const StatusIcon = statusObj.Icon;

              return (
                <div
                  key={idea.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs transition-all hover:shadow-md text-left"
                >
                  {/* Rank Icon */}
                  {getRankBadge(index)}

                  {/* Votes Count (Grey, left side) */}
                  <div className="flex flex-col items-center justify-center px-2.5 py-1 rounded-xl bg-slate-50 border border-slate-200 shrink-0">
                    <span className="text-xs font-semibold text-slate-600">
                      {idea.votes}
                    </span>
                    <span className="text-[9px] font-medium text-slate-400 uppercase">
                      Votes
                    </span>
                  </div>

                  {/* Main Details */}
                  <div className="min-w-0 flex-1 space-y-1 text-left">
                    <h3 className="text-sm font-semibold text-slate-900 truncate">
                      {idea.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span>by <span className="font-medium text-slate-700">{idea.authorName}</span></span>
                      <span>&bull;</span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border ${statusObj.badge}`}>
                        <StatusIcon className={`size-3 ${statusObj.iconColor}`} />
                        {statusObj.label}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}