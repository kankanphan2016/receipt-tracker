// API Configuration
const API_BASE_URL = "https://766cfc1c9b97.ngrok-free.app"; // Replace with your actual API endpoint
const CLOUDINARY_UPLOAD_URL =
  "https://api.cloudinary.com/v1_1/domc9w8ch/image/upload";
const UPLOAD_PRESET = "receipts";

// Request/Response Interfaces
export interface CreateUserRequest {
  username: string;
  full_name: string;
  email: string;
  password: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role?: string;
  isActive?: boolean;
  lastLogin?: string;
}

export interface StoreReceiptRequest {
  user_id?: string;
  receipt_data: {
    merchant_name: string;
    merchant_address?: string;
    merchant_phone?: string;
    transaction_date: string;
    transaction_time?: string;
    transaction_id?: string;
    order_number?: string;
    items: {
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[];
    subtotal?: number;
    tax_gst?: number;
    tax_qst?: number;
    total_tax?: number;
    total_amount: number;
    payment_method?: string;
  };
  ocr_confidence_scores?: number[];
  average_confidence?: number;
  raw_ocr_text?: string[];
  processing_time_seconds?: number;
  notes?: string;
  category?: string;
  categoryId?: string;
  image_url?: string;
}

export interface UpdateReceiptRequest {
  user_id?: string;
  receipt_data?: {
    merchant_name?: string;
    merchant_address?: string;
    merchant_phone?: string;
    transaction_date?: string;
    transaction_time?: string;
    transaction_id?: string;
    order_number?: string;
    items?: {
      name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }[];
    subtotal?: number;
    tax_gst?: number;
    tax_qst?: number;
    total_tax?: number;
    total_amount?: number;
    payment_method?: string;
  };
  notes?: string;
  image_url?: string;
}

export interface UpdateReceiptResponse {
  success: boolean;
  message: string;
  error_message?: string;
}

export interface StoredReceipt {
  id: string;
  title: string;
  amount: number;
  date: string;
  category: string;
  categoryId: string;
  description?: string;
  imageUri?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SearchReceiptsRequest {
  merchant_name?: string;
  min_amount?: number;
  max_amount?: number;
  limit?: number;
  user_id?: string;
}

export interface Item {
  itemId: number;
  receiptId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface SearchReceiptItem {
  receipt_id: string;
  merchant_name: string;
  total_amount: number;
  transaction_date: string;
  notes?: string;
  created_at: string;
  image_url?: string;
  items: Item[];
}

export interface SearchReceiptsResponse {
  count: number;
  error_message: string | null;
  receipts: SearchReceiptItem[];
  success: boolean;
}

export interface ProcessImageRequest {
  image_url: string;
}

export interface ProcessedItem {
  name: string;
  price: number;
  confidence?: number;
}

export interface ProcessImageResponse {
  success: boolean;
  error_message: string | null;
  average_confidence: number;
  processing_time_seconds: number;
  ocr_confidence_scores: number[];
  raw_ocr_text: string[];
  cloudinary_url?: string;
  receipt_data: {
    merchant_name: string;
    merchant_name_confidence: number;
    merchant_address?: string;
    merchant_address_confidence?: number;
    merchant_phone?: string;
    merchant_phone_confidence?: number;
    total_amount: number;
    total_amount_confidence: number;
    subtotal?: number;
    subtotal_confidence?: number;
    tax_gst?: number;
    tax_gst_confidence?: number;
    tax_qst?: number;
    tax_qst_confidence?: number;
    total_tax?: number;
    total_tax_confidence?: number;
    transaction_date: string;
    transaction_date_confidence: number;
    transaction_time?: string;
    transaction_time_confidence?: number;
    transaction_id?: string;
    transaction_id_confidence?: number;
    order_number?: string;
    order_number_confidence?: number;
    payment_method?: string;
    payment_method_confidence?: number;
    items: ProcessedItem[];
  };
}

export interface StoreReceiptResponse {
  success: boolean;
  receipt_id?: string;
  message: string;
  error_message?: string;
}

export interface DeleteReceiptRequest {
  user_id?: string;
}

export interface DeleteReceiptResponse {
  success: boolean;
  message: string;
  error_message?: string;
}

const uploadToCloudinary = async (imageUri) => {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    type: "image/jpeg",
    name: "receipt.jpg",
  });
  formData.append("upload_preset", UPLOAD_PRESET);

  try {
    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
      method: "POST",
      body: formData,
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    const data = await response.json();

    if (data.secure_url) {
      return data.secure_url;
    } else {
      throw new Error("Upload failed");
    }
  } catch (error) {
    throw new Error("Network error during upload");
  }
};

// API Service Class
class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const defaultHeaders = {
      "Content-Type": "application/json",
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      console.log(`Making ${config.method || "GET"} request to:`, url);

      const response = await fetch(url, config);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("API Response:", data);
      return data;
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  }

