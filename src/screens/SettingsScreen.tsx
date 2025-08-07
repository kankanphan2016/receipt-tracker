import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import {
  Card,
  Switch,
  Avatar,
  Divider,
  Portal,
  Modal,
  Button,
  ActivityIndicator,
} from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { getTheme, spacing, borderRadius } from "../theme/theme";
import { useDatabase } from "../context/DatabaseContext";

interface SettingsScreenProps {
  navigation: any;
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({ navigation }) => {
  const { user, logout } = useAuth();
  const { receipts, categories, addReceipt } = useDatabase();
  const { isDarkMode, toggleDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  // State for modals and loading
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [backupModalVisible, setBackupModalVisible] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const totalAmount = receipts.reduce(
    (sum, receipt) => sum + receipt.amount,
    0
  );
  const uniqueCategories = [
    ...new Set(receipts.map((receipt) => receipt.category)),
  ];

  // Export to CSV
  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const csvHeader = "Date,Merchant,Amount,Category,Description,Image URL\n";
      const csvData = receipts
        .map((receipt) => {
          const date = new Date(receipt.date).toISOString().split("T")[0];
          const merchant = `"${receipt.merchantName.replace(/"/g, '""')}"`;
          const amount = receipt.amount.toFixed(2);
          const category = `"${receipt.category.replace(/"/g, '""')}"`;
          const description = `"${(receipt.description || "").replace(
            /"/g,
            '""'
          )}"`;
          const imageUrl = `"${receipt.imageUri || ""}"`;
          return `${date},${merchant},${amount},${category},${description},${imageUrl}`;
        })
        .join("\n");

      const csvContent = csvHeader + csvData;
      const fileName = `receipts_export_${
        new Date().toISOString().split("T")[0]
      }.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/csv",
        dialogTitle: "Export Receipts CSV",
      });

      Alert.alert("Success", `Exported ${receipts.length} receipts to CSV!`);
    } catch (error) {
      console.error("CSV Export error:", error);
      Alert.alert("Error", "Failed to export receipts to CSV");
    } finally {
      setIsExporting(false);
      setExportModalVisible(false);
    }
  };

  // Export to JSON (for backup/restore)
  const exportToJSON = async () => {
    setIsExporting(true);
    try {
      const exportData = {
        version: "1.0.0",
        exportDate: new Date().toISOString(),
        userData: {
          name: user?.name || "",
          email: user?.email || "",
        },
        receipts: receipts,
        categories: categories,
        statistics: {
          totalReceipts: receipts.length,
          totalAmount: totalAmount,
          categoriesUsed: uniqueCategories.length,
        },
      };

      const jsonContent = JSON.stringify(exportData, null, 2);
      const fileName = `receipt_backup_${
        new Date().toISOString().split("T")[0]
      }.json`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, jsonContent);
      await Sharing.shareAsync(fileUri, {
        mimeType: "application/json",
        dialogTitle: "Export Receipt Backup",
      });

      Alert.alert(
        "Success",
        `Created backup with ${receipts.length} receipts!`
      );
    } catch (error) {
      console.error("JSON Export error:", error);
      Alert.alert("Error", "Failed to create backup file");
    } finally {
      setIsExporting(false);
      setExportModalVisible(false);
    }
  };

  // Export summary report
  const exportSummaryReport = async () => {
    setIsExporting(true);
    try {
      const categoryTotals = receipts.reduce((acc, receipt) => {
        acc[receipt.category] = (acc[receipt.category] || 0) + receipt.amount;
        return acc;
      }, {} as Record<string, number>);

      const monthlyTotals = receipts.reduce((acc, receipt) => {
        const month = new Date(receipt.date).toISOString().slice(0, 7); // YYYY-MM
        acc[month] = (acc[month] || 0) + receipt.amount;
        return acc;
      }, {} as Record<string, number>);

      const report = `RECEIPT SUMMARY REPORT
Generated: ${new Date().toLocaleDateString()}

OVERVIEW
========
Total Receipts: ${receipts.length}
Total Amount: $${totalAmount.toFixed(2)}
Categories Used: ${uniqueCategories.length}
Date Range: ${
        receipts.length > 0
          ? `${new Date(
              Math.min(...receipts.map((r) => new Date(r.date).getTime()))
            ).toLocaleDateString()} - ${new Date(
              Math.max(...receipts.map((r) => new Date(r.date).getTime()))
            ).toLocaleDateString()}`
          : "No receipts"
      }

CATEGORY BREAKDOWN
==================
${Object.entries(categoryTotals)
  .sort(([, a], [, b]) => b - a)
  .map(
    ([category, total]) =>
      `${category}: $${total.toFixed(2)} (${(
        (total / totalAmount) *
        100
      ).toFixed(1)}%)`
  )
  .join("\n")}

MONTHLY BREAKDOWN
=================
${Object.entries(monthlyTotals)
  .sort(([a], [b]) => b.localeCompare(a))
  .map(([month, total]) => `${month}: $${total.toFixed(2)}`)
  .join("\n")}

TOP MERCHANTS
=============
${Object.entries(
  receipts.reduce((acc, receipt) => {
    acc[receipt.merchantName] =
      (acc[receipt.merchantName] || 0) + receipt.amount;
    return acc;
  }, {} as Record<string, number>)
)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 10)
  .map(([merchant, total]) => `${merchant}: ${total.toFixed(2)}`)
  .join("\n")}
`;

      const fileName = `receipt_summary_${
        new Date().toISOString().split("T")[0]
      }.txt`;
      const fileUri = FileSystem.documentDirectory + fileName;

      await FileSystem.writeAsStringAsync(fileUri, report);
      await Sharing.shareAsync(fileUri, {
        mimeType: "text/plain",
        dialogTitle: "Share Summary Report",
      });

      Alert.alert("Success", "Summary report generated!");
    } catch (error) {
      console.error("Summary Report error:", error);
      Alert.alert("Error", "Failed to generate summary report");
    } finally {
      setIsExporting(false);
      setExportModalVisible(false);
    }
  };

  // Restore from backup
  const restoreFromBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) {
        return;
      }

      setIsRestoring(true);
      const fileUri = result.assets[0].uri;
      const fileContent = await FileSystem.readAsStringAsync(fileUri);
      const backupData = JSON.parse(fileContent);

      // Validate backup data structure
      if (!backupData.receipts || !Array.isArray(backupData.receipts)) {
        throw new Error("Invalid backup file format");
      }

      Alert.alert(
        "Restore Backup",
        `This backup contains ${
          backupData.receipts.length
        } receipts from ${new Date(
          backupData.exportDate
        ).toLocaleDateString()}.\n\nThis will replace your current data. Continue?`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Restore",
            style: "destructive",
            onPress: async () => {
              try {
                // Import receipts one by one
                let successCount = 0;
                for (const receipt of backupData.receipts) {
                  try {
                    await addReceipt(
                      {
                        merchantName: receipt.merchantName,
                        amount: receipt.amount,
                        description: receipt.description || "",
                        category: receipt.category,
                        categoryId: receipt.categoryId,
                        date: receipt.date,
                        imageUri: receipt.imageUri,
                      },
                      [],
                      null
                    );
                    successCount++;
                  } catch (error) {
                    console.error("Failed to import receipt:", receipt, error);
                  }
                }

                Alert.alert(
                  "Restore Complete",
                  `Successfully restored ${successCount} out of ${backupData.receipts.length} receipts.`
                );
              } catch (error) {
                console.error("Restore error:", error);
                Alert.alert("Error", "Failed to restore some receipts");
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error("Backup restore error:", error);
      Alert.alert(
        "Error",
        "Failed to read backup file. Please ensure it's a valid backup."
      );
    } finally {
      setIsRestoring(false);
      setBackupModalVisible(false);
    }
  };

  const handleExportData = () => {
    setExportModalVisible(true);
  };

  const handleBackupData = () => {
    setBackupModalVisible(true);
  };

  const handleAbout = () => {
    Alert.alert(
      "About Receipt Tracker",
      "Version 1.0.0\n\nA beautiful and intuitive app to track your expenses and manage receipts.\n\nDeveloped with React Native and Expo.",
      [{ text: "OK" }]
    );
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: logout,
      },
    ]);
  };

  const handleEditProfile = () => {
    navigation.navigate("ProfileEdit");
  };

  const styles = createStyles(theme, isDarkMode);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
          <Text style={styles.headerTitle}>Settings</Text>
        </View>
        <Text style={styles.headerSubtitle}>Customize your experience</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Section */}
        <Card style={styles.profileCard}>
          <Card.Content style={styles.profileContent}>
            <Avatar.Icon
              size={80}
              icon="account"
              style={[styles.avatar, { backgroundColor: theme.colors.primary }]}
            />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || "User"}</Text>
              <Text style={styles.profileEmail}>
                {user?.email || "user@example.com"}
              </Text>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={handleEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
              </TouchableOpacity>
            </View>
          </Card.Content>
        </Card>

        {/* Appearance Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Appearance</Text>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name={isDarkMode ? "moon" : "sunny"}
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>
                    {isDarkMode ? "Dark theme enabled" : "Light theme enabled"}
                  </Text>
                </View>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={toggleDarkMode}
                color={theme.colors.primary}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Data Management Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Data Management</Text>

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleExportData}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="download"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Export Data</Text>
                  <Text style={styles.settingDescription}>
                    Export receipts as CSV, JSON, or summary
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>

            <Divider style={styles.divider} />

            <TouchableOpacity
              style={styles.settingItem}
              onPress={handleBackupData}
            >
              <View style={styles.settingLeft}>
                <Ionicons
                  name="cloud-upload"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Backup & Restore</Text>
                  <Text style={styles.settingDescription}>
                    Create backup or restore from backup
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </Card.Content>
        </Card>

        {/* App Information Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>App Information</Text>

            <TouchableOpacity style={styles.settingItem} onPress={handleAbout}>
              <View style={styles.settingLeft}>
                <Ionicons
                  name="information-circle"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>About</Text>
                  <Text style={styles.settingDescription}>
                    Version and app information
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>

            <Divider style={styles.divider} />

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <Ionicons name="code" size={24} color={theme.colors.primary} />
                <View style={styles.settingText}>
                  <Text style={styles.settingLabel}>Version</Text>
                  <Text style={styles.settingDescription}>1.0.0</Text>
                </View>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Statistics Section */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Statistics</Text>
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{receipts.length}</Text>
                <Text style={styles.statLabel}>Total Receipts</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>${totalAmount.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Spent</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{uniqueCategories.length}</Text>
                <Text style={styles.statLabel}>Categories</Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {/* Account Actions */}
        <Card style={styles.sectionCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
              <View style={styles.settingLeft}>
                <Ionicons name="log-out" size={24} color={theme.colors.error} />
                <View style={styles.settingText}>
                  <Text
                    style={[styles.settingLabel, { color: theme.colors.error }]}
                  >
                    Logout
                  </Text>
                  <Text style={styles.settingDescription}>
                    Sign out of your account
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={theme.colors.onSurface}
              />
            </TouchableOpacity>
          </Card.Content>
        </Card>
      </View>

      {/* Export Modal */}
      <Portal>
        <Modal
          visible={exportModalVisible}
          onDismiss={() => !isExporting && setExportModalVisible(false)}
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text style={styles.modalTitle}>Export Data</Text>
              <Text style={styles.modalSubtitle}>Choose export format:</Text>

              {isExporting ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>Exporting...</Text>
                </View>
              ) : (
                <View style={styles.exportOptions}>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={exportToCSV}
                  >
                    <Ionicons
                      name="document-text"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>CSV File</Text>
                      <Text style={styles.exportOptionDescription}>
                        Spreadsheet format for analysis
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={exportToJSON}
                  >
                    <Ionicons
                      name="archive"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>
                        Backup File (JSON)
                      </Text>
                      <Text style={styles.exportOptionDescription}>
                        Complete backup for restore
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={exportSummaryReport}
                  >
                    <Ionicons
                      name="analytics"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>
                        Summary Report
                      </Text>
                      <Text style={styles.exportOptionDescription}>
                        Detailed text report with statistics
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setExportModalVisible(false)}
                  disabled={isExporting}
                >
                  Cancel
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>

      {/* Backup Modal */}
      <Portal>
        <Modal
          visible={backupModalVisible}
          onDismiss={() =>
            !isBackingUp && !isRestoring && setBackupModalVisible(false)
          }
          contentContainerStyle={styles.modalContainer}
        >
          <Card>
            <Card.Content>
              <Text style={styles.modalTitle}>Backup & Restore</Text>
              <Text style={styles.modalSubtitle}>
                Manage your data backups:
              </Text>

              {isBackingUp || isRestoring ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator
                    size="large"
                    color={theme.colors.primary}
                  />
                  <Text style={styles.loadingText}>
                    {isBackingUp ? "Creating backup..." : "Restoring data..."}
                  </Text>
                </View>
              ) : (
                <View style={styles.exportOptions}>
                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={exportToJSON}
                  >
                    <Ionicons
                      name="cloud-upload"
                      size={24}
                      color={theme.colors.primary}
                    />
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>
                        Create Backup
                      </Text>
                      <Text style={styles.exportOptionDescription}>
                        Save all your receipts and data
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.exportOption}
                    onPress={restoreFromBackup}
                  >
                    <Ionicons
                      name="cloud-download"
                      size={24}
                      color={theme.colors.success}
                    />
                    <View style={styles.exportOptionText}>
                      <Text style={styles.exportOptionTitle}>
                        Restore from Backup
                      </Text>
                      <Text style={styles.exportOptionDescription}>
                        Import data from a backup file
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.modalActions}>
                <Button
                  mode="outlined"
                  onPress={() => setBackupModalVisible(false)}
                  disabled={isBackingUp || isRestoring}
                >
                  Cancel
                </Button>
              </View>
            </Card.Content>
          </Card>
        </Modal>
      </Portal>
    </ScrollView>
  );
};

const createStyles = (theme: any, isDarkMode: boolean) =>
  StyleSheet.create({
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
      padding: spacing.lg,
    },
    profileCard: {
      elevation: 2,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    profileContent: {
      flexDirection: "row",
      alignItems: "center",
    },
    avatar: {
      marginRight: spacing.lg,
    },
    profileInfo: {
      flex: 1,
    },
    profileName: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: spacing.xs,
    },
    profileEmail: {
      fontSize: 14,
      color: theme.colors.onSurface,
      marginBottom: spacing.sm,
    },
    editProfileButton: {
      alignSelf: "flex-start",
    },
    editProfileText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: "500",
    },
    sectionCard: {
      elevation: 2,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    settingItem: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
    },
    settingLeft: {
      flexDirection: "row",
      alignItems: "center",
      flex: 1,
    },
    settingText: {
      marginLeft: spacing.md,
      flex: 1,
    },
    settingLabel: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 2,
    },
    settingDescription: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    divider: {
      marginVertical: spacing.sm,
      backgroundColor: isDarkMode ? "#475569" : "#e2e8f0",
    },
    statsContainer: {
      flexDirection: "row",
      justifyContent: "space-around",
      paddingTop: spacing.sm,
    },
    statItem: {
      alignItems: "center",
    },
    statValue: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.onSurface,
      textAlign: "center",
    },
    // Modal styles
    modalContainer: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      flex: 1,
      justifyContent: "center",
      padding: spacing.lg,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "bold",
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    modalSubtitle: {
      fontSize: 14,
      color: theme.colors.onSurface,
      marginBottom: spacing.lg,
    },
    exportOptions: {
      marginBottom: spacing.lg,
    },
    exportOption: {
      flexDirection: "row",
      alignItems: "center",
      padding: spacing.md,
      borderRadius: borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.outline,
      marginBottom: spacing.sm,
      backgroundColor: theme.colors.background,
    },
    exportOptionText: {
      marginLeft: spacing.md,
      flex: 1,
    },
    exportOptionTitle: {
      fontSize: 16,
      fontWeight: "500",
      color: theme.colors.text,
      marginBottom: 2,
    },
    exportOptionDescription: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
    loadingContainer: {
      alignItems: "center",
      padding: spacing.xl,
    },
    loadingText: {
      marginTop: spacing.md,
      fontSize: 16,
      color: theme.colors.onSurface,
    },
  });

export default SettingsScreen;
