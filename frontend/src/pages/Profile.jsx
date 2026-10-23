import { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import { setLogout, setUser } from "../store/authSlice";
import { fetchIdeas, deleteIdea } from "./IdeasDashboard";
import {
  User,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Trash2,
  Settings,
  X,
  Edit3,
  Heart,
} from "lucide-react";
import NewIdeaModal from "../components/NewIdeaModal";

export default function Profile() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux Auth State
  const { user } = useSelector((state) => state.auth);
  
  // Redux Ideas State
  const reduxIdeas = useSelector((state) => state.ideas?.ideas || []);
  const reduxLoading = useSelector((state) => state.ideas?.loading || false);

  const [activeTab, setActiveTab] = useState("my-ideas"); // 'my-ideas' ama 'favorited'
  const [favoritedIdeas, setFavoritedIdeas] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [actionError, setActionError] = useState("");
  const [pendingFavoriteId, setPendingFavoriteId] = useState(null);
  const [deletingIdeaId, setDeletingIdeaId] = useState(null);
  const [ideaToDelete, setIdeaToDelete] = useState(null);

  // Edit Idea Modal State
  const [editIdeaModalOpen, setEditIdeaModalOpen] = useState(false);
  const [selectedIdeaForEdit, setSelectedIdeaForEdit] = useState(null);

  // Profile Edit Modal State
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [error, setError] = useState("");
  const profileAlertTimeout = useRef(null);

  // Delete Account Confirmation Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const handleProfileApiError = useCallback(
    (err, fallback, setLocalError) => {
      if (err.response?.status === 401) {
        setActionError("");
        setError("");
        dispatch(setLogout());
        navigate("/login", { replace: true });
        return;
      }
      setLocalError(err.response?.data?.message || err.message || fallback);
    },
    [dispatch, navigate],
  );

  const clearProfileAlerts = () => {
    if (profileAlertTimeout.current) {
      clearTimeout(profileAlertTimeout.current);
      profileAlertTimeout.current = null;
    }
    setSuccessMessage("");
    setError("");
  };

  const showProfileAlert = (type, message) => {
    if (profileAlertTimeout.current) clearTimeout(profileAlertTimeout.current);
    setSuccessMessage(type === "success" ? message : "");
    setError(type === "error" ? message : "");
    profileAlertTimeout.current = setTimeout(() => {
      setSuccessMessage("");
      setError("");
      profileAlertTimeout.current = null;
    }, 5000);
  };

  const closeEditProfile = () => {
    clearProfileAlerts();
    setShowEditProfile(false);
  };

  useEffect(
    () => () => {
      if (profileAlertTimeout.current) clearTimeout(profileAlertTimeout.current);
    },
    [],
  );

  useEffect(() => {
    dispatch(fetchIdeas());
    let active = true;
    api
      .get("/ideas/favorites/me")
      .then((response) => {
        const favorites = response.data?.data;
        if (!Array.isArray(favorites)) {
          throw new Error("The server returned an invalid favorites response.");
        }
        if (active) {
          setFavoritedIdeas(favorites);
          setActionError("");
        }
      })
      .catch((err) => {
        if (active)
          handleProfileApiError(
            err,
            "Could not load your favorite ideas.",
            setActionError,
          );
      })
      .finally(() => {
        if (active) setFavoritesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [user, dispatch, handleProfileApiError]);

  const sourceIdeas = reduxIdeas;

  // ID-ga isticmaalaha hadda jira
  const currentUserId = String(user?.id || user?._id || user?.userId || "").trim();

  // 1. My Ideas (Submitted Ideas - Fikraddii uu user-kani qoray)
  const myIdeas = sourceIdeas.filter((idea) => {
    if (!currentUserId) return false;
    const authorObj = idea.author;
    const authorId = String(
      (typeof authorObj === "object" ? authorObj?.id || authorObj?._id : authorObj) ||
      idea.userId ||
      idea.authorId ||
      ""
    ).trim();

    return authorId === currentUserId;
  });

  // 2. Favorited Ideas (Fikraddii uu calaamadeeyay ee isFavorite true ah)
  const favoriteIds = new Set(favoritedIdeas.map((idea) => String(idea.id || idea._id)));

  // Edit Profile (PUT /api/auth/me)
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    clearProfileAlerts();
    setLoading(true);

    try {
      const payload = { fullName, email };
      const passwordChanged = Boolean(newPassword);
      if (passwordChanged) payload.password = newPassword;

      const response = await api.put("/auth/me", payload);
      const updatedUser = response.data?.data;
      if (!updatedUser || typeof updatedUser !== "object") {
        throw new Error("Profile updated, but the updated profile was not returned.");
      }
      dispatch(setUser(updatedUser));
      showProfileAlert("success", "Profile updated successfully!");
      setNewPassword("");
      window.setTimeout(closeEditProfile, 5000);
    } catch (err) {
      handleProfileApiError(err, "Failed to update profile.", (message) =>
        showProfileAlert("error", message),
      );
    } finally {
      setLoading(false);
    }
  };

  // Delete Account (DELETE /api/auth/me)
  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      await api.delete("/auth/me");
      dispatch(setLogout());
      navigate("/login", { replace: true });
    } catch (err) {
      handleProfileApiError(
        err,
        "Failed to delete account at this time.",
        setError,
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  // Delete Idea (DELETE /api/ideas/:id)
  const handleDeleteIdea = async (ideaId) => {
    setActionError("");
    setDeletingIdeaId(ideaId);
    try {
      await dispatch(deleteIdea(ideaId)).unwrap();
      setFavoritedIdeas((prev) => prev.filter((idea) => (idea.id || idea._id) !== ideaId));
      setIdeaToDelete(null);
    } catch (err) {
      if (typeof err === "string") setActionError(err);
      else handleProfileApiError(err, "Failed to delete idea.", setActionError);
    } finally {
      setDeletingIdeaId(null);
    }
  };

  const handleFavoriteToggle = async (ideaId) => {
    setActionError("");
    setPendingFavoriteId(ideaId);
    try {
      const response = await api.post(`/ideas/${ideaId}/favorite`);
      const isFavorite = response.data?.data?.isFavorite;
      if (typeof isFavorite !== "boolean") {
        throw new Error("The server returned an invalid favorite status.");
      }
      if (isFavorite) {
        const idea = sourceIdeas.find((item) => (item.id || item._id) === ideaId);
        if (idea) {
          setFavoritedIdeas((previous) => [
            { ...idea, isFavorite: true },
            ...previous.filter((item) => (item.id || item._id) !== ideaId),
          ]);
        }
      } else {
        setFavoritedIdeas((previous) =>
          previous.filter((item) => (item.id || item._id) !== ideaId),
        );
      }
      setActionError("");
    } catch (err) {
      handleProfileApiError(
        err,
        "Failed to update favorite.",
        setActionError,
      );
    } finally {
      setPendingFavoriteId(null);
    }
  };

  const handleOpenEditModal = (idea) => {
    setSelectedIdeaForEdit(idea);
    setEditIdeaModalOpen(true);
  };

  const displayedIdeas = activeTab === "my-ideas" ? myIdeas : favoritedIdeas;
  const isLoading = activeTab === "my-ideas" ? reduxLoading : favoritesLoading;

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 text-left">
      <div className="mx-auto max-w-5xl space-y-8">
        
        {/* Profile Card Header */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-full bg-slate-100 border border-slate-200 text-indigo-600 font-bold text-2xl shadow-inner">
                {user?.fullName ? user.fullName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() : "U"}
              </div>
              
              <div className="space-y-1">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-800">
                  {user?.fullName || "User Name"}
                </h1>
                <p className="text-sm text-slate-500 font-medium">
                  {user?.email} <span className="text-indigo-600 font-semibold">• {user?.role}</span>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setFullName(user?.fullName || "");
                setEmail(user?.email || "");
                setNewPassword("");
                clearProfileAlerts();
                setShowEditProfile(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
            >
              <Settings className="size-4 text-indigo-600" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>

        {/* Tabs: My Ideas / Favorited Ideas */}
        <div className="border-b border-slate-200/80">
          <nav className="-mb-px flex space-x-8">
            <button
              type="button"
              onClick={() => {
                setActionError("");
                setActiveTab("my-ideas");
              }}
              className={`pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "my-ideas"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              My Ideas ({myIdeas.length})
            </button>

            <button
              type="button"
              onClick={() => {
                setActionError("");
                setActiveTab("favorited");
              }}
              className={`pb-4 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "favorited"
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              Favorited Ideas ({favoritedIdeas.length})
            </button>
          </nav>
        </div>

        {/* Ideas List */}
        <div className="space-y-4">
          {actionError && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">
              {actionError}
            </p>
          )}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-indigo-600" />
            </div>
          ) : displayedIdeas.length === 0 ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-12 text-center text-sm font-medium text-slate-400">
              {activeTab === "my-ideas" ? "No ideas submitted yet." : "No favorited ideas yet."}
            </div>
          ) : (
            displayedIdeas.map((idea) => {
              const id = idea.id || idea._id;
              return (
                <div
                  key={id}
                  className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs hover:border-slate-300 transition-all space-y-2 text-left"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-800">{idea.title}</h3>
                    
                    <div className="flex items-center gap-3">
                      {/* Favorite Remove/Toggle Button hadii ay ku jirto tab-ka favorited ama guud */}
                      <button
                        type="button"
                        onClick={() => handleFavoriteToggle(id)}
                        disabled={pendingFavoriteId === id}
                        aria-label={favoriteIds.has(String(id)) ? "Remove from favorites" : "Add to favorites"}
                        className="text-rose-500 hover:text-rose-700 cursor-pointer flex items-center gap-1 text-xs font-semibold disabled:cursor-wait disabled:opacity-50"
                        title={favoriteIds.has(String(id)) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Heart className={`size-4 ${favoriteIds.has(String(id)) ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                      </button>

                      {activeTab === "my-ideas" && (
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(idea)}
                            className="hover:text-indigo-600 cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="size-3.5" />
                            <span>Edit</span>
                          </button>
                          <span>•</span>
                          <button
                            type="button"
                            onClick={() => {
                              setActionError("");
                              setIdeaToDelete(idea);
                            }}
                            disabled={deletingIdeaId === id}
                            className="hover:text-red-600 cursor-pointer flex items-center gap-1 disabled:cursor-wait disabled:opacity-50"
                          >
                            <Trash2 className="size-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">{idea.description}</p>
                </div>
              );
            })
          )}
        </div>

        {/* Danger Zone */}
        <div className="rounded-3xl border border-red-200/80 bg-red-50/20 p-6 sm:p-8 mt-12">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-bold text-red-900 flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-600" />
                <span>Danger Zone</span>
              </h2>
              <p className="text-xs text-red-600/80">
                Once you delete your account, there is no going back. Please be certain.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2.5 text-sm font-semibold text-white transition-all cursor-pointer shrink-0 shadow-xs"
            >
              <Trash2 className="size-4" />
              Delete Account
            </button>
          </div>
        </div>

      </div>

      {/* Account Settings / Edit Profile Modal */}
      {showEditProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <User className="size-5 text-indigo-600" />
                <span>Account Settings & Credentials</span>
              </h3>
              <button
                type="button"
                onClick={closeEditProfile}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {successMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>{successMessage}</span>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-800 border border-red-200">
                <AlertTriangle className="size-4 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-medium text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold uppercase text-slate-500">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-3.5 text-sm font-medium text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <hr className="border-slate-100 my-2" />
              <p className="text-xs font-semibold text-slate-600">Change Password (Optional)</p>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase">New Password</label>
                <input
                  type="password"
                  placeholder="Enter a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 px-3 text-sm text-slate-700 focus:bg-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditProfile}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-50"
                >
                  {loading && <Loader2 className="size-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Idea Modal */}
      {editIdeaModalOpen && selectedIdeaForEdit && (
        <NewIdeaModal
          isOpen={editIdeaModalOpen}
          onClose={() => {
            setEditIdeaModalOpen(false);
            setSelectedIdeaForEdit(null);
          }}
          editData={selectedIdeaForEdit}
          onSubmit={() => {
            setEditIdeaModalOpen(false);
            setSelectedIdeaForEdit(null);
          }}
        />
      )}

      {ideaToDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-idea-title"
            aria-describedby="delete-idea-description"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl text-left"
          >
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-red-100 bg-red-50">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 id="delete-idea-title" className="text-lg font-bold text-slate-800">
                  Delete idea?
                </h3>
                <p className="text-sm text-slate-600">
                  Are you sure you want to delete “{ideaToDelete.title}”?
                </p>
              </div>
            </div>
            <p id="delete-idea-description" className="mt-4 text-sm text-slate-600">
              This action cannot be undone.
            </p>
            {actionError && (
              <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {actionError}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIdeaToDelete(null);
                  setActionError("");
                }}
                disabled={deletingIdeaId !== null}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteIdea(ideaToDelete.id || ideaToDelete._id)}
                disabled={deletingIdeaId !== null}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {deletingIdeaId !== null && <Loader2 className="size-4 animate-spin" />}
                Delete idea
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 text-left">
            <div className="flex items-center gap-3 text-red-600">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-red-50 border border-red-100">
                <AlertTriangle className="size-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">Delete Account</h3>
                <p className="text-xs text-slate-500">Are you sure you want to delete your account?</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This action cannot be undone. All your ideas and data will be permanently removed.
            </p>
            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">
                {error}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="size-3.5 animate-spin" />}
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}