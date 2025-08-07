import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  RefreshControl,
} from "react-native";
import {
  Card,
  Button,
  Chip,
  Segmented,
  Menu,
  DataTable,
  ProgressBar,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, BarChart, PieChart } from "react-native-chart-kit";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";

const { width } = Dimensions.get("window");

// Mock analytics data - replace with API calls
const MOCK_ANALYTICS_DATA = {
  summary: {
    totalExpenses: 45678.9,
    monthlyExpenses: 8934.5,
    avgPerTrip: 1247.8,
    pendingApprovals: 12,
    approvalRate: 94.2,
    topSpendingCategory: "Fuel",
    monthlyChange: 12.5, // percentage
  },
  monthlyTrend: {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    datasets: [
      {
        data: [6500, 7200, 8100, 7800, 8934, 9200],
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
      },
    ],
  },
  categoryBreakdown: {
    labels: ["Fuel", "Meals", "Lodging", "Maintenance", "Tolls", "Equipment"],
    datasets: [
      {
        data: [18500, 4200, 3800, 12400, 2100, 4678],
      },
    ],
  },
  categoryPieData: [
    {
      name: "Fuel",
      population: 18500,
      color: "#3b82f6",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Maintenance",
      population: 12400,
      color: "#ef4444",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Equipment",
      population: 4678,
      color: "#f59e0b",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Meals",
      population: 4200,
      color: "#10b981",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Lodging",
      population: 3800,
      color: "#8b5cf6",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
    {
      name: "Tolls",
      population: 2100,
      color: "#f97316",
      legendFontColor: "#333",
      legendFontSize: 12,
    },
  ],
  topEmployees: [
    {
      name: "John Martinez",
      department: "Transportation",
      totalSpent: 8945.6,
      reportCount: 12,
      avgPerReport: 745.47,
    },
    {
      name: "Sarah Chen",
      department: "Fleet Maintenance",
      totalSpent: 7234.8,
      reportCount: 8,
      avgPerReport: 904.35,
    },
    {
      name: "Mike Thompson",
      department: "Safety & Compliance",
      totalSpent: 5678.9,
      reportCount: 15,
      avgPerReport: 378.59,
    },
    {
      name: "Lisa Rodriguez",
      department: "Transportation",
      totalSpent: 4832.5,
      reportCount: 10,
      avgPerReport: 483.25,
    },
    {
      name: "David Kim",
      department: "Transportation",
      totalSpent: 4123.4,
      reportCount: 9,
      avgPerReport: 458.16,
    },
  ],
  vehicleExpenses: [
    {
      vehicleId: "TRUCK-001",
      totalExpenses: 4567.8,
      fuelCost: 2890.45,
      maintenanceCost: 1200.0,
      tripCount: 8,
    },
    {
      vehicleId: "TRUCK-018",
      totalExpenses: 4234.6,
      fuelCost: 3100.2,
      maintenanceCost: 800.0,
      tripCount: 12,
    },
    {
      vehicleId: "TRUCK-025",
      totalExpenses: 3876.9,
      fuelCost: 2456.7,
      maintenanceCost: 1420.2,
      tripCount: 6,
    },
    {
      vehicleId: "TRUCK-012",
      totalExpenses: 3567.4,
      fuelCost: 2890.4,
      maintenanceCost: 677.0,
      tripCount: 9,
    },
    {
      vehicleId: "TRUCK-031",
      totalExpenses: 3245.8,
      fuelCost: 2567.8,
      maintenanceCost: 678.0,
      tripCount: 7,
    },
  ],
  monthlyComparison: {
    thisMonth: {
      fuel: 3200,
      meals: 890,
      lodging: 650,
      maintenance: 2100,
      other: 1094,
    },
    lastMonth: {
      fuel: 2980,
      meals: 820,
      lodging: 720,
      maintenance: 1850,
      other: 1430,
    },
  },
  complianceMetrics: {
    receiptCoverage: 96.8, // % of expenses with receipts
    avgApprovalTime: 2.3, // days
    policyViolations: 3,
    overdueReports: 5,
    missingReceipts: 8,
  },
};

const TIME_PERIODS = [
  { label: "This Week", value: "week" },
  { label: "This Month", value: "month" },
  { label: "Quarter", value: "quarter" },
  { label: "Year", value: "year" },
];

const CHART_TYPES = [
  { label: "Overview", value: "overview" },
  { label: "Categories", value: "categories" },
  { label: "Employees", value: "employees" },
  { label: "Vehicles", value: "vehicles" },
  { label: "Compliance", value: "compliance" },
];

export default function ExpenseAnalyticsScreen({ navigation }) {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  const [analyticsData, setAnalyticsData] = useState(MOCK_ANALYTICS_DATA);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("month");
  const [selectedChart, setSelectedChart] = useState("overview");
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Check if user is manager for advanced analytics
  const isManager = user?.role === "admin" || user?.role === "manager";

  useEffect(() => {
    loadAnalyticsData();
  }, [selectedPeriod]);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      // TODO: Replace with actual API call
      // const analytics = await apiService.getExpenseAnalytics({
      //   period: selectedPeriod,
      //   userId: isManager ? undefined : user.id
      // });
      // setAnalyticsData(analytics);

      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 800));
      setAnalyticsData(MOCK_ANALYTICS_DATA);
    } catch (error) {
      console.error("Error loading analytics data:", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAnalyticsData();
    setRefreshing(false);
  };

  const handleExport = (format) => {
    setShowExportMenu(false);
    // TODO: Implement export functionality
    Alert.alert("Export", `Export to ${format} will be implemented`);
  };

  const renderOverviewCharts = () => (
    <>
      {/* Monthly Trend */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Expense Trend - Last 6 Months</Text>
          <LineChart
            data={analyticsData.monthlyTrend}
            width={width - spacing.lg * 4}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.text,
              style: { borderRadius: borderRadius.md },
              propsForDots: {
                r: "6",
                strokeWidth: "2",
                stroke: "#3b82f6",
              },
            }}
            bezier
            style={styles.chart}
          />
          <View style={styles.chartInsight}>
            <Ionicons
              name="trending-up"
              size={16}
              color={theme.colors.success}
            />
            <Text style={styles.insightText}>
              {analyticsData.summary.monthlyChange > 0 ? "+" : ""}
              {analyticsData.summary.monthlyChange}% vs last month
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Category Breakdown Bar Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Expenses by Category</Text>
          <BarChart
            data={analyticsData.categoryBreakdown}
            width={width - spacing.lg * 4}
            height={220}
            chartConfig={{
              backgroundColor: theme.colors.surface,
              backgroundGradientFrom: theme.colors.surface,
              backgroundGradientTo: theme.colors.surface,
              decimalPlaces: 0,
              color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
              labelColor: (opacity = 1) => theme.colors.text,
              barPercentage: 0.7,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </Card.Content>
      </Card>
    </>
  );

  const renderCategoryCharts = () => (
    <>
      {/* Pie Chart */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Category Distribution</Text>
          <PieChart
            data={analyticsData.categoryPieData}
            width={width - spacing.lg * 4}
            height={220}
            chartConfig={{
              color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="population"
            backgroundColor="transparent"
            paddingLeft="15"
            absolute
          />
        </Card.Content>
      </Card>

      {/* Month-over-Month Comparison */}
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>This Month vs Last Month</Text>
          <View style={styles.comparisonContainer}>
            {Object.entries(analyticsData.monthlyComparison.thisMonth).map(
              ([category, amount]) => {
                const lastMonthAmount =
                  analyticsData.monthlyComparison.lastMonth[category];
                const change = (
                  ((amount - lastMonthAmount) / lastMonthAmount) *
                  100
                ).toFixed(1);
                const isPositive = change > 0;

                return (
                  <View key={category} style={styles.comparisonRow}>
                    <Text style={styles.comparisonCategory}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                    <View style={styles.comparisonAmounts}>
                      <Text style={styles.comparisonCurrent}>${amount}</Text>
                      <View style={styles.comparisonChange}>
                        <Ionicons
                          name={isPositive ? "arrow-up" : "arrow-down"}
                          size={12}
                          color={
                            isPositive
                              ? theme.colors.error
                              : theme.colors.success
                          }
                        />
                        <Text
                          style={[
                            styles.comparisonPercentage,
                            {
                              color: isPositive
                                ? theme.colors.error
                                : theme.colors.success,
                            },
                          ]}
                        >
                          {Math.abs(change)}%
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              }
            )}
          </View>
        </Card.Content>
      </Card>
    </>
  );

  const renderEmployeesCharts = () => (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>Top Spending Employees</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Employee</DataTable.Title>
            <DataTable.Title numeric>Total</DataTable.Title>
            <DataTable.Title numeric>Reports</DataTable.Title>
            <DataTable.Title numeric>Avg/Report</DataTable.Title>
          </DataTable.Header>
          {analyticsData.topEmployees.slice(0, 5).map((employee, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell style={{ flex: 2 }}>
                <View>
                  <Text style={styles.employeeName}>{employee.name}</Text>
                  <Text style={styles.employeeDept}>{employee.department}</Text>
                </View>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={styles.amountText}>
                  ${employee.totalSpent.toFixed(0)}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>{employee.reportCount}</DataTable.Cell>
              <DataTable.Cell numeric>
                ${employee.avgPerReport.toFixed(0)}
              </DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card.Content>
    </Card>
  );

  const renderVehiclesCharts = () => (
    <Card style={styles.chartCard}>
      <Card.Content>
        <Text style={styles.chartTitle}>Vehicle Expense Analysis</Text>
        <DataTable>
          <DataTable.Header>
            <DataTable.Title>Vehicle</DataTable.Title>
            <DataTable.Title numeric>Total</DataTable.Title>
            <DataTable.Title numeric>Fuel</DataTable.Title>
            <DataTable.Title numeric>Maintenance</DataTable.Title>
            <DataTable.Title numeric>Trips</DataTable.Title>
          </DataTable.Header>
          {analyticsData.vehicleExpenses.map((vehicle, index) => (
            <DataTable.Row key={index}>
              <DataTable.Cell>{vehicle.vehicleId}</DataTable.Cell>
              <DataTable.Cell numeric>
                <Text style={styles.amountText}>
                  ${vehicle.totalExpenses.toFixed(0)}
                </Text>
              </DataTable.Cell>
              <DataTable.Cell numeric>
                ${vehicle.fuelCost.toFixed(0)}
              </DataTable.Cell>
              <DataTable.Cell numeric>
                ${vehicle.maintenanceCost.toFixed(0)}
              </DataTable.Cell>
              <DataTable.Cell numeric>{vehicle.tripCount}</DataTable.Cell>
            </DataTable.Row>
          ))}
        </DataTable>
      </Card.Content>
    </Card>
  );

  const renderComplianceCharts = () => (
    <>
      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Compliance Metrics</Text>
          <View style={styles.complianceGrid}>
            <View style={styles.complianceItem}>
              <View style={styles.complianceHeader}>
                <Text style={styles.complianceValue}>
                  {analyticsData.complianceMetrics.receiptCoverage}%
                </Text>
                <Ionicons
                  name="receipt-outline"
                  size={24}
                  color={theme.colors.success}
                />
              </View>
              <Text style={styles.complianceLabel}>Receipt Coverage</Text>
              <ProgressBar
                progress={analyticsData.complianceMetrics.receiptCoverage / 100}
                color={theme.colors.success}
                style={styles.progressBar}
              />
            </View>

            <View style={styles.complianceItem}>
              <View style={styles.complianceHeader}>
                <Text style={styles.complianceValue}>
                  {analyticsData.complianceMetrics.avgApprovalTime}
                </Text>
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={theme.colors.primary}
                />
              </View>
              <Text style={styles.complianceLabel}>Avg Approval (days)</Text>
            </View>

            <View style={styles.complianceItem}>
              <View style={styles.complianceHeader}>
                <Text
                  style={[
                    styles.complianceValue,
                    { color: theme.colors.error },
                  ]}
                >
                  {analyticsData.complianceMetrics.policyViolations}
                </Text>
                <Ionicons
                  name="warning-outline"
                  size={24}
                  color={theme.colors.error}
                />
              </View>
              <Text style={styles.complianceLabel}>Policy Violations</Text>
            </View>

            <View style={styles.complianceItem}>
              <View style={styles.complianceHeader}>
                <Text
                  style={[
                    styles.complianceValue,
                    { color: theme.colors.warning },
                  ]}
                >
                  {analyticsData.complianceMetrics.overdueReports}
                </Text>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={theme.colors.warning}
                />
              </View>
              <Text style={styles.complianceLabel}>Overdue Reports</Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.chartCard}>
        <Card.Content>
          <Text style={styles.chartTitle}>Action Items</Text>
          <View style={styles.actionItems}>
            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={theme.colors.error}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Missing Receipts</Text>
                <Text style={styles.actionDescription}>
                  {analyticsData.complianceMetrics.missingReceipts} expenses
                  need receipt uploads
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name="time-outline"
                  size={20}
                  color={theme.colors.warning}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Overdue Approvals</Text>
                <Text style={styles.actionDescription}>
                  {analyticsData.complianceMetrics.overdueReports} reports
                  awaiting manager review
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionItem}>
              <View style={styles.actionIcon}>
                <Ionicons
                  name="shield-outline"
                  size={20}
                  color={theme.colors.primary}
                />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Policy Review</Text>
                <Text style={styles.actionDescription}>
                  Review expense policies for recent violations
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
        </Card.Content>
      </Card>
    </>
  );

  const renderChartContent = () => {
    switch (selectedChart) {
      case "overview":
        return renderOverviewCharts();
      case "categories":
        return renderCategoryCharts();
      case "employees":
        return renderEmployeesCharts();
      case "vehicles":
        return renderVehiclesCharts();
      case "compliance":
        return renderComplianceCharts();
      default:
        return renderOverviewCharts();
    }
  };

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
    summarySection: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
      marginTop: -spacing.md,
    },
    summaryCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 4,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    summaryGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      paddingVertical: spacing.lg,
    },
    summaryItem: {
      width: "48%",
      marginBottom: spacing.lg,
      alignItems: "center",
    },
    summaryValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    summaryLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    summaryChange: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.xs,
    },
    summaryChangeText: {
      fontSize: 12,
      color: theme.colors.success,
      marginLeft: spacing.xs,
    },
    controlsSection: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.lg,
    },
    periodSelector: {
      marginBottom: spacing.md,
    },
    chartSelector: {
      marginBottom: spacing.md,
    },
    chartsSection: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    chartCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      marginBottom: spacing.lg,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    chart: {
      marginVertical: spacing.sm,
      borderRadius: borderRadius.md,
    },
    chartInsight: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      marginTop: spacing.md,
      padding: spacing.sm,
      backgroundColor: theme.colors.success + "10",
      borderRadius: borderRadius.sm,
    },
    insightText: {
      fontSize: 14,
      color: theme.colors.success,
      fontWeight: "500",
      marginLeft: spacing.sm,
    },
    comparisonContainer: {
      marginTop: spacing.md,
    },
    comparisonRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outline + "20",
    },
    comparisonCategory: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      flex: 1,
    },
    comparisonAmounts: {
      alignItems: "flex-end",
    },
    comparisonCurrent: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    comparisonChange: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: spacing.xs,
    },
    comparisonPercentage: {
      fontSize: 12,
      fontWeight: "500",
      marginLeft: spacing.xs,
    },
    employeeName: {
      fontSize: 14,
      fontWeight: "500",
      color: theme.colors.text,
    },
    employeeDept: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      marginTop: 2,
    },
    amountText: {
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
    complianceGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "space-between",
      marginTop: spacing.md,
    },
    complianceItem: {
      width: "48%",
      marginBottom: spacing.lg,
    },
    complianceHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: spacing.sm,
    },
    complianceValue: {
      fontSize: 24,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    complianceLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      marginBottom: spacing.sm,
    },
    progressBar: {
      height: 6,
      borderRadius: 3,
    },
    actionItems: {
      marginTop: spacing.md,
    },
    actionItem: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.sm,
      backgroundColor: theme.colors.outline + "10",
      borderRadius: borderRadius.md,
      marginBottom: spacing.sm,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      justifyContent: "center",
      alignItems: "center",
      marginRight: spacing.md,
    },
    actionContent: {
      flex: 1,
    },
    actionTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    actionDescription: {
      fontSize: 14,
      color: theme.colors.textSecondary,
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
  });

  if (loading && !analyticsData) {
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
            <Text style={styles.headerTitle}>Expense Analytics</Text>
          </View>
        </LinearGradient>

        <View style={styles.loadingContainer}>
          <ProgressBar indeterminate color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading analytics data...</Text>
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
          <Text style={styles.headerTitle}>Expense Analytics</Text>
          <View style={styles.headerActions}>
            <Menu
              visible={showExportMenu}
              onDismiss={() => setShowExportMenu(false)}
              anchor={
                <TouchableOpacity
                  style={styles.headerActionButton}
                  onPress={() => setShowExportMenu(true)}
                >
                  <Ionicons name="download-outline" size={20} color="white" />
                </TouchableOpacity>
              }
            >
              <Menu.Item
                title="Export PDF"
                onPress={() => handleExport("PDF")}
              />
              <Menu.Item
                title="Export Excel"
                onPress={() => handleExport("Excel")}
              />
              <Menu.Item
                title="Export CSV"
                onPress={() => handleExport("CSV")}
              />
            </Menu>
          </View>
        </View>
        <Text style={styles.headerSubtitle}>
          Comprehensive expense insights and reporting
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={styles.summarySection}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryGrid}>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  ${analyticsData.summary.totalExpenses.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <View style={styles.summaryChange}>
                  <Ionicons
                    name="trending-up"
                    size={12}
                    color={theme.colors.success}
                  />
                  <Text style={styles.summaryChangeText}>
                    +{analyticsData.summary.monthlyChange}%
                  </Text>
                </View>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  ${analyticsData.summary.monthlyExpenses.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>This Month</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  ${analyticsData.summary.avgPerTrip.toLocaleString()}
                </Text>
                <Text style={styles.summaryLabel}>Avg per Trip</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {analyticsData.summary.approvalRate}%
                </Text>
                <Text style={styles.summaryLabel}>Approval Rate</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {analyticsData.summary.pendingApprovals}
                </Text>
                <Text style={styles.summaryLabel}>Pending Approvals</Text>
              </View>

              <View style={styles.summaryItem}>
                <Text style={styles.summaryValue}>
                  {analyticsData.summary.topSpendingCategory}
                </Text>
                <Text style={styles.summaryLabel}>Top Category</Text>
              </View>
            </View>
          </Card>
        </View>

        {/* Controls */}
        <View style={styles.controlsSection}>
          <View style={styles.periodSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {TIME_PERIODS.map((period) => (
                  <Chip
                    key={period.value}
                    selected={selectedPeriod === period.value}
                    onPress={() => setSelectedPeriod(period.value)}
                    style={{ minWidth: 80 }}
                  >
                    {period.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={styles.chartSelector}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: spacing.sm }}>
                {CHART_TYPES.map((chart) => (
                  <Chip
                    key={chart.value}
                    selected={selectedChart === chart.value}
                    onPress={() => setSelectedChart(chart.value)}
                    style={{ minWidth: 90 }}
                  >
                    {chart.label}
                  </Chip>
                ))}
              </View>
            </ScrollView>
          </View>
        </View>

        {/* Charts Section */}
        <View style={styles.chartsSection}>{renderChartContent()}</View>
      </ScrollView>
    </View>
  );
}
