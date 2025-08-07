import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import {
  Card,
  Button,
  TextInput,
  Chip,
  Checkbox,
  Divider,
  ProgressBar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

// Logistics-specific report types
const REPORT_TYPES = [
  {
    id: "trip",
    name: "Trip Expenses",
    icon: "car",
    color: "#3b82f6",
    description: "Fuel, meals, hotels for specific routes",
  },
  {
    id: "maintenance",
    name: "Vehicle Maintenance",
    icon: "construct",
    color: "#ef4444",
    description: "Repairs, parts, service costs",
  },
  {
    id: "monthly",
    name: "Monthly Expenses",
    icon: "calendar",
    color: "#10b981",
    description: "Regular operational costs",
  },
  {
    id: "equipment",
    name: "Equipment & Supplies",
    icon: "hardware-chip",
    color: "#f59e0b",
    description: "Tools, safety gear, supplies",
  },
  {
    id: "other",
    name: "Other Business",
    icon: "briefcase",
    color: "#8b5cf6",
    description: "General business expenses",
  },
];

// Logistics expense categories
const EXPENSE_CATEGORIES = [
  { id: "fuel", name: "Fuel", icon: "car", priority: "high" },
  { id: "meals", name: "Meals", icon: "restaurant", priority: "medium" },
  { id: "lodging", name: "Hotels/Lodging", icon: "bed", priority: "high" },
  { id: "tolls", name: "Tolls & Parking", icon: "card", priority: "medium" },
  {
    id: "maintenance",
    name: "Vehicle Maintenance",
    icon: "build",
    priority: "high",
  },
  {
    id: "equipment",
    name: "Equipment",
    icon: "hardware-chip",
    priority: "medium",
  },
  {
    id: "safety",
    name: "Safety Gear",
    icon: "shield-checkmark",
    priority: "medium",
  },
  { id: "office", name: "Office Supplies", icon: "clipboard", priority: "low" },
];

export default function CreateExpenseReportScreen({ navigation }) {
  const { receipts, searchReceipts } = useDatabase();
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  // Report details
  const [reportTitle, setReportTitle] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [selectedReportType, setSelectedReportType] = useState(REPORT_TYPES[0]);
  const [employeeId, setEmployeeId] = useState(user?.id || "");
  const [vehicleId, setVehicleId] = useState("");
  const [routeDetails, setRouteDetails] = useState("");

  // Date range
  const [startDate, setStartDate] = useState(
    new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
  ); // Last week
  const [endDate, setEndDate] = useState(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);

  // Receipt selection
  const [availableReceipts, setAvailableReceipts] = useState([]);
  const [selectedReceipts, setSelectedReceipts] = useState(new Set());
  const [filteredReceipts, setFilteredReceipts] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load receipts on component mount
  useEffect(() => {
    loadReceipts();
  }, []);

  // Filter receipts when date range or categories change
  useEffect(() => {
    filterReceipts();
  }, [availableReceipts, startDate, endDate, selectedCategories]);

  const loadReceipts = async () => {
    try {
      setLoading(true);
      const userReceipts = await searchReceipts({
        user_id: user?.id,
        limit: 200,
      });
      setAvailableReceipts(userReceipts);
    } catch (error) {
      console.error("Error loading receipts:", error);
      Alert.alert("Error", "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  };

  const filterReceipts = () => {
    let filtered = availableReceipts.filter((receipt) => {
      const receiptDate = new Date(receipt.date);
      const inDateRange = receiptDate >= startDate && receiptDate <= endDate;

      if (selectedCategories.size === 0) return inDateRange;

      // Check if receipt category matches selected filters
      const receiptCategory = receipt.categoryId || receipt.category;
      return inDateRange && selectedCategories.has(receiptCategory);
    });

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    setFilteredReceipts(filtered);
  };

  const toggleReceiptSelection = (receiptId) => {
    const newSelection = new Set(selectedReceipts);
    if (newSelection.has(receiptId)) {
      newSelection.delete(receiptId);
    } else {
      newSelection.add(receiptId);
    }
    setSelectedReceipts(newSelection);
  };

  const toggleCategoryFilter = (categoryId) => {
    const newCategories = new Set(selectedCategories);
    if (newCategories.has(categoryId)) {
      newCategories.delete(categoryId);
    } else {
      newCategories.add(categoryId);
    }
    setSelectedCategories(newCategories);
  };

  const calculateTotals = () => {
    const selectedReceiptData = filteredReceipts.filter((r) =>
      selectedReceipts.has(r.id)
    );

    const subtotal = selectedReceiptData.reduce(
      (sum, receipt) => sum + receipt.amount,
      0
    );
    const gstTotal = selectedReceiptData.reduce((sum, receipt) => {
      // Estimate GST (5% in Canada)
      return sum + (receipt.amount * 0.05) / 1.05;
    }, 0);
    const qstTotal = selectedReceiptData.reduce((sum, receipt) => {
      // Estimate QST (9.975% in Quebec)
      return sum + (receipt.amount * 0.09975) / 1.09975;
    }, 0);

    return {
      count: selectedReceiptData.length,
      subtotal,
      gstTotal,
      qstTotal,
      total: subtotal,
    };
  };

  const handleSubmitReport = async () => {
    if (!reportTitle.trim()) {
      Alert.alert("Error", "Please enter a report title");
      return;
    }

    if (selectedReceipts.size === 0) {
      Alert.alert("Error", "Please select at least one receipt");
      return;
    }

    Alert.alert(
      "Submit Expense Report",
      `Submit "${reportTitle}" with ${selectedReceipts.size} receipts for approval?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: performSubmit },
      ]
    );
  };

  const performSubmit = async () => {
    try {
      setSubmitting(true);

      const totals = calculateTotals();
      const selectedReceiptData = filteredReceipts.filter((r) =>
        selectedReceipts.has(r.id)
      );

      const reportData = {
        title: reportTitle,
        description: reportDescription,
        type: selectedReportType.id,
        employeeId: user?.id,
        vehicleId,
        routeDetails,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        receipts: selectedReceiptData,
        totals,
        status: "submitted",
        submittedAt: new Date().toISOString(),
      };

      console.log("Submitting expense report:", reportData);

      // TODO: Call API to submit report
      // await apiService.submitExpenseReport(reportData);

      Alert.alert(
        "Success",
        "Expense report submitted successfully! Your manager will be notified for approval.",
        [{ text: "OK", onPress: () => navigation.goBack() }]
      );
    } catch (error) {
      console.error("Error submitting report:", error);
      Alert.alert(
        "Error",
        "Failed to submit expense report. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totals = calculateTotals();

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
      marginBottom: spacing.xs,
    },
    backButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      marginRight: spacing.md,
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
      marginTop: spacing.xs,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    section: {
      marginBottom: spacing.lg,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginBottom: spacing.md,
    },
    reportTypeGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    reportTypeChip: {
      flexBasis: "48%",
      marginBottom: spacing.sm,
    },
    reportTypeChipSelected: {
      backgroundColor: theme.colors.primary + "20",
    },
    dateSection: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    dateButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.outline + "10",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + "30",
    },
    dateText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: spacing.sm,
    },
    filterSection: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    categoryChip: {
      marginBottom: spacing.sm,
    },
    receiptsHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    receiptsCount: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    receiptsList: {
      maxHeight: 300,
    },
    receiptItem: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.outline + "20",
    },
    receiptItemSelected: {
      backgroundColor: theme.colors.primary + "10",
      borderColor: theme.colors.primary + "50",
    },
    receiptInfo: {
      flex: 1,
      marginLeft: spacing.md,
    },
    receiptMerchant: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    receiptDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    receiptAmount: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    summaryCard: {
      backgroundColor: theme.colors.primary + "08",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    summaryLabel: {
      fontSize: 16,
      color: theme.colors.text,
    },
    summaryValue: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + "30",
      paddingTop: spacing.md,
      marginTop: spacing.sm,
    },
    totalValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    submitButton: {
      marginTop: spacing.lg,
      paddingVertical: spacing.sm,
    },
    input: {
      marginBottom: spacing.md,
    },
    loadingContainer: {
      padding: spacing.xl,
      alignItems: "center",
    },
    emptyState: {
      padding: spacing.xl,
      alignItems: "center",
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.md,
    },
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Expense Report</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Select receipts and submit for approval
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Report Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Type</Text>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.reportTypeGrid}>
                {REPORT_TYPES.map((type) => (
                  <Chip
                    key={type.id}
                    icon={type.icon}
                    selected={selectedReportType.id === type.id}
                    onPress={() => setSelectedReportType(type)}
                    style={[
                      styles.reportTypeChip,
                      selectedReportType.id === type.id &&
                        styles.reportTypeChipSelected,
                    ]}
                    textStyle={{ fontSize: 12 }}
                  >
                    {type.name}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Report Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Report Details</Text>
          <Card style={styles.card}>
            <Card.Content>
              <TextInput
                label="Report Title *"
                value={reportTitle}
                onChangeText={setReportTitle}
                mode="outlined"
                style={styles.input}
                placeholder="e.g., Toronto-Montreal Trip Nov 2024"
              />

              <TextInput
                label="Description"
                value={reportDescription}
                onChangeText={setReportDescription}
                mode="outlined"
                multiline
                numberOfLines={3}
                style={styles.input}
                placeholder="Additional details about this expense report..."
              />

              {selectedReportType.id === "trip" && (
                <>
                  <TextInput
                    label="Vehicle ID"
                    value={vehicleId}
                    onChangeText={setVehicleId}
                    mode="outlined"
                    style={styles.input}
                    placeholder="e.g., TRUCK-001"
                  />

                  <TextInput
                    label="Route Details"
                    value={routeDetails}
                    onChangeText={setRouteDetails}
                    mode="outlined"
                    style={styles.input}
                    placeholder="e.g., Toronto → Montreal → Quebec City"
                  />
                </>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Date Range */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date Range</Text>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.dateSection}>
                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View>
                    <Text
                      style={[
                        styles.dateText,
                        { fontSize: 12, color: theme.colors.textSecondary },
                      ]}
                    >
                      From
                    </Text>
                    <Text style={styles.dateText}>
                      {startDate.toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dateButton}
                  onPress={() => setShowEndDatePicker(true)}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={20}
                    color={theme.colors.primary}
                  />
                  <View>
                    <Text
                      style={[
                        styles.dateText,
                        { fontSize: 12, color: theme.colors.textSecondary },
                      ]}
                    >
                      To
                    </Text>
                    <Text style={styles.dateText}>
                      {endDate.toLocaleDateString()}
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Category Filters */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Filter by Category (Optional)</Text>
          <Card style={styles.card}>
            <Card.Content>
              <View style={styles.filterSection}>
                {EXPENSE_CATEGORIES.map((category) => (
                  <Chip
                    key={category.id}
                    icon={category.icon}
                    selected={selectedCategories.has(category.id)}
                    onPress={() => toggleCategoryFilter(category.id)}
                    style={styles.categoryChip}
                  >
                    {category.name}
                  </Chip>
                ))}
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Receipts Selection */}
        <View style={styles.section}>
          <View style={styles.receiptsHeader}>
            <Text style={styles.sectionTitle}>Select Receipts</Text>
            <Text style={styles.receiptsCount}>
              {filteredReceipts.length} available • {selectedReceipts.size}{" "}
              selected
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ProgressBar indeterminate color={theme.colors.primary} />
                  <Text style={styles.emptyText}>Loading receipts...</Text>
                </View>
              ) : filteredReceipts.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="receipt-outline"
                    size={48}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.emptyText}>
                    No receipts found for the selected date range and filters
                  </Text>
                </View>
              ) : (
                <ScrollView style={styles.receiptsList} nestedScrollEnabled>
                  {filteredReceipts.map((receipt) => (
                    <TouchableOpacity
                      key={receipt.id}
                      style={[
                        styles.receiptItem,
                        selectedReceipts.has(receipt.id) &&
                          styles.receiptItemSelected,
                      ]}
                      onPress={() => toggleReceiptSelection(receipt.id)}
                    >
                      <Checkbox
                        status={
                          selectedReceipts.has(receipt.id)
                            ? "checked"
                            : "unchecked"
                        }
                        onPress={() => toggleReceiptSelection(receipt.id)}
                      />

                      <View style={styles.receiptInfo}>
                        <Text style={styles.receiptMerchant}>
                          {receipt.merchantName}
                        </Text>
                        <Text style={styles.receiptDate}>
                          {new Date(receipt.date).toLocaleDateString()}
                        </Text>
                      </View>

                      <Text style={styles.receiptAmount}>
                        ${receipt.amount.toFixed(2)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </Card.Content>
          </Card>
        </View>

        {/* Summary */}
        {selectedReceipts.size > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Report Summary</Text>
            <Card style={[styles.card, styles.summaryCard]}>
              <Card.Content>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Selected Receipts:</Text>
                  <Text style={styles.summaryValue}>{totals.count}</Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated GST:</Text>
                  <Text style={styles.summaryValue}>
                    ${totals.gstTotal.toFixed(2)}
                  </Text>
                </View>

                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Estimated QST:</Text>
                  <Text style={styles.summaryValue}>
                    ${totals.qstTotal.toFixed(2)}
                  </Text>
                </View>

                <Divider style={{ marginVertical: spacing.sm }} />

                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={[styles.summaryLabel, { fontWeight: "bold" }]}>
                    Total Amount:
                  </Text>
                  <Text style={styles.totalValue}>
                    ${totals.total.toFixed(2)}
                  </Text>
                </View>
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Submit Button */}
        <Button
          mode="contained"
          onPress={handleSubmitReport}
          disabled={submitting || selectedReceipts.size === 0}
          loading={submitting}
          style={styles.submitButton}
          icon="send"
        >
          {submitting ? "Submitting..." : "Submit for Approval"}
        </Button>
      </ScrollView>

      {/* Date Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartDatePicker(false);
            if (selectedDate) {
              setStartDate(selectedDate);
            }
          }}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndDatePicker(false);
            if (selectedDate) {
              setEndDate(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
}
