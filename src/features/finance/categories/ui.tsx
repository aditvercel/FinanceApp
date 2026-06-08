"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useCategories, useCreateCategory, useDeleteCategory } from "./hooks";

const DEFAULT_EMOJIS = ["🍔", "🚗", "⚡", "🛍️", "❤️", "🎬", "📦", "🐾", "👶", "💰", "🏠", "💊", "🎓", "✈️"];

interface CategoryManagerProps {
  reportId: string;
}

export function CategoryManager({ reportId }: CategoryManagerProps) {
  const { data: categories, isLoading } = useCategories(reportId);
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📦");
  const [deleting, setDeleting] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="animate-pulse h-12 bg-gray-100 rounded-lg" />
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
              <div
                key={cat.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg">{cat.emoji}</span>
                <span className="font-medium text-sm flex-1">{cat.name}</span>
                <button
                  onClick={() => handleDelete(cat.id, cat.isDefault)}
                  disabled={deleting === cat.id}
                  className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
                className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 text-lg"
              >
                {newEmoji}
              </button>
            </div>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
              className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
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
