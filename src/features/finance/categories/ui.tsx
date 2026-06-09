"use client";

import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from "./hooks";

const DEFAULT_EMOJIS = ["🍔", "🚗", "⚡", "🛍️", "❤️", "🎬", "📦", "🐾", "👶", "💰", "🏠", "💊", "🎓", "✈️"];

interface CategoryManagerProps {
  reportId: string;
}

export function CategoryManager({ reportId }: CategoryManagerProps) {
  const { data: categories, isLoading } = useCategories(reportId);
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("📦");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createCategory.mutateAsync({ reportId, name: newName.trim(), emoji: newEmoji });
    setNewName("");
    setNewEmoji("📦");
    setShowAdd(false);
  };

  const handleDelete = async (categoryId: string, isDefault: boolean) => {
    if (isDefault) return;
    setDeleting(categoryId);
    await deleteCategory.mutateAsync({ reportId, categoryId });
    setDeleting(null);
  };

  const startEdit = (cat: { id: string; name: string; emoji: string }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditEmoji(cat.emoji);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditEmoji("📦");
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    await updateCategory.mutateAsync({
      reportId,
      categoryId: editingId,
      data: { name: editName.trim(), emoji: editEmoji },
    });
    cancelEdit();
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-(--muted)rounded-lg" />
        ))}
      </div>
    );
  }

  const defaultCats = categories?.filter((c) => c.isDefault) || [];
  const customCats = categories?.filter((c) => !c.isDefault) || [];

  return (
    <div>
      {defaultCats.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Default
          </h3>
          <div className="space-y-1">
            {defaultCats.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50"
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="font-medium text-sm">{cat.name}</span>
                <span className="text-xs text-gray-400 ml-auto">Default</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {customCats.length > 0 && (
        <div className="mb-6">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-1">
            Custom
          </h3>
          <div className="space-y-1">
            {customCats.map((cat) => (
              <div key={cat.id}>
                {editingId === cat.id ? (
                  <div className="border border-blue-400 rounded-lg p-3 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const idx = DEFAULT_EMOJIS.indexOf(editEmoji);
                          setEditEmoji(DEFAULT_EMOJIS[(idx + 1) % DEFAULT_EMOJIS.length]);
                        }}
                        className="w-10 h-10 flex items-center justify-center border border-(--border) rounded-lg hover:bg-gray-50 text-lg shrink-0"
                      >
                        {editEmoji}
                      </button>
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-(--border) rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {DEFAULT_EMOJIS.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => setEditEmoji(emoji)}
                          className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm transition-colors ${
                            editEmoji === emoji
                              ? "bg-blue-100 ring-2 ring-blue-500"
                              : "hover:bg-gray-100"
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={cancelEdit}
                        className="flex-1 py-1.5 border border-(--border) rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={!editName.trim() || updateCategory.isPending}
                        className="flex-1 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700 flex items-center justify-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        {updateCategory.isPending ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors group">
                    <span className="text-lg">{cat.emoji}</span>
                    <span className="font-medium text-sm flex-1">{cat.name}</span>
                    <button
                      onClick={() => startEdit(cat)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.isDefault)}
                      disabled={deleting === cat.id}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd ? (
        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-sm">Add Category</h4>
          <div className="flex gap-2">
            <div className="relative">
              <button
                onClick={() => {
                  const idx = DEFAULT_EMOJIS.indexOf(newEmoji);
                  setNewEmoji(DEFAULT_EMOJIS[(idx + 1) % DEFAULT_EMOJIS.length]);
                }}
                className="w-10 h-10 flex items-center justify-center border border-(--border) rounded-lg hover:bg-gray-50 text-lg"
              >
                {newEmoji}
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-(--border) rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>
          <div className="flex gap-10 flex-wrap">
            {DEFAULT_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => setNewEmoji(emoji)}
                className={`w-8 h-8 flex items-center justify-center rounded-lg text-lg transition-colors ${
                  newEmoji === emoji
                    ? "bg-blue-100 ring-2 ring-blue-500"
                    : "hover:bg-gray-100"
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setShowAdd(false)}
              className="flex-1 py-2 border border-(--border) rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={!newName.trim() || createCategory.isPending}
              className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
            >
              {createCategory.isPending ? "Adding..." : "Add"}
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 w-full px-3 py-3 text-blue-600 font-medium text-sm hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Category
        </button>
      )}
    </div>
  );
}
