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
} from '@mui/material';
import { 
  ArrowBack, 
  Add, 
  AccountBalance, 
  Wallet, 
  CreditCard, 
  Train, 
  AttachMoney 
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

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [openTransactionDialog, setOpenTransactionDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [accountId, setAccountId] = useState<string>('');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'income' | 'expense' | 'adjustment'>('all');

  // Get the account ID from params
  React.useEffect(() => {
    params.then(({ id }) => setAccountId(id));
  }, [params]);

  const { data: account, error: accountError, isLoading: accountLoading, mutate: mutateAccount } = useSWR(
    accountId ? `/api/accounts/${accountId}` : null,
    fetcher
  );

  // Build transactions API URL with filter
  const transactionsUrl = React.useMemo(() => {
    if (!accountId) return null;
    const baseUrl = `/api/transactions?accountId=${accountId}`;
    return transactionFilter === 'all' ? baseUrl : `${baseUrl}&type=${transactionFilter}`;
  }, [accountId, transactionFilter]);

  const { data: transactions, error: transactionsError, isLoading: transactionsLoading, mutate: mutateTransactions } = useSWR(
    transactionsUrl,
    fetcher
  );

  const {
    control,
    handleSubmit,
    reset,
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
    },
  });

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
  }) => {
    setSubmitting(true);
    try {
      // Combine date and time if time is provided
      const transactionDate = new Date(data.date);
      if (data.time) {
        const [hours, minutes] = data.time.split(':');
        transactionDate.setHours(parseInt(hours), parseInt(minutes));
      }

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
          
          <Typography variant="h3" color="primary" gutterBottom>
            {formatCurrency(account.currentBalanceCents)}
          </Typography>
          
          <Chip 
            label={account.type.toUpperCase()} 
            sx={{ backgroundColor: color, color: 'white' }}
          />
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
              <Tab label="Adjustments" value="adjustment" />
            </Tabs>
          </Box>
          
          {transactionsLoading ? (
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
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography 
                      variant="body1" 
                      color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                      fontWeight="bold"
                    >
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amountCents))}
                    </Typography>
                    <Chip 
                      label={transaction.type.toUpperCase()} 
                      size="small"
                      color={transaction.type === 'income' ? 'success' : 'error'}
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
                      <MenuItem value="adjustment">Adjustment</MenuItem>
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
              
              <Controller
                name="amountCents"
                control={control}
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
    </Box>
  );
}
