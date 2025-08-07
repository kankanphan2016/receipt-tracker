import React, { useState, useCallback } from "react";
import { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import {
  Card,
  Searchbar,
  FAB,
  Menu,
  Button,
  TextInput,
  IconButton,
  Portal,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { useDatabase } from "../context/DatabaseContext";
import { Receipt } from "../types/Receipt";
import { SearchReceiptsRequest } from "../services/api";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";
import { useFocusEffect } from "@react-navigation/native";

export default function ReceiptListScreen({ navigation }) {
  const {
    receipts,
    categories,
    searchReceipts,
    deleteReceipt,
    loadReceipts,
    getReceiptById,
    getReceiptItems,
  } = useDatabase();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [filteredReceipts, setFilteredReceipts] = useState(receipts);

  const loadAllReceipts = async () => {
    try {
      setRefreshing(true);
      await loadReceipts(); // Ensure fresh data from database
      const allReceipts = await searchReceipts({ limit: 100 });
      setFilteredReceipts(allReceipts);
    } catch (error) {
      console.error("Error loading all receipts:", error);
      setFilteredReceipts(receipts);
    } finally {
      setRefreshing(false);
    }
  };

  // Enhanced focus effect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("ReceiptListScreen focused - refreshing data");
      loadAllReceipts();

      // Close any open menus/modals when screen gains focus
      setMenuVisible(false);
      setShowAdvancedSearch(false);

      return () => {
        // Cleanup when screen loses focus
        setMenuVisible(false);
      };
    }, [])
  );

  // Update filtered receipts when receipts change
  useEffect(() => {
    if (!searchQuery.trim() && !minAmount && !maxAmount) {
      setFilteredReceipts(receipts);
    }
  }, [receipts]);

  useEffect(() => {
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    } else if (!minAmount && !maxAmount) {
      // Load all receipts when search is cleared
      loadAllReceipts();
    }
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    setSearchLoading(true);
    try {
      console.log("Performing search for:", query);

      const searchParams: SearchReceiptsRequest = {};

      // Use query as merchant_name if provided
      if (query.trim()) {
        searchParams.merchant_name = query.trim();
      }

      // Add amount filters if provided
      if (minAmount && !isNaN(parseFloat(minAmount))) {
        searchParams.min_amount = parseFloat(minAmount);
      }
      if (maxAmount && !isNaN(parseFloat(maxAmount))) {
        searchParams.max_amount = parseFloat(maxAmount);
      }

      // Set a reasonable limit
      searchParams.limit = 50;

      const searchResults = await searchReceipts(searchParams);
      setFilteredReceipts(searchResults);
      console.log("Search results:", searchResults.length);
    } catch (error) {
      console.error("Search error:", error);
      // Fallback to local search
      const filtered = receipts.filter(
        (receipt) =>
          receipt.merchantName.toLowerCase().includes(query.toLowerCase()) ||
          receipt.category.toLowerCase().includes(query.toLowerCase()) ||
          (receipt.description &&
            receipt.description.toLowerCase().includes(query.toLowerCase()))
      );
      setFilteredReceipts(filtered);
    } finally {
      setSearchLoading(false);
    }
  };

  const performAdvancedSearch = async () => {
    setSearchLoading(true);
    try {
      const searchParams: SearchReceiptsRequest = {};

      if (searchQuery.trim()) {
        searchParams.merchant_name = searchQuery.trim();
      }
      if (minAmount && !isNaN(parseFloat(minAmount))) {
        searchParams.min_amount = parseFloat(minAmount);
      }
      if (maxAmount && !isNaN(parseFloat(maxAmount))) {
        searchParams.max_amount = parseFloat(maxAmount);
      }
      searchParams.limit = 50;

      const searchResults = await searchReceipts(searchParams);
      setFilteredReceipts(searchResults);
      console.log("Advanced search results:", searchResults.length);
    } catch (error) {
      console.error("Advanced search error:", error);
      Alert.alert(
        "Search Error",
        "Failed to perform search. Please try again."
      );
    } finally {
      setSearchLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setMinAmount("");
    setMaxAmount("");
    setShowAdvancedSearch(false);
    loadAllReceipts();
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.icon : "receipt";
  };

  const getCategoryColor = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.color : theme.colors.primary;
  };

  const exportToCSV = async () => {
    // Close menu first
    setMenuVisible(false);

    try {
      const csvHeader = "MerchantName,Amount,Category,Date,Description\n";
      const csvData = receipts
        .map(
          (receipt) =>
            `"${receipt.merchantName}","${receipt.amount}","${
              receipt.category
            }","${new Date(receipt.date).toLocaleDateString()}","${
              receipt.description || ""
            }"`
        )
        .join("\n");

      const csvContent = csvHeader + csvData;
      const fileUri = FileSystem.documentDirectory + "receipts.csv";

      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      Alert.alert("Error", "Failed to export receipts");
    }
  };

  const handleEdit = (receipt: Receipt) => {
    // Close any open menus before navigating
    setMenuVisible(false);
    navigation.navigate("EditReceipt", { receipt });
  };

  const handleDelete = (receipt: Receipt) => {
    // Close any open menus before showing alert
    setMenuVisible(false);

    Alert.alert(
      "Delete Receipt",
      `Are you sure you want to delete "${receipt.merchantName}"? This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => performDelete(receipt.id),
        },
      ]
    );
  };

  const performDelete = async (receiptId: string) => {
    if (!user) {
      Alert.alert("Error", "You must be logged in to delete receipts");
      return;
    }

    setDeletingId(receiptId);

    try {
      console.log("Deleting receipt:", receiptId);

      const response = await deleteReceipt(receiptId);

      if (response && response.success) {
        // Remove from filtered receipts immediately for better UX
        setFilteredReceipts((prev) => prev.filter((r) => r.id !== receiptId));

        // Refresh the full list to ensure consistency
        setTimeout(() => {
          loadAllReceipts();
        }, 500);

        Alert.alert(
          "Success",
          response.message || "Receipt deleted successfully!"
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
      setDeletingId(null);
    }
  };

  const handleRefresh = () => {
    loadAllReceipts();
  };

  // Enhanced receipt click handler
  const handleReceiptClick = async (receipt: Receipt) => {
    try {
      // Close any open menus before navigating
      setMenuVisible(false);

      console.log("Clicked receipt:", receipt.id, receipt.merchantName);

      // Try to get the most complete receipt data
      let fullReceipt = receipt;

      // Method 1: Try to get fresh data from database
      if (getReceiptById) {
        try {
          const freshReceipt = await getReceiptById(receipt.id);
          if (freshReceipt) {
            fullReceipt = freshReceipt;
            console.log("Got fresh receipt data:", fullReceipt);
          }
        } catch (error) {
          console.log("Could not get fresh receipt data:", error);
        }
      }

      // Method 2: Try to attach items if not already present
      if (
        getReceiptItems &&
        (!fullReceipt.items || fullReceipt.items.length === 0)
      ) {
        try {
          const items = await getReceiptItems(receipt.id);
          if (items && items.length > 0) {
            fullReceipt = { ...fullReceipt, items };
            console.log("Attached items to receipt:", items);
          }
        } catch (error) {
          console.log("Could not get receipt items:", error);
        }
      }

      // Method 3: Ensure we have the most complete data from the original receipts array
      const originalReceipt = receipts.find((r) => r.id === receipt.id);
      if (originalReceipt) {
        // Merge the data, preferring the original receipt's complete data
        fullReceipt = {
          ...fullReceipt,
          ...originalReceipt,
          // Preserve any items we might have fetched
          items: fullReceipt.items || originalReceipt.items || [],
        };
        console.log("Merged with original receipt data");
      }

      console.log("Final receipt data being passed:", {
        id: fullReceipt.id,
        merchantName: fullReceipt.merchantName,
        itemsCount: fullReceipt.items?.length || 0,
        hasItems: !!(fullReceipt.items && fullReceipt.items.length > 0),
      });

      // Navigate with the complete receipt data
      navigation.navigate("ReceiptDetail", { receipt: fullReceipt });
    } catch (error) {
      console.error("Error handling receipt click:", error);
      // Fallback to basic navigation with original receipt
      navigation.navigate("ReceiptDetail", { receipt });
    }
  };

  const renderReceiptItem = ({ item }: { item: Receipt }) => (
    <Card style={styles.receiptCard}>
      <TouchableOpacity
        onPress={() => handleReceiptClick(item)}
        style={styles.receiptTouchable}
      >
        <Card.Content style={styles.receiptContent}>
          <View style={styles.receiptHeader}>
            <View style={styles.receiptInfo}>
              <Text style={styles.receiptTitle}>{item.merchantName}</Text>
              <Text style={styles.receiptDate}>
                {new Date(item.date).toLocaleDateString()}
              </Text>
              {/* Show items count if available */}
              {item.items && item.items.length > 0 && (
                <Text style={styles.itemsCount}>
                  {item.items.length} item{item.items.length !== 1 ? "s" : ""}
                </Text>
              )}
            </View>
            <View style={styles.receiptRight}>
              <Text style={styles.receiptAmount}>
                ${item.amount.toFixed(2)}
              </Text>
              <View style={styles.categoryBadge}>
                <Ionicons
                  name={getCategoryIcon(item.categoryId) as any}
                  size={16}
                  color={getCategoryColor(item.categoryId)}
                />
                <Text
                  style={[
                    styles.categoryText,
                    { color: getCategoryColor(item.categoryId) },
                  ]}
                >
                  {item.category}
                </Text>
              </View>
            </View>
          </View>
          {item.description && (
            <Text style={styles.receiptDescription} numberOfLines={2}>
              {item.description}
            </Text>
          )}
        </Card.Content>
      </TouchableOpacity>

      <View style={styles.actionButtons}>
        <IconButton
          icon="pencil"
          size={20}
          iconColor={theme.colors.primary}
          style={styles.actionButton}
          onPress={() => handleEdit(item)}
          disabled={deletingId === item.id}
        />
        <IconButton
          icon="delete"
          size={20}
          iconColor={theme.colors.error}
          style={styles.actionButton}
          onPress={() => handleDelete(item)}
          disabled={deletingId === item.id}
          loading={deletingId === item.id}
        />
      </View>
    </Card>
  );

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
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
      marginBottom: spacing.xs,
    },
    logo: {
      width: 32,
      height: 32,
      marginRight: spacing.md,
      borderRadius: 16,
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
    searchContainer: {
      marginBottom: spacing.lg,
    },
    searchActions: {
      flexDirection: "row",
      marginTop: spacing.sm,
      gap: spacing.sm,
    },
    advancedSearchButton: {
      flex: 1,
    },
    clearButton: {
      flex: 1,
    },
    advancedSearchContainer: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 1,
    },
    amountFilters: {
      flexDirection: "row",
      gap: spacing.md,
      marginBottom: spacing.md,
    },
    amountInput: {
      flex: 1,
    },
    searchButton: {
      borderRadius: borderRadius.md,
    },
    menuButton: {
      marginBottom: spacing.md,
      alignSelf: "flex-end",
    },
    receiptCard: {
      marginBottom: spacing.md,
      elevation: 2,
      borderRadius: borderRadius.lg,
      position: "relative",
    },
    receiptTouchable: {
      flex: 1,
    },
    receiptContent: {
      padding: spacing.lg,
      paddingRight: spacing.xl + 40, // Make room for action buttons
    },
    receiptHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.sm,
    },
    receiptInfo: {
      flex: 1,
    },
    receiptTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    receiptDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    itemsCount: {
      fontSize: 12,
      color: theme.colors.primary,
      fontWeight: "500",
      marginTop: 2,
    },
    receiptRight: {
      alignItems: "flex-end",
    },
    receiptAmount: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    categoryBadge: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.background,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
      borderRadius: borderRadius.md,
    },
    categoryText: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: spacing.xs,
    },
    receiptDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
    },
    actionButtons: {
      position: "absolute",
      right: spacing.sm,
      top: "50%",
      transform: [{ translateY: -20 }],
      flexDirection: "column",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      elevation: 3,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    actionButton: {
      margin: 0,
      width: 36,
      height: 36,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingVertical: spacing.xxl,
    },
    emptyText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.lg,
    },
    fab: {
      position: "absolute",
      margin: 16,
      right: 0,
      bottom: 0,
      backgroundColor: theme.colors.primary,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View
            style={[
              styles.logo,
              {
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="receipt" size={20} color="white" />
          </View>
          <Text style={styles.headerTitle}>My Receipts</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredReceipts.length} receipts
        </Text>
      </View>

      <View style={styles.content}>
        <View style={styles.searchContainer}>
          <Searchbar
            placeholder="Search by merchant name..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            loading={searchLoading}
          />

          <View style={styles.searchActions}>
            <Button
              mode={showAdvancedSearch ? "contained" : "outlined"}
              onPress={() => setShowAdvancedSearch(!showAdvancedSearch)}
              style={styles.advancedSearchButton}
              compact
            >
              Advanced
            </Button>
            {(searchQuery || minAmount || maxAmount) && (
              <Button
                mode="outlined"
                onPress={clearSearch}
                style={styles.clearButton}
                compact
              >
                Clear
              </Button>
            )}
          </View>

          {showAdvancedSearch && (
            <View style={styles.advancedSearchContainer}>
              <View style={styles.amountFilters}>
                <TextInput
                  label="Min Amount"
                  value={minAmount}
                  onChangeText={setMinAmount}
                  keyboardType="numeric"
                  style={styles.amountInput}
                  mode="outlined"
                  dense
                />
                <TextInput
                  label="Max Amount"
                  value={maxAmount}
                  onChangeText={setMaxAmount}
                  keyboardType="numeric"
                  style={styles.amountInput}
                  mode="outlined"
                  dense
                />
              </View>
              <Button
                mode="contained"
                onPress={performAdvancedSearch}
                loading={searchLoading}
                style={styles.searchButton}
              >
                Search
              </Button>
            </View>
          )}
        </View>

        {/* Wrap Menu in Portal to prevent overlap issues */}
        <Portal>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <Button
                mode="outlined"
                onPress={() => setMenuVisible(true)}
                style={styles.menuButton}
                icon="dots-vertical"
              >
                Options
              </Button>
            }
            anchorPosition="bottom"
          >
            <Menu.Item onPress={exportToCSV} title="Export to CSV" />
          </Menu>
        </Portal>

        {filteredReceipts.length > 0 ? (
          <FlatList
            data={filteredReceipts}
            renderItem={renderReceiptItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            refreshing={refreshing}
            onRefresh={handleRefresh}
            removeClippedSubviews={false} // Helps with rendering issues
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="receipt-outline"
              size={80}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>
              {searchQuery || minAmount || maxAmount
                ? "No receipts found for your search"
                : "No receipts yet.\nAdd your first receipt!"}
            </Text>
          </View>
        )}
      </View>

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => {
          // Close any open menus before navigating
          setMenuVisible(false);
          navigation.navigate("Add");
        }}
      />
    </View>
  );
}
