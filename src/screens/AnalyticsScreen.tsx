import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Card, Chip } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LineChart, PieChart, BarChart } from 'react-native-chart-kit';
import { useDatabase } from '../context/DatabaseContext';
import { Receipt, ReceiptAnalytics } from '../types/Receipt';
import { useTheme } from '../context/ThemeContext';
import { getTheme, spacing, borderRadius } from '../theme/theme';
import { format, subMonths, startOfMonth, endOfMonth, getMonth, getYear } from 'date-fns';

const { width } = Dimensions.get('window');
const chartWidth = width - spacing.lg * 2;

const months = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

const AnalyticsScreen: React.FC = () => {
  const { receipts, getReceiptsByDateRange } = useDatabase();
  const { isDarkMode } = useTheme();
  const theme = getTheme(isDarkMode);
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'year' | 'custom'>('month');
  const [startDate, setStartDate] = useState(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState(endOfMonth(new Date()));
  const [filteredReceipts, setFilteredReceipts] = useState<Receipt[]>([]);
  const [analytics, setAnalytics] = useState<ReceiptAnalytics | null>(null);
  
  const [selectedMonth, setSelectedMonth] = useState(getMonth(new Date()));
  const [selectedYear, setSelectedYear] = useState(getYear(new Date()));
  const [monthlyExpenseSum, setMonthlyExpenseSum] = useState(0);
  const [monthlyReceiptCount, setMonthlyReceiptCount] = useState(0);

  useEffect(() => {
    updateAnalytics();
  }, [selectedPeriod, startDate, endDate, receipts]);

  useEffect(() => {
    calculateMonthlyExpenses();
  }, [selectedMonth, selectedYear, receipts]);

  const calculateMonthlyExpenses = () => {
    const monthStart = new Date(selectedYear, selectedMonth, 1);
    const monthEnd = new Date(selectedYear, selectedMonth + 1, 0);
    
    const monthReceipts = receipts.filter(receipt => {
      const receiptDate = new Date(receipt.date);
      return receiptDate >= monthStart && receiptDate <= monthEnd;
    });
    
    const totalSum = monthReceipts.reduce((sum, receipt) => sum + receipt.amount, 0);
    setMonthlyExpenseSum(totalSum);
    setMonthlyReceiptCount(monthReceipts.length);
  };

  const updateAnalytics = async () => {
    let receiptsToAnalyze: Receipt[] = [];

    switch (selectedPeriod) {
      case 'week':
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        receiptsToAnalyze = getReceiptsByDateRange(weekStart, new Date());
        break;
      case 'month':
        receiptsToAnalyze = getReceiptsByDateRange(startOfMonth(new Date()), endOfMonth(new Date()));
        break;
      case 'year':
        const yearStart = new Date(new Date().getFullYear(), 0, 1);
        const yearEnd = new Date(new Date().getFullYear(), 11, 31);
        receiptsToAnalyze = getReceiptsByDateRange(yearStart, yearEnd);
        break;
      case 'custom':
        receiptsToAnalyze = getReceiptsByDateRange(startDate, endDate);
        break;
      default:
        receiptsToAnalyze = receipts;
    }

    setFilteredReceipts(receiptsToAnalyze);

    if (receiptsToAnalyze.length > 0) {
      const totalAmount = receiptsToAnalyze.reduce((sum, receipt) => sum + receipt.amount, 0);
      const averageAmount = totalAmount / receiptsToAnalyze.length;

      const categoryBreakdown: { [key: string]: number } = {};
      receiptsToAnalyze.forEach(receipt => {
        categoryBreakdown[receipt.category] = (categoryBreakdown[receipt.category] || 0) + receipt.amount;
      });

      const monthlyTrend = Array.from({ length: 6 }, (_, i) => {
        const date = subMonths(new Date(), 5 - i);
        const monthStart = startOfMonth(date);
        const monthEnd = endOfMonth(date);
        const monthReceipts = receipts.filter(receipt => {
          const receiptDate = new Date(receipt.date);
          return receiptDate >= monthStart && receiptDate <= monthEnd;
        });
        return {
          month: format(date, 'MMM'),
          amount: monthReceipts.reduce((sum, receipt) => sum + receipt.amount, 0)
        };
      });

      setAnalytics({
        totalAmount,
        averageAmount,
        receiptCount: receiptsToAnalyze.length,
        categoryBreakdown,
        monthlyTrend,
      });
    } else {
      setAnalytics(null);
    }
  };

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(22, 9, 91, ${opacity})`,
    labelColor: (opacity = 1) => theme.colors.text,
    style: {
      borderRadius: borderRadius.lg,
    },
    propsForDots: {
      r: '6',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const pieData = analytics ? Object.entries(analytics.categoryBreakdown).map(([category, amount], index) => ({
    name: category,
    amount: amount,
    color: `hsl(${index * 45}, 70%, 50%)`,
    legendFontColor: theme.colors.text,
    legendFontSize: 12,
  })) : [];

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
      flexDirection: 'row',
      alignItems: 'center',
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
      fontWeight: 'bold',
      color: 'white',
      flex: 1,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    periodSelector: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      gap: spacing.sm,
    },
    periodChip: {
      backgroundColor: theme.colors.surface,
    },
    selectedChip: {
      backgroundColor: theme.colors.primary,
    },
    selectedChipText: {
      color: 'white',
    },
    chipText: {
      color: theme.colors.text,
    },
    monthlyCalculatorCard: {
      elevation: 2,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    monthYearSelector: {
      marginBottom: spacing.lg,
    },
    selectorContainer: {
      marginBottom: spacing.md,
    },
    selectorLabel: {
      fontSize: 16,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: spacing.sm,
    },
    monthScroll: {
      flexDirection: 'row',
    },
    yearScroll: {
      flexDirection: 'row',
    },
    monthChip: {
      marginRight: spacing.sm,
      backgroundColor: theme.colors.background,
    },
    yearChip: {
      marginRight: spacing.sm,
      backgroundColor: theme.colors.background,
    },
    monthlyResultContainer: {
      backgroundColor: isDarkMode ? '#334155' : '#f8fafc',
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
    },
    monthlyResult: {
      alignItems: 'center',
    },
    monthlyResultLabel: {
      fontSize: 16,
      color: theme.colors.onSurface,
      marginBottom: spacing.sm,
      textAlign: 'center',
    },
    monthlyResultAmount: {
      fontSize: 32,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    monthlyResultCount: {
      fontSize: 14,
      color: theme.colors.onSurface,
    },
    statsContainer: {
      flexDirection: 'row',
      marginBottom: spacing.lg,
      gap: spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
      alignItems: 'center',
      elevation: 2,
    },
    statValue: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.primary,
      marginBottom: spacing.xs,
    },
    statLabel: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    chartCard: {
      elevation: 2,
      borderRadius: borderRadius.lg,
      marginBottom: spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    chartTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: theme.colors.text,
      marginBottom: spacing.md,
    },
    emptyContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacing.xxl,
    },
    emptyText: {
      fontSize: 18,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.lg,
    },
    emptySubtext: {
      fontSize: 14,
      color: theme.colors.onSurface,
      marginTop: spacing.xs,
      textAlign: 'center',
    },
  });

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={[styles.logo, { backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="receipt" size={20} color="white" />
          </View>
          <Text style={styles.headerTitle}>Analytics</Text>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.periodSelector}>
          {(['week', 'month', 'year'] as const).map((period) => (
            <Chip
              key={period}
              selected={selectedPeriod === period}
              onPress={() => setSelectedPeriod(period)}
              style={[
                styles.periodChip,
                selectedPeriod === period && styles.selectedChip,
              ]}
              textStyle={[
                styles.chipText,
                selectedPeriod === period && styles.selectedChipText,
              ]}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </Chip>
          ))}
        </View>

        <Card style={styles.monthlyCalculatorCard}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Monthly Expense Calculator</Text>
            
            <View style={styles.monthYearSelector}>
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Month</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.monthScroll}
                >
                  {months.map((month, index) => (
                    <Chip
                      key={month}
                      selected={selectedMonth === index}
                      onPress={() => setSelectedMonth(index)}
                      style={[
                        styles.monthChip,
                        selectedMonth === index && styles.selectedChip,
                      ]}
                      textStyle={[
                        styles.chipText,
                        selectedMonth === index && styles.selectedChipText,
                      ]}
                    >
                      {month.substring(0, 3)}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
              
              <View style={styles.selectorContainer}>
                <Text style={styles.selectorLabel}>Year</Text>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  style={styles.yearScroll}
                >
                  {years.map((year) => (
                    <Chip
                      key={year}
                      selected={selectedYear === year}
                      onPress={() => setSelectedYear(year)}
                      style={[
                        styles.yearChip,
                        selectedYear === year && styles.selectedChip,
                      ]}
                      textStyle={[
                        styles.chipText,
                        selectedYear === year && styles.selectedChipText,
                      ]}
                    >
                      {year}
                    </Chip>
                  ))}
                </ScrollView>
              </View>
            </View>
            
            <View style={styles.monthlyResultContainer}>
              <View style={styles.monthlyResult}>
                <Text style={styles.monthlyResultLabel}>
                  {months[selectedMonth]} {selectedYear} Expenses
                </Text>
                <Text style={styles.monthlyResultAmount}>
                  ${monthlyExpenseSum.toFixed(2)}
                </Text>
                <Text style={styles.monthlyResultCount}>
                  {monthlyReceiptCount} receipt{monthlyReceiptCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>
          </Card.Content>
        </Card>

        {analytics && (
          <>
            <View style={styles.statsContainer}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>${analytics.totalAmount.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Total Amount</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>${analytics.averageAmount.toFixed(2)}</Text>
                <Text style={styles.statLabel}>Average</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{analytics.receiptCount}</Text>
                <Text style={styles.statLabel}>Receipts</Text>
              </View>
            </View>

            {analytics.monthlyTrend.length > 0 && (
              <Card style={styles.chartCard}>
                <Card.Content>
                  <Text style={styles.chartTitle}>Monthly Trend</Text>
                  <LineChart
                    data={{
                      labels: analytics.monthlyTrend.map(item => item.month),
                      datasets: [{
                        data: analytics.monthlyTrend.map(item => item.amount),
                      }],
                    }}
                    width={chartWidth - 32}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    style={{
                      marginVertical: 8,
                      borderRadius: borderRadius.lg,
                    }}
                  />
                </Card.Content>
              </Card>
            )}

            {pieData.length > 0 && (
              <Card style={styles.chartCard}>
                <Card.Content>
                  <Text style={styles.chartTitle}>Category Breakdown</Text>
                  <PieChart
                    data={pieData}
                    width={chartWidth - 32}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="15"
                    center={[10, 50]}
                    absolute
                  />
                </Card.Content>
              </Card>
            )}
          </>
        )}

        {!analytics && (
          <View style={styles.emptyContainer}>
            <Ionicons name="analytics-outline" size={80} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No data available</Text>
            <Text style={styles.emptySubtext}>
              Add some receipts to see analytics
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default AnalyticsScreen;