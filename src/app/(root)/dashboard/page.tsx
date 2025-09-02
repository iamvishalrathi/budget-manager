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
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { 
  Add, 
  Wallet, 
  CreditCard, 
  AttachMoney,
  TrendingUp,
  MoreVert,
  Edit,
  Delete,
  Payment,
  Category,
  AccountBalance,
  Train,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccounts } from '@/hooks/useApi';
import { formatCurrency } from '@/lib/money';
import { createAccountSchema } from '@/lib/validations';
import { useRouter } from 'next/navigation';
import { IAccount } from '@/models/Account';

type CreateAccountForm = z.infer<typeof createAccountSchema>;

const accountTypeIcons = {
  wallet: Wallet,
  debit_card: CreditCard,
  credit_card: Payment,
  cash: AttachMoney,
  investments: TrendingUp,
  others: Category,
  // Backward compatibility for old types
  bank: AccountBalance,
  card: CreditCard,
  metro: Train,
};

const accountTypeColors = {
  wallet: '#388e3c',
  debit_card: '#f57c00',
  credit_card: '#e91e63',
  cash: '#d32f2f',
  investments: '#9c27b0',
  others: '#607d8b',
  // Backward compatibility for old types
  bank: '#1976d2',
  card: '#f57c00',
  metro: '#7b1fa2',
};

const getAccountTypeDisplay = (type: string) => {
  const displayNames: { [key: string]: string } = {
    wallet: 'Wallet',
    debit_card: 'Debit Card',
    credit_card: 'Credit Card',
    cash: 'Cash',
    investments: 'Investments',
    others: 'Others',
    // Backward compatibility for old types
    bank: 'Bank',
    card: 'Card',
    metro: 'Metro',
  };
  return displayNames[type] || type.toUpperCase();
};

export default function DashboardPage() {
  const [openDialog, setOpenDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<IAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedAccount, setSelectedAccount] = useState<IAccount | null>(null);
  const router = useRouter();
  
  const { accounts, isLoading, isError, mutate } = useAccounts();

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CreateAccountForm>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      name: '',
      type: 'wallet',
      currency: 'INR',
      openingBalanceCents: 0,
      color: '',
      icon: '',
    },
  });

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, account: IAccount) => {
    setAnchorEl(event.currentTarget);
    setSelectedAccount(account);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedAccount(null);
  };

  const handleEdit = () => {
    if (selectedAccount) {
      setEditingAccount(selectedAccount);
      setValue('name', selectedAccount.name);
      setValue('type', selectedAccount.type);
      setValue('currency', selectedAccount.currency);
      setValue('openingBalanceCents', selectedAccount.openingBalanceCents);
      setValue('color', selectedAccount.color || '');
      setValue('icon', selectedAccount.icon || '');
      setOpenDialog(true);
    }
    handleMenuClose();
  };

  const handleDelete = async () => {
    if (selectedAccount && confirm(`Are you sure you want to delete "${selectedAccount.name}"?`)) {
      try {
        const response = await fetch(`/api/accounts/${selectedAccount._id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error('Failed to delete account');
        }

        mutate(); // Refresh data
      } catch (error) {
        console.error('Error deleting account:', error);
        alert('Failed to delete account. Please try again.');
      }
    }
    handleMenuClose();
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingAccount(null);
    reset();
  };

  const onSubmit = async (data: CreateAccountForm) => {
    setSubmitting(true);
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount._id}` : '/api/accounts';
      const method = editingAccount ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`Failed to ${editingAccount ? 'update' : 'create'} account`);
      }

      handleCloseDialog();
      mutate(); // Refresh data
    } catch (error) {
      console.error(`Error ${editingAccount ? 'updating' : 'creating'} account:`, error);
      alert(`Failed to ${editingAccount ? 'update' : 'create'} account. Please try again.`);
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
              const IconComponent = accountIcon || Wallet;
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
                          {getAccountTypeDisplay(account.type)}
                        </Typography>
                      </Box>
                      <IconButton
                        size="small"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMenuClick(e, account);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
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

      {/* Add/Edit Account Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit(onSubmit)}>
          <DialogTitle>{editingAccount ? 'Edit Account' : 'Add New Account'}</DialogTitle>
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
                      value={value || 'wallet'}
                      onChange={onChange}
                      label="Account Type"
                    >
                      <MenuItem value="wallet">Wallet</MenuItem>
                      <MenuItem value="debit_card">Debit Card</MenuItem>
                      <MenuItem value="credit_card">Credit Card</MenuItem>
                      <MenuItem value="cash">Cash</MenuItem>
                      <MenuItem value="investments">Investments</MenuItem>
                      <MenuItem value="others">Others</MenuItem>
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
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={20} /> : null}
            >
              {submitting ? (editingAccount ? 'Updating...' : 'Creating...') : (editingAccount ? 'Update Account' : 'Create Account')}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Account Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          <ListItemText>Edit</ListItemText>
        </MenuItem>
        <MenuItem onClick={handleDelete}>
          <ListItemIcon>
            <Delete fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </Box>
  );
}
