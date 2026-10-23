import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RefreshCw,
  GitMerge,
  ChevronDown,
  X,
  Clock,
} from "lucide-react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

export const fetchModerationData = createAsyncThunk(
  "moderation/fetchModerationData",
  async (_, { rejectWithValue }) => {
    try {
      const [reportsRes, ideasRes] = await Promise.all([
        api.get("/reports?status=PENDING"),
        api.get("/ideas"),
      ]);

      const reportsList = Array.isArray(reportsRes.data) ? reportsRes.data : reportsRes.data.data || [];
      const ideasData = ideasRes.data;
      const ideasList = Array.isArray(ideasData) ? ideasData : ideasData.ideas || ideasData.data || [];

      
      const underReview = ideasList.filter((i) => {
        const st = String(i.status || "").toUpperCase();
        return st !== "DONE";
      });

      return {
        reports: reportsList,
        allIdeas: ideasList,
        underReviewIdeas: underReview,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to load moderation queue.");
    }
  }
);

export const resolveReport = createAsyncThunk(
  "moderation/resolveReport",
  async ({ reportId, action }, { rejectWithValue }) => {
    try {
      await api.put(`/reports/${reportId}/resolve`, {
        action,
        resolution: action === "HIDE" ? "Content hidden by moderator" : "Dismissed by moderator",
      });
      return reportId;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to update report");
    }
  }
);

export const updateIdeaStatus = createAsyncThunk(
  "moderation/updateIdeaStatus",
  async ({ ideaId, newStatus }, { dispatch, rejectWithValue }) => {
    try {
      await api.patch(`/ideas/${ideaId}/status`, { status: newStatus }).catch(async () => {
        return await api.put(`/ideas/${ideaId}/status`, { status: newStatus });
      });
      
      dispatch(fetchModerationData());
      return { ideaId, newStatus };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to update status");
    }
  }
);

export const mergeIdeas = createAsyncThunk(
  "moderation/mergeIdeas",
  async ({ sourceId, targetId }, { dispatch, rejectWithValue }) => {
    try {
      await api.post(`/ideas/${sourceId}/merge`, { targetId });
      dispatch(fetchModerationData());
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Failed to merge ideas");
    }
  }
);

export const moderationSlice = createSlice({
  name: "moderation",
  initialState: {
    activeTab: "reports",
    reports: [],
    underReviewIdeas: [],
    allIdeas: [],
    loading: true,
    error: "",
    mergeSourceIdea: null,
    selectedTargetId: "",
    mergeLoading: false,
    successMessage: "",
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    setMergeSourceIdea: (state, action) => {
      state.mergeSourceIdea = action.payload;
    },
    setSelectedTargetId: (state, action) => {
      state.selectedTargetId = action.payload;
    },
    setSuccessMessage: (state, action) => {
      state.successMessage = action.payload;
    },
    optimisticStatusUpdate: (state, action) => {
      const { ideaId, newStatus } = action.payload;
      
      if (newStatus === "DONE") {
        state.underReviewIdeas = state.underReviewIdeas.filter(
          (i) => (i.id || i._id) !== ideaId
        );
      } else {
        state.underReviewIdeas = state.underReviewIdeas.map((i) =>
          (i.id || i._id) === ideaId ? { ...i, status: newStatus } : i
        );
      }
      
      state.allIdeas = state.allIdeas.map((i) =>
        (i.id || i._id) === ideaId ? { ...i, status: newStatus } : i
      );
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchModerationData.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(fetchModerationData.fulfilled, (state, action) => {
        state.loading = false;
        state.reports = action.payload.reports;
        state.allIdeas = action.payload.allIdeas;
        state.underReviewIdeas = action.payload.underReviewIdeas;
      })
      .addCase(fetchModerationData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(resolveReport.fulfilled, (state, action) => {
        const id = action.payload;
        state.reports = state.reports.filter((r) => r.id !== id && r._id !== id);
        state.successMessage = "Report resolved successfully.";
      })
      .addCase(updateIdeaStatus.fulfilled, (state, action) => {
        const { newStatus } = action.payload;
        state.successMessage = `Idea status successfully changed to ${newStatus}`;
      })
      .addCase(updateIdeaStatus.rejected, (state, action) => {
        state.error = action.payload || "Could not update status";
      })
      .addCase(mergeIdeas.fulfilled, (state) => {
        state.mergeSourceIdea = null;
        state.selectedTargetId = "";
        state.successMessage = "Ideas merged successfully.";
      });
  },
});

export const {
  setActiveTab,
  setMergeSourceIdea,
  setSelectedTargetId,
  setSuccessMessage,
  optimisticStatusUpdate,
} = moderationSlice.actions;

export default function ModerationQueue() {
  const dispatch = useDispatch();
  const {
    activeTab,
    reports,
    underReviewIdeas,
    allIdeas,
    loading,
    error,
    mergeSourceIdea,
    selectedTargetId,
    mergeLoading,
    successMessage,
  } = useSelector(
    (state) =>
      state.moderation || {
        activeTab: "reports",
        reports: [],
        underReviewIdeas: [],
        allIdeas: [],
        loading: true,
        error: "",
      }
  );

  const loadData = useCallback(() => {
    dispatch(fetchModerationData());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResolveReport = (reportId, action) => {
    dispatch(resolveReport({ reportId, action }));
  };

  const handleStatusChange = async (ideaId, newStatus) => {
    dispatch(optimisticStatusUpdate({ ideaId, newStatus }));
    dispatch(updateIdeaStatus({ ideaId, newStatus }));
  };

  const handleMergeSubmit = async (e) => {
    e.preventDefault();
    if (!mergeSourceIdea || !selectedTargetId) return;
    dispatch(
      mergeIdeas({
        sourceId: mergeSourceIdea.id || mergeSourceIdea._id,
        targetId: selectedTargetId,
      })
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased py-8 px-6 text-left">
      <main className="mx-auto max-w-4xl space-y-6 text-left">
        {/* Success Banner */}
        {successMessage && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-sm text-left">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Header Section */}
        <div className="flex flex-col items-start gap-4 border-b border-slate-200/80 pb-5 text-left">
          <div className="w-full flex items-center justify-between text-left">
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 text-left">
                Moderation Queue
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Review reported content and update idea status pipelines
              </p>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`size-3.5 text-slate-500 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center border-b border-slate-200 text-sm font-semibold text-left w-full gap-6">
            <button
              type="button"
              onClick={() => dispatch(setActiveTab("reports"))}
              className={`pb-3 transition-colors cursor-pointer relative ${
                activeTab === "reports"
                  ? "text-blue-600 font-bold border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Reports ({reports.length})
            </button>
            <button
              type="button"
              onClick={() => dispatch(setActiveTab("queue"))}
              className={`pb-3 transition-colors cursor-pointer relative ${
                activeTab === "queue"
                  ? "text-blue-600 font-bold border-b-2 border-blue-600"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Under Review Status ({underReviewIdeas.length})
            </button>
          </div>
        </div>

        {loading && (
          <div className="flex flex-col items-start justify-center py-16 space-y-2 text-left">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-500 font-medium">Loading queue data...</p>
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-left space-y-3">
            <AlertTriangle className="size-8 text-red-500" />
            <p className="text-sm font-semibold text-red-800">{error}</p>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 shadow-xs cursor-pointer"
            >
              <RefreshCw className="size-3.5" /> Retry
            </button>
          </div>
        )}

        {/* REPORTS TAB */}
        {!loading && !error && activeTab === "reports" && (
          <div className="space-y-4 text-left">
            {reports.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-left space-y-3 shadow-xs">
                <CheckCircle2 className="size-10 text-emerald-500" />
                <p className="text-base font-semibold text-slate-800">No Pending Reports</p>
                <p className="text-xs text-slate-500">
                  All reported ideas have been reviewed and resolved.
                </p>
              </div>
            ) : (
              reports.map((report) => {
                const reporterName =
                  report.user?.fullName ||
                  report.user?.name ||
                  report.userName ||
                  report.author?.name ||
                  "Alex Rodriguez";

                const reportReason = String(report.reason || "DUPLICATE").toUpperCase();
                const reportComment = report.description || report.reasonComment || "hhhhhh";

                return (
                  <div
                    key={report.id || report._id}
                    className="rounded-xl border border-slate-200/80 border-l-4 border-l-red-500 bg-white p-6 shadow-xs space-y-4 text-left relative"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-red-600 tracking-wide uppercase">
                        REPORT: {reportReason}
                      </span>
                      <span className="text-slate-400">
                        Reported by {reporterName}
                      </span>
                    </div>

                    <div className="rounded-lg bg-slate-50 p-3.5 border border-slate-100/80 text-xs text-slate-600 italic">
                      &quot;{reportComment}&quot;
                    </div>

                    <div className="rounded-lg bg-slate-50 p-4 border border-slate-100/80 space-y-1.5 text-left">
                      <h3 className="text-sm font-bold text-slate-800">
                        {report.idea?.title || report.ideaTitle || "AI-Powered Code Review Assistant"}
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {report.idea?.description ||
                          report.ideaDescription ||
                          "Develop an intelligent assistant that can automatically review code for common issues, suggest improvements, and ensure coding standards compliance. This would save developers time and improve code quality across projects."}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id || report._id, "HIDE")}
                        className="rounded-lg bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-700 transition-colors cursor-pointer"
                      >
                        Take Action 
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolveReport(report.id || report._id, "DISMISS")}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Dismiss Report
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* UNDER REVIEW TAB */}
        {!loading && !error && activeTab === "queue" && (
          <div className="space-y-4 text-left">
            {underReviewIdeas.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-left space-y-3 shadow-xs">
                <CheckCircle2 className="size-10 text-emerald-500" />
                <p className="text-base font-semibold text-slate-800">No Ideas Under Review</p>
                <p className="text-xs text-slate-500">
                  There are currently no ideas waiting for review.
                </p>
              </div>
            ) : (
              underReviewIdeas.map((idea) => {
                const ideaId = idea.id || idea._id;
                const currentStatus = String(idea.status || "UNDER_REVIEW").toUpperCase();

                // Dynamic Status Badge Color based on Status (Planned = Blue, Done = Green, Under Review = Amber)
                const statusBadgeStyle =
                  currentStatus === "PLANNED"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : currentStatus === "DONE"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200";

                return (
                  <div
                    key={ideaId}
                    className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4 text-left"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        {/* BADGE-KA COLOR-KA LAGU DARIYAY */}
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold border mb-2 ${statusBadgeStyle}`}>
                          <Clock className="size-3" /> Status: {currentStatus}
                        </span>
                        <h3 className="text-base font-bold text-slate-900">{idea.title}</h3>
                        <p className="text-xs text-slate-600 mt-1">{idea.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 text-left">
                      {/* Merge Button */}
                      <button
                        type="button"
                        onClick={() => dispatch(setMergeSourceIdea(idea))}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        <GitMerge className="size-4" /> Merge Idea
                      </button>

                      {/* Dropdown Options */}
                      <div className="relative">
                        <select
                          value={currentStatus}
                          onChange={(e) => handleStatusChange(ideaId, e.target.value)}
                          className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none cursor-pointer shadow-xs"
                        >
                          <option value="UNDER_REVIEW">Under Review</option>
                          <option value="PLANNED">Planned</option>
                          <option value="DONE">Done</option>
                        </select>
                        <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* MERGE MODAL */}
        {mergeSourceIdea && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left">
            <form
              onSubmit={handleMergeSubmit}
              className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 text-left"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
                <div className="flex items-center gap-2 text-left">
                  <GitMerge className="size-5 text-indigo-600" />
                  <h3 className="text-base font-bold text-slate-900 text-left">Merge Idea</h3>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch(setMergeSourceIdea(null))}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-slate-600 text-left">
                Merging{" "}
                <span className="font-bold text-slate-900">
                  &ldquo;{mergeSourceIdea.title}&rdquo;
                </span>{" "}
                into another target idea:
              </p>

              <div className="text-left">
                <label className="block text-xs font-bold text-slate-700 mb-1 text-left">
                  Select Target Idea
                </label>
                <select
                  value={selectedTargetId}
                  onChange={(e) => dispatch(setSelectedTargetId(e.target.value))}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-indigo-500 text-left"
                >
                  <option value="">-- Choose Target Idea --</option>
                  {allIdeas
                    .filter(
                      (i) => (i.id || i._id) !== (mergeSourceIdea.id || mergeSourceIdea._id)
                    )
                    .map((i) => (
                      <option key={i.id || i._id} value={i.id || i._id}>
                        {i.title}
                      </option>
                    ))}
                </select>
              </div>

              <div className="flex justify-start gap-2 pt-2 text-left">
                <button
                  type="button"
                  onClick={() => dispatch(setMergeSourceIdea(null))}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={mergeLoading || !selectedTargetId}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                >
                  {mergeLoading && <Loader2 className="size-3.5 animate-spin" />}
                  Confirm Merge
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}