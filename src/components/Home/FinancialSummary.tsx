'use client';

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalanceWallet,
} from '@mui/icons-material';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/money';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function FinancialSummary() {
  const { data: summary, error: summaryError, isLoading: summaryLoading } = useSWR(
    '/api/summary',
    fetcher
  );

  if (summaryLoading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  if (summaryError) {
    return (
      <Alert severity="error">
        Failed to load financial summary. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, maxWidth: 900, mx: 'auto' }}>
      {/* Total Balance */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        minHeight: 200
      }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <AccountBalanceWallet sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Total Balance
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {formatCurrency(summary?.totalBalance || 0)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            Across {summary?.totalAccounts || 0} accounts
          </Typography>
        </CardContent>
      </Card>

      {/* Total Income */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        color: 'white',
        minHeight: 200
      }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <TrendingUp sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Total Income
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {formatCurrency(summary?.totalIncome || 0)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            All time earnings
          </Typography>
        </CardContent>
      </Card>

      {/* Total Expenses */}
      <Card sx={{ 
        background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        color: 'white',
        minHeight: 200
      }}>
        <CardContent sx={{ textAlign: 'center', py: 4 }}>
          <TrendingDown sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h6" gutterBottom>
            Total Expenses
          </Typography>
          <Typography variant="h3" fontWeight="bold">
            {formatCurrency(summary?.totalExpenses || 0)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9, mt: 1 }}>
            All time spending
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}
