import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import api from "../api/axios";
import {
  AlertTriangle,
  ArrowDown,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  Loader2,
  MessageSquare,
  MoreVertical,
  RefreshCw,
  Search,
  Edit3,
  Trash2,
  Flag,
  X,
  Star,
} from "lucide-react";
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import NewIdeaModal from "../components/NewIdeaModal";

export const fetchIdeas = createAsyncThunk(
  "ideas/fetchIdeas",
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await api.get("/ideas");
      const data = res.data;
      const list = Array.isArray(data) ? data : data.ideas || data.data || [];
      const ideas = list.map(normalizeIdea);
      const state = getState();
      const currentUser = state.ideas?.currentUser || state.auth?.user;
      let favoriteIds = new Set();
      let favoriteLoadError = "";
      if (currentUser) {
        try {
          const favoritesRes = await api.get("/ideas/favorites/me");
          const favorites = favoritesRes.data?.data;
          if (!Array.isArray(favorites)) {
            throw new Error("The server returned an invalid favorites response.");
          }
          favoriteIds = new Set(favorites.map((idea) => String(idea.id ?? idea._id)));
        } catch (err) {
          favoriteLoadError =
            err.response?.data?.message || err.message || "Could not load your favorites.";
        }
      }
      const voteDetails = await Promise.all(
        ideas.map(async (idea) => {
          let totalScore = idea.votes;
          let userVote = null;
          let scoreFailed = false;
          let userVoteFailed = false;

          try {
            const scoreRes = await api.get(`/votes/${idea.id}`);
            const scoreData = scoreRes.data?.data ?? scoreRes.data;
            if (typeof scoreData?.totalScore === "number") {
              totalScore = scoreData.totalScore;
            } else {
              scoreFailed = true;
            }
          } catch {
            scoreFailed = true;
          }

          if (currentUser) {
            try {
              const voteRes = await api.get(`/votes/${idea.id}/me`);
              const payload = voteRes.data?.data ?? voteRes.data;
              userVote = ["UPVOTE", "DOWNVOTE"].includes(payload) ? payload : null;
            } catch {
              userVoteFailed = true;
            }
          }

          return { ideaId: idea.id, totalScore, userVote, scoreFailed, userVoteFailed };
        })
      );
      const failedScoreLookups = voteDetails.some((result) => result.scoreFailed);
      const failedUserVoteLookups = voteDetails.some((result) => result.userVoteFailed);
      const votesByIdea = new Map(voteDetails.map(({ ideaId, ...details }) => [ideaId, details]));
      return {
        ideas: ideas.map((idea) => {
          const details = votesByIdea.get(idea.id);
          return {
            ...idea,
            isFavorite: favoriteIds.has(String(idea.id)),
            votes: details.totalScore,
            voteSortScore: details.totalScore,
            userVote: details.userVote,
          };
        }),
        voteLoadError: [
          failedScoreLookups && "Some idea scores could not be refreshed.",
          failedUserVoteLookups && "Some of your existing votes could not be loaded.",
        ]
          .filter(Boolean)
          .join(" "),
        favoriteLoadError,
      };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not load ideas.");
    }
  }
);

export const voteIdea = createAsyncThunk(
  "ideas/voteIdea",
  async ({ ideaId, type }, { rejectWithValue }) => {
    let postRes;
    try {
      postRes = await api.post(`/votes/${ideaId}`, { voteType: type });
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Please log in to vote.");
    }

    const postPayload = postRes.data?.data ?? postRes.data;
    const vote = Object.hasOwn(postPayload || {}, "vote")
      ? postPayload.vote
      : postPayload?.voteType
        ? postPayload
        : null;
    let freshScore;
    let scoreRefreshError = "";

    try {
      const scoreRes = await api.get(`/votes/${ideaId}`);
      const scoreData = scoreRes.data?.data ?? scoreRes.data;
      if (typeof scoreData?.totalScore === "number") {
        freshScore = scoreData.totalScore;
      }
    } catch (err) {
      scoreRefreshError =
        err.response?.data?.message || err.message || "Could not refresh the vote score.";
    }

    return {
      ideaId,
      userVote: vote?.voteType ?? null,
      freshScore,
      scoreRefreshError,
    };
  }
);

