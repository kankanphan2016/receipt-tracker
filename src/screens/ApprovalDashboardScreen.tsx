import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  Card,
  Button,
  TextInput,
  Chip,
  Avatar,
  Divider,
  ProgressBar,
  Badge,
  Menu,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

// Mock data for pending approvals - replace with API calls
const MOCK_PENDING_REPORTS = [
  {
    id: "report-006",
    title: "Calgary-Edmonton Route Week 47",
    employee: {
      id: "emp-001",
      name: "John Martinez",
      avatar: null,
      employeeId: "EMP-001",
      department: "Transportation",
    },
    type: "trip",
    totalAmount: 3847.9,
    receiptCount: 18,
    submittedDate: "2024-11-20T10:30:00Z",
    urgency: "high",
    vehicleId: "TRUCK-018",
    route: "Calgary → Edmonton → Fort McMurray",
    receipts: [
      {
        id: "r1",
        merchant: "Petro-Canada",
        amount: 289.45,
        category: "Fuel",
        date: "2024-11-18",
      },
      {
        id: "r2",
        merchant: "Tim Hortons",
        amount: 24.8,
        category: "Meals",
        date: "2024-11-18",
      },
      {
        id: "r3",
        merchant: "Shell",
        amount: 312.7,
        category: "Fuel",
        date: "2024-11-19",
      },
      {
        id: "r4",
        merchant: "Boston Pizza",
        amount: 67.9,
        category: "Meals",
        date: "2024-11-19",
      },
      {
        id: "r5",
        merchant: "Days Inn",
        amount: 159.0,
        category: "Lodging",
        date: "2024-11-19",
      },
    ],
    notes:
      "Urgent delivery to Fort McMurray oil sands project. Extended route due to road construction on Highway 63.",
    daysAgo: 1,
  },
  {
    id: "report-007",
    title: "Vehicle Maintenance - TRUCK-025",
    employee: {
      id: "emp-002",
      name: "Sarah Chen",
      avatar: null,
      employeeId: "EMP-002",
      department: "Fleet Maintenance",
    },
    type: "maintenance",
    totalAmount: 2156.8,
    receiptCount: 8,
    submittedDate: "2024-11-19T14:22:00Z",
    urgency: "medium",
    vehicleId: "TRUCK-025",
    receipts: [
      {
        id: "r6",
        merchant: "Kenworth Parts",
        amount: 847.5,
        category: "Parts",
        date: "2024-11-18",
      },
      {
        id: "r7",
        merchant: "Mike's Truck Service",
        amount: 650.0,
        category: "Labor",
        date: "2024-11-19",
      },
      {
        id: "r8",
        merchant: "NAPA Auto Parts",
        amount: 234.8,
        category: "Parts",
        date: "2024-11-19",
      },
    ],
    notes:
      "Emergency brake system repair. Truck was out of service for 2 days. All safety inspections passed.",
    daysAgo: 2,
  },
  {
    id: "report-008",
    title: "Safety Equipment Quarterly Purchase",
    employee: {
      id: "emp-003",
      name: "Mike Thompson",
      avatar: null,
      employeeId: "EMP-003",
      department: "Safety & Compliance",
    },
    type: "equipment",
    totalAmount: 1847.65,
    receiptCount: 12,
    submittedDate: "2024-11-18T09:15:00Z",
    urgency: "low",
    receipts: [
      {
        id: "r9",
        merchant: "Safety Supply Co",
        amount: 456.8,
        category: "Safety Gear",
        date: "2024-11-15",
      },
      {
        id: "r10",
        merchant: "Industrial Safety",
        amount: 289.9,
        category: "Equipment",
        date: "2024-11-16",
      },
      {
        id: "r11",
        merchant: "ProSafe Equipment",
        amount: 378.45,
        category: "Safety Gear",
        date: "2024-11-17",
      },
    ],
    notes:
      "Quarterly safety equipment replenishment for all drivers. Includes hi-vis vests, hard hats, and emergency kits.",
    daysAgo: 3,
  },
  {
    id: "report-009",
    title: "Toronto-Windsor Express Run",
    employee: {
      id: "emp-004",
      name: "Lisa Rodriguez",
      avatar: null,
      employeeId: "EMP-004",
      department: "Transportation",
    },
    type: "trip",
    totalAmount: 945.3,
    receiptCount: 6,
    submittedDate: "2024-11-17T16:45:00Z",
    urgency: "medium",
    vehicleId: "TRUCK-012",
    route: "Toronto → London → Windsor",
    receipts: [
      {
        id: "r12",
        merchant: "Esso",
        amount: 267.8,
        category: "Fuel",
        date: "2024-11-16",
      },
      {
        id: "r13",
        merchant: "McDonald's",
        amount: 18.9,
        category: "Meals",
        date: "2024-11-16",
      },
      {
        id: "r14",
        merchant: "Subway",
        amount: 24.5,
        category: "Meals",
        date: "2024-11-17",
      },
    ],
    notes:
      "Express delivery for automotive parts to Windsor assembly plant. Same-day delivery completed successfully.",
    daysAgo: 4,
  },
];

