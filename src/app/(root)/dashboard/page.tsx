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
import { 
  Add, 
  AccountBalance, 
  Wallet, 
  CreditCard, 
  Train, 
  AttachMoney
} from '@mui/icons-material';
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

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      type: 'bank',
      currency: 'INR',
      openingBalanceCents: 0,
      color: '',
      icon: '',
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
        Account Management
      </Typography>
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Accounts Grid */}
        {accounts && accounts.length > 0 ? (
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: '1fr', 
              sm: 'repeat(2, 1fr)', 
              md: 'repeat(3, 1fr)',
              lg: 'repeat(4, 1fr)'
            }, 
            gap: 3 
          }}>
            {accounts.map((account) => {
              const accountIcon = accountTypeIcons[account.type as keyof typeof accountTypeIcons];
              const IconComponent = accountIcon || AccountBalance;
              const color = accountTypeColors[account.type as keyof typeof accountTypeColors] || '#666';

              return (
                <Card
                  key={account._id}
                  sx={{
                    cursor: 'pointer',
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4,
                    },
                  }}
                  onClick={() => router.push(`/accounts/${account._id}`)}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
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
                          mr: 2,
                        }}
                      >
                        <IconComponent />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" noWrap>
                          {account.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {account.type.toUpperCase()}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Typography variant="h5" color="primary" sx={{ mb: 1 }}>
                      {formatCurrency(account.currentBalanceCents, account.currency)}
                    </Typography>
                    
                    <Chip 
                      label={account.currency} 
                      size="small" 
                      variant="outlined"
                    />
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        ) : (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 6 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No accounts yet
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Create your first account to get started with managing your finances.
              </Typography>
              <Button variant="contained" onClick={() => setOpenDialog(true)}>
                Create Account
              </Button>
            </CardContent>
          </Card>
        )}
      </Box>

      {/* Add Account FAB */}
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
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    value={value || ''}
                    onChange={onChange}
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
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Account Type</InputLabel>
                    <Select 
                      {...field}
                      value={value || 'bank'}
                      onChange={onChange}
                      label="Account Type"
                    >
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
                render={({ field: { value, onChange, ...field } }) => (
                  <FormControl fullWidth error={!!errors.currency}>
                    <InputLabel>Currency</InputLabel>
                    <Select 
                      {...field}
                      value={value || 'INR'}
                      onChange={onChange}
                      label="Currency"
                    >
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
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    label="Opening Balance"
                    type="number"
                    fullWidth
                    error={!!errors.openingBalanceCents}
                    helperText={errors.openingBalanceCents?.message}
                    onChange={(e) => onChange(Number(e.target.value) * 100)}
                    value={(value || 0) / 100}
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