export const toggleFavorite = createAsyncThunk(
  "ideas/toggleFavorite",
  async (ideaId, { rejectWithValue }) => {
    try {
      const res = await api.post(`/ideas/${ideaId}/favorite`);
      const isFavorite = res.data?.data?.isFavorite;
      if (typeof isFavorite !== "boolean") {
        throw new Error("The server returned an invalid favorite status.");
      }
      return { ideaId, isFavorite };
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || err.message || "Could not update favorite.",
      );
    }
  }
);

export const deleteIdea = createAsyncThunk(
  "ideas/deleteIdea",
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/ideas/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not delete idea.");
    }
  }
);

export const reportIdea = createAsyncThunk(
  "ideas/reportIdea",
  async ({ ideaId, reason, description }, { rejectWithValue }) => {
    try {
      await api.post("/reports", { ideaId, reason, description });
      return true;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not report idea");
    }
  }
);

export const fetchCommentsForIdea = createAsyncThunk(
  "ideas/fetchCommentsForIdea",
  async (ideaId, { rejectWithValue }) => {
    try {
      const res = await api.get(`/comments/idea/${ideaId}`);
      const data = res.data;
      const commentsList = Array.isArray(data) ? data : data.comments || data.data || [];
      return { ideaId, comments: commentsList };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not load comments.");
    }
  }
);

export const addComment = createAsyncThunk(
  "ideas/addComment",
  async ({ ideaId, content }, { rejectWithValue }) => {
    try {
      const res = await api.post("/comments", { ideaId, content });
      return { ideaId, comment: res.data?.comment || res.data?.data || res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not post comment.");
    }
  }
);

export const deleteComment = createAsyncThunk(
  "ideas/deleteComment",
  async ({ commentId, ideaId }, { rejectWithValue }) => {
    try {
      await api.delete(`/comments/${commentId}`);
      return { commentId, ideaId };
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || err.message || "Could not delete comment.");
    }
  }
);

export const ideasSlice = createSlice({
  name: "ideas",
  initialState: {
    ideas: [],
    currentUser: null,
    loading: true,
    error: "",
    voteError: "",
    favoriteError: "",
    pendingVotes: {},
  },
  reducers: {
    setVoteError: (state, action) => {
      state.voteError = action.payload;
    },
    clearFavoriteError: (state) => {
      state.favoriteError = "";
    },
    setCurrentUser: (state, action) => {
      state.currentUser = action.payload;
    },
    refreshVoteOrder: (state) => {
      state.ideas.forEach((idea) => {
        idea.voteSortScore = idea.votes;
      });
    },
    optimisticVote: (state, action) => {
      const { ideaId, voteChange, nextUserVote } = action.payload;
      state.ideas = state.ideas.map((idea) =>
        idea.id === ideaId
          ? { ...idea, votes: idea.votes + voteChange, userVote: nextUserVote }
          : idea
      );
      state.pendingVotes[ideaId] = true;
    },
    revertVote: (state, action) => {
      const { ideaId, previousState } = action.payload;
      state.ideas = state.ideas.map((idea) =>
        idea.id === ideaId ? { ...idea, ...previousState } : idea
      );
      delete state.pendingVotes[ideaId];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchIdeas.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.favoriteError = "";
      })
      .addCase(fetchIdeas.fulfilled, (state, action) => {
        state.loading = false;
        state.ideas = action.payload.ideas;
        state.voteError = action.payload.voteLoadError;
        state.favoriteError = action.payload.favoriteLoadError;
      })
      .addCase(fetchIdeas.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(voteIdea.fulfilled, (state, action) => {
        const { ideaId, freshScore, scoreRefreshError } = action.payload;
        state.ideas = state.ideas.map((idea) =>
          idea.id === ideaId
            ? {
                ...idea,
                ...(typeof freshScore === "number" ? { votes: freshScore } : {}),
                userVote: action.payload.userVote,
              }
            : idea
        );
        state.voteError = scoreRefreshError;
        delete state.pendingVotes[ideaId];
      })
      .addCase(voteIdea.rejected, (state, action) => {
        state.voteError = action.payload;
        delete state.pendingVotes[action.meta.arg.ideaId];
      })
      .addCase(toggleFavorite.fulfilled, (state, action) => {
        const { ideaId, isFavorite } = action.payload;
        state.favoriteError = "";
        state.ideas = state.ideas.map((idea) =>
          idea.id === ideaId
            ? { ...idea, isFavorite: isFavorite !== undefined ? isFavorite : !idea.isFavorite }
            : idea
        );
      })
      .addCase(toggleFavorite.rejected, (state, action) => {
        state.favoriteError = action.payload || "Could not update favorite.";
      })
      .addCase(deleteIdea.fulfilled, (state, action) => {
        const id = action.payload;
        state.ideas = state.ideas.filter((item) => item.id !== id);
      })
      .addCase(fetchCommentsForIdea.fulfilled, (state, action) => {
        const { ideaId, comments } = action.payload;
        const normalizedComments = comments.map((c) => {
          const cAuthor = c.author || c.user || {};
          const authorName =
            cAuthor.name ||
            cAuthor.fullName ||
            c.userName ||
            c.authorName ||
            (typeof c.author === "string" ? c.author : "User");
          return {
            id: c.id ?? c._id,
            content: c.content ?? c.text ?? "",
            createdAt: c.createdAt || c.date || null,
            author: {
              id: cAuthor.id ?? cAuthor._id ?? c.userId,
              name: authorName,
            },
          };
        });

        state.ideas = state.ideas.map((idea) => {
          if (idea.id === ideaId) {
            return { ...idea, comments: normalizedComments, commentsCount: normalizedComments.length };
          }
          return idea;
        });
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const { ideaId, comment } = action.payload;
        const authorObj = comment.author || comment.user || {};
        const authorName =
          authorObj.name ||
          authorObj.fullName ||
          comment.userName ||
          (state.currentUser ? state.currentUser.fullName || state.currentUser.name : "User");

        const normalizedNewComment = {
          id: comment.id ?? comment._id ?? Date.now(),
          content: comment.content ?? comment.text ?? "",
          createdAt: comment.createdAt || comment.date || new Date().toISOString(),
          author: {
            id: authorObj.id ?? authorObj._id ?? comment.userId,
            name: authorName,
          },
        };

        state.ideas = state.ideas.map((idea) => {
          if (idea.id === ideaId) {
            const comments = [...(idea.comments || []), normalizedNewComment];
            return { ...idea, comments, commentsCount: comments.length };
          }
          return idea;
        });
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId, ideaId } = action.payload;
        state.ideas = state.ideas.map((idea) => {
          if (idea.id === ideaId) {
            const comments = (idea.comments || []).filter(
              (c) => (c.id ?? c._id) !== commentId
            );
            return { ...idea, comments, commentsCount: comments.length };
          }
          return idea;
        });
      });
  },
});

