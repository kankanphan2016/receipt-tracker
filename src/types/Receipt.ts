// Updated Receipt interface with items support
export interface ReceiptItem {
  itemId: number;
  receiptId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  itemOrder?: number;
}

export interface Receipt {
  id: string;
  merchantName: string;
  amount: number;
  date: string;
  category: string;
  categoryId: string;
  description?: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
  items?: ReceiptItem[]; // ADD THIS LINE
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface ReceiptAnalytics {
  totalAmount: number;
  averageAmount: number;
  receiptCount: number;
  categoryBreakdown: { [key: string]: number };
  monthlyTrend: { month: string; amount: number }[];
}
