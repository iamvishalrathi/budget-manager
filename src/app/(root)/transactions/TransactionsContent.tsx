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

interface Transaction {
  _id: string;
  description?: string;
  category?: string;
  type: 'income' | 'expense' | 'adjustment';
  amountCents: number;
  date: string;
  time?: string;
  paymentMode?: string;
  tags?: string[];
  accountId?: {
    name: string;
  };
}

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

export default function TransactionsContent() {
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

  // Find selected account data
  const selectedAccountData = accounts?.find((acc: Account) => acc._id === selectedAccount);

  if (transactionsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  if (transactionsError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load transactions. Please try again.
      </Alert>
    );
  }

  const handleBackToAccounts = () => {
    router.push('/dashboard');
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'income': return 'success';
      case 'expense': return 'error';
      case 'transfer': return 'info';
      case 'refund': return 'warning';
      case 'adjustment': return 'secondary';
      default: return 'default';
    }
  };

  const getTransactionIcon = (type: string) => {
    const IconComponent = accountTypeIcons[type as keyof typeof accountTypeIcons] || AccountBalance;
    return <IconComponent />;
  };

  const filteredTransactions = transactions?.filter((transaction: Transaction) => {
    const matchesFilter = transactionFilter === 'all' || transaction.type === transactionFilter;
    const matchesSearch = !searchTerm || 
      transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.category?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  }) || [];

  return (
    <Box sx={{ p: 3 }}>
      {selectedAccount && selectedAccountData && (
        <Box sx={{ mb: 3 }}>
          <ButtonBase onClick={handleBackToAccounts} sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ArrowBack />
              <Typography variant="body2">Back to Accounts</Typography>
            </Box>
          </ButtonBase>
          
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundColor: accountTypeColors[selectedAccountData.type as keyof typeof accountTypeColors],
                    color: 'white',
                  }}
                >
                  {getTransactionIcon(selectedAccountData.type)}
                </Box>
                <Box>
                  <Typography variant="h6">{selectedAccountData.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedAccountData.type.toUpperCase()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      <Typography variant="h4" component="h1" gutterBottom>
        {selectedAccount ? `${selectedAccountData?.name} Transactions` : 'All Transactions'}
      </Typography>

      <Card>
        <CardContent>
          {/* Filters and Search */}
          <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Account</InputLabel>
              <Select
                value={selectedAccount}
                onChange={(e) => setSelectedAccount(e.target.value)}
                label="Account"
              >
                <MenuItem value="">All Accounts</MenuItem>
                {accounts?.map((account: Account) => (
                  <MenuItem key={account._id} value={account._id}>
                    {account.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              size="small"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setSearchTerm('')}>
                      <ArrowBack />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 250 }}
            />
          </Box>

          {/* Transaction Type Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs
              value={transactionFilter}
              onChange={(_, newValue) => setTransactionFilter(newValue)}
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="All" value="all" />
              <Tab label="Income" value="income" />
              <Tab label="Expenses" value="expense" />
              <Tab label="Adjustments" value="adjustment" />
            </Tabs>
          </Box>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <Typography variant="body2" color="text.secondary" textAlign="center" py={4}>
              No transactions found
            </Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filteredTransactions.map((transaction: Transaction) => (
                <Card key={transaction._id} variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                          <Typography variant="body1" fontWeight="medium">
                            {transaction.description || 'No description'}
                          </Typography>
                          <Chip 
                            label={transaction.type.toUpperCase()} 
                            size="small" 
                            color={getTransactionColor(transaction.type)}
                          />
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          {transaction.category || 'Uncategorized'} • {new Date(transaction.date).toLocaleDateString()}
                        </Typography>
                        {transaction.accountId?.name && (
                          <Typography variant="caption" color="text.secondary">
                            Account: {transaction.accountId.name}
                          </Typography>
                        )}
                      </Box>
                      <Typography 
                        variant="h6" 
                        color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                        sx={{ ml: 2 }}
                      >
                        {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amountCents))}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