export const {
  setVoteError,
  clearFavoriteError,
  setCurrentUser,
  optimisticVote,
  revertVote,
  refreshVoteOrder,
} = ideasSlice.actions;

const POPULAR_TAGS = [
  "All",
  "Development Tools",
  "Productivity",
  "Remote Work",
  "Team Building",
  "Collaboration",
  "Sustainability",
  "Office",
  "Environment",
  "Health",
];

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "UNDER_REVIEW", label: "Under Review" },
  { value: "PLANNED", label: "Planned" },
  { value: "DONE", label: "Done" },
];

const STATUS_STYLES = {
  UNDER_REVIEW: {
    label: "UNDER_REVIEW",
    badge: "bg-amber-100 text-amber-800",
    iconColor: "text-amber-500",
    Icon: AlertTriangle,
  },
  PLANNED: {
    label: "PLANNED",
    badge: "bg-blue-100 text-blue-800",
    iconColor: "text-blue-500",
    Icon: Clock,
  },
  DONE: {
    label: "DONE",
    badge: "bg-emerald-100 text-emerald-800",
    iconColor: "text-emerald-600",
    Icon: CheckCircle2,
  },
};

const SORT_OPTIONS = [
  { key: "votes", label: "Votes" },
  { key: "date", label: "Date" },
  { key: "comments", label: "Comments" },
];

function normalizeStatus(value) {
  const key = String(value || "UNDER_REVIEW")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
  if (key === "COMPLETED") return "DONE";
  return STATUS_STYLES[key] ? key : "UNDER_REVIEW";
}

