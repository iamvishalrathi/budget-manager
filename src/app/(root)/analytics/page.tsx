'use client';

import React, { useState, useMemo } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Box,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    CircularProgress,
    Alert,
} from '@mui/material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement,
} from 'chart.js';
import { useAnalytics, useAccounts } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/money';

// Register Chart.js components
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    ArcElement
);

interface Account {
    _id: string;
    name: string;
    type: string;
}

interface TimeSeriesItem {
    _id: string;
    data: Array<{
        type: string;
        totalAmountCents: number;
        count: number;
    }>;
}

interface CategoryItem {
    _id: {
        type: string;
        category: string;
    };
    totalAmountCents: number;
    count: number;
}

export default function AnalyticsPage() {
    const [selectedAccount, setSelectedAccount] = useState<string>('all');
    const [timeRange, setTimeRange] = useState<string>('30d');
    
    const { accounts } = useAccounts();
    
    // Convert timeRange to granularity and date range
    const analyticsParams = useMemo(() => {
        const now = new Date();
        let from: Date;
        let granularity: string;
        
        switch (timeRange) {
            case '7d':
                from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                granularity = 'day';
                break;
            case '30d':
                from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                granularity = 'day';
                break;
            case '90d':
                from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                granularity = 'week';
                break;
            case '1y':
                from = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                granularity = 'month';
                break;
            default:
                from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                granularity = 'day';
        }
        
        return {
            granularity,
            from: from.toISOString(),
            to: now.toISOString(),
            accountId: selectedAccount === 'all' ? undefined : selectedAccount,
        };
    }, [timeRange, selectedAccount]);
    
    const { analytics, isLoading, isError } = useAnalytics(analyticsParams);

    // Process time series data for line chart
    const timeSeriesChart = useMemo(() => {
        if (!analytics?.timeSeriesData) return null;

        const timeSeriesData: TimeSeriesItem[] = analytics.timeSeriesData;
        
        // Create date labels
        const labels = timeSeriesData.map((item) => item._id);
        
        // Process income and expense data
        const incomeData = timeSeriesData.map((item) => {
            const incomeItem = item.data.find((d) => d.type === 'income');
            return incomeItem ? incomeItem.totalAmountCents / 100 : 0;
        });
        
        const expenseData = timeSeriesData.map((item) => {
            const expenseItem = item.data.find((d) => d.type === 'expense');
            return expenseItem ? expenseItem.totalAmountCents / 100 : 0;
        });

        return {
            labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    tension: 0.1,
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    borderColor: 'rgb(239, 68, 68)',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    tension: 0.1,
                },
            ],
        };
    }, [analytics]);

    // Process category data for pie chart
    const categoryChart = useMemo(() => {
        if (!analytics?.categoryData) return null;

        const categoryData: CategoryItem[] = analytics.categoryData;
        const expenseCategories = categoryData
            .filter((item) => item._id.type === 'expense')
            .slice(0, 10);

        const labels = expenseCategories.map((item) => item._id.category);
        const data = expenseCategories.map((item) => item.totalAmountCents / 100);

        const backgroundColors = [
            '#ff6384', '#36a2eb', '#ffce56', '#4bc0c0', '#9966ff',
            '#ff9f40', '#ff6384', '#c9cbcf', '#4bc0c0', '#ff6384'
        ];

        return {
            labels,
            datasets: [
                {
                    data,
                    backgroundColor: backgroundColors.slice(0, labels.length),
                    borderWidth: 1,
                },
            ],
        };
    }, [analytics]);

    if (isLoading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
                <CircularProgress />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Alert severity="error">
                    Failed to load analytics data. Please try again.
                </Alert>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Financial Analytics
                </Typography>
                
                {/* Filters */}
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>Account</InputLabel>
                        <Select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            label="Account"
                        >
                            <MenuItem value="all">All Accounts</MenuItem>
                            {accounts?.map((account: Account) => (
                                <MenuItem key={account._id} value={account._id}>
                                    {account.name}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Time Range</InputLabel>
                        <Select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value)}
                            label="Time Range"
                        >
                            <MenuItem value="7d">Last 7 days</MenuItem>
                            <MenuItem value="30d">Last 30 days</MenuItem>
                            <MenuItem value="90d">Last 3 months</MenuItem>
                            <MenuItem value="1y">Last year</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Summary Cards */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 3 }}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="success.main">
                                Total Income
                            </Typography>
                            <Typography variant="h4">
                                {formatCurrency(analytics?.summary?.totalIncomeCents || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color="error.main">
                                Total Expenses
                            </Typography>
                            <Typography variant="h4">
                                {formatCurrency(analytics?.summary?.totalExpenseCents || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" color={analytics?.summary?.netIncomeCents >= 0 ? 'success.main' : 'error.main'}>
                                Net Income
                            </Typography>
                            <Typography variant="h4">
                                {formatCurrency(analytics?.summary?.netIncomeCents || 0)}
                            </Typography>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">
                                Transactions
                            </Typography>
                            <Typography variant="h4">
                                {analytics?.summary?.transactionCount || 0}
                            </Typography>
                        </CardContent>
                    </Card>
                </Box>

                {/* Charts Section */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 3 }}>
                    {/* Income vs Expenses Chart */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Income vs Expenses Over Time
                            </Typography>
                            {timeSeriesChart ? (
                                <Box sx={{ height: 400 }}>
                                    <Line
                                        data={timeSeriesChart}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'top' as const,
                                                },
                                            },
                                            scales: {
                                                y: {
                                                    beginAtZero: true,
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Typography color="text.secondary">No data available</Typography>
                            )}
                        </CardContent>
                    </Card>

                    {/* Category Breakdown */}
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Expense Categories
                            </Typography>
                            {categoryChart ? (
                                <Box sx={{ height: 400 }}>
                                    <Doughnut
                                        data={categoryChart}
                                        options={{
                                            responsive: true,
                                            maintainAspectRatio: false,
                                            plugins: {
                                                legend: {
                                                    position: 'bottom' as const,
                                                },
                                            },
                                        }}
                                    />
                                </Box>
                            ) : (
                                <Typography color="text.secondary">No data available</Typography>
                            )}
                        </CardContent>
                    </Card>
                </Box>
            </Box>
        </Box>
    );
}
