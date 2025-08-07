import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Card } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useDatabase } from "../context/DatabaseContext";
import { useTheme } from "../context/ThemeContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";
import { useAuth } from "../context/AuthContext";
import { Image } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const { width } = Dimensions.get("window");

export default function HomeScreen({ navigation }) {
  const { receipts, categories, loadReceipts } = useDatabase(); // Add loadReceipts
  const { isDarkMode } = useTheme();

  const theme = getTheme(isDarkMode);

  const totalExpenses = receipts.reduce(
    (sum, receipt) => sum + receipt.amount,
    0
  );
  const thisMonthExpenses = receipts
    .filter((receipt) => {
      const receiptDate = new Date(receipt.date);
      const now = new Date();
      return (
        receiptDate.getMonth() === now.getMonth() &&
        receiptDate.getFullYear() === now.getFullYear()
      );
    })
    .reduce((sum, receipt) => sum + receipt.amount, 0);

  const recentReceipts = receipts.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const categoryTotals = categories
    .map((category) => ({
      ...category,
      total: receipts
        .filter((receipt) => receipt.categoryId === category.id)
        .reduce((sum, receipt) => sum + receipt.amount, 0),
    }))
    .sort((a, b) => b.total - a.total);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      paddingTop: 60,
      paddingBottom: spacing.xl,
      paddingHorizontal: spacing.lg,
      borderBottomLeftRadius: borderRadius.xl,
      borderBottomRightRadius: borderRadius.xl,
    },
    headerContent: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing.xs,
    },
    logo: {
      width: 40,
      height: 40,
      marginRight: spacing.md,
      borderRadius: 20,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: "bold",
      color: "white",
      flex: 1,
    },
    headerSubtitle: {
      fontSize: 16,
      color: "rgba(255, 255, 255, 0.8)",
      marginTop: spacing.xs,
    },
    scrollContent: {
      padding: spacing.lg,
    },
    statsContainer: {
      flexDirection: "row",
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.xs,
      alignItems: "center",
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    statValue: {
      fontSize: 18,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 14,
      color: theme.colors.textSecondary,
      textAlign: "center",
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: spacing.lg,
    },
    quickActionsContainer: {
      flexDirection: "row",
      marginBottom: spacing.xl,
      gap: spacing.md,
    },
    quickActionButton: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: "center",
      elevation: 2,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
    },
    quickActionIcon: {
      marginBottom: spacing.sm,
    },
    quickActionText: {
      fontSize: 14,
      color: theme.colors.text,
      textAlign: "center",
      fontWeight: "500",
    },
    recentReceiptsContainer: {
      marginBottom: spacing.xl,
    },
    receiptItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    receiptInfo: {
      flex: 1,
    },
    receiptTitle: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    receiptDate: {
      fontSize: 14,
      color: theme.colors.textSecondary,
    },
    receiptAmount: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    categoriesContainer: {
      marginBottom: spacing.xl,
    },
    categoryItem: {
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.md,
      padding: spacing.lg,
      marginBottom: spacing.md,
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      elevation: 1,
      shadowColor: theme.colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    categoryInfo: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
    },
    categoryIcon: {
      marginRight: spacing.md,
    },
    categoryName: {
      fontSize: 16,
      fontWeight: "600",
      color: theme.colors.text,
    },
    categoryAmount: {
      fontSize: 16,
      fontWeight: "bold",
      color: theme.colors.primary,
    },
    emptyState: {
      alignItems: "center",
      padding: spacing.xl,
    },
    emptyStateText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: "center",
      marginTop: spacing.md,
    },
  });

  useFocusEffect(
    React.useCallback(() => {
      loadReceipts();
    }, [])
  );

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[theme.colors.primary, theme.colors.secondary]}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          {/* <View
            style={[
              styles.logo,
              {
                backgroundColor: "rgba(255,255,255,0.2)",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Ionicons name="receipt" size={24} color="white" />
          </View> */}
          <Image
            style={styles.logo}
            source={require("../../assets/logo.png")}
          />
          <Text style={styles.headerTitle}>Receipt Tracker</Text>
        </View>
        <Text style={styles.headerSubtitle}>
          Manage your expenses effortlessly
        </Text>
      </LinearGradient>

      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>${totalExpenses.toFixed(2)}</Text>
            <Text style={styles.statLabel}>Total Expenses</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              ${thisMonthExpenses.toFixed(2)}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{receipts.length}</Text>
            <Text style={styles.statLabel}>Total Receipts</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.quickActionsContainer}>
          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Add")}
          >
            <Ionicons
              name="add-circle"
              size={32}
              color={theme.colors.primary}
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionText}>Add Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Receipts")}
          >
            <Ionicons
              name="receipt"
              size={32}
              color={theme.colors.primary}
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionText}>View All</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickActionButton}
            onPress={() => navigation.navigate("Analytics")}
          >
            <Ionicons
              name="analytics"
              size={32}
              color={theme.colors.primary}
              style={styles.quickActionIcon}
            />
            <Text style={styles.quickActionText}>Analytics</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Receipts */}
        <Text style={styles.sectionTitle}>Recent Receipts</Text>
        <View style={styles.recentReceiptsContainer}>
          {recentReceipts.length > 0 ? (
            recentReceipts.map((receipt) => (
              <TouchableOpacity
                key={receipt.id}
                style={styles.receiptItem}
                onPress={() =>
                  navigation.navigate("Receipts", {
                    screen: "ReceiptDetail",
                    params: { receipt },
                  })
                }
              >
                <View style={styles.receiptInfo}>
                  <Text style={styles.receiptTitle}>
                    {receipt.merchantName}
                  </Text>
                  <Text style={styles.receiptDate}>{receipt.date}</Text>
                </View>
                <Text style={styles.receiptAmount}>
                  ${receipt.amount.toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons
                name="receipt-outline"
                size={64}
                color={theme.colors.textSecondary}
              />
              <Text style={styles.emptyStateText}>
                No receipts yet. Add your first receipt to get started!
              </Text>
            </View>
          )}
        </View>

        {/* Top Categories */}
        {categoryTotals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Top Categories</Text>
            <View style={styles.categoriesContainer}>
              {categoryTotals.slice(0, 5).map((category) => (
                <View key={category.id} style={styles.categoryItem}>
                  <View style={styles.categoryInfo}>
                    <Ionicons
                      name={category.icon as any}
                      size={24}
                      color={category.color}
                      style={styles.categoryIcon}
                    />
                    <Text style={styles.categoryName}>{category.name}</Text>
                  </View>
                  <Text style={styles.categoryAmount}>
                    ${category.total.toFixed(2)}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}
