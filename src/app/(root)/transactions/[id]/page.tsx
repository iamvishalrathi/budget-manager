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
  IconButton,
  Divider,
} from '@mui/material';
import { 
  ArrowBack, 
  Edit, 
  Delete,
  Receipt,
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

interface TransactionFormData {
  accountId: string;
  type: string;
  category: string;
  amountCents: number;
  currency: string;
  date: string;
  merchant: string;
  note: string;
}

interface Account {
  _id: string;
  name: string;
  type: string;
}

const transactionCategories = [
  'Food & Dining',
  'Shopping',
  'Entertainment',
  'Transportation',
  'Bills & Utilities',
  'Healthcare',
  'Education',
  'Travel',
  'Groceries',
  'Fuel',
  'Salary',
  'Freelance',
  'Investment',
  'Gift',
  'Other',
];

export default function TransactionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [transactionId, setTransactionId] = useState<string>('');

  // Get the transaction ID from params
  React.useEffect(() => {
    params.then(({ id }) => setTransactionId(id));
  }, [params]);

  const { data: transaction, error: transactionError, isLoading: transactionLoading, mutate: mutateTransaction } = useSWR(
    transactionId ? `/api/transactions/${transactionId}` : null,
    fetcher
  );

  const { data: accounts } = useSWR('/api/accounts', fetcher);

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
      merchant: '',
      note: '',
    },
  });

  // Update form with transaction data when it's available
  React.useEffect(() => {
    if (transaction) {
      reset({
        accountId: transaction.accountId._id || transaction.accountId,
        type: transaction.type,
        category: transaction.category,
        amountCents: Math.abs(transaction.amountCents) / 100, // Convert from cents
        currency: transaction.currency,
        date: new Date(transaction.date).toISOString().split('T')[0],
        merchant: transaction.merchant || '',
        note: transaction.note || '',
      });
    }
  }, [transaction, reset]);

  const onEditSubmit = async (data: TransactionFormData) => {
    if (!transactionId) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          amountCents: data.amountCents * 100, // Convert to cents
          date: new Date(data.date),
          merchant: data.merchant || undefined,
          note: data.note || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update transaction');
      }

      setOpenEditDialog(false);
      mutateTransaction();
    } catch (error) {
      console.error('Error updating transaction:', error);
      alert('Failed to update transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!transactionId) return;
    
    setSubmitting(true);
    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      router.back();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (transactionLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (transactionError || !transaction) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">
          Failed to load transaction details. Please try again.
        </Alert>
      </Box>
    );
  }

  const account = transaction.accountId;
  const accountIcon = accountTypeIcons[account?.type as keyof typeof accountTypeIcons];
  const AccountIcon = accountIcon || Receipt;
  const color = accountTypeColors[account?.type as keyof typeof accountTypeColors] || '#666';

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <IconButton onClick={() => router.back()} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Transaction Details
        </Typography>
        <IconButton onClick={() => setOpenEditDialog(true)} color="primary">
          <Edit />
        </IconButton>
        <IconButton onClick={() => setOpenDeleteDialog(true)} color="error">
          <Delete />
        </IconButton>
      </Box>

      {/* Transaction Info Card */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 60,
                height: 60,
                borderRadius: '50%',
                backgroundColor: color,
                color: 'white',
                mr: 3,
              }}
            >
              <AccountIcon />
            </Box>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" gutterBottom>
                {transaction.merchant || transaction.category}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {new Date(transaction.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
              <Typography 
                variant="h4" 
                color={transaction.type === 'income' ? 'success.main' : 'error.main'}
                fontWeight="bold"
              >
                {transaction.type === 'income' ? '+' : '-'}
                {formatCurrency(Math.abs(transaction.amountCents), transaction.currency)}
              </Typography>
              <Chip 
                label={transaction.type.toUpperCase()} 
                color={transaction.type === 'income' ? 'success' : 'error'}
                sx={{ mt: 1 }}
              />
            </Box>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Transaction Details */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 3 }}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Account
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountIcon sx={{ mr: 1, color }} />
                <Typography variant="body1">
                  {account?.name} ({account?.type.toUpperCase()})
                </Typography>
              </Box>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Category
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {transaction.category}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Transaction ID
              </Typography>
              <Typography variant="body1" sx={{ mb: 2, fontFamily: 'monospace' }}>
                {transaction._id}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Currency
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {transaction.currency}
              </Typography>
            </Box>
          </Box>

          {transaction.note && (
            <>
              <Divider sx={{ my: 2 }} />
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Note
                </Typography>
                <Typography variant="body1">
                  {transaction.note}
                </Typography>
              </Box>
            </>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Transaction</DialogTitle>
        <form onSubmit={handleSubmit(onEditSubmit)}>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="accountId"
                control={control}
                rules={{ required: 'Account is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.accountId}>
                    <InputLabel>Account</InputLabel>
                    <Select {...field} label="Account">
                      {accounts?.map((acc: Account) => (
                        <MenuItem key={acc._id} value={acc._id}>
                          {acc.name} ({acc.type.toUpperCase()})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="type"
                control={control}
                rules={{ required: 'Type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type">
                      <MenuItem value="income">Income</MenuItem>
                      <MenuItem value="expense">Expense</MenuItem>
                      <MenuItem value="transfer">Transfer</MenuItem>
                      <MenuItem value="adjustment">Adjustment</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="category"
                control={control}
                rules={{ required: 'Category is required' }}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.category}>
                    <InputLabel>Category</InputLabel>
                    <Select {...field} label="Category">
                      {transactionCategories.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="amountCents"
                control={control}
                rules={{ 
                  required: 'Amount is required',
                  min: { value: 0.01, message: 'Amount must be greater than 0' }
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Amount"
                    type="number"
                    inputProps={{ step: 0.01, min: 0 }}
                    fullWidth
                    error={!!errors.amountCents}
                    helperText={errors.amountCents?.message}
                  />
                )}
              />

              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth>
                    <InputLabel>Currency</InputLabel>
                    <Select {...field} label="Currency">
                      <MenuItem value="INR">INR (₹)</MenuItem>
                      <MenuItem value="USD">USD ($)</MenuItem>
                      <MenuItem value="EUR">EUR (€)</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />

              <Controller
                name="date"
                control={control}
                rules={{ required: 'Date is required' }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    error={!!errors.date}
                    helperText={errors.date?.message}
                  />
                )}
              />

              <Controller
                name="merchant"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Merchant (Optional)"
                    fullWidth
                  />
                )}
              />

              <Controller
                name="note"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Note (Optional)"
                    multiline
                    rows={3}
                    fullWidth
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEditDialog(false)}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={submitting}>
              {submitting ? 'Updating...' : 'Update Transaction'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Delete Transaction</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this transaction? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained" disabled={submitting}>
            {submitting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
