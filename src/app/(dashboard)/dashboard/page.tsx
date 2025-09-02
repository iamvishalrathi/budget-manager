'use client';

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
} from '@mui/material';
import { Add, AccountBalance, Wallet, CreditCard, Train, AttachMoney } from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccounts } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/money';
import { createAccountSchema } from '@/lib/validations';
import { useRouter } from 'next/navigation';

type CreateAccountForm = z.infer<typeof createAccountSchema>;

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

export default function DashboardPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  
  const { accounts, isLoading, isError, mutate } = useAccounts();

  const totalBalance = accounts?.reduce((sum, account) => sum + account.currentBalanceCents, 0) || 0;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      currency: 'INR',
      openingBalanceCents: 0,
    },
  });

  const onSubmit = async (data: CreateAccountForm) => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create account');
      }

      reset();
      setOpenDialog(false);
      mutate(); // Refresh data
    } catch (error) {
      console.error('Error creating account:', error);
      alert('Failed to create account. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        Failed to load accounts. Please try again.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Summary Card */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Total Balance
            </Typography>
            <Typography variant="h3" color="primary">
              {formatCurrency(totalBalance)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Across {accounts?.length || 0} accounts
            </Typography>
          </CardContent>
        </Card>

        {/* Accounts */}
        <Box>
          <Typography variant="h5" gutterBottom>
            Your Accounts
          </Typography>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {accounts?.map((account) => {
              const IconComponent = accountTypeIcons[account.type];
              const color = account.color || accountTypeColors[account.type];
              
              return (
                <Card 
                  key={account._id} 
                  sx={{ 
                    minWidth: 280, 
                    flex: '1 1 280px', 
                    maxWidth: 400,
                    cursor: 'pointer',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    }
                  }}
                  onClick={() => router.push(`/accounts/${account._id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <IconComponent sx={{ mr: 1, color }} />
                      <Typography variant="h6">{account.name}</Typography>
                    </Box>
                    
                    <Typography variant="h4" color="primary" gutterBottom>
                      {formatCurrency(account.currentBalanceCents)}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Chip 
                        label={account.type.toUpperCase()} 
                        size="small" 
                        sx={{ backgroundColor: color, color: 'white' }}
                      />
                      <Typography variant="body2" color="text.secondary">
                        {account.currency}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      </Box>

      {/* Add Account Button */}
      <Fab
        color="primary"
        aria-label="add account"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setOpenDialog(true)}
      >
        <Add />
      </Fab>

      {/* Add Account Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>Add New Account</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Account Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
              
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Account Type</InputLabel>
                    <Select {...field} label="Account Type">
                      <MenuItem value="bank">Bank</MenuItem>
                      <MenuItem value="wallet">Wallet</MenuItem>
                      <MenuItem value="card">Card</MenuItem>
                      <MenuItem value="metro">Metro</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.currency}>
                    <InputLabel>Currency</InputLabel>
                    <Select {...field} label="Currency">
                      <MenuItem value="INR">INR</MenuItem>
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                    </Select>
                  </FormControl>
                )}
              />
              
              <Controller
                name="openingBalanceCents"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Opening Balance"
                    type="number"
                    fullWidth
                    error={!!errors.openingBalanceCents}
                    helperText={errors.openingBalanceCents?.message}
                    onChange={(e) => field.onChange(Number(e.target.value) * 100)}
                    value={field.value / 100}
                  />
                )}
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
