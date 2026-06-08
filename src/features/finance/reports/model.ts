export interface Report {
  id: string;
  reportId: string;
  name: string;
  currency: string;
  role: "owner" | "editor" | "viewer";
  ownerId: string;
  memberCount: number;
  totalExpense: number;
  budgetWarnings?: Array<{
    category: string;
    percentage: number;
    status: "warning" | "exceeded";
  }>;
  createdAt: string;
}

export interface ReportMember {
  id: string;
  userId: string;
  displayName: string;
  role: "owner" | "editor" | "viewer";
}