const URGENCY_CONFIG = {
  high: {
    color: "#ef4444",
    bgColor: "#fee2e2",
    label: "Urgent",
    icon: "warning",
  },
  medium: {
    color: "#f59e0b",
    bgColor: "#fef3c7",
    label: "Medium",
    icon: "time",
  },
  low: {
    color: "#10b981",
    bgColor: "#d1fae5",
    label: "Low",
    icon: "checkmark-circle",
  },
};

const REPORT_TYPES = {
  trip: { icon: "car", label: "Trip", color: "#3b82f6" },
  maintenance: { icon: "construct", label: "Maintenance", color: "#ef4444" },
  equipment: { icon: "hardware-chip", label: "Equipment", color: "#f59e0b" },
  monthly: { icon: "calendar", label: "Monthly", color: "#10b981" },
};

export default function ApprovalDashboardScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [pendingReports, setPendingReports] = useState(MOCK_PENDING_REPORTS);
  const [filteredReports, setFilteredReports] = useState(MOCK_PENDING_REPORTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState("approve"); // "approve" or "reject"
  const [approvalComment, setApprovalComment] = useState("");
  const [processing, setProcessing] = useState(false);
  const [selectedUrgency, setSelectedUrgency] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("urgency");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  useEffect(() => {
    loadPendingReports();
  }, []);

  useEffect(() => {
    filterAndSortReports();
  }, [pendingReports, selectedUrgency, selectedType, sortBy]);

  const loadPendingReports = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const pending = await apiService.getPendingExpenseReports();
      // setPendingReports(pending);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      setPendingReports(MOCK_PENDING_REPORTS);
    } catch (error) {
      console.error("Error loading pending reports:", error);
      Alert.alert("Error", "Failed to load pending reports");
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPendingReports();
    setRefreshing(false);
  };

  const filterAndSortReports = () => {
    let filtered = [...pendingReports];

    // Filter by urgency
    if (selectedUrgency !== "all") {
      filtered = filtered.filter(
        (report) => report.urgency === selectedUrgency
      );
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((report) => report.type === selectedType);
    }

    // Sort reports
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "urgency":
          const urgencyOrder = { high: 3, medium: 2, low: 1 };
          return urgencyOrder[b.urgency] - urgencyOrder[a.urgency];
        case "amount_high":
          return b.totalAmount - a.totalAmount;
        case "amount_low":
          return a.totalAmount - b.totalAmount;
        case "newest":
          return new Date(b.submittedDate) - new Date(a.submittedDate);
        case "oldest":
          return new Date(a.submittedDate) - new Date(b.submittedDate);
        case "employee":
          return a.employee.name.localeCompare(b.employee.name);
        default:
          return 0;
      }
    });

    setFilteredReports(filtered);
  };

  const handleApprovalAction = (report, action) => {
    setSelectedReport(report);
    setApprovalAction(action);
    setApprovalComment("");
    setShowApprovalModal(true);
  };

  const processApproval = async () => {
    if (approvalAction === "reject" && !approvalComment.trim()) {
      Alert.alert("Comment Required", "Please provide a reason for rejection");
      return;
    }

    try {
      setProcessing(true);

      // TODO: Call API to approve/reject report
      // await apiService.processExpenseReport({
      //   reportId: selectedReport.id,
      //   action: approvalAction,
      //   comment: approvalComment,
      //   approvedBy: user.id
      // });

      // Remove from pending list
      setPendingReports((prev) =>
        prev.filter((r) => r.id !== selectedReport.id)
      );

      const actionText = approvalAction === "approve" ? "approved" : "rejected";
      Alert.alert("Success", `Expense report ${actionText} successfully!`, [
        {
          text: "OK",
          onPress: () => {
            setShowApprovalModal(false);
            setSelectedReport(null);
          },
        },
      ]);
    } catch (error) {
      console.error("Error processing approval:", error);
      Alert.alert("Error", "Failed to process approval. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const bulkApprove = () => {
    Alert.alert(
      "Bulk Approve",
      `Approve all ${filteredReports.length} filtered reports?`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Approve All", onPress: performBulkApprove },
      ]
    );
  };

  const performBulkApprove = async () => {
    try {
      setLoading(true);

      // TODO: Call API for bulk approval
      // await apiService.bulkApproveReports(filteredReports.map(r => r.id));

      // Remove all approved reports from pending list
      const approvedIds = new Set(filteredReports.map((r) => r.id));
      setPendingReports((prev) => prev.filter((r) => !approvedIds.has(r.id)));

      Alert.alert(
        "Success",
        `${filteredReports.length} reports approved successfully!`
      );
    } catch (error) {
      console.error("Error in bulk approval:", error);
      Alert.alert("Error", "Failed to process bulk approval");
    } finally {
      setLoading(false);
    }
  };

  const renderPendingReportCard = (report) => {
    const urgencyConfig = URGENCY_CONFIG[report.urgency];
    const typeConfig = REPORT_TYPES[report.type];

    return (
      <Card key={report.id} style={styles.reportCard}>
        <Card.Content>
          {/* Header */}
          <View style={styles.reportHeader}>
            <View style={styles.employeeInfo}>
              <Avatar.Text
                size={40}
                label={report.employee.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")}
                style={{ backgroundColor: theme.colors.primary }}
              />
              <View style={styles.employeeDetails}>
                <Text style={styles.employeeName}>{report.employee.name}</Text>
                <Text style={styles.employeeId}>
                  {report.employee.employeeId} • {report.employee.department}
                </Text>
              </View>
            </View>
            <View style={styles.reportAmount}>
              <Text style={styles.amountText}>
                ${report.totalAmount.toFixed(2)}
              </Text>
              <Badge
                style={[
                  styles.urgencyBadge,
                  { backgroundColor: urgencyConfig.color },
                ]}
              >
                {urgencyConfig.label}
              </Badge>
            </View>
          </View>

          {/* Report Info */}
          <View style={styles.reportInfo}>
            <Text style={styles.reportTitle}>{report.title}</Text>
            <View style={styles.reportMeta}>
              <Chip
                icon={typeConfig.icon}
                style={[
                  styles.typeChip,
                  { backgroundColor: typeConfig.color + "20" },
                ]}
                textStyle={{ color: typeConfig.color, fontSize: 12 }}
                compact
              >
                {typeConfig.label}
              </Chip>
              <View style={styles.metaInfo}>
                <Text style={styles.metaText}>
                  {report.receiptCount} receipts
                </Text>
                <Text style={styles.metaText}>•</Text>
                <Text style={styles.metaText}>
                  {report.daysAgo} day{report.daysAgo !== 1 ? "s" : ""} ago
                </Text>
              </View>
            </View>
          </View>

          {/* Vehicle & Route */}
          {(report.vehicleId || report.route) && (
            <View style={styles.tripInfo}>
              {report.vehicleId && (
                <View style={styles.tripDetail}>
                  <Ionicons name="car" size={16} color={theme.colors.primary} />
                  <Text style={styles.tripText}>{report.vehicleId}</Text>
                </View>
              )}
              {report.route && (
                <View style={styles.tripDetail}>
                  <Ionicons
                    name="navigate"
                    size={16}
                    color={theme.colors.primary}
                  />
                  <Text style={styles.tripText} numberOfLines={1}>
                    {report.route}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Notes */}
          {report.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>
                {report.notes}
              </Text>
            </View>
          )}

          {/* Receipt Preview */}
          <View style={styles.receiptsPreview}>
            <Text style={styles.receiptsTitle}>Recent Receipts:</Text>
            {report.receipts.slice(0, 3).map((receipt, index) => (
              <View key={receipt.id} style={styles.receiptPreviewItem}>
                <Text style={styles.receiptMerchant}>{receipt.merchant}</Text>
                <Text style={styles.receiptAmount}>
                  ${receipt.amount.toFixed(2)}
                </Text>
              </View>
            ))}
            {report.receipts.length > 3 && (
              <Text style={styles.moreReceipts}>
                +{report.receipts.length - 3} more receipts
              </Text>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <Button
              mode="outlined"
              onPress={() =>
                navigation.navigate("ExpenseReportDetail", {
                  report: { ...report, status: "submitted" },
                })
              }
              style={styles.viewButton}
              icon="eye"
              compact
            >
              View Details
            </Button>
            <Button
              mode="contained"
              onPress={() => handleApprovalAction(report, "approve")}
              style={styles.approveButton}
              buttonColor={theme.colors.success}
              icon="checkmark"
              compact
            >
              Approve
            </Button>
            <Button
              mode="outlined"
              onPress={() => handleApprovalAction(report, "reject")}
              style={styles.rejectButton}
              textColor={theme.colors.error}
              icon="close"
              compact
            >
              Reject
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const getUrgencyCounts = () => {
    return {
      all: pendingReports.length,
      high: pendingReports.filter((r) => r.urgency === "high").length,
      medium: pendingReports.filter((r) => r.urgency === "medium").length,
      low: pendingReports.filter((r) => r.urgency === "low").length,
    };
  };

  const urgencyCounts = getUrgencyCounts();

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
      fontSize: 24,
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
    statsContainer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      marginTop: -spacing.md,
    },
    statsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
    },
    statsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: spacing.md,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
    filtersContainer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    filtersRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    filterButton: {
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: theme.colors.surface,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline + "30",
    },
    filterButtonText: {
      fontSize: 14,
      color: theme.colors.text,
      marginLeft: spacing.xs,
    },
    bulkApproveButton: {
      backgroundColor: theme.colors.success + "20",
      borderColor: theme.colors.success,
    },
    urgencyFilters: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    urgencyChip: {
      minWidth: 60,
    },
    reportsContainer: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    reportCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginBottom: spacing.lg,
    },
    reportHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.md,
    },
    employeeInfo: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    employeeDetails: {
      marginLeft: spacing.md,
      flex: 1,
    },
    employeeName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    employeeId: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
    reportAmount: {
      alignItems: "flex-end",
    },
    amountText: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    urgencyBadge: {
      fontSize: 10,
    },
    reportInfo: {
      marginBottom: spacing.md,
    },
    reportTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    reportMeta: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    typeChip: {
      height: 28,
    },
    metaInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
    },
    metaText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    tripInfo: {
      marginBottom: spacing.md,
    },
    tripDetail: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginBottom: spacing.xs,
    },
    tripText: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    notesContainer: {
      backgroundColor: theme.colors.outline + "10",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.md,
    },
    notesText: {
      fontSize: 14,
      color: theme.colors.text,
      fontStyle: "italic",
    },
    receiptsPreview: {
      marginBottom: spacing.md,
    },
    receiptsTitle: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    receiptPreviewItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: borderRadius.sm,
      marginBottom: spacing.xs,
    },
    receiptMerchant: {
      fontSize: 14,
      color: theme.colors.text,
      flex: 1,
    },
    receiptAmount: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    moreReceipts: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      fontStyle: "italic",
      textAlign: "center",
      marginTop: spacing.xs,
    },
    actionButtons: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    viewButton: {
      flex: 1,
    },
    approveButton: {
      flex: 1,
    },
    rejectButton: {
      flex: 1,
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
    emptyContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      paddingTop: spacing.xl * 2,
    },
    emptyText: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginTop: spacing.md,
      marginBottom: spacing.sm,
    },
    emptySubtext: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    // Modal Styles
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContent: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      margin: spacing.lg,
      maxWidth: width - spacing.lg * 2,
      width: "100%",
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      flex: 1,
      marginLeft: spacing.md,
    },
    modalReportInfo: {
      backgroundColor: theme.colors.outline + "10",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      marginBottom: spacing.lg,
    },
    modalReportTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    modalReportAmount: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    commentInput: {
      marginBottom: spacing.lg,
    },
    modalActions: {
      flexDirection: "row",
      gap: spacing.md,
    },
    modalButton: {
      flex: 1,
    },
  });

  if (loading && pendingReports.length === 0) {
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
            <Text style={styles.headerTitle}>Pending Approvals</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading pending reports...</Text>
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
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => navigation.navigate("ExpenseAnalytics")}
            >
              <Ionicons name="analytics-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredReports.length} of {pendingReports.length} reports pending
          review
        </Text>
      </LinearGradient>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <Card style={styles.statsCard}>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: URGENCY_CONFIG.high.color }]}
              >
                {urgencyCounts.high}
              </Text>
              <Text style={styles.statLabel}>Urgent</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: URGENCY_CONFIG.medium.color },
                ]}
              >
                {urgencyCounts.medium}
              </Text>
              <Text style={styles.statLabel}>Medium</Text>
            </View>
            <View style={styles.statItem}>
              <Text
                style={[styles.statValue, { color: URGENCY_CONFIG.low.color }]}
              >
                {urgencyCounts.low}
              </Text>
              <Text style={styles.statLabel}>Low</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{urgencyCounts.all}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </Card>
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <View style={styles.filtersRow}>
          <Menu
            visible={showFilterMenu}
            onDismiss={() => setShowFilterMenu(false)}
            anchor={
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => setShowFilterMenu(true)}
              >
                <Ionicons
                  name="filter-outline"
                  size={16}
                  color={theme.colors.text}
                />
                <Text style={styles.filterButtonText}>Sort & Filter</Text>
              </TouchableOpacity>
            }
          >
            <Menu.Item
              title="Urgency Priority"
              onPress={() => {
                setSortBy("urgency");
                setShowFilterMenu(false);
              }}
            />
            <Menu.Item
              title="Highest Amount"
              onPress={() => {
                setSortBy("amount_high");
                setShowFilterMenu(false);
              }}
            />
            <Menu.Item
              title="Lowest Amount"
              onPress={() => {
                setSortBy("amount_low");
                setShowFilterMenu(false);
              }}
            />
            <Menu.Item
              title="Newest First"
              onPress={() => {
                setSortBy("newest");
                setShowFilterMenu(false);
              }}
            />
            <Menu.Item
              title="Oldest First"
              onPress={() => {
                setSortBy("oldest");
                setShowFilterMenu(false);
              }}
            />
            <Menu.Item
              title="Employee Name"
              onPress={() => {
                setSortBy("employee");
                setShowFilterMenu(false);
              }}
            />
          </Menu>

          {filteredReports.length > 0 && (
            <TouchableOpacity
              style={[styles.filterButton, styles.bulkApproveButton]}
              onPress={bulkApprove}
            >
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color={theme.colors.success}
              />
              <Text
                style={[
                  styles.filterButtonText,
                  { color: theme.colors.success },
                ]}
              >
                Approve All ({filteredReports.length})
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.urgencyFilters}
        >
          {Object.entries({ all: "All", ...URGENCY_CONFIG }).map(
            ([urgency, config]) => (
              <Chip
                key={urgency}
                selected={selectedUrgency === urgency}
                onPress={() => setSelectedUrgency(urgency)}
                style={styles.urgencyChip}
                compact
              >
                {urgency === "all" ? "All" : config.label} (
                {urgencyCounts[urgency] || 0})
              </Chip>
            )
          )}
        </ScrollView>
      </View>

      {/* Reports List */}
      <ScrollView
        style={styles.reportsContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {filteredReports.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons
              name="checkmark-done-circle-outline"
              size={64}
              color={theme.colors.success}
            />
            <Text style={styles.emptyText}>All Caught Up!</Text>
            <Text style={styles.emptySubtext}>
              No expense reports pending approval at this time
            </Text>
          </View>
        ) : (
          filteredReports.map(renderPendingReportCard)
        )}
      </ScrollView>

      {/* Approval/Rejection Modal */}
      <Modal
        visible={showApprovalModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowApprovalModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons
                name={
                  approvalAction === "approve"
                    ? "checkmark-circle"
                    : "close-circle"
                }
                size={24}
                color={
                  approvalAction === "approve"
                    ? theme.colors.success
                    : theme.colors.error
                }
              />
              <Text style={styles.modalTitle}>
                {approvalAction === "approve" ? "Approve" : "Reject"} Expense
                Report
              </Text>
              <TouchableOpacity onPress={() => setShowApprovalModal(false)}>
                <Ionicons name="close" size={24} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            {selectedReport && (
              <View style={styles.modalReportInfo}>
                <Text style={styles.modalReportTitle}>
                  {selectedReport.title}
                </Text>
                <Text style={styles.modalReportAmount}>
                  ${selectedReport.totalAmount.toFixed(2)} •{" "}
                  {selectedReport.employee.name}
                </Text>
              </View>
            )}

            <TextInput
              label={
                approvalAction === "approve"
                  ? "Approval Comments (Optional)"
                  : "Rejection Reason *"
              }
              value={approvalComment}
              onChangeText={setApprovalComment}
              mode="outlined"
              multiline
              numberOfLines={3}
              style={styles.commentInput}
              placeholder={
                approvalAction === "approve"
                  ? "Add any notes about this approval..."
                  : "Please explain why this report is being rejected..."
              }
            />

            <View style={styles.modalActions}>
              <Button
                mode="outlined"
                onPress={() => setShowApprovalModal(false)}
                style={styles.modalButton}
                disabled={processing}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={processApproval}
                style={styles.modalButton}
                loading={processing}
                disabled={processing}
                buttonColor={
                  approvalAction === "approve"
                    ? theme.colors.success
                    : theme.colors.error
                }
              >
                {processing
                  ? `${
                      approvalAction === "approve" ? "Approving" : "Rejecting"
                    }...`
                  : `${
                      approvalAction === "approve" ? "Approve" : "Reject"
                    } Report`}
              </Button>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
