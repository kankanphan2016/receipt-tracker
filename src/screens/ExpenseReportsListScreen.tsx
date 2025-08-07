import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from "react-native";
import {
  Card,
  Button,
  Chip,
  FAB,
  Searchbar,
  Menu,
  ProgressBar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

// Mock data - replace with API calls to your backend
const MOCK_EXPENSE_REPORTS = [
  {
    id: "report-001",
    title: "Montreal-Toronto Trip Oct 2024",
    type: "trip",
    status: "approved",
    totalAmount: 2847.65,
    receiptCount: 12,
    submittedDate: "2024-10-28",
    approvedDate: "2024-10-30",
    approvedBy: "Sarah Johnson",
    vehicleId: "TRUCK-042",
    route: "Montreal → Toronto → Ottawa",
  },
  {
    id: "report-002",
    title: "Vehicle Maintenance - November",
    type: "maintenance",
    status: "pending",
    totalAmount: 1543.2,
    receiptCount: 6,
    submittedDate: "2024-11-15",
    vehicleId: "TRUCK-042",
  },
  {
    id: "report-003",
    title: "Weekly Fuel & Meals",
    type: "monthly",
    status: "rejected",
    totalAmount: 892.3,
    receiptCount: 8,
    submittedDate: "2024-11-10",
    rejectedDate: "2024-11-12",
    rejectedBy: "Mike Chen",
    rejectionReason: "Missing fuel receipts for Nov 8-9",
  },
  {
    id: "report-004",
    title: "Safety Equipment Purchase",
    type: "equipment",
    status: "draft",
    totalAmount: 567.8,
    receiptCount: 4,
    lastModified: "2024-11-20",
  },
  {
    id: "report-005",
    title: "Vancouver Route - Week 46",
    type: "trip",
    status: "submitted",
    totalAmount: 3210.45,
    receiptCount: 15,
    submittedDate: "2024-11-18",
    route: "Toronto → Winnipeg → Vancouver",
    vehicleId: "TRUCK-031",
  },
];

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
  trip: { icon: "car", label: "Trip", color: "#3b82f6" },
  maintenance: { icon: "construct", label: "Maintenance", color: "#ef4444" },
  monthly: { icon: "calendar", label: "Monthly", color: "#10b981" },
  equipment: { icon: "hardware-chip", label: "Equipment", color: "#f59e0b" },
  other: { icon: "briefcase", label: "Other", color: "#8b5cf6" },
};

