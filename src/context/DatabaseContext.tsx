import React, { createContext, useContext, useState, useEffect } from "react";
import { Receipt, Category } from "../types/Receipt";
import { apiService, Item, SearchReceiptsRequest } from "../services/api";
import { useAuth, User } from "./AuthContext";
import { Alert } from "react-native";

interface DatabaseContextType {
  receipts: Receipt[];
  categories: Category[];
  addReceipt: (
    receipt: Omit<Receipt, "id" | "createdAt" | "updatedAt">,
    items?: any[],
    processingResult?: any
  ) => Promise<void>;
  updateReceipt: (id: string, receipt: Partial<Receipt>) => Promise<void>;
  deleteReceipt: (id: string) => Promise<void>;
  getReceiptsByDateRange: (startDate: Date, endDate: Date) => Receipt[];
  uploadReceiptImage: (imageUri: string) => Promise<string>; // Add this function
  processReceiptImage: (cloudinaryUrl: string) => Promise<any>; // Modified to accept cloudinary URL
  searchReceipts: (searchParams?: SearchReceiptsRequest) => Promise<Receipt[]>;
  loadReceipts: () => void;
}

const defaultCategories: Category[] = [
  { id: "1", name: "Food & Dining", icon: "restaurant", color: "#ff6b6b" },
  { id: "2", name: "Transportation", icon: "car", color: "#4ecdc4" },
  { id: "3", name: "Shopping", icon: "bag", color: "#45b7d1" },
  { id: "4", name: "Entertainment", icon: "game-controller", color: "#f9ca24" },
  { id: "5", name: "Health & Medical", icon: "medical", color: "#6c5ce7" },
  { id: "6", name: "Utilities", icon: "flash", color: "#a0e7e5" },
  { id: "7", name: "Travel", icon: "airplane", color: "#ffa8a8" },
  { id: "8", name: "Education", icon: "school", color: "#54a0ff" },
  { id: "9", name: "Other", icon: "ellipsis-horizontal", color: "#778ca3" },
];

const DatabaseContext = createContext<DatabaseContextType | undefined>(
  undefined
);

export const useDatabase = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabase must be used within a DatabaseProvider");
  }
  return context;
};

