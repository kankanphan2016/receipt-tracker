import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActionSheetIOS,
  Image,
  Modal,
  FlatList,
  SafeAreaView,
} from "react-native";
import {
  TextInput,
  Button,
  Card,
  Chip,
  ProgressBar,
  Portal,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";
import { useAuth } from "../context/AuthContext";

interface BatchUploadItem {
  id: string;
  uri: string;
  cloudinaryUrl?: string;
  status:
    | "pending"
    | "uploading"
    | "uploaded"
    | "processing"
    | "completed"
    | "error";
  progress: number;
  result?: any;
  error?: string;
  receipt?: any;
}

export default function AddReceiptScreen({ navigation }) {
  // If uploadReceiptImage doesn't exist in context, use processReceiptImage or add upload function
  const { addReceipt, categories, processReceiptImage } = useDatabase();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  // Add upload function directly if not available in context
  const uploadReceiptImage = async (imageUri: string): Promise<string> => {
    const CLOUDINARY_UPLOAD_URL =
      "https://api.cloudinary.com/v1_1/domc9w8ch/image/upload";
    const UPLOAD_PRESET = "receipts";

    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      type: "image/jpeg",
      name: "receipt.jpg",
    } as any);
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

  // Form fields - always visible
  const [merchantName, setMerchantName] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState(categories[0]);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [items, setItems] = useState<any[]>([]);

  // Image states
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [cloudinaryUrl, setCloudinaryUrl] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const [processingResult, setProcessingResult] = useState<any>(null);

  // Other states
  const [loading, setLoading] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchItems, setBatchItems] = useState<BatchUploadItem[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [selectedBatchItems, setSelectedBatchItems] = useState<string[]>([]);
  const [showOcrData, setShowOcrData] = useState(false);

  const handleImagePicker = async () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [
            "Cancel",
            "Take Photo",
            "Choose from Gallery",
            "Batch Upload",
          ],
          cancelButtonIndex: 0,
        },
        (buttonIndex) => {
          if (buttonIndex === 1) {
            openCamera();
          } else if (buttonIndex === 2) {
            openGallery();
          } else if (buttonIndex === 3) {
            openBatchUpload();
          }
        }
      );
    } else {
      Alert.alert("Select Image", "Choose an option", [
        { text: "Cancel", style: "cancel" },
        { text: "Take Photo", onPress: openCamera },
        { text: "Choose from Gallery", onPress: openGallery },
        { text: "Batch Upload", onPress: openBatchUpload },
      ]);
    }
  };

  const openCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera permissions to take photos."
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      await uploadSingleImage(result.assets[0].uri);
    }
  };

  const openGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to add images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      await uploadSingleImage(result.assets[0].uri);
    }
  };

  const uploadSingleImage = async (uri: string) => {
    setUploadingImage(true);
    try {
      console.log("Uploading image:", uri);
      const cloudinaryUrl = await uploadReceiptImage(uri);
      console.log("Image uploaded successfully:", cloudinaryUrl);
      setCloudinaryUrl(cloudinaryUrl);
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Error", "Failed to upload image. Please try again.");
    } finally {
      setUploadingImage(false);
    }
  };

  const extractDataFromImage = async () => {
    if (!cloudinaryUrl) {
      Alert.alert("No Image", "Please upload an image first.");
      return;
    }

    setProcessingImage(true);
    try {
      console.log("Processing image:", cloudinaryUrl);
      const result = await processReceiptImage(cloudinaryUrl);
      console.log("Processing completed:", result);

      setProcessingResult(result);
      console.log("receipt data after processing: ", processingResult);

      // Auto-populate form fields with extracted data
      if (result.receipt_data) {
        if (result.receipt_data.merchant_name) {
          setMerchantName(result.receipt_data.merchant_name);
        }
        if (result.receipt_data.total_amount) {
          setAmount(result.receipt_data.total_amount.toString());
        }
        if (result.receipt_data.transaction_date) {
          setDate(result.receipt_data.transaction_date);
        }
        if (result.receipt_data.items && result.receipt_data.items.length > 0) {
          setItems(
            result.receipt_data.items.map((item) => ({
              name: item.name || "",
              quantity: item.quantity || 1,
              unit_price: item.unit_price || 0,
              price: item.total_price || item.price || 0,
              total_price: item.total_price || item.price || 0,
            }))
          );
        }
      }

      Alert.alert(
        "✅ Data Extracted Successfully!",
        `Found: ${
          result.receipt_data.merchant_name || "Unknown merchant"
        }\nAmount: $${result.receipt_data.total_amount || "0.00"}\nItems: ${
          result.receipt_data.items?.length || 0
        }\n\nForm fields have been populated. You can review and edit them before saving.`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Error processing image:", error);
      Alert.alert(
        "Processing Error",
        "Failed to extract data from image. You can still enter the details manually."
      );
    } finally {
      setProcessingImage(false);
    }
  };

  // Add this function to clear all form fields
  const clearForm = () => {
    // Clear basic form fields
    setMerchantName("");
    setAmount("");
    setDescription("");
    setSelectedCategory(categories[0]); // Reset to first category
    setDate(new Date()); // Reset to current date
    setItems([]);

    // Clear image states
    setImageUri(null);
    setCloudinaryUrl(null);
    setUploadingImage(false);
    setProcessingImage(false);
    setProcessingResult(null);

    // Clear other states
    setLoading(false);
    setShowBatchUpload(false);
    setBatchItems([]);
    setBatchProcessing(false);
    setBatchProgress(0);
    setSelectedBatchItems([]);
    setShowOcrData(false);
    setShowDatePicker(false);
  };

  const handleSave = async () => {
    const numericAmount = parseFloat(amount);

    // Enhanced validation with detailed logging
    console.log("=== SAVE VALIDATION ===");
    console.log("Merchant Name:", merchantName);
    console.log("Amount:", amount, "Parsed:", numericAmount);
    console.log("Category:", selectedCategory);
    console.log("Date:", date);
    console.log("Items:", items);
    console.log("CloudinaryUrl:", cloudinaryUrl);
    console.log("ImageUri:", imageUri);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      Alert.alert("Error", "Please enter a valid amount");
      return;
    }

    if (!merchantName.trim()) {
      Alert.alert("Error", "Please enter a merchant name");
      return;
    }

    if (!selectedCategory || !selectedCategory.id) {
      Alert.alert("Error", "Please select a category");
      return;
    }

    setLoading(true);
    try {
      // Create the receipt data object that matches your Receipt interface
      const receiptData = {
        merchantName: merchantName.trim(),
        amount: numericAmount,
        description: description.trim(),
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        date: date.toString(),
        imageUri: cloudinaryUrl || imageUri,
      };

      console.log("=== CALLING addReceipt ===");
      console.log("Receipt Data:", receiptData);
      console.log("Items:", items);
      console.log("Processing Result:", processingResult ? "Present" : "None");

      await addReceipt(receiptData, items, processingResult);
      clearForm();

      console.log("✅ Receipt saved successfully");
      Alert.alert("Success", "Receipt added successfully!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error("❌ Error saving receipt:", error);

      // Show more detailed error information
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Full error details:", error);

      Alert.alert(
        "Save Error",
        `Failed to save receipt: ${errorMessage}\n\nPlease check:\n• Merchant name: "${merchantName}"\n• Amount: "${amount}"\n• Category: "${selectedCategory?.name}"\n• Network connection`
      );
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = () => {
    const merchantNameValid = merchantName.trim().length > 0;
    const amountValid = !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

    console.log("Form validation:", {
      merchantName: merchantName.trim(),
      merchantNameValid,
      amount,
      amountValid,
      categorySelected: selectedCategory?.name,
      categoryId: selectedCategory?.id,
    });

    return merchantNameValid && amountValid;
  };

  const renderBatchItem = ({ item }: { item: BatchUploadItem }) => {
    const isSelected = selectedBatchItems.includes(item.id);

    const getStatusIcon = () => {
      switch (item.status) {
        case "pending":
          return "time-outline";
        case "processing":
          return "hourglass";
        case "completed":
          return "checkmark-circle";
        case "error":
          return "close-circle";
        default:
          return "help-circle";
      }
    };

    const getStatusColor = () => {
      switch (item.status) {
        case "pending":
          return theme.colors.onSurface;
        case "processing":
          return theme.colors.primary;
        case "completed":
          return theme.colors.success;
        case "error":
          return theme.colors.error;
        default:
          return theme.colors.onSurface;
      }
    };

    return (
      <Card style={styles.batchItemCard}>
        <Card.Content style={styles.batchItemContent}>
          {/* Add checkbox for completed items */}
          {item.status === "completed" && (
            <TouchableOpacity
              onPress={() => {
                if (isSelected) {
                  setSelectedBatchItems((prev) =>
                    prev.filter((id) => id !== item.id)
                  );
                } else {
                  setSelectedBatchItems((prev) => [...prev, item.id]);
                }
              }}
              style={{ marginRight: spacing.sm }}
            >
              <Ionicons
                name={isSelected ? "checkbox" : "square-outline"}
                size={24}
                color={theme.colors.primary}
              />
            </TouchableOpacity>
          )}

          <Image source={{ uri: item.uri }} style={styles.batchItemImage} />
          <View style={styles.batchItemInfo}>
            <View style={styles.batchItemHeader}>
              <Text style={styles.batchItemTitle}>
                {item.result?.receipt_data?.merchant_name ||
                  `Receipt ${batchItems.indexOf(item) + 1}`}
              </Text>
              <Ionicons
                name={getStatusIcon() as any}
                size={20}
                color={getStatusColor()}
              />
            </View>

            {item.status === "processing" && (
              <ProgressBar
                progress={item.progress / 100}
                color={theme.colors.primary}
                style={styles.batchItemProgress}
              />
            )}

            {item.status === "completed" && item.result && (
              <Text style={styles.batchItemAmount}>
                ${item.result.receipt_data.total_amount?.toFixed(2) || "0.00"}
              </Text>
            )}

            {item.status === "error" && (
              <Text style={styles.batchItemError}>
                {item.error || "Processing failed"}
              </Text>
            )}
          </View>
        </Card.Content>
      </Card>
    );
  };

  // Batch upload functions (simplified for this example)
  const openBatchUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please grant camera roll permissions to select multiple images."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 1,
    });

    if (!result.canceled && result.assets.length > 0) {
      const items: BatchUploadItem[] = result.assets.map((asset, index) => ({
        id: `batch-${Date.now()}-${index}`,
        uri: asset.uri,
        status: "pending",
        progress: 0,
      }));

      setBatchItems(items);
      setShowBatchUpload(true);
    }
  };

  const processBatchUpload = async () => {
    setBatchProcessing(true);
    setBatchProgress(0);

    const totalItems = batchItems.length;
    let completedItems = 0;
    let successfulCount = 0; // Track success count
    let failedCount = 0; // Track failed count

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];

      // Update status to processing
      setBatchItems((prev) =>
        prev.map((prevItem) =>
          prevItem.id === item.id
            ? { ...prevItem, status: "processing", progress: 0 }
            : prevItem
        )
      );

      try {
        // Process the image
        const result = await processReceiptImage(item.uri);

        // // Create receipt data from AI result
        // const receiptData = {
        //   title: result.receipt_data.merchant_name || `Receipt ${i + 1}`,
        //   amount: result.receipt_data.total_amount || 0,
        //   description: `Auto-imported receipt (${Math.round(result.average_confidence * 100)}% confidence)`,
        //   category: categories[0].name, // Default category
        //   categoryId: categories[0].id,
        //   date: result.receipt_data.transaction_date
        //     ? new Date(result.receipt_data.transaction_date).toISOString()
        //     : new Date().toISOString(),
        //   imageUri: result.cloudinary_url || item.uri,
        // };

        // // Save the receipt
        // const savedReceipt = await addReceipt(
        //   receiptData,
        //   result.receipt_data.items || [],
        //   result
        // );

        // Update status to completed
        setBatchItems((prev) =>
          prev.map((prevItem) =>
            prevItem.id === item.id
              ? {
                  ...prevItem,
                  status: "completed",
                  progress: 100,
                  result,
                  // receipt: savedReceipt
                }
              : prevItem
          )
        );
        successfulCount++; // Increment here
      } catch (error) {
        console.error(`Error processing batch item ${i}:`, error);

        // Update status to error
        setBatchItems((prev) =>
          prev.map((prevItem) =>
            prevItem.id === item.id
              ? {
                  ...prevItem,
                  status: "error",
                  progress: 0,
                  error:
                    error instanceof Error
                      ? error.message
                      : "Processing failed",
                }
              : prevItem
          )
        );
        failedCount++; // Increment here
      }

      completedItems++;
      setBatchProgress(completedItems / totalItems);
    }

    setBatchProcessing(false);

    // Show completion summary
    const successful = batchItems.filter(
      (item) => item.status === "completed"
    ).length;
    const failed = batchItems.filter((item) => item.status === "error").length;

    Alert.alert(
      "Batch Processing Complete",
      `Successfully processed: ${successfulCount}\nFailed: ${failedCount}`,
      [{ text: "OK" }]
    );
  };

  const handleBatchCancel = () => {
    const unsavedCompletedItems = batchItems.filter(
      (item) => item.status === "completed"
    );

    if (unsavedCompletedItems.length > 0) {
      Alert.alert(
        "Unsaved Receipts",
        `You have ${unsavedCompletedItems.length} processed receipts that haven't been saved. Are you sure you want to close?`,
        [
          { text: "Keep Open", style: "cancel" },
          {
            text: "Close Anyway",
            style: "destructive",
            onPress: () => {
              setShowBatchUpload(false);
              setBatchItems([]);
              setSelectedBatchItems([]);
            },
          },
        ]
      );
    } else {
      setShowBatchUpload(false);
      setBatchItems([]);
      setSelectedBatchItems([]);
    }
  };

  const saveSelectedReceipts = async () => {
    const selectedItems = batchItems.filter(
      (item) =>
        selectedBatchItems.includes(item.id) && item.status === "completed"
    );

    if (selectedItems.length === 0) {
      Alert.alert("No Selection", "Please select receipts to save.");
      return;
    }
    try {
      for (const item of selectedItems) {
        if (item.result) {
          const receiptData = {
            title: item.result.receipt_data.merchant_name || `Receipt`,
            amount: item.result.receipt_data.total_amount || 0,
            description: `Auto-imported receipt (${Math.round(
              item.result.average_confidence * 100
            )}% confidence)`,
            category: categories[0].name,
            categoryId: categories[0].id,
            date: item.result.receipt_data.transaction_date
              ? new Date(
                  item.result.receipt_data.transaction_date
                ).toISOString()
              : new Date().toISOString(),
            imageUri: item.result.cloudinary_url || item.uri,
          };

          await addReceipt(
            receiptData,
            item.result.receipt_data.items || [],
            item.result
          );
        }
      }

      Alert.alert("Success", `Saved ${selectedItems.length} receipts!`);
      // Only remove the saved items, keep the rest
      setBatchItems((prev) =>
        prev.filter((item) => !selectedBatchItems.includes(item.id))
      );
      // Clear only the selected items from selection
      setSelectedBatchItems([]);
      // DON'T close the modal if there are still items left
      const remainingItems = batchItems.filter(
        (item) => !selectedBatchItems.includes(item.id)
      );
      if (remainingItems.length === 0) {
        // Only close modal if no items left
        setShowBatchUpload(false);
        setBatchItems([]);
      }
    } catch (error) {
      console.error("Error saving receipts:", error);
      Alert.alert("Error", "Failed to save some receipts");
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    // Date picker modal styles for iOS
    datePickerModalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    datePickerModalContent: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: borderRadius.xl,
      borderTopRightRadius: borderRadius.xl,
      paddingBottom: Platform.OS === "ios" ? 34 : spacing.lg, // Account for safe area
    },
    datePickerHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "30",
    },
    datePickerTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    datePickerCancelButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    datePickerCancelText: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    datePickerDoneButton: {
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    datePickerDoneText: {
      fontSize: 16,
      color: theme.colors.primary,
      fontWeight: "600",
    },
    datePickerIOS: {
      height: 200,
      backgroundColor: theme.colors.surface,
    },

    // Enhanced date button styles
    // dateButton: {
    //   flexDirection: "row",
    //   alignItems: "center",
    //   backgroundColor: theme.colors.surface,
    //   padding: spacing.md,
    //   borderRadius: borderRadius.md,
    //   borderWidth: 1,
    //   borderColor: theme.colors.outline,
    //   minHeight: 56, // Match TextInput height
    // },
    // dateText: {
    //   fontSize: 16,
    //   color: theme.colors.text,
    //   marginLeft: spacing.sm,
    //   flex: 1,
    // },
    header: {
      paddingTop: 60,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: theme.colors.primary,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    headerTitle: {
      fontSize: 24,
      fontWeight: "bold",
      color: "white",
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    formCard: {
      elevation: 2,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
    },
    input: {
      marginBottom: spacing.md,
    },
    categorySection: {
      marginBottom: spacing.lg,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    categoryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    categoryChip: {
      marginRight: spacing.sm,
      marginBottom: spacing.sm,
    },
    dateSection: {
      marginBottom: spacing.lg,
    },
    dateButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
    },
    dateText: {
      fontSize: 16,
      color: isDarkMode ? "#FFFFFF" : "#000000",
      marginLeft: spacing.sm,
    },
    imageSection: {
      marginBottom: spacing.lg,
    },
    imageButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: theme.colors.surface,
      padding: spacing.lg,
      borderRadius: borderRadius.md,
      borderWidth: 2,
      borderColor: theme.colors.outline,
      borderStyle: "dashed",
    },
    imageButtonText: {
      fontSize: 16,
      color: theme.colors.primary,
      marginLeft: spacing.sm,
      fontWeight: "500",
    },
    selectedImage: {
      width: "100%",
      height: 200,
      borderRadius: borderRadius.md,
      marginTop: spacing.md,
    },
    extractDataButton: {
      marginTop: spacing.md,
      backgroundColor: theme.colors.primary,
    },
    processingContainer: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: theme.colors.primary + "10",
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    processingProgressBar: {
      marginBottom: spacing.sm,
      height: 6,
      borderRadius: 3,
    },
    processingText: {
      textAlign: "center",
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    processingSubtext: {
      textAlign: "center",
      fontSize: 14,
      color: theme.colors.onSurface,
      fontStyle: "italic",
    },
    uploadStatus: {
      textAlign: "center",
      color: theme.colors.onSurface,
      fontSize: 14,
      marginTop: spacing.sm,
      fontStyle: "italic",
    },
    uploadSuccess: {
      textAlign: "center",
      color: theme.colors.success,
      fontSize: 14,
      marginTop: spacing.sm,
      fontWeight: "500",
    },
    itemsFormSection: {
      marginBottom: spacing.lg,
    },
    itemsContainer: {
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + "30",
    },
    itemFormRow: {
      flexDirection: "row",
      gap: spacing.sm,
      marginBottom: spacing.md,
      alignItems: "flex-end",
    },
    itemNameInput: {
      flex: 3,
    },
    itemQuantityInput: {
      flex: 1,
    },
    itemPriceInput: {
      flex: 2,
    },
    removeItemButton: {
      justifyContent: "center",
      alignItems: "center",
      padding: spacing.sm,
      backgroundColor: theme.colors.error + "20",
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    itemActions: {
      flexDirection: "row",
      justifyContent: "center",
      marginTop: spacing.sm,
    },
    addItemButton: {
      flex: 1,
    },
    buttonContainer: {
      marginTop: spacing.lg,
    },
    saveButton: {
      marginBottom: spacing.md,
    },
    cancelButton: {
      marginBottom: spacing.sm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    // AI Results Card Styles
    aiResultsCard: {
      marginBottom: spacing.md,
      backgroundColor: theme.colors.primary + "10",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    aiResultsHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    aiResultsTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginLeft: spacing.sm,
      flex: 1,
    },
    aiConfidenceText: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "bold",
    },
    aiResultsContent: {
      marginBottom: spacing.md,
    },
    aiResultRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      marginBottom: spacing.sm,
    },
    aiResultLabel: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: "500",
    },
    aiResultValue: {
      fontSize: 14,
      color: theme.colors.text,
    },
    aiResultValueContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    aiConfidencePercentage: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "bold",
      backgroundColor: theme.colors.primary + "20",
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    aiSection: {
      marginBottom: spacing.lg,
    },
    aiSectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    aiSectionTitle: {
      fontSize: 14,
      fontWeight: "bold",
      marginLeft: spacing.sm,
    },
    aiSectionContent: {
      borderRadius: borderRadius.md,
      padding: spacing.md,
      borderWidth: 1,
      borderColor: "rgba(0,0,0,0.1)",
    },
    itemRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    itemDetails: {
      flex: 1,
      marginRight: spacing.sm,
    },
    itemName: {
      fontSize: 13,
      color: theme.colors.text,
      fontWeight: "600",
      marginBottom: 2,
    },
    itemQuantity: {
      fontSize: 11,
      color: theme.colors.onSurface,
      fontStyle: "italic",
    },
    itemPrice: {
      fontSize: 13,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    moreItemsText: {
      fontSize: 12,
      color: theme.colors.onSurface,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: spacing.xs,
    },
    // OCR Raw Data Card Styles
    ocrRawDataCard: {
      marginBottom: spacing.md,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.outline + "50",
    },
    ocrRawDataHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
      paddingBottom: spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "30",
    },
    ocrRawDataTitle: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
      marginLeft: spacing.sm,
      flex: 1,
    },
    ocrDataCount: {
      fontSize: 12,
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.onSurface + "20",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
    },
    ocrScrollContainer: {
      maxHeight: 300,
      marginBottom: spacing.md,
    },
    ocrTextBlock: {
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.sm,
      padding: spacing.sm,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.outline + "30",
    },
    ocrTextHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    ocrTextIndex: {
      fontSize: 12,
      fontWeight: "600",
      color: theme.colors.onSurface,
      backgroundColor: theme.colors.onSurface + "20",
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
      minWidth: 30,
      textAlign: "center",
    },
    ocrConfidenceBadge: {
      paddingHorizontal: spacing.xs,
      paddingVertical: 2,
      borderRadius: borderRadius.sm,
    },
    ocrConfidenceText: {
      color: "white",
      fontSize: 10,
      fontWeight: "bold",
    },
    ocrTextContent: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
      fontStyle: "italic",
    },
    noOcrData: {
      textAlign: "center",
      color: theme.colors.onSurface,
      fontStyle: "italic",
      padding: spacing.lg,
    },
    ocrStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: spacing.sm,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + "30",
    },
    ocrStatItem: {
      alignItems: "center",
    },
    ocrStatLabel: {
      fontSize: 12,
      color: theme.colors.onSurface,
      marginBottom: 2,
    },
    ocrStatValue: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
    },
    // Batch upload styles (simplified)
    batchUploadTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    contentContainerStyle: {
      padding: spacing.lg,
    },
    batchUploadProgress: {
      marginVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    batchProgressText: {
      textAlign: "center",
      marginTop: spacing.sm,
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    batchActionButton: {
      flex: 1,
      marginHorizontal: spacing.xs,
      borderRadius: borderRadius.md,
    },
    batchUploadActions: {
      flexDirection: "row",
      padding: spacing.lg,
      gap: spacing.md,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
    },

    batchItemCard: {
      marginBottom: spacing.sm,
      marginHorizontal: spacing.lg,
    },

    batchItemContent: {
      flexDirection: "row",
      alignItems: "center",
    },

    batchItemImage: {
      width: 60,
      height: 60,
      borderRadius: borderRadius.sm,
      marginRight: spacing.md,
    },

    batchItemInfo: {
      flex: 1,
    },

    batchItemHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },

    batchItemTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      flex: 1,
    },

    batchItemProgress: {
      marginVertical: spacing.xs,
    },

    batchItemAmount: {
      fontSize: 14,
      fontWeight: "bold",
      color: theme.colors.primary,
    },

    batchItemError: {
      fontSize: 12,
      color: theme.colors.error,
      fontStyle: "italic",
    },
    batchUploadModal: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },

    batchUploadHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      padding: spacing.lg,
      paddingTop: spacing.sm, // Less top padding since SafeAreaView handles it
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline,
    },
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Add New Receipt</Text>
          </View>
          <Text style={styles.headerSubtitle}>Track your expenses</Text>
        </View>

        <View style={styles.content}>
          <Card style={styles.formCard}>
            <Card.Content>
              {/* Show AI Results after processing */}
              {processingResult && (
                <>
                  {/* AI Extracted Data Card */}
                  <Card style={styles.aiResultsCard}>
                    <Card.Content>
                      <View style={styles.aiResultsHeader}>
                        <Ionicons
                          name="sparkles"
                          size={20}
                          color={theme.colors.primary}
                        />
                        <Text style={styles.aiResultsTitle}>
                          AI Extracted Data
                        </Text>
                        {/* <Text style={styles.aiConfidenceText}>
                          {Math.round(
                            processingResult.average_confidence * 100
                          )}
                          % confidence
                        </Text> */}
                      </View>

                      <View style={styles.aiResultsContent}>
                        {/* Merchant Information Section */}
                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHeader}>
                            <Ionicons
                              name="storefront"
                              size={16}
                              color="#3b82f6"
                            />
                            <Text
                              style={[
                                styles.aiSectionTitle,
                                { color: "#3b82f6" },
                              ]}
                            >
                              Merchant Information
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.aiSectionContent,
                              { backgroundColor: "#eff6ff" },
                            ]}
                          >
                            <View style={styles.aiResultRow}>
                              <Text style={styles.aiResultLabel}>Name:</Text>
                              <View style={styles.aiResultValueContainer}>
                                <Text style={styles.aiResultValue}>
                                  {processingResult.receipt_data
                                    .merchant_name || "Not detected"}
                                </Text>
                                {processingResult.receipt_data
                                  .merchant_name && (
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .merchant_name_confidence * 100
                                    )}
                                    %
                                  </Text>
                                )}
                              </View>
                            </View>
                            {processingResult.receipt_data.merchant_address && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Address:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {
                                      processingResult.receipt_data
                                        .merchant_address
                                    }
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .merchant_address_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.merchant_phone && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>Phone:</Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {
                                      processingResult.receipt_data
                                        .merchant_phone
                                    }
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .merchant_phone_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Financial Information Section */}
                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHeader}>
                            <Ionicons name="cash" size={16} color="#10b981" />
                            <Text
                              style={[
                                styles.aiSectionTitle,
                                { color: "#10b981" },
                              ]}
                            >
                              Financial Details
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.aiSectionContent,
                              { backgroundColor: "#ecfdf5" },
                            ]}
                          >
                            <View style={styles.aiResultRow}>
                              <Text style={styles.aiResultLabel}>
                                Total Amount:
                              </Text>
                              <View style={styles.aiResultValueContainer}>
                                <Text
                                  style={[
                                    styles.aiResultValue,
                                    { fontWeight: "bold", color: "#10b981" },
                                  ]}
                                >
                                  $
                                  {processingResult.receipt_data.total_amount ||
                                    "0.00"}
                                </Text>
                                {processingResult.receipt_data.total_amount && (
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .total_amount_confidence * 100
                                    )}
                                    %
                                  </Text>
                                )}
                              </View>
                            </View>
                            {processingResult.receipt_data.subtotal && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Subtotal:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    $
                                    {processingResult.receipt_data.subtotal.toFixed(
                                      2
                                    )}
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .subtotal_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.tax_gst && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>GST:</Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    $
                                    {processingResult.receipt_data.tax_gst.toFixed(
                                      2
                                    )}
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .tax_gst_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.tax_qst && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>QST:</Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    $
                                    {processingResult.receipt_data.tax_qst.toFixed(
                                      2
                                    )}
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .tax_qst_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.total_tax && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Total Tax:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    $
                                    {processingResult.receipt_data.total_tax.toFixed(
                                      2
                                    )}
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .total_tax_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Transaction Information Section */}
                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHeader}>
                            <Ionicons
                              name="receipt"
                              size={16}
                              color="#f59e0b"
                            />
                            <Text
                              style={[
                                styles.aiSectionTitle,
                                { color: "#f59e0b" },
                              ]}
                            >
                              Transaction Details
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.aiSectionContent,
                              { backgroundColor: "#fffbeb" },
                            ]}
                          >
                            <View style={styles.aiResultRow}>
                              <Text style={styles.aiResultLabel}>Date:</Text>
                              <View style={styles.aiResultValueContainer}>
                                <Text style={styles.aiResultValue}>
                                  {processingResult.receipt_data
                                    .transaction_date
                                    ? new Date(
                                        processingResult.receipt_data.transaction_date
                                      )
                                        .toISOString()
                                        .split("T")[0]
                                    : "Not detected"}
                                </Text>
                                {processingResult.receipt_data
                                  .transaction_date && (
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .transaction_date_confidence * 100
                                    )}
                                    %
                                  </Text>
                                )}
                              </View>
                            </View>
                            {processingResult.receipt_data.transaction_time && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>Time:</Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {
                                      processingResult.receipt_data
                                        .transaction_time
                                    }
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .transaction_time_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.transaction_id && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Transaction ID:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {
                                      processingResult.receipt_data
                                        .transaction_id
                                    }
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .transaction_id_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.order_number && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Order Number:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {processingResult.receipt_data.order_number}
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .order_number_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                            {processingResult.receipt_data.payment_method && (
                              <View style={styles.aiResultRow}>
                                <Text style={styles.aiResultLabel}>
                                  Payment Method:
                                </Text>
                                <View style={styles.aiResultValueContainer}>
                                  <Text style={styles.aiResultValue}>
                                    {
                                      processingResult.receipt_data
                                        .payment_method
                                    }
                                  </Text>
                                  <Text style={styles.aiConfidencePercentage}>
                                    {Math.round(
                                      processingResult.receipt_data
                                        .payment_method_confidence * 100
                                    )}
                                    %
                                  </Text>
                                </View>
                              </View>
                            )}
                          </View>
                        </View>

                        {/* Processing Information */}
                        <View style={styles.aiSection}>
                          <View style={styles.aiSectionHeader}>
                            <Ionicons name="time" size={16} color="#8b5cf6" />
                            <Text
                              style={[
                                styles.aiSectionTitle,
                                { color: "#8b5cf6" },
                              ]}
                            >
                              Processing Info
                            </Text>
                          </View>
                          <View
                            style={[
                              styles.aiSectionContent,
                              { backgroundColor: "#f3e8ff" },
                            ]}
                          >
                            <View style={styles.aiResultRow}>
                              <Text style={styles.aiResultLabel}>
                                Processing Time:
                              </Text>
                              <Text style={styles.aiResultValue}>
                                {processingResult.processing_time_seconds?.toFixed(
                                  1
                                )}
                                s
                              </Text>
                            </View>
                          </View>
                        </View>

                        {/* Items Section */}
                        {processingResult.receipt_data.items &&
                          processingResult.receipt_data.items.length > 0 && (
                            <View style={styles.aiSection}>
                              <View style={styles.aiSectionHeader}>
                                <Ionicons
                                  name="bag"
                                  size={16}
                                  color="#ef4444"
                                />
                                <Text
                                  style={[
                                    styles.aiSectionTitle,
                                    { color: "#ef4444" },
                                  ]}
                                >
                                  Items (
                                  {processingResult.receipt_data.items.length})
                                </Text>
                              </View>
                              <View
                                style={[
                                  styles.aiSectionContent,
                                  { backgroundColor: "#fef2f2" },
                                ]}
                              >
                                {processingResult.receipt_data.items
                                  .slice(0, 5)
                                  .map((item, index) => (
                                    <View key={index} style={styles.itemRow}>
                                      <View style={styles.itemDetails}>
                                        <Text
                                          style={styles.itemName}
                                          numberOfLines={1}
                                        >
                                          {item.name}
                                        </Text>
                                        <Text style={styles.itemQuantity}>
                                          Qty: {item.quantity || 1} × $
                                          {(item.unit_price || 0).toFixed(2)}
                                        </Text>
                                      </View>
                                      <Text
                                        style={[
                                          styles.itemPrice,
                                          { color: "#ef4444" },
                                        ]}
                                      >
                                        $
                                        {(
                                          item.total_price ||
                                          item.price ||
                                          0
                                        ).toFixed(2)}
                                      </Text>
                                    </View>
                                  ))}
                                {processingResult.receipt_data.items.length >
                                  5 && (
                                  <Text style={styles.moreItemsText}>
                                    +
                                    {processingResult.receipt_data.items
                                      .length - 5}{" "}
                                    more items
                                  </Text>
                                )}
                              </View>
                            </View>
                          )}
                      </View>
                    </Card.Content>
                  </Card>

                  {/* OCR Raw Data Card */}
                  <Card style={styles.ocrRawDataCard}>
                    <Card.Content>
                      <TouchableOpacity
                        style={styles.ocrRawDataHeader}
                        onPress={() => setShowOcrData(!showOcrData)}
                      >
                        <Ionicons
                          name="eye"
                          size={20}
                          color={theme.colors.onSurface}
                        />
                        <Text style={styles.ocrRawDataTitle}>OCR Raw Data</Text>
                        <Text style={styles.ocrDataCount}>
                          {processingResult.raw_ocr_text?.length || 0} text
                          blocks
                        </Text>
                        <Ionicons
                          name={showOcrData ? "chevron-up" : "chevron-down"}
                          size={20}
                          color={theme.colors.onSurface}
                        />
                      </TouchableOpacity>

                      {showOcrData && (
                        <>
                          <ScrollView
                            style={styles.ocrScrollContainer}
                            showsVerticalScrollIndicator={true}
                            nestedScrollEnabled={true}
                          >
                            {processingResult.raw_ocr_text?.map(
                              (text, index) => {
                                const confidence =
                                  processingResult.ocr_confidence_scores?.[
                                    index
                                  ] || 0;

                                return (
                                  <View key={index} style={styles.ocrTextBlock}>
                                    <View style={styles.ocrTextHeader}>
                                      <Text style={styles.ocrTextIndex}>
                                        #{index + 1}
                                      </Text>
                                      <View
                                        style={[
                                          styles.ocrConfidenceBadge,
                                          {
                                            backgroundColor:
                                              confidence >= 0.9
                                                ? theme.colors.success
                                                : confidence >= 0.7
                                                ? "#f59e0b"
                                                : theme.colors.error,
                                          },
                                        ]}
                                      >
                                        <Text style={styles.ocrConfidenceText}>
                                          {Math.round(confidence * 100)}%
                                        </Text>
                                      </View>
                                    </View>
                                    <Text style={styles.ocrTextContent}>
                                      "{text}"
                                    </Text>
                                  </View>
                                );
                              }
                            )}

                            {(!processingResult.raw_ocr_text ||
                              processingResult.raw_ocr_text.length === 0) && (
                              <Text style={styles.noOcrData}>
                                No OCR text data available
                              </Text>
                            )}
                          </ScrollView>

                          <View style={styles.ocrStats}>
                            <View style={styles.ocrStatItem}>
                              <Text style={styles.ocrStatLabel}>
                                Avg Confidence:
                              </Text>
                              <Text style={styles.ocrStatValue}>
                                {Math.round(
                                  (processingResult.average_confidence || 0) *
                                    100
                                )}
                                %
                              </Text>
                            </View>
                            <View style={styles.ocrStatItem}>
                              <Text style={styles.ocrStatLabel}>
                                Processing Time:
                              </Text>
                              <Text style={styles.ocrStatValue}>
                                {processingResult.processing_time_seconds?.toFixed(
                                  1
                                )}
                                s
                              </Text>
                            </View>
                          </View>
                        </>
                      )}
                    </Card.Content>
                  </Card>
                </>
              )}
              {/* Image Upload Section */}
              <View style={styles.imageSection}>
                <Text style={styles.categoryTitle}>
                  Receipt Image (Optional)
                </Text>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={handleImagePicker}
                  disabled={uploadingImage}
                >
                  <Ionicons
                    name={uploadingImage ? "hourglass" : "camera"}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.imageButtonText}>
                    {uploadingImage
                      ? "Uploading..."
                      : imageUri
                      ? "Change Image"
                      : "Upload Receipt Image"}
                  </Text>
                </TouchableOpacity>

                {imageUri && (
                  <>
                    <TouchableOpacity
                      onPress={() => {
                        // Show full screen image when tapped
                        Alert.alert("Receipt Image", "Image preview", [
                          { text: "Close", style: "cancel" },
                        ]);
                      }}
                    >
                      <Image
                        source={{ uri: imageUri }}
                        style={styles.selectedImage}
                      />
                    </TouchableOpacity>

                    {/* Show upload status */}
                    {uploadingImage && (
                      <Text style={styles.uploadStatus}>
                        Uploading to cloud storage...
                      </Text>
                    )}

                    {/* Show extract data button when image is uploaded */}
                    {cloudinaryUrl && !uploadingImage && (
                      <>
                        <Text style={styles.uploadSuccess}>
                          ✅ Image uploaded successfully!
                        </Text>
                        <Button
                          mode="contained"
                          onPress={extractDataFromImage}
                          disabled={processingImage}
                          loading={processingImage}
                          style={styles.extractDataButton}
                          icon={processingImage ? "hourglass" : "sparkles"}
                        >
                          {processingImage
                            ? "Extracting Data..."
                            : "Extract Data from Image"}
                        </Button>

                        {/* Show processing progress indicator */}
                        {processingImage && (
                          <View style={styles.processingContainer}>
                            <ProgressBar
                              indeterminate
                              color={theme.colors.primary}
                              style={styles.processingProgressBar}
                            />
                            <Text style={styles.processingText}>
                              🤖 AI is analyzing your receipt...
                            </Text>
                            <Text style={styles.processingSubtext}>
                              This may take a few seconds
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </>
                )}
              </View>

              {/* Form Fields - Always Visible */}
              <TextInput
                label="Merchant Name *"
                value={merchantName}
                onChangeText={setMerchantName}
                mode="outlined"
                style={styles.input}
                left={<TextInput.Icon icon="store" />}
              />

              <TextInput
                label="Total Amount *"
                value={amount}
                onChangeText={setAmount}
                mode="outlined"
                keyboardType="numeric"
                style={styles.input}
                left={<TextInput.Icon icon="currency-usd" />}
              />

              <View style={styles.categorySection}>
                <Text style={styles.categoryTitle}>Category</Text>
                <View style={styles.categoryGrid}>
                  {categories.map((category) => (
                    <Chip
                      key={category.id}
                      selected={selectedCategory.id === category.id}
                      onPress={() => setSelectedCategory(category)}
                      style={styles.categoryChip}
                      icon={category.icon}
                    >
                      {category.name}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.dateSection}>
                <Text style={styles.categoryTitle}>Date</Text>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Ionicons
                    name="calendar"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <Text style={[styles.dateText]}>{date.toString()}</Text>
                </TouchableOpacity>
              </View>

              {/* Items Section */}
              <View style={styles.itemsFormSection}>
                <Text style={styles.categoryTitle}>Items ({items.length})</Text>
                <View style={styles.itemsContainer}>
                  {items.map((item, index) => (
                    <View key={index} style={styles.itemFormRow}>
                      <TextInput
                        label={`Item ${index + 1} Name`}
                        value={item.name || ""}
                        onChangeText={(text) => {
                          const updatedItems = [...items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            name: text,
                          };
                          setItems(updatedItems);
                        }}
                        mode="outlined"
                        style={styles.itemNameInput}
                        dense
                      />
                      <TextInput
                        label="Qty"
                        value={(item.quantity || 1).toString()}
                        onChangeText={(text) => {
                          const updatedItems = [...items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            quantity: parseInt(text) || 1,
                          };
                          setItems(updatedItems);
                        }}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.itemQuantityInput}
                        dense
                      />
                      <TextInput
                        label="Price"
                        value={(item.total_price || item.price || 0).toString()}
                        onChangeText={(text) => {
                          const updatedItems = [...items];
                          updatedItems[index] = {
                            ...updatedItems[index],
                            price: parseFloat(text) || 0,
                            total_price: parseFloat(text) || 0,
                          };
                          setItems(updatedItems);
                        }}
                        mode="outlined"
                        keyboardType="numeric"
                        style={styles.itemPriceInput}
                        dense
                      />
                      <TouchableOpacity
                        onPress={() => {
                          const updatedItems = items.filter(
                            (_, i) => i !== index
                          );
                          setItems(updatedItems);
                        }}
                        style={styles.removeItemButton}
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color={theme.colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}

                  <View style={styles.itemActions}>
                    <Button
                      mode="outlined"
                      onPress={() =>
                        setItems([
                          ...items,
                          { name: "", quantity: 1, price: 0, total_price: 0 },
                        ])
                      }
                      style={styles.addItemButton}
                      icon="plus"
                      compact
                    >
                      Add Item
                    </Button>
                  </View>
                </View>
              </View>

              <TextInput
                label="Description (Optional)"
                value={description}
                onChangeText={setDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                left={<TextInput.Icon icon="text" />}
              />

              <View style={styles.buttonContainer}>
                <Button
                  mode="contained"
                  onPress={handleSave}
                  disabled={loading || !isFormValid()}
                  style={[
                    styles.saveButton,
                    !isFormValid() && styles.saveButtonDisabled,
                  ]}
                  loading={loading}
                >
                  {loading ? "Saving..." : "Save Receipt"}
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => navigation.goBack()}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </View>
            </Card.Content>
          </Card>
        </View>
      </ScrollView>

      {showDatePicker && Platform.OS === "ios" && (
        <Modal
          visible={showDatePicker}
          transparent={true}
          animationType="slide"
        >
          <View
            style={{
              flex: 1,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              justifyContent: "flex-end",
            }}
          >
            <View
              style={{
                backgroundColor: "#FFFFFF",
                borderTopLeftRadius: 20,
                borderTopRightRadius: 20,
                paddingBottom: 34,
              }}
            >
              {/* Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 16,
                  paddingVertical: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: "#E5E7EB",
                }}
              >
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text style={{ fontSize: 16, color: "#6B7280" }}>Cancel</Text>
                </TouchableOpacity>
                <Text
                  style={{ fontSize: 18, fontWeight: "600", color: "#1F2937" }}
                >
                  Select Date
                </Text>
                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                  <Text
                    style={{
                      fontSize: 16,
                      color: "#3B82F6",
                      fontWeight: "600",
                    }}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Date Picker Container - This was missing! */}
              <View
                style={{
                  height: 250,
                  backgroundColor: "#FFFFFF",
                  paddingHorizontal: 20,
                  paddingVertical: 10,
                }}
              >
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="spinner"
                  onChange={(event, selectedDate) => {
                    if (selectedDate) {
                      setDate(selectedDate);
                    }
                  }}
                  maximumDate={new Date()}
                  style={{
                    height: 220,
                    backgroundColor: "transparent",
                  }}
                  textColor="#000000"
                  accentColor="#3B82F6"
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      <Portal>
        <Modal
          visible={showBatchUpload}
          onDismiss={() => !batchProcessing && setShowBatchUpload(false)}
          contentContainerStyle={styles.batchUploadModal}
        >
          <SafeAreaView style={{ flex: 1 }}>
            <View style={styles.batchUploadHeader}>
              <Text style={styles.batchUploadTitle}>
                Batch Upload ({batchItems.length} receipts)
              </Text>
              {!batchProcessing && (
                <TouchableOpacity onPress={() => setShowBatchUpload(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>
              )}
            </View>

            {batchProcessing && (
              <View style={styles.batchUploadProgress}>
                <Text style={styles.batchProgressText}>
                  Processing receipts... {Math.round(batchProgress * 100)}%
                </Text>
                <ProgressBar
                  progress={batchProgress}
                  color={theme.colors.primary}
                />
              </View>
            )}

            <FlatList
              data={batchItems}
              renderItem={renderBatchItem}
              keyExtractor={(item) => item.id}
              style={{ flex: 1 }}
            />

            <View style={styles.batchUploadActions}>
              <Button
                mode="outlined"
                onPress={handleBatchCancel} // Use the new cancel handler
                style={styles.batchActionButton}
                disabled={batchProcessing}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={processBatchUpload}
                style={styles.batchActionButton}
                loading={batchProcessing}
                disabled={batchProcessing || batchItems.length === 0}
              >
                {batchProcessing ? "Processing..." : "Process All"}
              </Button>
              {batchItems.some((item) => item.status === "completed") && (
                <Button
                  mode="contained"
                  onPress={saveSelectedReceipts}
                  style={[
                    styles.batchActionButton,
                    { backgroundColor: theme.colors.success },
                  ]}
                  disabled={selectedBatchItems.length === 0}
                >
                  Save Selected ({selectedBatchItems.length})
                </Button>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}
