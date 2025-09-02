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
        category: string;
        type: string;
    };
    totalAmountCents: number;
    count: number;
}

export default function AnalyticsPage() {
    const [granularity, setGranularity] = useState('month');
    const [selectedAccount, setSelectedAccount] = useState('');

    const { analytics, isLoading, isError } = useAnalytics({
        granularity,
        accountId: selectedAccount || undefined,
    });

    const { accounts } = useAccounts();

    // Process time series data for chart
    const timeSeriesChart = useMemo(() => {
        if (!analytics?.timeSeriesData) return null;

        const timeSeriesData: TimeSeriesItem[] = analytics.timeSeriesData;
        const labels = timeSeriesData.map((item) => item._id);
        const incomeData: number[] = [];
        const expenseData: number[] = [];

        timeSeriesData.forEach((item) => {
            let income = 0;
            let expense = 0;

            item.data.forEach((typeData) => {
                if (typeData.type === 'income') {
                    income = typeData.totalAmountCents / 100;
                } else if (typeData.type === 'expense') {
                    expense = typeData.totalAmountCents / 100;
                }
            });

            incomeData.push(income);
            expenseData.push(expense);
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
            <Alert severity="error">
                Failed to load analytics. Please try again.
            </Alert>
        );
    }

    return (
        <Box>
            <Typography variant="h4" gutterBottom>
                Analytics
            </Typography>

            {/* Filters */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
                    <FormControl fullWidth>
                        <InputLabel>Time Period</InputLabel>
                        <Select
                            value={granularity}
                            label="Time Period"
                            onChange={(e) => setGranularity(e.target.value)}
                        >
                            <MenuItem value="day">Daily</MenuItem>
                            <MenuItem value="week">Weekly</MenuItem>
                            <MenuItem value="month">Monthly</MenuItem>
                            <MenuItem value="year">Yearly</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Box sx={{ flex: { xs: '1 1 100%', sm: '1 1 45%', md: '1 1 22%' }, minWidth: 200 }}>
                    <FormControl fullWidth>
                        <InputLabel>Account</InputLabel>
                        <Select
                            value={selectedAccount}
                            label="Account"
                            onChange={(e) => setSelectedAccount(e.target.value)}
                        >
                            <MenuItem value="">All Accounts</MenuItem>
                            {accounts?.map((account) => (
                                <MenuItem key={account._id} value={account._id}>
                                    {account.name}
                                </MenuItem>
                            ))}
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
