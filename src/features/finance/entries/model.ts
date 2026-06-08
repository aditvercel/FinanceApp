export type EntryType = "income" | "expense";
export type EntryAction = "create" | "edit" | "revert" | "recurring";

export interface LineItem {
  id: string;
  name: string;
  price: number;
  confidence: "high" | "medium" | "low";
}

export interface EntrySnapshot {
  id: string;
  entryId: string;
  version: number;
  changedBy: string;
  action: EntryAction;
  revertedFrom: number | null;
  type: EntryType;
  amount: number;
  amountOriginal: number | null;
  currencyOriginal: string | null;
  exchangeRate: number | null;
  exchangeRateSource: "live" | "manual" | "fallback" | null;
  category: string;
  merchant: string | null;
  note: string | null;
  entryDate: string;
  isCurrent: boolean;
  lineItems: LineItem[];
  changedAt: string;
}

export interface Entry {
  id: string;
  reportId: string;
  createdBy: string;
  createdAt: string;
  currentSnapshot: EntrySnapshot;
}
