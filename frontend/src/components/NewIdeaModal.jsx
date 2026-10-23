import { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { X, Tag, Loader2, Sparkles, Edit3 } from "lucide-react";
import api from "../api/axios";
import { fetchIdeas } from "../pages/IdeasDashboard";

export default function NewIdeaModal({ isOpen, onClose, onSubmit, editData }) {
  const dispatch = useDispatch();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isEditing = Boolean(editData);

  
  useEffect(() => {
    if (editData) {
      setTitle(editData.title || "");
      setDescription(editData.description || "");
      setTagsInput(Array.isArray(editData.tags) ? editData.tags.join(", ") : "");
    } else {
      setTitle("");
      setDescription("");
      setTagsInput("");
    }
    setError("");
  }, [editData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setError("Fadlan buuxi magaca iyo sharaxaadda fikradda.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const tags = tagsInput
        ? tagsInput.split(",").map((t) => t.trim()).filter(Boolean)
        : [];

      if (isEditing) {
      
        await api.put(`/ideas/${editData.id}`, {
          title: title.trim(),
          description: description.trim(),
          tags,
        });
      } else {
        
        await api.post("/ideas", {
          title: title.trim(),
          description: description.trim(),
          tags,
        });
      }

      dispatch(fetchIdeas());

      if (onSubmit) {
        onSubmit();
      } else {
        onClose();
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.message ||
          "Cilad ayaa dhacday sabab la xiriirta gudbinta fikradda."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div 
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 text-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              {isEditing ? <Edit3 className="size-4" /> : <Sparkles className="size-4" />}
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {isEditing ? "Edit Idea" : "Share Your Idea"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-all cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="mt-4 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-200">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Idea Title <span className="text-indigo-600">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a clear, descriptive title for your idea..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Description <span className="text-indigo-600">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed description of your idea, including benefits and potential implementation..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs resize-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tags <span className="text-slate-400 font-normal">(Comma separated)</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="e.g. frontend, react, UI/UX"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2.5 pl-10 pr-3.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none transition-all shadow-2xs"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 mt-6">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading && <Loader2 className="size-3.5 animate-spin" />}
              <span>{isEditing ? "Save Changes" : "Submit Idea"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}