import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { TextInput, Button, Card, Chip } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import DateTimePicker from "@react-native-community/datetimepicker";
import { ActionSheetIOS } from "react-native";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";
import { useEffect } from "react";
import { Item } from "../services/api";
import { useFocusEffect } from "@react-navigation/native";

// Import the upload function from your API service
const uploadToCloudinary = async (imageUri: string) => {
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

export default function EditReceiptScreen({ route, navigation }) {
  const { receipt } = route.params;
  const { updateReceipt, categories } = useDatabase();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [merchantName, setMerchantName] = useState(receipt.merchantName);
  const [amount, setAmount] = useState(receipt.amount.toString());
  const [description, setDescription] = useState(receipt.description || "");
  const [selectedCategory, setSelectedCategory] = useState(
    categories.find((cat) => cat.id === receipt.categoryId) || categories[0]
  );
  const [date, setDate] = useState(new Date(receipt.date));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(
    receipt.imageUri || null
  );
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [items, setItems] = useState<Item[]>([]);
  const { receipts, loadReceipts } = useDatabase(); // Make sure loadReceipts is exposed

  useFocusEffect(
    React.useCallback(() => {
      console.log("HomeScreen focused - refreshing data");
      loadReceipts(); // This should reload from the API
    }, [])
  );

  useEffect(() => {
    // Initialize items from receipt data
    // You might need to fetch items from your database or they might be stored in the receipt object
    // For now, let's assume items are stored in receipt.items or we need to fetch them
    console.log("sdfsdfsdfsdfs---    ", receipt);

    if (receipt.items) {
      setItems(receipt.items);
    } else {
      // If no items, start with empty array
      setItems([]);
    }
  }, [receipt]);

  // Enhanced validation function
  const validateForm = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!merchantName.trim()) {
      newErrors.merchantName = "Merchant name is required";
    }

    if (!amount.trim()) {
      newErrors.amount = "Amount is required";
    } else {
      const numericAmount = parseFloat(amount);
      if (isNaN(numericAmount) || numericAmount <= 0) {
        newErrors.amount = "Please enter a valid amount greater than 0";
      }
    }

    if (!selectedCategory) {
      newErrors.category = "Please select a category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Enhanced image picker with remove option
  const handleImagePicker = async () => {
    try {
      if (Platform.OS === "ios") {
        const options = ["Cancel", "Take Photo", "Choose from Gallery"];
        if (imageUri) {
          options.push("Remove Image");
        }

        ActionSheetIOS.showActionSheetWithOptions(
          {
            options,
            cancelButtonIndex: 0,
            destructiveButtonIndex: imageUri ? options.length - 1 : -1,
          },
          (buttonIndex) => {
            if (buttonIndex === 1) {
              openCamera();
            } else if (buttonIndex === 2) {
              openGallery();
            } else if (buttonIndex === 3 && imageUri) {
              setImageUri(null);
            }
          }
        );
      } else {
        const options = [
          { text: "Cancel", style: "cancel" as const },
          { text: "Take Photo", onPress: openCamera },
          { text: "Choose from Gallery", onPress: openGallery },
        ];

        if (imageUri) {
          options.push({
            text: "Remove Image",
            onPress: () => setImageUri(null),
            style: "destructive" as const,
          });
        }

        Alert.alert("Select Image", "Choose an option", options);
      }
    } catch (error) {
      console.error("Image picker error:", error);
      Alert.alert("Error", "Failed to open image picker");
    }
  };

  const openCamera = async () => {
    try {
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
      }
    } catch (error) {
      console.error("Camera error:", error);
      Alert.alert("Error", "Failed to open camera");
    }
  };

  const openGallery = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
      }
    } catch (error) {
      console.error("Gallery error:", error);
      Alert.alert("Error", "Failed to open gallery");
    }
  };

  // Handle image upload with progress
  const handleImageUpload = async (
    localImageUri: string
  ): Promise<string | null> => {
    try {
      setImageUploading(true);

      const cloudinaryUrl = await uploadToCloudinary(localImageUri);
      console.log("Image uploaded to Cloudinary:", cloudinaryUrl);

      return cloudinaryUrl;
    } catch (error) {
      console.error("Image upload failed:", error);
      Alert.alert(
        "Warning",
        "Failed to upload image. The receipt will be saved without the image."
      );
      return null;
    } finally {
      setImageUploading(false);
    }
  };

  // Enhanced form submission with progress feedback
  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    if (!user) {
      Alert.alert("Error", "You must be logged in to update receipts");
      return;
    }

    setFormSubmitting(true);

    try {
      let finalImageUri = imageUri;

      // Handle image upload with progress
      if (imageUri && !imageUri.startsWith("http")) {
        finalImageUri = await handleImageUpload(imageUri);
      }

      const updateData = {
        merchantName: merchantName.trim(),
        amount: parseFloat(amount),
        description: description.trim(),
        category: selectedCategory.name,
        categoryId: selectedCategory.id,
        date: date.toISOString().split("T")[0],
        imageUri: finalImageUri,
        items: items,
      };

      console.log("Updating receipt with data:", updateData);

      const response = await updateReceipt(receipt.id, updateData);

      if (response && response.success) {
        // CREATE UPDATED RECEIPT OBJECT to pass back
        const updatedReceipt = {
          ...receipt,
          merchantName: updateData.merchantName,
          amount: updateData.amount,
          description: updateData.description,
          category: updateData.category,
          categoryId: updateData.categoryId,
          date: updateData.date,
          imageUri: finalImageUri,
          items: items,
          updatedAt: new Date().toISOString(),
        };

        Alert.alert(
          "Success",
          response.message || "Receipt updated successfully!",
          [
            {
              text: "OK",
              onPress: () => {
                // Navigate back with updated receipt data
                navigation.navigate({
                  name: "ReceiptDetail",
                  params: { receipt: updatedReceipt },
                  merge: true, // This merges with existing params
                });
              },
            },
          ]
        );
      } else {
        throw new Error(response?.error_message || "Update failed");
      }
    } catch (error) {
      console.error("Update receipt error:", error);

      let errorMessage = "Failed to update receipt";
      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          errorMessage = "You do not have permission to edit this receipt";
        } else if (error.message.includes("not found")) {
          errorMessage = "Receipt not found";
        } else if (
          error.message.includes("network") ||
          error.message.includes("fetch")
        ) {
          errorMessage =
            "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }

      Alert.alert("Error", errorMessage);
    } finally {
      setFormSubmitting(false);
    }
  };

  // Enhanced input component with error display
  const renderTextInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    icon: string,
    error?: string,
    ...props: any
  ) => (
    <View style={styles.inputContainer}>
      <TextInput
        label={label}
        value={value}
        onChangeText={(text) => {
          onChangeText(text);
          // Clear error when user starts typing
          if (error) {
            const errorKey = label.toLowerCase().replace(" ", "");
            setErrors((prev) => ({ ...prev, [errorKey]: "" }));
          }
        }}
        mode="outlined"
        style={[styles.input, error ? styles.inputError : null]}
        left={<TextInput.Icon icon={icon} />}
        error={!!error}
        {...props}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );

  // Enhanced save button with loading states
  const renderSaveButton = () => {
    const isLoading = formSubmitting || imageUploading;
    const loadingText = imageUploading
      ? "Uploading Image..."
      : "Updating Receipt...";

    return (
      <Button
        mode="contained"
        onPress={handleSave}
        loading={isLoading}
        disabled={isLoading}
        style={styles.saveButton}
      >
        {isLoading ? loadingText : "Update Receipt"}
      </Button>
    );
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    itemsSummary: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.md,
      marginBottom: spacing.md,
    },

    itemsSummaryTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },

    itemSummaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs,
    },

    itemSummaryName: {
      flex: 1,
      fontSize: 14,
      color: theme.colors.text,
    },

    itemSummaryDetails: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },

    itemsSummaryTotal: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline,
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
    },

    itemsSummaryTotalText: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
      textAlign: "right",
    },
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
      justifyContent: "space-between",
    },
    backButton: {
      padding: spacing.sm,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
      flex: 1,
      textAlign: "center",
    },
    placeholder: {
      width: 40,
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
    inputContainer: {
      marginBottom: spacing.md,
    },
    input: {
      marginBottom: spacing.xs,
    },
    inputError: {
      borderColor: theme.colors.error,
    },
    errorText: {
      color: theme.colors.error,
      fontSize: 12,
      marginTop: spacing.xs,
      marginLeft: spacing.sm,
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
      color: theme.colors.text,
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
    buttonContainer: {
      flexDirection: "row",
      gap: spacing.md,
    },
    saveButton: {
      flex: 1,
      borderRadius: borderRadius.lg,
    },
    cancelButton: {
      flex: 1,
      borderRadius: borderRadius.lg,
    },
    progressContainer: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      padding: spacing.md,
    },
    progressText: {
      marginLeft: spacing.sm,
      color: theme.colors.primary,
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
  });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Receipt</Text>
          <View style={styles.placeholder} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Card style={styles.formCard}>
          <Card.Content>
            <View style={styles.imageSection}>
              <Text style={styles.categoryTitle}>Receipt Image (Optional)</Text>
              <TouchableOpacity
                style={styles.imageButton}
                onPress={handleImagePicker}
                disabled={imageUploading}
              >
                <Ionicons
                  name="camera"
                  size={24}
                  color={
                    imageUploading
                      ? theme.colors.disabled
                      : theme.colors.primary
                  }
                />
                <Text
                  style={[
                    styles.imageButtonText,
                    imageUploading && { color: theme.colors.disabled },
                  ]}
                >
                  {imageUploading
                    ? "Uploading..."
                    : imageUri
                    ? "Change Image"
                    : "Add Image"}
                </Text>
              </TouchableOpacity>
              {imageUri && (
                <Image
                  source={{ uri: imageUri }}
                  style={styles.selectedImage}
                />
              )}
            </View>

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
              {errors.category && (
                <Text style={styles.errorText}>{errors.category}</Text>
              )}
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
                <Text style={styles.dateText}>
                  {date.toISOString().split("T")[0]}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ADD THIS ITEMS SECTION */}
            <View style={styles.itemsFormSection}>
              <Text style={styles.categoryTitle}>Items ({items.length})</Text>
              <View style={styles.itemsContainer}>
                {items.map((item, index) => (
                  <View key={index} style={styles.itemFormRow}>
                    <TextInput
                      label={`Item ${index + 1} Name`}
                      value={item.itemName || ""}
                      onChangeText={(text) => {
                        const updatedItems = [...items];
                        updatedItems[index] = {
                          ...updatedItems[index],
                          itemName: text,
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
                      value={(item.totalPrice || 0).toString()}
                      onChangeText={(text) => {
                        const updatedItems = [...items];
                        updatedItems[index] = {
                          ...updatedItems[index],
                          totalPrice: parseFloat(text) || 0,
                        };
                        setItems(updatedItems);
                      }}
                      mode="outlined"
                      keyboardType="numeric"
                      style={styles.itemPriceInput}
                      dense
                    />
                    {/* Individual remove button for each item */}
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

                {/* Add Item button */}
                <View style={styles.itemActions}>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      setItems([
                        ...items,
                        {
                          itemName: "",
                          quantity: 1,
                          unitPrice: 0,
                          totalPrice: 0,
                          itemId: 0,
                          receiptId: receipt.id,
                        },
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

            {renderTextInput(
              "Receipt merchant name",
              merchantName,
              setMerchantName,
              "receipt",
              errors.merchantName
            )}

            {renderTextInput(
              "Description (Optional)",
              description,
              setDescription,
              "text",
              undefined,
              { multiline: true, numberOfLines: 3 }
            )}
            {renderTextInput(
              "Amount",
              amount,
              setAmount,
              "currency-usd",
              errors.amount,
              { keyboardType: "numeric" }
            )}

            <View style={styles.buttonContainer}>
              {renderSaveButton()}
              <Button
                mode="outlined"
                onPress={() => navigation.goBack()}
                style={styles.cancelButton}
                disabled={formSubmitting || imageUploading}
              >
                Cancel
              </Button>
            </View>
          </Card.Content>
        </Card>
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
    </KeyboardAvoidingView>
  );
}
