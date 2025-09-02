'use client';

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Fab,
  Tabs,
  Tab,
  ButtonBase,
  Autocomplete,
  Collapse,
  IconButton,
  InputAdornment,
} from '@mui/material';
import { 
  ArrowBack, 
  Add, 
  AccountBalance, 
  Wallet, 
  CreditCard, 
  Train, 
  AttachMoney,
  Search,
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import useSWR from 'swr';
import { formatCurrency } from '@/lib/money';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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

type Adjustment = {
  _id: string;
  previousBalanceCents: number;
  newBalanceCents: number;
  adjustmentAmountCents: number;
  reason?: string;
  createdAt: string;
  accountId: string;
};

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [openBalanceDialog, setOpenBalanceDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [adjustmentSubmitting, setAdjustmentSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'transfer' | 'adjustments'>('all');
  
  // Search functionality state
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchParams, setSearchParams] = useState({
    search: '',
    category: '',
    merchant: '',
    tags: '',
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
  });

  // Get the account ID from params
  React.useEffect(() => {
    params.then(({ id }: { id: string }) => setAccountId(id));
  }, [params]);

  const { data: account, error: accountError, isLoading: accountLoading, mutate: mutateAccount } = useSWR(
    accountId ? `/api/accounts/${accountId}` : null,
    fetcher
  );

  // Build transactions API URL with filter and search parameters
  const transactionsUrl = React.useMemo(() => {
    if (!accountId) return null;
    
    const params = new URLSearchParams();
    params.append('accountId', accountId);
    
    if (transactionFilter !== 'all') {
      params.append('type', transactionFilter);
    }
    
    if (searchParams.search) {
      params.append('search', searchParams.search);
    }
    
    if (searchParams.category) {
      params.append('category', searchParams.category);
    }
    
    if (searchParams.merchant) {
      params.append('merchant', searchParams.merchant);
    }
    
    if (searchParams.tags) {
      params.append('tags', searchParams.tags);
    }
    
    if (searchParams.dateFrom) {
      params.append('from', new Date(searchParams.dateFrom).toISOString());
    }
    
    if (searchParams.dateTo) {
      // Set to end of day for the "to" date
      const toDate = new Date(searchParams.dateTo);
      toDate.setHours(23, 59, 59, 999);
      params.append('to', toDate.toISOString());
    }
    
    if (searchParams.amountMin) {
      params.append('amountMin', searchParams.amountMin);
    }
    
    if (searchParams.amountMax) {
      params.append('amountMax', searchParams.amountMax);
    }
    
    return `/api/transactions?${params.toString()}`;
  }, [accountId, transactionFilter, searchParams]);

  const { data: transactions, error: transactionsError, isLoading: transactionsLoading, mutate: mutateTransactions } = useSWR(
    transactionsUrl,
    fetcher
  );

  // Fetch adjustments for this account
  const { data: adjustments, error: adjustmentsError, isLoading: adjustmentsLoading, mutate: mutateAdjustments } = useSWR(
    accountId ? `/api/adjustments?accountId=${accountId}` : null,
    fetcher
  );

  // Fetch available tags for autocomplete
  const { data: tagsData } = useSWR('/api/tags', fetcher);
  const availableTags = tagsData?.tags?.map((t: { tag: string; count: number }) => t.tag) || [];

  // Fetch all accounts for transfer functionality
  const { data: allAccounts } = useSWR('/api/accounts', fetcher);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      accountId: '',
      type: 'expense',
      category: '',
      amountCents: 0,
      currency: 'INR',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
      paymentMode: '',
      merchant: '',
      note: '',
      tags: [],
      transferToAccountId: '',
    },
  });

  // Form for balance adjustment
  const {
    control: balanceControl,
    handleSubmit: handleBalanceSubmit,
    reset: resetBalance,
    formState: { errors: balanceErrors },
  } = useForm({
    defaultValues: {
      newBalance: 0,
      reason: '',
    },
  });

  // Update balance form when account data or dialog opens
  React.useEffect(() => {
    if (account && openBalanceDialog) {
      resetBalance({
        newBalance: account.currentBalanceCents / 100, // Convert from cents
        reason: '',
      });
    }
  }, [account, openBalanceDialog, resetBalance]);

  // Watch the transaction type to show/hide transfer fields
  const transactionType = watch('type');

  // Update form with accountId when it's available
  React.useEffect(() => {
    if (accountId) {
      reset({
        accountId,
        type: 'expense',
        category: '',
        amountCents: 0,
        currency: 'INR',
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().slice(0, 5),
        paymentMode: '',
        merchant: '',
        note: '',
        tags: [],
        transferToAccountId: '',
      });
    }
  }, [accountId, reset]);

  const onSubmit = async (data: {
    accountId: string;
    type: string;
    category: string;
    amountCents: number;
    currency: string;
    date: string;
    time?: string;
    paymentMode?: string;
    merchant: string;
    note: string;
    tags?: string[];
    transferToAccountId?: string;
  }) => {
    setSubmitting(true);
    try {
      // Combine date and time if time is provided
      const transactionDate = new Date(data.date);
      if (data.time) {
        const [hours, minutes] = data.time.split(':');
        transactionDate.setHours(parseInt(hours), parseInt(minutes));
      }

      // Handle transfer transactions
      if (data.type === 'transfer') {
        if (!data.transferToAccountId) {
          alert('Please select a destination account for the transfer.');
          return;
        }

        const transferData = {
          fromAccountId: data.accountId,
          toAccountId: data.transferToAccountId,
          amountCents: data.amountCents * 100, // Convert to cents
          date: transactionDate,
          note: data.note || undefined,
          category: data.category || 'Transfer',
        };
        
        console.log('Sending transfer data:', transferData);

        const response = await fetch('/api/transfers', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transferData),
        });

        if (!response.ok) {
          let errorMessage = 'Failed to create transfer';
          try {
            const errorData = await response.json();
            console.error('Transfer creation failed:', errorData);
            
            if (errorData.error) {
              errorMessage = errorData.error;
              
              // Add specific balance information if available
              if (errorData.details && errorData.details.available !== undefined) {
                const available = formatCurrency(errorData.details.available, errorData.details.currency);
                const requested = formatCurrency(errorData.details.requested, errorData.details.currency);
                errorMessage += `\nAvailable: ${available}\nRequested: ${requested}`;
              }
            }
          } catch (parseError) {
            console.error('Failed to parse error response:', parseError);
          }
          throw new Error(errorMessage);
        }
      } else {
        // Handle regular transactions
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId: data.accountId,
            type: data.type,
            category: data.category,
            amountCents: data.amountCents * 100, // Convert to cents
            currency: data.currency,
            date: transactionDate,
            time: data.time || undefined,
            paymentMode: data.paymentMode || undefined,
            merchant: data.merchant || undefined,
            note: data.note || undefined,
            tags: data.tags && data.tags.length > 0 ? data.tags : undefined,
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to create transaction');
        }
      }

      reset();
      setOpenTransactionDialog(false);
      mutateTransactions();
      mutateAccount();
    } catch (error) {
      console.error('Error creating transaction:', error);
      alert('Failed to create transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle balance adjustment submission
  const onBalanceSubmit = async (data: {
    newBalance: number;
    reason: string;
  }) => {
    setAdjustmentSubmitting(true);
    try {
      const response = await fetch('/api/adjustments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          newBalanceCents: data.newBalance * 100, // Convert to cents
          reason: data.reason,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to adjust balance';
        try {
          const errorData = await response.json();
          console.error('Balance adjustment failed:', errorData);
          errorMessage = errorData.error || errorMessage;
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
        }
        throw new Error(errorMessage);
      }

      resetBalance();
      setOpenBalanceDialog(false);
      mutateAccount(); // Refresh account data
      mutateAdjustments(); // Refresh adjustments data
      alert('Balance adjusted successfully!');
    } catch (error) {
      console.error('Error adjusting balance:', error);
      alert('Failed to adjust balance. Please try again.');
    } finally {
      setAdjustmentSubmitting(false);
    }
  };

  if (accountLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (accountError || !account) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load account details. Please try again.
        </Alert>
      </Box>
    );
  }

  const IconComponent = accountTypeIcons[account.type as keyof typeof accountTypeIcons] || AccountBalance;
  const color = account.color || accountTypeColors[account.type as keyof typeof accountTypeColors] || '#1976d2';

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => router.back()}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" component="h1">
          Account Details
        </Typography>
      </Box>

      {/* Account Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconComponent sx={{ mr: 2, color, fontSize: 40 }} />
            <Box>
              <Typography variant="h5">{account.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {account.type.toUpperCase()} • {account.currency}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box>
              <Typography variant="h3" color="primary" gutterBottom>
                {formatCurrency(account.currentBalanceCents)}
              </Typography>
              <Chip 
                label={account.type.toUpperCase()} 
                sx={{ backgroundColor: color, color: 'white' }}
              />
            </Box>
            
            <Button
              variant="outlined"
              size="small"
              onClick={() => setOpenBalanceDialog(true)}
              sx={{ alignSelf: 'flex-start' }}
            >
              Edit Balance
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Transactions Section */}
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Transactions
            </Typography>
          </Box>

          {/* Transaction Filter Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs 
              value={transactionFilter} 
              onChange={(_, newValue) => setTransactionFilter(newValue)}
              aria-label="transaction filter tabs"
            >
              <Tab label="All" value="all" />
              <Tab label="Income" value="income" />
              <Tab label="Expense" value="expense" />
              <Tab label="Transfers" value="transfer" />
              <Tab label="Adjustments" value="adjustments" />
            </Tabs>
          </Box>

          {/* Search Section - Only show for transactions, not adjustments */}
          {transactionFilter !== 'adjustments' && (
            <Box sx={{ mb: 2 }}>
              {/* Quick Search Bar */}
              <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                <TextField
                  size="small"
                  placeholder="Search transactions..."
                  value={searchParams.search}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, search: e.target.value }))}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search />
                      </InputAdornment>
                    ),
                    endAdornment: searchParams.search && (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setSearchParams(prev => ({ ...prev, search: '' }))}
                        >
                          <Clear />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FilterList />}
                  endIcon={searchExpanded ? <ExpandLess /> : <ExpandMore />}
                  onClick={() => setSearchExpanded(!searchExpanded)}
                  sx={{ minWidth: 'auto', px: 2 }}
                >
                  Filters
                </Button>
              </Box>

              {/* Active Filter Indicator */}
              {(searchParams.search || searchParams.category || searchParams.merchant || searchParams.tags ||
                searchParams.dateFrom || searchParams.dateTo || searchParams.amountMin || searchParams.amountMax) && (
                <Box sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary">
                    Active filters:
                  </Typography>
                  {searchParams.search && <Chip size="small" label={`Search: "${searchParams.search}"`} />}
                  {searchParams.category && <Chip size="small" label={`Category: "${searchParams.category}"`} />}
                  {searchParams.merchant && <Chip size="small" label={`Merchant: "${searchParams.merchant}"`} />}
                  {searchParams.tags && <Chip size="small" label={`Tags: "${searchParams.tags}"`} />}
                  {searchParams.dateFrom && <Chip size="small" label={`From: ${searchParams.dateFrom}`} />}
                  {searchParams.dateTo && <Chip size="small" label={`To: ${searchParams.dateTo}`} />}
                  {searchParams.amountMin && <Chip size="small" label={`Min: ₹${searchParams.amountMin}`} />}
                  {searchParams.amountMax && <Chip size="small" label={`Max: ₹${searchParams.amountMax}`} />}
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => setSearchParams({
                      search: '',
                      category: '',
                      merchant: '',
                      tags: '',
                      dateFrom: '',
                      dateTo: '',
                      amountMin: '',
                      amountMax: '',
                    })}
                  >
                    Clear all
                  </Button>
                </Box>
              )}

              {/* Advanced Search Panel */}
              <Collapse in={searchExpanded}>
                <Card variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        size="small"
                        label="Category"
                        sx={{ flex: 1 }}
                        value={searchParams.category}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, category: e.target.value }))}
                      />
                      <TextField
                        size="small"
                        label="Merchant"
                        sx={{ flex: 1 }}
                        value={searchParams.merchant}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, merchant: e.target.value }))}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Autocomplete
                        multiple
                        freeSolo
                        size="small"
                        options={availableTags}
                        value={searchParams.tags ? searchParams.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []}
                        onChange={(_, newValue) => {
                          const tagsString = Array.isArray(newValue) ? newValue.join(', ') : '';
                          setSearchParams(prev => ({ ...prev, tags: tagsString }));
                        }}
                        onInputChange={(_, inputValue) => {
                          // Handle manual input (comma-separated)
                          if (inputValue.includes(',')) {
                            const newTags = inputValue.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
                            setSearchParams(prev => ({ ...prev, tags: newTags.join(', ') }));
                          }
                        }}
                        renderTags={(value, getTagProps) =>
                          value.map((option, index) => (
                            <Chip
                              variant="outlined"
                              label={option}
                              size="small"
                              {...getTagProps({ index })}
                              key={index}
                            />
                          ))
                        }
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Tags"
                            placeholder="Select or type tags..."
                            helperText="Select existing tags or type new ones"
                          />
                        )}
                        sx={{ flex: 1 }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        size="small"
                        label="From Date"
                        type="date"
                        sx={{ flex: 1 }}
                        value={searchParams.dateFrom}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, dateFrom: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                      <TextField
                        size="small"
                        label="To Date"
                        type="date"
                        sx={{ flex: 1 }}
                        value={searchParams.dateTo}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, dateTo: e.target.value }))}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <TextField
                        size="small"
                        label="Min Amount"
                        type="number"
                        sx={{ flex: 1 }}
                        value={searchParams.amountMin}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, amountMin: e.target.value }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>
                        }}
                      />
                      <TextField
                        size="small"
                        label="Max Amount"
                        type="number"
                        sx={{ flex: 1 }}
                        value={searchParams.amountMax}
                        onChange={(e) => setSearchParams(prev => ({ ...prev, amountMax: e.target.value }))}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">₹</InputAdornment>
                        }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setSearchParams({
                          search: '',
                          category: '',
                          merchant: '',
                          tags: '',
                          dateFrom: '',
                          dateTo: '',
                          amountMin: '',
                          amountMax: '',
                        })}
                      >
                        Clear All Filters
                      </Button>
                    </Box>
                  </Box>
                </Card>
              </Collapse>
            </Box>
          )}
          
          {transactionFilter === 'adjustments' ? (
            adjustmentsLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : adjustmentsError ? (
              <Alert severity="error">Failed to load adjustments</Alert>
            ) : !adjustments || !adjustments.adjustments || adjustments.adjustments.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No balance adjustments found.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {adjustments.adjustments.map((adjustment: Adjustment) => (
                  <Box
                    key={adjustment._id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      width: '100%',
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body1">Balance Adjustment</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(adjustment.createdAt).toLocaleDateString()}
                        {adjustment.reason && ` • ${adjustment.reason}`}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="body1" 
                        color={adjustment.adjustmentAmountCents > 0 ? 'success.main' : 'error.main'}
                        fontWeight="bold"
                      >
                        {adjustment.adjustmentAmountCents > 0 ? '+' : ''}
                        {formatCurrency(adjustment.adjustmentAmountCents)}
                      </Typography>
                      <Chip 
                        label="ADJUSTMENT" 
                        size="small"
                        color="warning"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )
          ) : (
            transactionsLoading ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : transactionsError ? (
              <Alert severity="error">Failed to load transactions</Alert>
            ) : !transactions || !Array.isArray(transactions.transactions) || transactions.transactions.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                No transactions yet. Add your first transaction using the + button.
              </Typography>
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                {Array.isArray(transactions.transactions) && transactions.transactions.slice(0, 10).map((transaction: {
                  _id: string;
                  category: string;
                  date: string;
                  merchant?: string;
                  amountCents: number;
                  type: string;
                  transferToAccountId?: { name: string };
                  transferFromAccountId?: { name: string };
                }) => (
                  <ButtonBase
                    key={transaction._id}
                    onClick={() => router.push(`/transactions/${transaction._id}`)}
                    sx={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      p: 2,
                      border: '1px solid',
                      borderColor: 'divider',
                      borderRadius: 1,
                      width: '100%',
                      '&:hover': {
                        backgroundColor: 'action.hover',
                        borderColor: 'primary.main',
                      },
                      transition: 'all 0.2s ease-in-out',
                    }}
                  >
                    <Box sx={{ textAlign: 'left' }}>
                      <Typography variant="body1">{transaction.merchant || transaction.category}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(transaction.date).toLocaleDateString()}
                        {transaction.merchant && transaction.category && ` • ${transaction.category}`}
                        {transaction.type === 'transfer' && transaction.transferFromAccountId && transaction.transferToAccountId && (
                          <span> • {transaction.amountCents > 0 ? `From: ${transaction.transferFromAccountId.name}` : `To: ${transaction.transferToAccountId.name}`}</span>
                        )}
                      </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                      <Typography 
                        variant="body1" 
                        color={
                          transaction.type === 'income' ? 'success.main' : 
                          transaction.type === 'transfer' ? 'info.main' :
                          'error.main'
                        }
                        fontWeight="bold"
                      >
                        {transaction.type === 'income' ? '+' : 
                         transaction.type === 'transfer' ? (transaction.amountCents > 0 ? '+' : '-') : 
                         '-'}{formatCurrency(Math.abs(transaction.amountCents))}
                      </Typography>
                      <Chip 
                        label={transaction.type.toUpperCase()} 
                        size="small"
                        color={
                          transaction.type === 'income' ? 'success' : 
                          transaction.type === 'transfer' ? 'info' :
                          'error'
                        }
                      />
                    </Box>
                  </ButtonBase>
                ))}
                {transactions.transactions.length > 10 && (
                  <Box sx={{ textAlign: 'center', mt: 2 }}>
                    <Button 
                      variant="outlined" 
                      onClick={() => router.push(`/transactions?accountId=${accountId}`)}
                    >
                      View All Transactions ({transactions.transactions.length})
                    </Button>
                  </Box>
                )}
              </Box>
            )
          )}
        </CardContent>
      </Card>

      {/* Add Transaction Button */}
      <Fab
        color="primary"
        aria-label="add transaction"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenTransactionDialog(true)}
      >
        <Add />
      </Fab>

      {/* Add Transaction Dialog */}
      <Dialog open={openTransactionDialog} onClose={() => setOpenTransactionDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add New Transaction</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="type"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Transaction Type</InputLabel>
                    <Select 
                      {...field}
                      value={value || 'expense'}
                      onChange={onChange}
                      label="Transaction Type"
                    >
                      <MenuItem value="income">Income</MenuItem>
                      <MenuItem value="expense">Expense</MenuItem>
                      <MenuItem value="transfer">Transfer</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              
              <Controller
                name="category"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={onChange}
                    label="Category"
                    fullWidth
                    error={!!errors.category}
                    helperText={errors.category?.message}
                  />
                )}
              />

              {/* Transfer Account Selector - Only show for transfer type */}
              {transactionType === 'transfer' && (
                <>
                  <Controller
                    name="transferToAccountId"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <FormControl fullWidth error={!!errors.transferToAccountId}>
                        <InputLabel>Transfer To Account</InputLabel>
                        <Select 
                          {...field}
                          value={value || ''}
                          onChange={onChange}
                          label="Transfer To Account"
                        >
                          {allAccounts?.filter((acc: { _id: string }) => acc._id !== accountId).map((account: { _id: string; name: string; type: string; currentBalanceCents: number; currency: string }) => (
                            <MenuItem key={account._id} value={account._id}>
                              {account.name} ({account.type.toUpperCase()}) - {formatCurrency(account.currentBalanceCents, account.currency)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                  
                  {/* Show current balance warning */}
                  {account && (
                    <Alert severity="info" sx={{ mt: 1 }}>
                      Available balance: {formatCurrency(account.currentBalanceCents, account.currency)}
                    </Alert>
                  )}
                </>
              )}
              
              <Controller
                name="amountCents"
                control={control}
                rules={{ 
                  required: 'Amount is required', 
                  min: { value: 0.01, message: 'Amount must be greater than 0' },
                  validate: (value) => {
                    if (transactionType === 'transfer' && account) {
                      const amountInCents = value * 100;
                      if (amountInCents > account.currentBalanceCents) {
                        return `Insufficient balance. Available: ${formatCurrency(account.currentBalanceCents, account.currency)}`;
                      }
                    }
                    return true;
                  }
                }}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    label="Amount"
                    type="number"
                    fullWidth
                    error={!!errors.amountCents}
                    helperText={errors.amountCents?.message}
                    value={value || 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    inputProps={{ min: 0.01, step: 0.01 }}
                  />
                )}
              />
              
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      label="Date"
                      type="date"
                      fullWidth
                      error={!!errors.date}
                      helperText={errors.date?.message}
                      value={value || ''}
                      onChange={onChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
                
                <Controller
                  name="time"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      label="Time"
                      type="time"
                      fullWidth
                      error={!!errors.time}
                      helperText={errors.time?.message}
                      value={value || ''}
                      onChange={onChange}
                      InputLabelProps={{ shrink: true }}
                    />
                  )}
                />
              </Box>
              
              <Controller
                name="paymentMode"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControl fullWidth error={!!errors.paymentMode}>
                    <InputLabel>Payment Mode</InputLabel>
                    <Select 
                      {...field}
                      value={value || ''}
                      onChange={onChange}
                      label="Payment Mode"
                    >
                      <MenuItem value="">Select Payment Mode</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="debit_card">Debit Card</MenuItem>
                      <MenuItem value="credit_card">Credit Card</MenuItem>
                      <MenuItem value="upi">UPI</MenuItem>
                      <MenuItem value="net_banking">Net Banking</MenuItem>
                      <MenuItem value="wallet">Wallet</MenuItem>
                      <MenuItem value="cheque">Cheque</MenuItem>
                      <MenuItem value="other">Other</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              
              <Controller
                name="merchant"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={onChange}
                    label="Merchant (Optional)"
                    fullWidth
                    error={!!errors.merchant}
                    helperText={errors.merchant?.message}
                  />
                )}
              />
              
              <Controller
                name="tags"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Autocomplete
                    {...field}
                    multiple
                    freeSolo
                    options={[]}
                    value={value || []}
                    onChange={(_, newValue) => onChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Tags (Optional)"
                        fullWidth
                        error={!!errors.tags}
                        helperText={errors.tags?.message || "Press Enter to add tags"}
                      />
                    )}
                  />
                )}
              />
              
              <Controller
                name="note"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={onChange}
                    label="Note (Optional)"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!errors.note}
                    helperText={errors.note?.message}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenTransactionDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Adding...' : 'Add Transaction'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Balance Adjustment Dialog */}
      <Dialog open={openBalanceDialog} onClose={() => setOpenBalanceDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleBalanceSubmit(onBalanceSubmit)}>
          <DialogTitle>Adjust Account Balance</DialogTitle>
          <DialogContent>
            <Alert severity="info" sx={{ mb: 2 }}>
              Current Balance: {formatCurrency(account.currentBalanceCents, account.currency)}
            </Alert>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="newBalance"
                control={balanceControl}
                rules={{ required: 'New balance is required' }}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    label="New Balance"
                    type="number"
                    fullWidth
                    error={!!balanceErrors.newBalance}
                    helperText={balanceErrors.newBalance?.message}
                    value={value || 0}
                    onChange={(e) => onChange(Number(e.target.value))}
                    inputProps={{ step: 0.01 }}
                  />
                )}
              />
              
              <Controller
                name="reason"
                control={balanceControl}
                rules={{ required: 'Reason is required' }}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={onChange}
                    label="Reason for Adjustment"
                    multiline
                    rows={3}
                    fullWidth
                    error={!!balanceErrors.reason}
                    helperText={balanceErrors.reason?.message || "Explain why this balance adjustment is needed"}
                    placeholder="e.g., Bank reconciliation, correction of error, cash found, etc."
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenBalanceDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              color="warning"
              disabled={adjustmentSubmitting}
              startIcon={adjustmentSubmitting ? <CircularProgress size={20} /> : null}
            >
              {adjustmentSubmitting ? 'Adjusting...' : 'Adjust Balance'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
