import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { Card, Button, Chip, Divider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

export default function ReceiptDetailScreen({ route, navigation }) {
  const { receipt } = route.params;
  const { deleteReceipt, categories } = useDatabase();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [deleting, setDeleting] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const category = categories.find((cat) => cat.id === receipt.categoryId);

  const handleDelete = () => {
    Alert.alert(
      "Delete Receipt",
      "Are you sure you want to delete this receipt? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete receipts");
      return;
    }

    setDeleting(true);

    try {
      console.log("Deleting receipt:", receipt.id);

      const response = await deleteReceipt(receipt.id);

      if (response && response.success) {
        Alert.alert(
          "Success",
          response.message || "Receipt deleted successfully!",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error(response?.error_message || "Delete failed");
      }
    } catch (error) {
      console.error("Delete receipt error:", error);

      let errorMessage = "Failed to delete receipt";
      if (error instanceof Error) {
        if (error.message.includes("Access denied")) {
          errorMessage = "You do not have permission to delete this receipt";
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
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return {
      short: date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      long: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    };
  };
  const transactionDate = receipt.date;
  const createdDate = formatDate(receipt.createdAt);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 60,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.lg,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    backButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    headerActions: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    headerActionButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
    },
    content: {
      flex: 1,
    },
    heroSection: {
      backgroundColor: theme.colors.surface,
      marginHorizontal: spacing.lg,
      marginTop: -spacing.xl,
      borderRadius: borderRadius.xl,
      elevation: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      overflow: "hidden",
    },
    receiptImageContainer: {
      position: "relative",
    },
    receiptImage: {
      width: "100%",
      height: 220,
      backgroundColor: theme.colors.outline + "20",
    },
    imageOverlay: {
      position: "absolute",
      top: spacing.md,
      right: spacing.md,
      backgroundColor: "rgba(0, 0, 0, 0.6)",
      borderRadius: borderRadius.full,
      padding: spacing.sm,
    },
    noImagePlaceholder: {
      height: 120,
      backgroundColor: theme.colors.outline + "10",
      justifyContent: "center",
      alignItems: "center",
    },
    noImageText: {
      color: theme.colors.textSecondary,
      fontSize: 14,
      marginTop: spacing.sm,
    },
    heroContent: {
      padding: spacing.xl,
    },
    merchantName: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    receiptAmount: {
      fontSize: 36,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.lg,
    },
    categorySection: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.lg,
    },
    categoryChip: {
      alignSelf: "flex-start",
    },
    transactionDate: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      fontWeight: "500",
    },
    detailsSection: {
      margin: spacing.lg,
      marginTop: spacing.md,
    },
    detailsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      overflow: "hidden",
    },
    detailsHeader: {
      padding: spacing.lg,
      backgroundColor: theme.colors.primary + "08",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "20",
    },
    detailsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    detailsContent: {
      padding: spacing.lg,
    },
    detailRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
    },
    detailIcon: {
      width: 40,
      alignItems: "center",
      marginRight: spacing.md,
    },
    detailContent: {
      flex: 1,
    },
    detailLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: spacing.xs,
    },
    detailValue: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "500",
    },
    description: {
      fontSize: 16,
      color: theme.colors.text,
      lineHeight: 24,
      backgroundColor: theme.colors.outline + "10",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      fontStyle: "italic",
    },
    itemsSection: {
      margin: spacing.lg,
      marginTop: spacing.md,
    },
    itemsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    itemsHeader: {
      padding: spacing.lg,
      backgroundColor: theme.colors.secondary + "08",
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "20",
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    itemsTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
    },
    itemsCount: {
      backgroundColor: theme.colors.secondary,
      color: "white",
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.sm,
      fontSize: 12,
      fontWeight: "bold",
    },
    itemRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "10",
    },
    itemDetails: {
      flex: 1,
    },
    itemName: {
      fontSize: 16,
      color: theme.colors.text,
      fontWeight: "500",
      marginBottom: spacing.xs,
    },
    itemMeta: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    itemPrice: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    actionsSection: {
      padding: spacing.lg,
      paddingBottom: spacing.xl,
    },
    buttonContainer: {
      flexDirection: "row",
      gap: spacing.md,
    },
    editButton: {
      flex: 1,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
    },
    deleteButton: {
      flex: 1,
      borderRadius: borderRadius.lg,
      paddingVertical: spacing.sm,
    },
    disabledButton: {
      opacity: 0.6,
    },
    expandedImageModal: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: "rgba(0, 0, 0, 0.9)",
      zIndex: 1000,
      justifyContent: "center",
      alignItems: "center",
    },
    expandedImage: {
      width: width - spacing.lg * 2,
      height: "70%",
      borderRadius: borderRadius.lg,
    },
    closeButton: {
      position: "absolute",
      top: 60,
      right: spacing.lg,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      borderRadius: borderRadius.full,
      padding: spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header with Gradient */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            disabled={deleting}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => navigation.navigate("EditReceipt", { receipt })}
              disabled={deleting}
            >
              <Ionicons name="create-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => {
                // Share functionality could go here
                Alert.alert("Share", "Share functionality coming soon!");
              }}
              disabled={deleting}
            >
              <Ionicons name="share-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Card style={styles.heroSection}>
          {receipt.imageUri ? (
            <View style={styles.receiptImageContainer}>
              <TouchableOpacity onPress={() => setImageExpanded(true)}>
                <Image
                  source={{ uri: receipt.imageUri }}
                  style={styles.receiptImage}
                  resizeMode="cover"
                />
                <View style={styles.imageOverlay}>
                  <Ionicons name="expand-outline" size={20} color="white" />
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.noImagePlaceholder}>
              <Ionicons
                name="image-outline"
                size={48}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.noImageText}>No receipt image</Text>
            </View>
          )}

          <View style={styles.heroContent}>
            <Text style={styles.merchantName}>{receipt.merchantName}</Text>
            <Text style={styles.receiptAmount}>
              ${receipt.amount.toFixed(2)}
            </Text>

            <View style={styles.categorySection}>
              {category && (
                <Chip
                  icon={category.icon}
                  style={[
                    styles.categoryChip,
                    { backgroundColor: category.color + "20" },
                  ]}
                  textStyle={{ color: category.color, fontWeight: "600" }}
                >
                  {category.name}
                </Chip>
              )}
              <Text style={styles.transactionDate}>
                {transactionDate.short}
              </Text>
            </View>
          </View>
        </Card>

        {/* Receipt Details */}
        <View style={styles.detailsSection}>
          <Card style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Receipt Information</Text>
            </View>
            <View style={styles.detailsContent}>
              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Transaction Date</Text>
                  <Text style={styles.detailValue}>{transactionDate}</Text>
                </View>
              </View>

              <Divider style={{ marginVertical: spacing.sm }} />

              <View style={styles.detailRow}>
                <View style={styles.detailIcon}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <View style={styles.detailContent}>
                  <Text style={styles.detailLabel}>Added to App</Text>
                  <Text style={styles.detailValue}>{createdDate.long}</Text>
                </View>
              </View>

              {receipt.updatedAt && receipt.updatedAt !== receipt.createdAt && (
                <>
                  <Divider style={{ marginVertical: spacing.sm }} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons
                        name="refresh-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Last Updated</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(receipt.updatedAt).long}
                      </Text>
                    </View>
                  </View>
                </>
              )}

              {receipt.description && (
                <>
                  <Divider style={{ marginVertical: spacing.sm }} />
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Ionicons
                        name="document-text-outline"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <Text style={styles.detailLabel}>Description</Text>
                      <Text style={styles.description}>
                        {receipt.description}
                      </Text>
                    </View>
                  </View>
                </>
              )}
            </View>
          </Card>
        </View>

        {/* Items Section (if items exist) */}
        {receipt.items && receipt.items.length > 0 && (
          <View style={styles.itemsSection}>
            <Card style={styles.itemsCard}>
              <View style={styles.itemsHeader}>
                <Text style={styles.itemsTitle}>Receipt Items</Text>
                <Text style={styles.itemsCount}>{receipt.items.length}</Text>
              </View>
              {receipt.items.map((item, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemName}>
                      {item.itemName || item.name}
                    </Text>
                    <Text style={styles.itemMeta}>
                      Qty: {item.quantity} × $
                      {(item.unitPrice || item.unit_price || 0).toFixed(2)}
                    </Text>
                  </View>
                  <Text style={styles.itemPrice}>
                    $
                    {(
                      item.totalPrice ||
                      item.total_price ||
                      item.price ||
                      0
                    ).toFixed(2)}
                  </Text>
                </View>
              ))}
            </Card>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={() => navigation.navigate("EditReceipt", { receipt })}
              style={[styles.editButton, deleting && styles.disabledButton]}
              icon="pencil"
              disabled={deleting}
            >
              Edit Receipt
            </Button>
            <Button
              mode="outlined"
              onPress={handleDelete}
              style={[styles.deleteButton, deleting && styles.disabledButton]}
              textColor={deleting ? theme.colors.disabled : theme.colors.error}
              icon={deleting ? undefined : "delete"}
              loading={deleting}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </View>
        </View>
      </ScrollView>

      {/* Expanded Image Modal */}
      {imageExpanded && receipt.imageUri && (
        <View style={styles.expandedImageModal}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setImageExpanded(false)}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setImageExpanded(false)}
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <Image
              source={{ uri: receipt.imageUri }}
              style={styles.expandedImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