export default function ExpenseReportsListScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [reports, setReports] = useState(MOCK_EXPENSE_REPORTS);
  const [filteredReports, setFilteredReports] = useState(MOCK_EXPENSE_REPORTS);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  // Check if user is manager for approval features
  const isManager = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    loadReports();
  }, []);

  useEffect(() => {
    filterAndSortReports();
  }, [reports, searchQuery, selectedStatus, selectedType, sortBy]);

  const loadReports = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const userReports = await apiService.getExpenseReports(user.id);
      // setReports(userReports);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      setReports(MOCK_EXPENSE_REPORTS);
    } catch (error) {
      console.error("Error loading expense reports:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadReports();
    setRefreshing(false);
  };

  const filterAndSortReports = () => {
    let filtered = [...reports];

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (report) =>
          report.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.vehicleId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          report.route?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filter by status
    if (selectedStatus !== "all") {
      filtered = filtered.filter((report) => report.status === selectedStatus);
    }

    // Filter by type
    if (selectedType !== "all") {
      filtered = filtered.filter((report) => report.type === selectedType);
    }

    // Sort reports
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return (
            new Date(b.submittedDate || b.lastModified) -
            new Date(a.submittedDate || a.lastModified)
          );
        case "oldest":
          return (
            new Date(a.submittedDate || a.lastModified) -
            new Date(b.submittedDate || b.lastModified)
          );
        case "amount_high":
          return b.totalAmount - a.totalAmount;
        case "amount_low":
          return a.totalAmount - b.totalAmount;
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredReports(filtered);
  };

  const getStatusCounts = () => {
    return {
      all: reports.length,
      draft: reports.filter((r) => r.status === "draft").length,
      submitted:
        reports.filter((r) => r.status === "submitted").length +
        reports.filter((r) => r.status === "pending").length,
      approved: reports.filter((r) => r.status === "approved").length,
      rejected: reports.filter((r) => r.status === "rejected").length,
    };
  };

  const renderReportCard = (report) => {
    const statusConfig = STATUS_CONFIG[report.status];
    const typeConfig = REPORT_TYPES[report.type];

    return (
      <TouchableOpacity
        key={report.id}
        onPress={() => navigation.navigate("ExpenseReportDetail", { report })}
      >
        <Card style={styles.reportCard}>
          <Card.Content>
            {/* Header Row */}
            <View style={styles.reportHeader}>
              <View style={styles.reportTitleContainer}>
                <Text style={styles.reportTitle} numberOfLines={1}>
                  {report.title}
                </Text>
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
                  <Chip
                    icon={statusConfig.icon}
                    style={[
                      styles.statusChip,
                      { backgroundColor: statusConfig.bgColor },
                    ]}
                    textStyle={{
                      color: statusConfig.color,
                      fontSize: 12,
                      fontWeight: "600",
                    }}
                    compact
                  >
                    {statusConfig.label}
                  </Chip>
                </View>
              </View>
              <Text style={styles.reportAmount}>
                ${report.totalAmount.toFixed(2)}
              </Text>
            </View>

            {/* Details Row */}
            <View style={styles.reportDetails}>
              <View style={styles.detailItem}>
                <Ionicons
                  name="receipt-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.detailText}>
                  {report.receiptCount} receipts
                </Text>
              </View>

              {report.vehicleId && (
                <View style={styles.detailItem}>
                  <Ionicons
                    name="car-outline"
                    size={16}
                    color={theme.colors.textSecondary}
                  />
                  <Text style={styles.detailText}>{report.vehicleId}</Text>
                </View>
              )}

              <View style={styles.detailItem}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color={theme.colors.textSecondary}
                />
                <Text style={styles.detailText}>
                  {report.status === "draft"
                    ? `Modified ${new Date(
                        report.lastModified
                      ).toLocaleDateString()}`
                    : `Submitted ${new Date(
                        report.submittedDate
                      ).toLocaleDateString()}`}
                </Text>
              </View>
            </View>

            {/* Route or Status Info */}
            {report.route && (
              <View style={styles.routeContainer}>
                <Ionicons
                  name="navigate-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={styles.routeText} numberOfLines={1}>
                  {report.route}
                </Text>
              </View>
            )}

            {/* Approval/Rejection Info */}
            {report.status === "approved" && (
              <View style={styles.approvalInfo}>
                <Ionicons
                  name="checkmark-circle"
                  size={16}
                  color={STATUS_CONFIG.approved.color}
                />
                <Text style={styles.approvalText}>
                  Approved by {report.approvedBy} on{" "}
                  {new Date(report.approvedDate).toLocaleDateString()}
                </Text>
              </View>
            )}

            {report.status === "rejected" && (
              <View style={styles.rejectionInfo}>
                <Ionicons
                  name="close-circle"
                  size={16}
                  color={STATUS_CONFIG.rejected.color}
                />
                <Text style={styles.rejectionText}>
                  Rejected: {report.rejectionReason}
                </Text>
              </View>
            )}
          </Card.Content>
        </Card>
      </TouchableOpacity>
    );
  };

  const statusCounts = getStatusCounts();

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
    searchContainer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.md,
      marginTop: -spacing.md,
    },
    searchBar: {
      elevation: 0,
      backgroundColor: theme.colors.surface,
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
    statusFilters: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    statusFilterChip: {
      minWidth: 70,
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
      marginBottom: spacing.md,
    },
    reportHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      marginBottom: spacing.md,
    },
    reportTitleContainer: {
      flex: 1,
      marginRight: spacing.md,
    },
    reportTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    reportMeta: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    typeChip: {
      height: 28,
    },
    statusChip: {
      height: 28,
    },
    reportAmount: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    reportDetails: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.md,
      marginBottom: spacing.sm,
    },
    detailItem: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
    },
    detailText: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    routeContainer: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: theme.colors.primary + "10",
      borderRadius: borderRadius.sm,
    },
    routeText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
      flex: 1,
    },
    approvalInfo: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: STATUS_CONFIG.approved.bgColor,
      borderRadius: borderRadius.sm,
    },
    approvalText: {
      fontSize: 14,
      color: STATUS_CONFIG.approved.color,
      fontWeight: "500",
    },
    rejectionInfo: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: spacing.sm,
      marginTop: spacing.sm,
      padding: spacing.sm,
      backgroundColor: STATUS_CONFIG.rejected.bgColor,
      borderRadius: borderRadius.sm,
    },
    rejectionText: {
      fontSize: 14,
      color: STATUS_CONFIG.rejected.color,
      fontWeight: "500",
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
      marginBottom: spacing.xl,
    },
    fab: {
      position: "absolute",
      right: spacing.lg,
      bottom: spacing.lg,
    },
    quickStatsContainer: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    quickStatsCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 1,
    },
    quickStatsGrid: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingVertical: spacing.md,
    },
    quickStatItem: {
      alignItems: "center",
    },
    quickStatValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    quickStatLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: spacing.xs,
    },
  });

  if (loading && reports.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[theme.colors.primary, theme.colors.secondary]}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Expense Reports</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text style={styles.loadingText}>
            Loading your expense reports...
          </Text>
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
          <Text style={styles.headerTitle}>Expense Reports</Text>
          <View style={styles.headerActions}>
            {isManager && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={() => navigation.navigate("ApprovalDashboard")}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => navigation.navigate("ExpenseAnalytics")}
            >
              <Ionicons name="analytics-outline" size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          {filteredReports.length} of {reports.length} reports
        </Text>
      </LinearGradient>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search reports, vehicles, routes..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchBar}
        />
      </View>

      {/* Quick Stats */}
      <View style={styles.quickStatsContainer}>
        <Card style={styles.quickStatsCard}>
          <View style={styles.quickStatsGrid}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{statusCounts.draft}</Text>
              <Text style={styles.quickStatLabel}>Drafts</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>
                {statusCounts.submitted}
              </Text>
              <Text style={styles.quickStatLabel}>Pending</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{statusCounts.approved}</Text>
              <Text style={styles.quickStatLabel}>Approved</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{statusCounts.rejected}</Text>
              <Text style={styles.quickStatLabel}>Rejected</Text>
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
          </Menu>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.statusFilters}
        >
          {Object.entries({ all: "All", ...STATUS_CONFIG }).map(
            ([status, config]) => (
              <Chip
                key={status}
                selected={selectedStatus === status}
                onPress={() => setSelectedStatus(status)}
                style={styles.statusFilterChip}
                compact
              >
                {status === "all" ? "All" : config.label} (
                {statusCounts[status] || 0})
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
              name="document-text-outline"
              size={64}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.emptyText}>No Expense Reports</Text>
            <Text style={styles.emptySubtext}>
              {searchQuery || selectedStatus !== "all"
                ? "No reports match your current filters"
                : "Create your first expense report to get started"}
            </Text>
            {!searchQuery && selectedStatus === "all" && (
              <Button
                mode="contained"
                onPress={() => navigation.navigate("CreateExpenseReport")}
                icon="plus"
              >
                Create First Report
              </Button>
            )}
          </View>
        ) : (
          filteredReports.map(renderReportCard)
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => navigation.navigate("CreateExpenseReport")}
        label="New Report"
      />
    </View>
  );
}