export const DatabaseProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [categories] = useState<Category[]>(defaultCategories);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      loadReceipts();
    }
  }, [user]);

  const loadReceipts = async () => {
    if (!user) {
      console.log("No user available, skipping receipt load");
      return;
    }

    try {
      console.log("Loading receipts from API...");
      console.log("loading receipts for user ", user);
      const apiReceipts = await apiService.searchReceipts({
        limit: 100,
        user_id: user?.id,
      });
      console.log("Loaded receipts count:", apiReceipts.length);
      const receipts: Receipt[] = apiReceipts.map((apiReceipt) => ({
        id: apiReceipt.receipt_id,
        merchantName: apiReceipt.merchant_name,
        amount: apiReceipt.total_amount,
        date: apiReceipt.transaction_date,
        category: "", //FIXME:
        categoryId: "", //FIXME:
        description: apiReceipt.notes,
        imageUri: apiReceipt.image_url,
        createdAt: apiReceipt.created_at,
        updatedAt: apiReceipt.created_at,
        items: apiReceipt.items.map((item: any) => ({
          itemId: item.item_id,
          receiptId: item.receipt_id,
          itemName: item.item_name,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        })),
      }));

      setReceipts(receipts);
    } catch (error) {
      console.error("Error loading receipts:", error);
      // Fallback to empty array if API fails
      setReceipts([]);
    }
  };

  const addReceipt = async (
    receiptData: Omit<Receipt, "id" | "createdAt" | "updatedAt">,
    items: any[] = [],
    processingResult: any = null
  ) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Adding receipt:", receiptData);

      // Build the receipt_data object with confidence scores
      let receipt_data_with_confidence: any = {
        merchant_name: receiptData.merchantName,
        transaction_date: receiptData.date,
        total_amount: receiptData.amount,
        items: items.map((item) => ({
          name: item.name || "",
          quantity: item.quantity || 1,
          unit_price: item?.unit_price || item?.price || 0,
          total_price: item.total_price || item.price || 0,
        })),
        // Default confidence scores for manually entered data
        merchant_name_confidence: null,
        transaction_date_confidence: null,
        total_amount_confidence: null,
      };

      // Add processing result data if available
      if (processingResult?.receipt_data) {
        // Copy over all the confidence scores and additional data from AI processing
        receipt_data_with_confidence = {
          ...receipt_data_with_confidence,
          ...processingResult.receipt_data,
          // Ensure our core data takes precedence if user modified it
          merchant_name:
            receiptData.merchantName ||
            processingResult.receipt_data.merchant_name,
          transaction_date:
            receiptData.date || processingResult.receipt_data.transaction_date,
          total_amount:
            receiptData.amount || processingResult.receipt_data.total_amount,
          items:
            items.length > 0
              ? receipt_data_with_confidence.items
              : processingResult.receipt_data.items,
        };
      }

      // Store category and other app-specific data in notes as JSON
      const appData = {
        category: receiptData.category,
        categoryId: receiptData.categoryId,
        description: receiptData.description,
        appVersion: "1.0",
      };

      // Prepare the API request data
      const storeReceiptData = {
        user_id: user.id,
        receipt_data: receipt_data_with_confidence,
        ocr_confidence_scores: processingResult?.ocr_confidence_scores || [],
        average_confidence: processingResult?.average_confidence || 0.0,
        raw_ocr_text: processingResult?.raw_ocr_text || [],
        processing_time_seconds:
          processingResult?.processing_time_seconds || 0.0,
        image_url: receiptData.imageUri?.startsWith("http")
          ? receiptData.imageUri
          : null,
        notes: JSON.stringify(appData),
      };

      console.log("Sending to API:", storeReceiptData);

      const apiResponse = await apiService.storeReceipt(storeReceiptData);

      if (!apiResponse.success) {
        throw new Error(apiResponse.error_message || "Failed to store receipt");
      }

      if (!apiResponse.receipt_id) {
        throw new Error("No receipt ID returned from server");
      }

      console.log(
        "Receipt stored successfully with ID:",
        apiResponse.receipt_id
      );

      const newReceipt: Receipt = {
        id: apiResponse.receipt_id,
        merchantName: receiptData.merchantName,
        amount: receiptData.amount,
        date: receiptData.date,
        category: receiptData.category,
        categoryId: receiptData.categoryId,
        description: receiptData.description,
        imageUri: receiptData.imageUri,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setReceipts((prevReceipts) => [...prevReceipts, newReceipt]);

      return newReceipt;
    } catch (error) {
      console.error("Error adding receipt:", error);
      throw error;
    }
  };

  const updateReceipt = async (id: string, receiptData: Partial<Receipt>) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Updating receipt:", id, receiptData);

      // Call the updated API service method with items support
      const apiResponse = await apiService.updateReceipt(
        id,
        {
          merchantName: receiptData.merchantName,
          amount: receiptData.amount,
          date: receiptData.date,
          category: receiptData.category,
          categoryId: receiptData.categoryId,
          description: receiptData.description,
          imageUri: receiptData.imageUri,
          items: receiptData.items,
        },
        user.id
      );

      if (!apiResponse.success) {
        throw new Error(
          apiResponse.error_message || "Failed to update receipt"
        );
      }

      console.log("Receipt updated successfully:", apiResponse.message);

      // Update local state
      setReceipts((prevReceipts) =>
        prevReceipts.map((receipt) =>
          receipt.id === id
            ? {
                ...receipt,
                merchantName: receiptData.merchantName ?? receipt.merchantName,
                amount: receiptData.amount ?? receipt.amount,
                date: receiptData.date ?? receipt.date,
                category: receiptData.category ?? receipt.category,
                categoryId: receiptData.categoryId ?? receipt.categoryId,
                description: receiptData.description ?? receipt.description,
                imageUri: receiptData.imageUri ?? receipt.imageUri,
                items: receiptData.items ?? receipt.items,
                updatedAt: new Date().toISOString(),
              }
            : receipt
        )
      );

      return apiResponse;
    } catch (error) {
      console.error("Error updating receipt:", error);
      throw error;
    }
  };

  const deleteReceipt = async (id: string) => {
    if (!user) {
      throw new Error("User not authenticated");
    }

    try {
      console.log("Deleting receipt:", id);

      // Call the API service delete method
      const response = await apiService.deleteReceipt(id, user.id);

      if (!response.success) {
        throw new Error(response.error_message || "Failed to delete receipt");
      }

      console.log("Receipt deleted successfully:", response.message);

      // Update local state - remove the deleted receipt
      setReceipts((prevReceipts) =>
        prevReceipts.filter((receipt) => receipt.id !== id)
      );

      return response;
    } catch (error) {
      console.error("Error deleting receipt:", error);
      throw error;
    }
  };

  const getReceiptsByDateRange = (
    startDate: Date,
    endDate: Date
  ): Receipt[] => {
    return receipts.filter((receipt) => {
      const receiptDate = new Date(receipt.date);
      return receiptDate >= startDate && receiptDate <= endDate;
    });
  };

  // NEW: Separate upload function
  const uploadReceiptImage = async (imageUri: string): Promise<string> => {
    try {
      console.log("Uploading receipt image:", imageUri);
      const cloudinaryUrl = await apiService.uploadImage(imageUri);
      console.log("Image upload result:", cloudinaryUrl);
      return cloudinaryUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      throw error;
    }
  };

  // MODIFIED: Process function now takes cloudinary URL
  const processReceiptImage = async (cloudinaryUrl: string) => {
    try {
      console.log("Processing receipt image from URL:", cloudinaryUrl);
      const result = await apiService.processImage(cloudinaryUrl);
      console.log("Image processing result:", result);
      return result;
    } catch (error) {
      console.error("Error processing image:", error);
      throw error;
    }
  };

  const searchReceipts = async (
    searchParams?: SearchReceiptsRequest
  ): Promise<Receipt[]> => {
    if (!user) {
      console.log("No user available for search");
      return [];
    }

    try {
      console.log("Searching receipts with params:", searchParams);
      const apiReceipts = await apiService.searchReceipts({
        ...searchParams,
        user_id: user.id,
      });
      console.log("Search results count:", apiReceipts.length);
      return apiReceipts.map((apiReceipt) => ({
        id: apiReceipt.receipt_id,
        merchantName: apiReceipt.merchant_name,
        amount: apiReceipt.total_amount,
        date: apiReceipt.transaction_date,
        category: "",
        categoryId: "",
        description: apiReceipt.notes,
        imageUri: apiReceipt.image_url,
        createdAt: apiReceipt.created_at,
        updatedAt: apiReceipt.created_at,
      }));
    } catch (error) {
      console.error("Error searching receipts:", error);
      throw error;
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        receipts,
        categories,
        addReceipt,
        updateReceipt,
        deleteReceipt,
        getReceiptsByDateRange,
        uploadReceiptImage,
        processReceiptImage,
        searchReceipts,
        loadReceipts,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};