  // User Management
  async createUser(userData: CreateUserRequest): Promise<User> {
    return this.makeRequest<User>("/users/create", {
      method: "POST",
      body: JSON.stringify(userData),
    });
  }

  async login(credentials: LoginRequest): Promise<{ user: User }> {
    return this.makeRequest<{ user: User }>("/users/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
  }

  // Receipt Management
  async storeReceipt(
    receiptData: StoreReceiptRequest
  ): Promise<StoreReceiptResponse> {
    console.log(receiptData);
    return this.makeRequest<StoreReceiptResponse>("/store-receipt", {
      method: "POST",
      body: JSON.stringify(receiptData),
    });
  }

  async updateReceipt(
    id: string,
    receiptData: {
      merchantName?: string;
      amount?: number;
      date?: string;
      category?: string;
      categoryId?: string;
      description?: string;
      imageUri?: string;
      items?: any[]; // ADD ITEMS SUPPORT
    },
    userId?: string
  ): Promise<UpdateReceiptResponse> {
    try {
      console.log("updateReceipt called with:", { id, receiptData, userId });

      // Convert frontend data to backend format
      const updateData: UpdateReceiptRequest = {
        user_id: userId,
      };

      // Build receipt_data object - now always create it if we have any receipt updates
      const hasReceiptUpdates =
        receiptData.merchantName ||
        receiptData.amount ||
        receiptData.date ||
        receiptData.items;

      if (hasReceiptUpdates) {
        updateData.receipt_data = {};

        if (receiptData.merchantName) {
          updateData.receipt_data.merchant_name = receiptData.merchantName;
        }

        if (receiptData.amount) {
          updateData.receipt_data.total_amount = receiptData.amount;
        }

        if (receiptData.date) {
          updateData.receipt_data.transaction_date = receiptData.date;
        }

        if (receiptData.items && Array.isArray(receiptData.items)) {
          console.log("Processing items for update:", receiptData.items);

          updateData.receipt_data.items = receiptData.items.map((item) => ({
            name: item.name || item.item_name || item.itemName || "",
            quantity: parseFloat(item.quantity) || 1,
            unit_price: parseFloat(item.unit_price || item.unitPrice) || 0,
            total_price:
              parseFloat(item.total_price || item.totalPrice || item.price) ||
              0,
          }));

          console.log("Transformed items:", updateData.receipt_data.items);
        }
      }

      // Handle app-specific metadata in notes
      if (
        receiptData.category ||
        receiptData.categoryId ||
        receiptData.description
      ) {
        const appData = {
          category: receiptData.category,
          categoryId: receiptData.categoryId,
          description: receiptData.description,
          appVersion: "1.0",
        };
        updateData.notes = JSON.stringify(appData);
      }

      // Handle image URL
      if (receiptData.imageUri?.startsWith("http")) {
        updateData.image_url = receiptData.imageUri;
      }

      console.log(`Updating receipt ${id} with final data:`, updateData);

      return this.makeRequest<UpdateReceiptResponse>(`/receipt/${id}`, {
        method: "PUT",
        body: JSON.stringify(updateData),
      });
    } catch (error) {
      console.error("Update receipt error:", error);
      throw error;
    }
  }

  async deleteReceipt(
    id: string,
    userId?: string
  ): Promise<DeleteReceiptResponse> {
    try {
      console.log(`Deleting receipt ${id} for user ${userId}`);

      const deleteData: DeleteReceiptRequest = {
        user_id: userId,
      };

      return this.makeRequest<DeleteReceiptResponse>(`/receipt/${id}`, {
        method: "DELETE",
        body: JSON.stringify(deleteData),
      });
    } catch (error) {
      console.error("Delete receipt error:", error);
      throw error;
    }
  }

  async searchReceipts(
    searchParams: SearchReceiptsRequest = {}
  ): Promise<SearchReceiptItem[]> {
    try {
      console.log("Searching receipts with params:", searchParams);
      const response = await this.makeRequest<SearchReceiptsResponse>(
        "/search-receipts",
        {
          method: "POST",
          body: JSON.stringify(searchParams),
        }
      );

      if (!response.success) {
        throw new Error(response.error_message || "Search failed");
      }

      console.log(`Found ${response.count} receipts`);
      return response.receipts || [];
    } catch (error) {
      console.error("Search receipts error:", error);
      throw error;
    }
  }

  // Image Processing
  async processImage(imageUri: string): Promise<ProcessImageResponse> {
    try {
      const cloudinaryUrl = await uploadToCloudinary(imageUri);
      console.log("Sending image for processing...");
      const response = await this.makeRequest<ProcessImageResponse>(
        "/process-image",
        {
          method: "POST",
          body: JSON.stringify({
            image_url: cloudinaryUrl,
          }),
        }
      );

      if (!response.success) {
        throw new Error(response.error_message || "Image processing failed");
      }

      console.log("Image processing completed successfully");
      return {
        ...response,
        cloudinary_url: cloudinaryUrl,
      };
    } catch (error) {
      console.error("Process image error:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const apiService = new ApiService(API_BASE_URL);