function initials(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function Avatar({ name, className = "size-8 text-xs" }) {
  const displayName = name || "User";
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200/80 font-bold text-indigo-600 ${className}`}
    >
      {initials(displayName)}
    </span>
  );
}

function normalizeIdea(raw) {
  const author =
    typeof raw.author === "string"
      ? { name: raw.author }
      : raw.author || { name: raw.authorName || "Unknown" };

  const comments = Array.isArray(raw.comments)
    ? raw.comments.map((c) => {
        const cAuthor = c.author || c.user || {};
        const authorName =
          cAuthor.name ||
          cAuthor.fullName ||
          c.userName ||
          c.authorName ||
          (typeof c.author === "string" ? c.author : "User");

        return {
          id: c.id ?? c._id,
          content: c.content ?? c.text ?? "",
          createdAt: c.createdAt || c.date || null,
          author: {
            id: cAuthor.id ?? cAuthor._id ?? c.userId,
            name: authorName,
          },
        };
      })
    : [];

  const commentsCount = comments.length || Number(raw._count?.comments ?? raw.commentsCount ?? 0) || 0;

  return {
    id: raw.id ?? raw._id,
    title: raw.title ?? "",
    description: raw.description ?? "",
    author: {
      id: author.id ?? author._id ?? raw.userId,
      name: author.name || author.fullName || author.username || "Unknown",
    },
    createdAt: raw.createdAt || raw.date || null,
    status: normalizeStatus(raw.status),
    votes: Number(raw.totalScore ?? raw.votes ?? raw.score ?? 0) || 0,
    voteSortScore: Number(raw.totalScore ?? raw.votes ?? raw.score ?? 0) || 0,
    userVote: raw.userVote || null,
    isFavorite: Boolean(raw.isFavorite),
    commentsCount,
    comments,
    tags: (raw.tags || []).map((tag) => String(tag).replace(/^#/, "")),
  };
}

function formatDate(value) {
  if (!value) return "Just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US");
}

export default function IdeasDashboard() {
  const dispatch = useDispatch();
  const { ideas, currentUser, loading, error, voteError, favoriteError, pendingVotes } = useSelector(
    (state) => state.ideas || { ideas: [], currentUser: null, loading: true, error: "", voteError: "", favoriteError: "", pendingVotes: {} }
  );

  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTag, setActiveTag] = useState("All");
  const [tagQuery, setTagQuery] = useState("");
  const [sortBy, setSortBy] = useState("votes");
  const [activeMenuId, setActiveMenuId] = useState(null);
  const activeMenuRef = useRef(null);

  // Modal Comments Active Idea State
  const [activeModalIdea, setActiveModalIdea] = useState(null);
  const [modalCommentText, setModalCommentText] = useState("");
  const [modalCommentLoading, setModalCommentLoading] = useState(false);

  // Edit Modal States
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedIdeaForEdit, setSelectedIdeaForEdit] = useState(null);

  // Report Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [selectedIdeaForReport, setSelectedIdeaForReport] = useState(null);
  const [reportReason, setReportReason] = useState("Spam");
  const [reportDescription, setReportDescription] = useState("");
  const [reportLoading, setReportLoading] = useState(false);

  // Delete Confirmation Modal States
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedIdeaForDelete, setSelectedIdeaForDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [successMessage, setSuccessMessage] = useState("");
  const [actionError, setActionError] = useState("");
  const successTimeoutRef = useRef(null);

  const triggerSuccess = (msg) => {
    if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    setSuccessMessage(msg);
    successTimeoutRef.current = setTimeout(() => {
      setSuccessMessage("");
      successTimeoutRef.current = null;
    }, 3000);
  };

  const loadData = useCallback(async () => {
    try {
      const userRes = await api.get("/auth/me");
      if (userRes.data) {
        const uData = userRes.data.data || userRes.data;
        dispatch(setCurrentUser(uData));
      }
    } catch (err) {
      // Guest
    }
    dispatch(fetchIdeas());
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(
    () => () => {
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
    },
    []
  );

  // Close the menu only when a pointer interaction happens outside its wrapper.
  useEffect(() => {
    if (!activeMenuId) return undefined;

    const handlePointerDown = (event) => {
      if (!activeMenuRef.current?.contains(event.target)) {
        setActiveMenuId(null);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setActiveMenuId(null);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuId]);

  const handleOpenCommentsModal = (idea) => {
    setActiveModalIdea(idea);
    dispatch(fetchCommentsForIdea(idea.id));
  };

  const handleVote = async (ideaId, type) => {
    if (pendingVotes[ideaId]) return;

    const target = ideas.find((idea) => idea.id === ideaId);
    if (!target) return;

    dispatch(setVoteError(""));

    const isSameVote = target.userVote === type;
    const nextUserVote = isSameVote ? null : type;
    const voteValue = (vote) => (vote === "UPVOTE" ? 1 : vote === "DOWNVOTE" ? -1 : 0);
    const voteChange = voteValue(nextUserVote) - voteValue(target.userVote);

    const previousState = { votes: target.votes, userVote: target.userVote };

    dispatch(optimisticVote({ ideaId, type, voteChange, nextUserVote }));

    try {
      await dispatch(voteIdea({ ideaId, type })).unwrap();
      triggerSuccess(
        isSameVote
          ? `${type === "UPVOTE" ? "Upvote" : "Downvote"} removed.`
          : target.userVote
            ? `${type === "UPVOTE" ? "Upvote" : "Downvote"} updated.`
            : `${type === "UPVOTE" ? "Upvote" : "Downvote"} added.`
      );
    } catch (err) {
      dispatch(revertVote({ ideaId, previousState }));
    }
  };

  const handleFavoriteToggle = (ideaId) => {
    setActionError("");
    dispatch(toggleFavorite(ideaId))
      .unwrap()
      .then(({ isFavorite }) => {
        triggerSuccess(isFavorite ? "Idea added to favorites." : "Idea removed from favorites.");
      })
      .catch((message) => {
        setActionError(typeof message === "string" ? message : "Could not update favorite.");
      });
  };

  const handleEdit = (idea) => {
    setActiveMenuId(null);
    setActionError("");
    setSelectedIdeaForEdit(idea);
    setEditModalOpen(true);
  };

  const handleReport = (idea) => {
    setActiveMenuId(null);
    setActionError("");
    setSelectedIdeaForReport(idea);
    setReportReason("Spam");
    setReportDescription("");
    setReportModalOpen(true);
  };

  const promptDelete = (idea) => {
    setActiveMenuId(null);
    setActionError("");
    setSelectedIdeaForDelete(idea);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedIdeaForDelete) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteIdea(selectedIdeaForDelete.id)).unwrap();
      setDeleteModalOpen(false);
      setSelectedIdeaForDelete(null);
      triggerSuccess("Idea deleted successfully.");
    } catch (err) {
      setActionError(err);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedIdeaForReport) return;

    setReportLoading(true);
    try {
      await dispatch(
        reportIdea({
          ideaId: selectedIdeaForReport.id,
          reason: reportReason,
          description: reportDescription || "Reported via dashboard",
        })
      ).unwrap();
      setReportModalOpen(false);
      triggerSuccess("Report submitted successfully.");
    } catch (err) {
      setActionError(err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleModalCommentSubmit = async (e) => {
    e.preventDefault();
    if (!modalCommentText.trim() || !activeModalIdea) return;

    setModalCommentLoading(true);
    try {
      await dispatch(
        addComment({ ideaId: activeModalIdea.id, content: modalCommentText.trim() })
      ).unwrap();
      setModalCommentText("");
      triggerSuccess("Comment added successfully.");
    } catch (err) {
      // Safe catch
    } finally {
      setModalCommentLoading(false);
    }
  };

  const handleDeleteComment = async (commentId, ideaId) => {
    try {
      await dispatch(deleteComment({ commentId, ideaId })).unwrap();
      triggerSuccess("Comment deleted successfully.");
    } catch (err) {
      // Safe catch
    }
  };

  const currentIdeaInModal = useMemo(() => {
    if (!activeModalIdea) return null;
    return ideas.find((i) => i.id === activeModalIdea.id) || activeModalIdea;
  }, [ideas, activeModalIdea]);

  const stats = useMemo(
    () => [
      { label: "Total Ideas", value: ideas.length, color: "text-indigo-600" },
      {
        label: "Under Review",
        value: ideas.filter((i) => i.status === "UNDER_REVIEW").length,
        color: "text-amber-600",
      },
      {
        label: "Planned",
        value: ideas.filter((i) => i.status === "PLANNED").length,
        color: "text-blue-600",
      },
      {
        label: "Completed",
        value: ideas.filter((i) => i.status === "DONE").length,
        color: "text-emerald-600",
      },
    ],
    [ideas]
  );

  const visibleIdeas = useMemo(() => {
    const query = tagQuery.trim().toLowerCase().replace(/^#/, "");

    const filtered = ideas.filter((idea) => {
      const matchesStatus =
        statusFilter === "ALL" || idea.status === statusFilter;
      const matchesPill =
        activeTag === "All" ||
        idea.tags.some((tag) => tag.toLowerCase() === activeTag.toLowerCase());
      const matchesQuery =
        !query || idea.tags.some((tag) => tag.toLowerCase().includes(query));
      return matchesStatus && matchesPill && matchesQuery;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "date") {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === "comments") return b.commentsCount - a.commentsCount;
      return (b.voteSortScore ?? b.votes) - (a.voteSortScore ?? a.votes);
    });
  }, [ideas, statusFilter, activeTag, tagQuery, sortBy]);

  const isAdminOrModerator =
    currentUser &&
    (String(currentUser.role).toUpperCase() === "ADMIN" ||
      String(currentUser.role).toUpperCase() === "MODERATOR");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased text-left">
      <main className="mx-auto max-w-6xl space-y-6 px-6 py-8 text-left">
        {/* Success Banner */}
        {successMessage && (
          <div role="status" aria-live="polite" className="fixed right-4 top-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800 shadow-lg text-left">
            <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}
        {(actionError || favoriteError) && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-left">
            <span>{actionError || favoriteError}</span>
            <button
              type="button"
              onClick={() => {
                setActionError("");
                dispatch(clearFavoriteError());
              }}
              className="font-medium underline hover:text-red-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stats */}
        <section aria-label="Idea statistics">
          <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col-reverse items-center rounded-2xl border border-gray-100 bg-white px-4 py-6 text-center shadow-sm"
              >
                <dt className="mt-1 text-sm text-slate-500">{stat.label}</dt>
                <dd className={`text-3xl font-bold ${stat.color}`}>
                  {loading ? "–" : stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Filters + sort */}
        <section
          aria-label="Filters and sorting"
          className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between text-left"
        >
          <div className="flex flex-wrap items-center gap-3 text-left">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-600">
              <Filter className="size-4" aria-hidden="true" />
              Filters:
            </span>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                aria-label="Filter by status"
                className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-9 text-sm font-medium text-slate-900 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200 cursor-pointer"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
            </div>

            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="text"
                value={tagQuery}
                onChange={(e) => setTagQuery(e.target.value)}
                placeholder="Filter by tag..."
                aria-label="Filter by tag"
                className="w-48 rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-2 focus:outline-indigo-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 text-left">
            <span className="text-sm text-slate-600">Sort by:</span>
            {SORT_OPTIONS.map((option) => {
              const active = sortBy === option.key;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => {
                    if (option.key === "votes") dispatch(refreshVoteOrder());
                    setSortBy(option.key);
                  }}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                  {active && <ArrowDown className="size-3.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </section>

        {/* Popular tags */}
        <section
          aria-labelledby="popular-tags-heading"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm text-left"
        >
          <h2 id="popular-tags-heading" className="text-sm font-semibold text-slate-900 text-left">
            Popular Tags
          </h2>
          <ul className="mt-4 flex flex-wrap gap-2 text-left">
            {POPULAR_TAGS.map((tag) => {
              const active = activeTag === tag;
              return (
                <li key={tag}>
                  <button
                    type="button"
                    onClick={() => setActiveTag(tag)}
                    aria-pressed={active}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors cursor-pointer ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                    }`}
                  >
                    #{tag}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        {voteError && (
          <div role="alert" className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 text-left">
            <span>{voteError}</span>
            <button type="button" onClick={() => dispatch(setVoteError(""))} className="font-medium underline hover:text-red-900 cursor-pointer">
              Dismiss
            </button>
          </div>
        )}

        {/* Ideas list */}
        <section aria-label="Ideas" aria-busy={loading} className="space-y-4 text-left">
          {loading && (
            <div className="space-y-4 text-left" role="status">
              <span className="sr-only">Loading ideas…</span>
              {[0, 1, 2].map((n) => (
                <div key={n} className="flex animate-pulse gap-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                  <div className="h-20 w-10 rounded-lg bg-slate-100" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-1/3 rounded bg-slate-100" />
                    <div className="h-3 w-full rounded bg-slate-100" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
              <p className="text-base font-semibold text-red-800">We couldn&rsquo;t load ideas</p>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button type="button" onClick={() => loadData()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white cursor-pointer">
                <RefreshCw className="size-4" /> Try again
              </button>
            </div>
          )}

          {!loading && !error && visibleIdeas.map((idea) => {
            const style = STATUS_STYLES[idea.status];
            const StatusIcon = style.Icon;
            const voting = Boolean(pendingVotes[idea.id]);
            const isMenuOpen = activeMenuId === idea.id;
            const isIdeaOwner =
              currentUser?.id != null &&
              String(currentUser.id) === String(idea.author.id);

            return (
              <article key={idea.id} className={`relative flex gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md sm:gap-5 text-left ${isMenuOpen ? "z-20" : ""}`}>
                {/* Vote column */}
                <div className="flex w-10 shrink-0 flex-col items-center">
                  <button
                    type="button"
                    onClick={() => handleVote(idea.id, "UPVOTE")}
                    disabled={voting}
                    aria-label={`Upvote ${idea.title}`}
                    aria-pressed={idea.userVote === "UPVOTE"}
                    className={`rounded p-1 transition-colors cursor-pointer ${
                      idea.userVote === "UPVOTE" ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-indigo-600"
                    }`}
                  >
                    <ChevronUp className="size-5" />
                  </button>
                  <span className="min-w-[2ch] text-center text-base font-bold tabular-nums text-slate-900" aria-live="polite" aria-atomic="true">
                    {idea.votes}
                  </span>
                  {voting && <Loader2 className="size-3.5 animate-spin text-slate-400" aria-label="Saving vote" />}
                  <button
                    type="button"
                    onClick={() => handleVote(idea.id, "DOWNVOTE")}
                    disabled={voting}
                    aria-label={`Downvote ${idea.title}`}
                    aria-pressed={idea.userVote === "DOWNVOTE"}
                    className={`rounded p-1 transition-colors cursor-pointer ${
                      idea.userVote === "DOWNVOTE" ? "text-red-500 font-bold" : "text-slate-400 hover:text-red-500"
                    }`}
                  >
                    <ChevronDown className="size-5" />
                  </button>
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1 text-left">
                  <div className="flex items-center justify-between gap-2 text-left">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-slate-500 text-left">
                      <Avatar name={idea.author.name} />
                      <span className="font-medium text-slate-700">{idea.author.name}</span>
                      {idea.createdAt && (
                        <>
                          <span>&middot;</span>
                          <time dateTime={idea.createdAt}>{formatDate(idea.createdAt)}</time>
                        </>
                      )}
                      <span className="inline-flex items-center gap-1.5 ml-2">
                        <StatusIcon className={`size-4 ${style.iconColor}`} />
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${style.badge}`}>
                          {style.label}
                        </span>
                      </span>
                    </div>

                    {/* COMPLETELY UNLOCKED 3-DOT MENU */}
                    <div ref={isMenuOpen ? activeMenuRef : null} className={`relative text-left ${isMenuOpen ? "z-50" : ""}`}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveMenuId(isMenuOpen ? null : idea.id);
                        }}
                        aria-label={`More actions for ${idea.title}`}
                        aria-haspopup="menu"
                        aria-expanded={isMenuOpen}
                        className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                      >
                        <MoreVertical className="size-5" />
                      </button>

                      {isMenuOpen && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full z-50 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 shadow-2xl text-xs text-left"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isIdeaOwner && (
                            <button
                              type="button"
                              onClick={() => handleEdit(idea)}
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2 text-slate-700 hover:bg-slate-100 font-medium cursor-pointer"
                            >
                              <Edit3 className="size-3.5 text-indigo-500" /> Edit
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleReport(idea)}
                            role="menuitem"
                            className="flex w-full items-center gap-2 px-3 py-2 text-amber-600 hover:bg-amber-50 font-medium cursor-pointer"
                          >
                            <Flag className="size-3.5 text-amber-500" /> Report
                          </button>
                          {(isIdeaOwner || isAdminOrModerator) && (
                            <button
                              type="button"
                              onClick={() => promptDelete(idea)}
                              role="menuitem"
                              className="flex w-full items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 font-medium border-t border-slate-100 cursor-pointer"
                            >
                              <Trash2 className="size-3.5 text-red-500" /> Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="mt-3 text-base font-bold text-slate-900 text-left">{idea.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600 text-left">{idea.description}</p>
                  {idea.tags.length > 0 && (
                    <ul aria-label={`Tags for ${idea.title}`} className="mt-3 flex flex-wrap gap-2">
                      {idea.tags.map((tag) => (
                        <li key={tag}>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTag(tag);
                              setTagQuery("");
                            }}
                            aria-label={`Filter ideas by ${tag}`}
                            className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100"
                          >
                            #{tag}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* BOTTOM ACTIONS */}
                  <div className="mt-4 flex flex-wrap items-center justify-start gap-4 pt-3 border-t border-slate-100 text-left">
                    <button
                      type="button"
                      onClick={() => handleFavoriteToggle(idea.id)}
                      className="inline-flex items-center text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                      title="Favorite"
                    >
                      <Star
                        className={`size-5 ${
                          idea.isFavorite ? "fill-amber-400 text-amber-400" : "text-amber-400"
                        }`}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenCommentsModal(idea)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-indigo-600 cursor-pointer"
                    >
                      <MessageSquare className="size-4 text-slate-400" />
                      <span>{idea.commentsCount} comments</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </section>

        <NewIdeaModal
          isOpen={editModalOpen}
          editData={selectedIdeaForEdit}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedIdeaForEdit(null);
          }}
          onSubmit={() => {
            setEditModalOpen(false);
            setSelectedIdeaForEdit(null);
            triggerSuccess("Idea updated successfully.");
          }}
        />

        {reportModalOpen && selectedIdeaForReport && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <form
              onSubmit={handleReportSubmit}
              className="w-full max-w-md space-y-5 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-2xl"
              aria-labelledby="report-idea-title"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="report-idea-title" className="text-lg font-bold text-slate-900">
                    Report idea
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">{selectedIdeaForReport.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  aria-label="Close report dialog"
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="size-5" />
                </button>
              </div>
              {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
              <label className="block text-sm font-medium text-slate-700">
                Reason
                <select
                  value={reportReason}
                  onChange={(event) => setReportReason(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {["Spam", "Abuse", "Duplicate", "Other"].map((reason) => (
                    <option key={reason} value={reason}>{reason}</option>
                  ))}
                </select>
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Details
                <textarea
                  value={reportDescription}
                  onChange={(event) => setReportDescription(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="Add details to help us review this report."
                  className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setReportModalOpen(false)}
                  disabled={reportLoading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reportLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {reportLoading && <Loader2 className="size-4 animate-spin" />}
                  Submit report
                </button>
              </div>
            </form>
          </div>
        )}

        {deleteModalOpen && selectedIdeaForDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs">
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="delete-idea-title"
              className="w-full max-w-md space-y-5 rounded-2xl border border-slate-100 bg-white p-6 text-left shadow-2xl"
            >
              <div>
                <h2 id="delete-idea-title" className="text-lg font-bold text-slate-900">
                  Delete idea?
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  “{selectedIdeaForDelete.title}” will be permanently deleted.
                </p>
              </div>
              {actionError && <p role="alert" className="text-sm text-red-700">{actionError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setSelectedIdeaForDelete(null);
                  }}
                  disabled={deleteLoading}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={deleteLoading}
                  className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                >
                  {deleteLoading && <Loader2 className="size-4 animate-spin" />}
                  Delete idea
                </button>
              </div>
            </div>
          </div>
        )}

        {/* COMMENTS MODAL POPUP */}
        {activeModalIdea && currentIdeaInModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 text-left">
            <div className="bg-white rounded-3xl max-w-xl w-full p-8 shadow-2xl space-y-6 text-left relative max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{currentIdeaInModal.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Discussion &amp; Comments</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModalIdea(null)}
                  className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
                >
                  <X className="size-5" />
                </button>
              </div>

              {/* Comments List */}
              <div className="space-y-4">
                {currentIdeaInModal.comments && currentIdeaInModal.comments.length > 0 ? (
                  currentIdeaInModal.comments.map((comment) => {
                    const isOwner = currentUser && (comment.author.id === currentUser.id || comment.author.name === currentUser.fullName || comment.author.name === currentUser.name);
                    const canDeleteComment = isAdminOrModerator || isOwner;

                    return (
                      <div key={comment.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 space-y-2 relative group">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar name={comment.author.name} className="size-6 text-[10px]" />
                            <span className="text-xs font-bold text-slate-800">{comment.author.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-slate-400">{formatDate(comment.createdAt)}</span>
                            {canDeleteComment && (
                              <button
                                type="button"
                                onClick={() => handleDeleteComment(comment.id, currentIdeaInModal.id)}
                                className="text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                title="Delete comment"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 pl-8">{comment.content}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-xs text-slate-400 italic text-center py-6">No comments yet. Be the first to share your thoughts!</p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleModalCommentSubmit} className="space-y-3 pt-4 border-t">
                <textarea
                  value={modalCommentText}
                  onChange={(e) => setModalCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none"
                  required
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveModalIdea(null)}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    disabled={modalCommentLoading || !modalCommentText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50 cursor-pointer"
                  >
                    {modalCommentLoading && <Loader2 className="size-3.5 animate-spin" />}
                    Post Comment
                  </button>
                </div>
              </form>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}