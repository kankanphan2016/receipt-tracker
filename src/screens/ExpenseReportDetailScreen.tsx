import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
  Share,
  Image,
} from "react-native";
import {
  Card,
  Button,
  Chip,
  Avatar,
  Divider,
  ProgressBar,
  Badge,
  DataTable,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

const STATUS_CONFIG = {
  draft: {
    color: "#6b7280",
    bgColor: "#f3f4f6",
    icon: "create-outline",
    label: "Draft",
  },
  submitted: {
    color: "#3b82f6",
    bgColor: "#dbeafe",
    icon: "time-outline",
    label: "Under Review",
  },
  pending: {
    color: "#f59e0b",
    bgColor: "#fef3c7",
    icon: "hourglass-outline",
    label: "Pending",
  },
  approved: {
    color: "#10b981",
    bgColor: "#d1fae5",
    icon: "checkmark-circle-outline",
    label: "Approved",
  },
  rejected: {
    color: "#ef4444",
    bgColor: "#fee2e2",
    icon: "close-circle-outline",
    label: "Rejected",
  },
};

const REPORT_TYPES = {
  trip: { icon: "car", label: "Trip Expenses", color: "#3b82f6" },
  maintenance: {
    icon: "construct",
    label: "Vehicle Maintenance",
    color: "#ef4444",
  },
  monthly: { icon: "calendar", label: "Monthly Expenses", color: "#10b981" },
  equipment: {
    icon: "hardware-chip",
    label: "Equipment & Supplies",
    color: "#f59e0b",
  },
  other: { icon: "briefcase", label: "Other Business", color: "#8b5cf6" },
};

export default function ExpenseReportDetailScreen({ route, navigation }) {
  const { report } = route.params;
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [reportData, setReportData] = useState(report);
  const [loading, setLoading] = useState(false);
  const [expandedReceipt, setExpandedReceipt] = useState(null);

  // Check if current user is the report owner
  const isOwner =
    reportData.employee?.id === user?.id || reportData.userId === user?.id;

  // Check if user can approve (manager/admin and not owner)
  const canApprove =
    (user?.role === "admin" || user?.role === "manager") && !isOwner;

  // Mock detailed receipts data - in real app, load from API
  const detailedReceipts = [
    {
      id: "r1",
      merchantName: "Petro-Canada",
      amount: 289.45,
      category: "Fuel",
      date: "2024-11-18T08:30:00Z",
      description: "Fuel for route start",
      imageUri: "https://example.com/receipt1.jpg",
      items: [
        {
          name: "Regular Gasoline",
          quantity: 102.3,
          unitPrice: 1.42,
          totalPrice: 145.27,
        },
        { name: "Diesel", quantity: 95.8, unitPrice: 1.51, totalPrice: 144.66 },
      ],
      location: "Calgary, AB",
      paymentMethod: "Corporate Card",
      gst: 13.78,
      total: 289.45,
    },
    {
      id: "r2",
      merchantName: "Tim Hortons",
      amount: 24.8,
      category: "Meals",
      date: "2024-11-18T12:15:00Z",
      description: "Lunch during route",
      imageUri: "https://example.com/receipt2.jpg",
      items: [
        {
          name: "Double Double",
          quantity: 2,
          unitPrice: 2.79,
          totalPrice: 5.58,
        },
        {
          name: "Boston Cream Donut",
          quantity: 1,
          unitPrice: 1.89,
          totalPrice: 1.89,
        },
        {
          name: "Chicken Club Sandwich",
          quantity: 1,
          unitPrice: 8.99,
          totalPrice: 8.99,
        },
        { name: "Hash Browns", quantity: 2, unitPrice: 2.49, totalPrice: 4.98 },
      ],
      location: "Red Deer, AB",
      paymentMethod: "Cash",
      gst: 1.18,
      total: 24.8,
    },
    {
      id: "r3",
      merchantName: "Shell",
      amount: 312.7,
      category: "Fuel",
      date: "2024-11-19T06:45:00Z",
      description: "Fuel top-up Edmonton",
      imageUri: "https://example.com/receipt3.jpg",
      items: [
        {
          name: "V-Power Diesel",
          quantity: 89.2,
          unitPrice: 1.58,
          totalPrice: 140.94,
        },
        {
          name: "Regular Gasoline",
          quantity: 108.7,
          unitPrice: 1.46,
          totalPrice: 158.7,
        },
      ],
      location: "Edmonton, AB",
      paymentMethod: "Corporate Card",
      gst: 14.89,
      total: 312.7,
    },
    {
      id: "r4",
      merchantName: "Boston Pizza",
      amount: 67.9,
      category: "Meals",
      date: "2024-11-19T19:30:00Z",
      description: "Dinner - overnight stay",
      imageUri: "https://example.com/receipt4.jpg",
      items: [
        {
          name: "Chicken Caesar Salad",
          quantity: 1,
          unitPrice: 18.99,
          totalPrice: 18.99,
        },
        {
          name: "Pepperoni Pizza (Medium)",
          quantity: 1,
          unitPrice: 22.99,
          totalPrice: 22.99,
        },
        { name: "Coca-Cola", quantity: 2, unitPrice: 3.49, totalPrice: 6.98 },
        { name: "Tip", quantity: 1, unitPrice: 15.0, totalPrice: 15.0 },
      ],
      location: "Fort McMurray, AB",
      paymentMethod: "Corporate Card",
      gst: 3.24,
      total: 67.9,
    },
    {
      id: "r5",
      merchantName: "Days Inn",
      amount: 159.0,
      category: "Lodging",
      date: "2024-11-19T22:00:00Z",
      description: "Overnight accommodation",
      imageUri: "https://example.com/receipt5.jpg",
      items: [
        {
          name: "Standard Room (1 night)",
          quantity: 1,
          unitPrice: 139.0,
          totalPrice: 139.0,
        },
        { name: "Parking", quantity: 1, unitPrice: 12.0, totalPrice: 12.0 },
      ],
      location: "Fort McMurray, AB",
      paymentMethod: "Corporate Card",
      gst: 7.57,
      total: 159.0,
    },
  ];

  useEffect(() => {
    // In real app, load full report details from API
    loadReportDetails();
  }, []);

  const loadReportDetails = async () => {
    try {
      setLoading(true);
      // TODO: Load full report details including all receipts
      // const fullReport = await apiService.getExpenseReportDetails(reportData.id);
      // setReportData(fullReport);

      // For demo, use existing data
      setReportData({
        ...reportData,
        receipts: detailedReceipts,
      });
    } catch (error) {
      console.error("Error loading report details:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    try {
      const shareContent =
        `Expense Report: ${reportData.title}\n` +
        `Amount: $${reportData.totalAmount.toFixed(2)}\n` +
        `Status: ${STATUS_CONFIG[reportData.status]?.label}\n` +
        `Receipts: ${reportData.receiptCount}\n` +
        `Submitted: ${new Date(
          reportData.submittedDate || reportData.lastModified
        ).toLocaleDateString()}`;

      await Share.share({
        message: shareContent,
        title: `Expense Report - ${reportData.title}`,
      });
    } catch (error) {
      console.error("Error sharing report:", error);
    }
  };

  const handleExportPDF = () => {
    // TODO: Implement PDF export functionality
    Alert.alert(
      "Export PDF",
      "PDF export functionality will be implemented here"
    );
  };

  const calculateTotals = () => {
    const receipts = reportData.receipts || detailedReceipts;

    const subtotal = receipts.reduce(
      (sum, receipt) => sum + (receipt.amount - (receipt.gst || 0)),
      0
    );
    const totalGST = receipts.reduce(
      (sum, receipt) => sum + (receipt.gst || 0),
      0
    );
    const total = receipts.reduce((sum, receipt) => sum + receipt.amount, 0);

    const categoryBreakdown = receipts.reduce((acc, receipt) => {
      acc[receipt.category] = (acc[receipt.category] || 0) + receipt.amount;
      return acc;
    }, {});

    return { subtotal, totalGST, total, categoryBreakdown };
  };

  const renderReceiptCard = (receipt, index) => {
    const isExpanded = expandedReceipt === receipt.id;

    return (
      <Card key={receipt.id} style={styles.receiptCard}>
        <TouchableOpacity
          onPress={() => setExpandedReceipt(isExpanded ? null : receipt.id)}
        >
          <Card.Content>
            <View style={styles.receiptHeader}>
              <View style={styles.receiptInfo}>
                <Text style={styles.receiptMerchant}>
                  {receipt.merchantName}
                </Text>
                <Text style={styles.receiptDate}>
                  {new Date(receipt.date).toLocaleDateString()} •{" "}
                  {receipt.location}
                </Text>
                <Chip
                  style={styles.receiptCategory}
                  textStyle={{ fontSize: 12 }}
                  compact
                >
                  {receipt.category}
                </Chip>
              </View>
              <View style={styles.receiptAmountContainer}>
                <Text style={styles.receiptAmount}>
                  ${receipt.amount.toFixed(2)}
                </Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.colors.text}
                />
              </View>
            </View>

            {receipt.description && (
              <Text style={styles.receiptDescription}>
                {receipt.description}
              </Text>
            )}

            {isExpanded && (
              <View style={styles.receiptDetails}>
                <Divider style={{ marginVertical: spacing.md }} />

                {/* Receipt Items */}
                <Text style={styles.sectionTitle}>Items:</Text>
                <DataTable>
                  <DataTable.Header>
                    <DataTable.Title>Item</DataTable.Title>
                    <DataTable.Title numeric>Qty</DataTable.Title>
                    <DataTable.Title numeric>Price</DataTable.Title>
                    <DataTable.Title numeric>Total</DataTable.Title>
                  </DataTable.Header>
                  {receipt.items.map((item, idx) => (
                    <DataTable.Row key={idx}>
                      <DataTable.Cell style={{ flex: 2 }}>
                        {item.name}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>{item.quantity}</DataTable.Cell>
                      <DataTable.Cell numeric>
                        ${item.unitPrice.toFixed(2)}
                      </DataTable.Cell>
                      <DataTable.Cell numeric>
                        ${item.totalPrice.toFixed(2)}
                      </DataTable.Cell>
                    </DataTable.Row>
                  ))}
                </DataTable>

                {/* Receipt Summary */}
                <View style={styles.receiptSummary}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Subtotal:</Text>
                    <Text style={styles.summaryValue}>
                      ${(receipt.amount - (receipt.gst || 0)).toFixed(2)}
                    </Text>
                  </View>
                  {receipt.gst && (
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>GST:</Text>
                      <Text style={styles.summaryValue}>
                        ${receipt.gst.toFixed(2)}
                      </Text>
                    </View>
                  )}
                  <Divider style={{ marginVertical: spacing.sm }} />
                  <View style={[styles.summaryRow, styles.totalRow]}>
                    <Text style={styles.totalLabel}>Total:</Text>
                    <Text style={styles.totalValue}>
                      ${receipt.total.toFixed(2)}
                    </Text>
                  </View>
                </View>

                {/* Receipt Actions */}
                <View style={styles.receiptActions}>
                  <Button
                    mode="outlined"
                    onPress={() =>
                      navigation.navigate("ReceiptDetail", {
                        receipt: { ...receipt, id: receipt.id },
                      })
                    }
                    icon="eye"
                    compact
                  >
                    View Receipt
                  </Button>
                  {receipt.imageUri && (
                    <Button
                      mode="outlined"
                      onPress={() => {
                        // TODO: Show full screen image
                        Alert.alert(
                          "View Image",
                          "Full image view will open here"
                        );
                      }}
                      icon="image"
                      compact
                    >
                      View Image
                    </Button>
                  )}
                </View>
              </View>
            )}
          </Card.Content>
        </TouchableOpacity>
      </Card>
    );
  };

  const statusConfig = STATUS_CONFIG[reportData.status];
  const typeConfig = REPORT_TYPES[reportData.type];
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
      justifyContent: "space-between",
      marginBottom: spacing.xs,
    },
    backButton: {
      padding: spacing.sm,
      borderRadius: borderRadius.full,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      marginRight: spacing.md,
    },
    headerTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: "white",
      flex: 1,
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
    headerSubtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: spacing.xs,
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
      marginBottom: spacing.lg,
    },
    heroContent: {
      padding: spacing.xl,
    },
    reportTitleRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.lg,
    },
    reportTitleContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    reportTitle: {
      fontSize: 22,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    reportMeta: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    typeChip: {
      height: 32,
    },
    statusChip: {
      height: 32,
    },
    reportAmount: {
      fontSize: 32,
      fontWeight: "bold",
      color: theme.colors.primary,
      textAlign: "right",
    },
    employeeSection: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.lg,
      padding: spacing.md,
      backgroundColor: theme.colors.outline + "10",
      borderRadius: borderRadius.md,
    },
    employeeInfo: {
      marginLeft: spacing.md,
      flex: 1,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    employeeDetails: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
    quickStats: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: spacing.md,
      backgroundColor: theme.colors.primary + "08",
      borderRadius: borderRadius.md,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
    section: {
      margin: spacing.lg,
      marginTop: spacing.md,
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
    tripInfoCard: {
      backgroundColor: theme.colors.primary + "08",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    tripInfoRow: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    tripInfoLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      width: 80,
    },
    tripInfoValue: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      flex: 1,
    },
    routeText: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    receiptsSection: {
      margin: spacing.lg,
      marginTop: spacing.md,
    },
    receiptCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      marginBottom: spacing.md,
    },
    receiptHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
    },
    receiptInfo: {
      flex: 1,
      marginRight: spacing.md,
    },
    receiptMerchant: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    receiptDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: spacing.sm,
    },
    receiptCategory: {
      alignSelf: "flex-start",
      backgroundColor: theme.colors.primary + "20",
    },
    receiptAmountContainer: {
      alignItems: "flex-end",
    },
    receiptAmount: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    receiptDescription: {
      fontSize: 14,
      color: theme.colors.text,
      fontStyle: "italic",
      marginTop: spacing.md,
      padding: spacing.sm,
      backgroundColor: theme.colors.outline + "10",
      borderRadius: borderRadius.sm,
    },
    receiptDetails: {
      marginTop: spacing.md,
    },
    receiptSummary: {
      marginTop: spacing.md,
      padding: spacing.md,
      backgroundColor: theme.colors.outline + "10",
      borderRadius: borderRadius.sm,
    },
    summaryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.text,
    },
    summaryValue: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    totalRow: {
      borderTopWidth: 1,
      borderTopColor: theme.colors.outline + "30",
      paddingTop: spacing.sm,
      marginTop: spacing.sm,
      marginBottom: 0,
    },
    totalLabel: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.text,
    },
    totalValue: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    receiptActions: {
      flexDirection: "row",
      gap: spacing.md,
      marginTop: spacing.md,
    },
    summaryCard: {
      backgroundColor: theme.colors.primary + "08",
      borderWidth: 1,
      borderColor: theme.colors.primary + "30",
    },
    categoryBreakdown: {
      marginTop: spacing.md,
    },
    categoryRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.sm,
    },
    categoryLabel: {
      fontSize: 14,
      color: theme.colors.text,
    },
    categoryAmount: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    actionButtons: {
      flexDirection: "row",
      gap: spacing.md,
      margin: spacing.lg,
    },
    actionButton: {
      flex: 1,
    },
    approveButton: {
      backgroundColor: theme.colors.success,
    },
    rejectButton: {
      borderColor: theme.colors.error,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: spacing.xl * 2,
    },
    loadingText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: spacing.md,
    },
    approvalInfo: {
      marginTop: spacing.lg,
      padding: spacing.md,
      backgroundColor: statusConfig?.bgColor || theme.colors.surface,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: statusConfig?.color + "30" || theme.colors.outline,
    },
    approvalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    approvalTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: statusConfig?.color || theme.colors.text,
      marginLeft: spacing.sm,
    },
    approvalText: {
      fontSize: 14,
      color: theme.colors.text,
      lineHeight: 20,
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
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
            <Text style={styles.headerTitle}>Expense Report</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading report details...</Text>
        </View>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Expense Report</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
            >
              <Ionicons name="share-outline" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleExportPDF}
            >
              <Ionicons name="download-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {statusConfig?.label} • {reportData.receiptCount} receipts
        </Text>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <Card style={styles.heroSection}>
          <View style={styles.heroContent}>
            <View style={styles.reportTitleRow}>
              <View style={styles.reportTitleContainer}>
                <Text style={styles.reportTitle}>{reportData.title}</Text>
                <View style={styles.reportMeta}>
                  <Chip
                    icon={typeConfig.icon}
                    style={[
                      styles.typeChip,
                      { backgroundColor: typeConfig.color + "20" },
                    ]}
                    textStyle={{ color: typeConfig.color, fontWeight: "600" }}
                  >
                    {typeConfig.label}
                  </Chip>
                  <Chip
                    icon={statusConfig.icon}
                    style={[
                      styles.statusChip,
                      { backgroundColor: statusConfig.bgColor },
                    ]}
                    textStyle={{ color: statusConfig.color, fontWeight: "600" }}
                  >
                    {statusConfig.label}
                  </Chip>
                </View>
              </View>
              <Text style={styles.reportAmount}>
                ${reportData.totalAmount.toFixed(2)}
              </Text>
            </View>

            {/* Employee Info */}
            {reportData.employee && (
              <View style={styles.employeeSection}>
                <Avatar.Text
                  size={48}
                  label={reportData.employee.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                  style={{ backgroundColor: theme.colors.primary }}
                />
                <View style={styles.employeeInfo}>
                  <Text style={styles.employeeName}>
                    {reportData.employee.name}
                  </Text>
                  <Text style={styles.employeeDetails}>
                    {reportData.employee.employeeId} •{" "}
                    {reportData.employee.department}
                  </Text>
                </View>
              </View>
            )}

            {/* Quick Stats */}
            <View style={styles.quickStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{reportData.receiptCount}</Text>
                <Text style={styles.statLabel}>Receipts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {reportData.submittedDate
                    ? Math.ceil(
                        (new Date() - new Date(reportData.submittedDate)) /
                          (1000 * 60 * 60 * 24)
                      )
                    : "-"}
                </Text>
                <Text style={styles.statLabel}>Days Ago</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {Object.keys(totals.categoryBreakdown).length}
                </Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
            </View>
          </View>
        </Card>

        {/* Trip Information */}
        {(reportData.vehicleId || reportData.route) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip Information</Text>
            <Card style={[styles.card, styles.tripInfoCard]}>
              <Card.Content>
                {reportData.vehicleId && (
                  <View style={styles.tripInfoRow}>
                    <Text style={styles.tripInfoLabel}>Vehicle:</Text>
                    <Text style={styles.tripInfoValue}>
                      {reportData.vehicleId}
                    </Text>
                  </View>
                )}
                {reportData.route && (
                  <View style={styles.tripInfoRow}>
                    <Text style={styles.tripInfoLabel}>Route:</Text>
                    <Text style={styles.routeText}>{reportData.route}</Text>
                  </View>
                )}
                {reportData.notes && (
                  <View style={styles.tripInfoRow}>
                    <Text style={styles.tripInfoLabel}>Notes:</Text>
                    <Text style={styles.tripInfoValue}>{reportData.notes}</Text>
                  </View>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Summary</Text>
          <Card style={[styles.card, styles.summaryCard]}>
            <Card.Content>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal (before tax):</Text>
                <Text style={styles.summaryValue}>
                  ${totals.subtotal.toFixed(2)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total GST:</Text>
                <Text style={styles.summaryValue}>
                  ${totals.totalGST.toFixed(2)}
                </Text>
              </View>
              <Divider style={{ marginVertical: spacing.sm }} />
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  ${totals.total.toFixed(2)}
                </Text>
              </View>

              {/* Category Breakdown */}
              <View style={styles.categoryBreakdown}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { fontSize: 16, marginBottom: spacing.sm },
                  ]}
                >
                  Category Breakdown:
                </Text>
                {Object.entries(totals.categoryBreakdown).map(
                  ([category, amount]) => (
                    <View key={category} style={styles.categoryRow}>
                      <Text style={styles.categoryLabel}>{category}:</Text>
                      <Text style={styles.categoryAmount}>
                        ${amount.toFixed(2)}
                      </Text>
                    </View>
                  )
                )}
              </View>
            </Card.Content>
          </Card>
        </View>

        {/* Approval/Status Information */}
        {(reportData.status === "approved" ||
          reportData.status === "rejected") && (
          <View style={styles.section}>
            <Card style={styles.approvalInfo}>
              <Card.Content>
                <View style={styles.approvalHeader}>
                  <Ionicons
                    name={
                      reportData.status === "approved"
                        ? "checkmark-circle"
                        : "close-circle"
                    }
                    size={20}
                    color={statusConfig.color}
                  />
                  <Text style={styles.approvalTitle}>
                    {reportData.status === "approved" ? "Approved" : "Rejected"}
                  </Text>
                </View>
                <Text style={styles.approvalText}>
                  {reportData.status === "approved"
                    ? `Approved by ${reportData.approvedBy} on ${new Date(
                        reportData.approvedDate
                      ).toLocaleDateString()}`
                    : `Rejected by ${reportData.rejectedBy} on ${new Date(
                        reportData.rejectedDate
                      ).toLocaleDateString()}`}
                </Text>
                {reportData.rejectionReason && (
                  <Text
                    style={[
                      styles.approvalText,
                      { marginTop: spacing.sm, fontStyle: "italic" },
                    ]}
                  >
                    Reason: {reportData.rejectionReason}
                  </Text>
                )}
              </Card.Content>
            </Card>
          </View>
        )}

        {/* Receipts Section */}
        <View style={styles.receiptsSection}>
          <Text style={styles.sectionTitle}>
            Receipts ({(reportData.receipts || detailedReceipts).length})
          </Text>
          {(reportData.receipts || detailedReceipts).map(renderReceiptCard)}
        </View>

        {/* Action Buttons */}
        {canApprove && reportData.status === "submitted" && (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              style={[styles.actionButton, styles.approveButton]}
              onPress={() => {
                // TODO: Implement approval action
                Alert.alert(
                  "Approve Report",
                  "Approval functionality will be implemented"
                );
              }}
              icon="checkmark"
            >
              Approve Report
            </Button>
            <Button
              mode="outlined"
              style={[styles.actionButton, styles.rejectButton]}
              textColor={theme.colors.error}
              onPress={() => {
                // TODO: Implement rejection action
                Alert.alert(
                  "Reject Report",
                  "Rejection functionality will be implemented"
                );
              }}
              icon="close"
            >
              Reject Report
            </Button>
          </View>
        )}

        {/* Edit Button for Draft Reports */}
        {isOwner && reportData.status === "draft" && (
          <View style={styles.actionButtons}>
            <Button
              mode="contained"
              style={styles.actionButton}
              onPress={() =>
                navigation.navigate("CreateExpenseReport", {
                  editReport: reportData,
                })
              }
              icon="pencil"
            >
              Edit Report
            </Button>
            <Button
              mode="outlined"
              style={styles.actionButton}
              onPress={() => {
                // TODO: Submit report for approval
                Alert.alert(
                  "Submit Report",
                  "Submit for approval functionality will be implemented"
                );
              }}
              icon="send"
            >
              Submit for Approval
            </Button>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
