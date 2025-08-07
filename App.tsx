import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createStackNavigator } from "@react-navigation/stack";
import { Provider as PaperProvider } from "react-native-paper";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";

import HomeScreen from "./src/screens/HomeScreen";
import AddReceiptScreen from "./src/screens/AddReceiptScreen";
import ReceiptListScreen from "./src/screens/ReceiptListScreen";
import AnalyticsScreen from "./src/screens/AnalyticsScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import ReceiptDetailScreen from "./src/screens/ReceiptDetailScreen";
import EditReceiptScreen from "./src/screens/EditReceiptScreen";
import AuthScreen from "./src/screens/AuthScreen";
import ProfileEditScreen from "./src/screens/ProfileEditScreen";

// NEW: Import expense report screens

import { DatabaseProvider } from "./src/context/DatabaseContext";
import { ThemeProvider, useTheme } from "./src/context/ThemeContext";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { getTheme } from "./src/theme/theme";
import ApprovalDashboardScreen from "./src/screens/ApprovalDashboardScreen";
import CreateExpenseReportScreen from "./src/screens/CreateExpenseReportScreen";
import ExpenseReportDetailScreen from "./src/screens/ExpenseReportDetailScreen";
import ExpenseReportsListScreen from "./src/screens/ExpenseReportsListScreen";
import ExpenseAnalyticsScreen from "./src/screens/ExpenseAnalyticsScreen";

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function ReceiptStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="ReceiptList" component={ReceiptListScreen} />
      <Stack.Screen name="ReceiptDetail" component={ReceiptDetailScreen} />
      <Stack.Screen name="EditReceipt" component={EditReceiptScreen} />
    </Stack.Navigator>
  );
}

// NEW: Expense Reports Stack
function ExpenseStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="ExpenseReportsList"
        component={ExpenseReportsListScreen}
        options={{ title: "Expense Reports" }}
      />
      <Stack.Screen
        name="CreateExpenseReport"
        component={CreateExpenseReportScreen}
        options={{ title: "Create Report" }}
      />
      <Stack.Screen
        name="ExpenseReportDetail"
        component={ExpenseReportDetailScreen}
        options={{ title: "Report Details" }}
      />
      <Stack.Screen
        name="ApprovalDashboard"
        component={ApprovalDashboardScreen}
        options={{ title: "Approvals" }}
      />
      <Stack.Screen
        name="ExpenseAnalytics"
        component={ExpenseAnalyticsScreen}
        options={{ title: "Analytics" }}
      />
    </Stack.Navigator>
  );
}

function SettingsStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SettingsMain" component={SettingsScreen} />
      <Stack.Screen name="ProfileEdit" component={ProfileEditScreen} />
    </Stack.Navigator>
  );
}

function TabNavigator() {
  const { isDarkMode } = useTheme();
  const { user } = useAuth();
  const theme = getTheme(isDarkMode);

  // Check if user has manager/admin role for approval features
  const isManager = user?.role === "admin" || user?.role === "manager";

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Add") {
            iconName = focused ? "add-circle" : "add-circle-outline";
          } else if (route.name === "Receipts") {
            iconName = focused ? "receipt" : "receipt-outline";
          } else if (route.name === "Reports") {
            iconName = focused ? "document-text" : "document-text-outline";
          } else if (route.name === "Analytics") {
            iconName = focused ? "analytics" : "analytics-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }

          return <Ionicons name={iconName as any} size={size} color={color} />;
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
        },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Add" component={AddReceiptScreen} />
      <Tab.Screen name="Receipts" component={ReceiptStack} />

      {/* NEW: Add Expense Reports Tab */}
      <Tab.Screen
        name="Reports"
        component={ExpenseStack}
        options={{
          tabBarLabel: "Reports",
          tabBarBadge: isManager ? "!" : undefined, // Show badge for managers
        }}
      />

      <Tab.Screen name="Analytics" component={AnalyticsScreen} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  );
}

function AppContent() {
  const { user, isLoading } = useAuth();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);

  if (isLoading) {
    return null;
  }

  return (
    <PaperProvider theme={theme}>
      <NavigationContainer>
        <StatusBar style={isDarkMode ? "light" : "dark"} />
        {user ? <TabNavigator /> : <AuthScreen />}
      </NavigationContainer>
    </PaperProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <AppContent />
        </DatabaseProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

// ALTERNATIVE APPROACH: Add Reports as a section in Home Screen
// If you prefer not to add another tab, you can add expense reports to the Home screen

// Updated HomeScreen.js - Add these action buttons:
/*
// Add to your HomeScreen quick actions section:

<TouchableOpacity
  style={styles.quickActionButton}
  onPress={() => navigation.navigate("Reports", { 
    screen: "CreateExpenseReport" 
  })}
>
  <Ionicons
    name="document-text"
    size={32}
    color={theme.colors.primary}
    style={styles.quickActionIcon}
  />
  <Text style={styles.quickActionText}>Create Report</Text>
</TouchableOpacity>

<TouchableOpacity
  style={styles.quickActionButton}
  onPress={() => navigation.navigate("Reports", { 
    screen: "ExpenseReportsList" 
  })}
>
  <Ionicons
    name="list"
    size={32}
    color={theme.colors.primary}
    style={styles.quickActionIcon}
  />
  <Text style={styles.quickActionText}>My Reports</Text>
</TouchableOpacity>

// For managers/admins only:
{isManager && (
  <TouchableOpacity
    style={styles.quickActionButton}
    onPress={() => navigation.navigate("Reports", { 
      screen: "ApprovalDashboard" 
    })}
  >
    <Ionicons
      name="checkmark-circle"
      size={32}
      color={theme.colors.secondary}
      style={styles.quickActionIcon}
    />
    <Text style={styles.quickActionText}>Approvals</Text>
  </TouchableOpacity>
)}
*/

// SCREENS YOU NEED TO CREATE:

// 1. ExpenseReportsListScreen.js - List all user's expense reports
// 2. ExpenseReportDetailScreen.js - View individual report details
// 3. ApprovalDashboardScreen.js - For managers to approve reports
// 4. ExpenseAnalyticsScreen.js - Advanced analytics for expense reports

// FILE STRUCTURE:
/*
src/
  screens/
    HomeScreen.js
    AddReceiptScreen.js
    ReceiptListScreen.js
    ReceiptDetailScreen.js
    EditReceiptScreen.js
    AnalyticsScreen.js
    SettingsScreen.js
    AuthScreen.js
    ProfileEditScreen.js
    
    // NEW EXPENSE REPORT SCREENS:
    CreateExpenseReportScreen.js     ← Already created
    ExpenseReportsListScreen.js      ← Need to create
    ExpenseReportDetailScreen.js     ← Need to create  
    ApprovalDashboardScreen.js       ← Need to create
    ExpenseAnalyticsScreen.js        ← Need to create
*/
