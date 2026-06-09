"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useReports } from "@/features/finance/reports/hooks";
import { useRecurringTemplates, useUpdateRecurringTemplate, useDeleteRecurringTemplate } from "@/features/finance/recurring/hooks";
import { TemplateList, TemplateForm } from "@/features/finance/recurring/ui";
import { useState } from "react";

export default function RecurringTemplatesPage() {
  const router = useRouter();
  const { data: reports, isLoading: reportsLoading } = useReports();
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  const { data: templates, isLoading: templatesLoading } = useRecurringTemplates(selectedReportId);
  const updateMutation = useUpdateRecurringTemplate();
  const deleteMutation = useDeleteRecurringTemplate();

  const handleToggle = async (id: string, isActive: boolean) => {
    await updateMutation.mutateAsync({ id, data: { isActive } });
  };

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
  };

  const handleEdit = (template: any) => {
    setEditingTemplate(template);
    setShowForm(true);
  };

  const handleFormClose = (open: boolean) => {
    setShowForm(open);
    if (!open) setEditingTemplate(null);
  };

  return (
    <div className="p-4 pb-16">
      <header className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-1 -ml-1 hover:bg-(--muted) rounded-lg"
        >
          <ArrowLeft className="w-5 h-5 text-(--foreground)" />
        </button>
        <h1 className="text-2xl font-bold">Recurring Templates</h1>
      </header>

      {reportsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No reports found. Create a report first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Select Report
            </label>
            <select
              value={selectedReportId}
              onChange={(e) => setSelectedReportId(e.target.value)}
              className="w-full py-2.5 px-3 border border-(--border) rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Choose a report...</option>
              {reports.map((r: any) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          {selectedReportId && (
            <div className="bg-(--card) border border-(--border) rounded-xl p-4">
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : (
                <TemplateList
                  templates={templates ?? []}
                  onAdd={() => { setEditingTemplate(null); setShowForm(true); }}
                  onEdit={handleEdit}
                  onToggle={handleToggle}
                  onDelete={handleDelete}
                />
              )}
            </div>
          )}
        </div>
      )}

      <TemplateForm
        key={editingTemplate?.id ?? "new"}
        open={showForm}
        onOpenChange={handleFormClose}
        reportId={selectedReportId}
        editingTemplate={editingTemplate}
      />
    </div>
  );
}
