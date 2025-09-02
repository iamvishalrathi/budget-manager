'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  ButtonBase,
  TextField,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { 
  ArrowBack,
  Search,
  AccountBalance, 
  Wallet, 
  CreditCard, 
  Train, 
  AttachMoney 
} from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/money';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface Account {
  _id: string;
  name: string;
  type: string;
}

const accountTypeIcons = {
  bank: AccountBalance,
  wallet: Wallet,
  card: CreditCard,
  metro: Train,
  cash: AttachMoney,
};

const accountTypeColors = {
  bank: '#1976d2',
  wallet: '#388e3c',
  card: '#f57c00',
  metro: '#7b1fa2',
  cash: '#d32f2f',
};

export default function TransactionsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId');
  
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccount, setSelectedAccount] = useState(accountId || '');

  // Build transactions API URL with filters
  const transactionsUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    if (selectedAccount) params.append('accountId', selectedAccount);
    if (transactionFilter !== 'all') params.append('type', transactionFilter);
    if (searchTerm) params.append('search', searchTerm);
    return `/api/transactions?${params.toString()}`;
  }, [selectedAccount, transactionFilter, searchTerm]);

  const { data: transactions, error: transactionsError, isLoading: transactionsLoading } = useSWR(
    transactionsUrl,
    fetcher
  );

  const { data: accounts } = useSWR('/api/accounts', fetcher);

  // Get selected account info
  const selectedAccountData = accounts?.find((acc: Account) => acc._id === selectedAccount);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          {selectedAccountData ? `${selectedAccountData.name} Transactions` : 'All Transactions'}
        </Typography>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Search and Account Filter */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
              <TextField
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ flex: { xs: '1 1 100%', sm: '1 1 300px' } }}
              />
              
              {!accountId && (
                <FormControl sx={{ flex: { xs: '1 1 100%', sm: '1 1 200px' } }}>
                  <InputLabel>Account</InputLabel>
                  <Select
                    value={selectedAccount}
                    label="Account"
                    onChange={(e) => setSelectedAccount(e.target.value)}
                  >
                    <MenuItem value="">All Accounts</MenuItem>
                    {accounts?.map((account: Account) => (
                      <MenuItem key={account._id} value={account._id}>
                        {account.name} ({account.type.toUpperCase()})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Transaction Type Tabs */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs 
                value={transactionFilter} 
                onChange={(_, newValue) => setTransactionFilter(newValue)}
                aria-label="transaction filter tabs"
              >
                <Tab label="All" value="all" />
                <Tab label="Income" value="income" />
                <Tab label="Expense" value="expense" />
                <Tab label="Adjustments" value="adjustment" />
              </Tabs>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardContent>
          {transactionsLoading ? (
            <Box display="flex" justifyContent="center" p={4}>
              <CircularProgress />
            </Box>
          ) : transactionsError ? (
            <Alert severity="error">Failed to load transactions</Alert>
          ) : !transactions || !Array.isArray(transactions.transactions) || transactions.transactions.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No transactions found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {searchTerm || transactionFilter !== 'all' || selectedAccount 
                  ? 'Try adjusting your filters or search term.'
                  : 'Start by adding your first transaction.'
                }
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Showing {transactions.transactions.length} transaction(s)
              </Typography>
              
              {transactions.transactions.map((transaction: {
                _id: string;
                category: string;
                date: string;
                merchant?: string;
                amountCents: number;
                type: string;
                currency: string;
                accountId: {
                  _id: string;
                  name: string;
                  type: string;
                };
              }) => {
                const accountIcon = accountTypeIcons[transaction.accountId.type as keyof typeof accountTypeIcons];
                const AccountIcon = accountIcon || AccountBalance;
                const color = accountTypeColors[transaction.accountId.type as keyof typeof accountTypeColors] || '#666';

                return (
                  <ButtonBase
                    key={transaction._id}
                    onClick={() => router.push(`/transactions/${transaction._id}`)}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 3,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 2,
                      width: '100%',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 48,
                          height: 48,
                          borderRadius: '50%',
                          backgroundColor: color,
                          color: 'white',
                          mr: 3,
                        }}
                      >
                        <AccountIcon />
                      </Box>
                      
                      <Box sx={{ textAlign: 'left', flex: 1 }}>
                        <Typography variant="body1" fontWeight="bold">
                          {transaction.merchant || transaction.category}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {transaction.accountId.name} • {new Date(transaction.date).toLocaleDateString()}
                        </Typography>
                        {transaction.merchant && transaction.category && (
                          <Typography variant="body2" color="text.secondary">
                            {transaction.category}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="h6" 
                        color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {transaction.type === 'income' ? '+' : '-'}
                        {formatCurrency(Math.abs(transaction.amountCents), transaction.currency)}
                      </Typography>
                      <Chip 
                        label={transaction.type.toUpperCase()} 
                        size="small"
                        color={transaction.type === 'income' ? 'success' : 'error'}
                      />
                    </Box>
                  </ButtonBase>
                );
              })}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
