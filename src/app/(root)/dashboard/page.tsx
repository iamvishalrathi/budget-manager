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
    others: 'Others',
    // Backward compatibility for old types
    bank: 'Bank',
    card: 'Card',
    metro: 'Metro',
  };
  return displayNames[type] || type.toUpperCase();
};

const groupAccountsByType = (accounts: IAccount[]) => {
  const grouped: { [key: string]: IAccount[] } = {};
  
  accounts.forEach(account => {
    const type = account.type;
    if (!grouped[type]) {
      grouped[type] = [];
    }
    grouped[type].push(account);
  });
  
  // Define the order of account types
  const typeOrder = ['wallet', 'debit_card', 'credit_card', 'cash', 'others', 'bank', 'card', 'metro'];
  
  // Sort the grouped object by type order
  const sortedGrouped: { [key: string]: IAccount[] } = {};
  typeOrder.forEach(type => {
    if (grouped[type]) {
      sortedGrouped[type] = grouped[type];
    }
  });
  
  // Add any remaining types not in the predefined order
  Object.keys(grouped).forEach(type => {
    if (!sortedGrouped[type]) {
      sortedGrouped[type] = grouped[type];
    }
  });
  
  return sortedGrouped;
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
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Account Management
        </Typography>
        {accounts && accounts.length > 0 && (
          <Chip 
            label={`${accounts.length} Account${accounts.length !== 1 ? 's' : ''}`}
            color="primary"
            variant="outlined"
          />
        )}
      </Box>
      
      {/* Account Summary */}
      {accounts && accounts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Account Summary
          </Typography>
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: { 
              xs: 'repeat(2, 1fr)', 
              sm: 'repeat(3, 1fr)', 
              md: 'repeat(4, 1fr)',
              lg: 'repeat(6, 1fr)'
            }, 
            gap: 2 
          }}>
            {Object.entries(groupAccountsByType(accounts)).map(([accountType, accountList]) => {
              const typeIcon = accountTypeIcons[accountType as keyof typeof accountTypeIcons] || Category;
              const TypeIconComponent = typeIcon;
              const typeColor = accountTypeColors[accountType as keyof typeof accountTypeColors] || '#666';
              const totalBalance = accountList.reduce((sum, account) => sum + account.currentBalanceCents, 0);
              
              return (
                <Card key={`summary-${accountType}`} sx={{ backgroundColor: `${typeColor}15` }}>
                  <CardContent sx={{ p: 2, textAlign: 'center' }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: typeColor,
                        color: 'white',
                        mx: 'auto',
                        mb: 1,
                      }}
                    >
                      <TypeIconComponent fontSize="small" />
                    </Box>
                    <Typography variant="body2" fontWeight={600} color={typeColor}>
                      {getAccountTypeDisplay(accountType)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {accountList.length} account{accountList.length !== 1 ? 's' : ''}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                      {formatCurrency(totalBalance, accountList[0]?.currency || 'INR')}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </Box>
      )}
      
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Accounts Grouped by Type */}
        {accounts && accounts.length > 0 ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {Object.entries(groupAccountsByType(accounts)).map(([accountType, accountList]) => {
              const typeIcon = accountTypeIcons[accountType as keyof typeof accountTypeIcons] || Category;
              const TypeIconComponent = typeIcon;
              const typeColor = accountTypeColors[accountType as keyof typeof accountTypeColors] || '#666';
              
              return (
                <Box key={accountType}>
                  {/* Account Type Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        backgroundColor: typeColor,
                        color: 'white',
                        mr: 2,
                      }}
                    >
                      <TypeIconComponent fontSize="small" />
                    </Box>
                    <Typography variant="h6" sx={{ color: typeColor, fontWeight: 600 }}>
                      {getAccountTypeDisplay(accountType)} ({accountList.length})
                    </Typography>
                  </Box>
                  
                  {/* Accounts Grid for this type */}
                  <Box sx={{ 
                    display: 'grid', 
                    gridTemplateColumns: { 
                      xs: '1fr', 
                      sm: 'repeat(2, 1fr)', 
                      md: 'repeat(3, 1fr)',
                      lg: 'repeat(4, 1fr)'
                    }, 
                    gap: 2,
                    ml: 6 // Indent the cards slightly
                  }}>
                    {accountList.map((account) => {
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
                          <CardContent sx={{ p: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box
                                sx={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  width: 40,
                                  height: 40,
                                  borderRadius: '50%',
                                  backgroundColor: color,
                                  color: 'white',
                                  mr: 2,
                                }}
                              >
                                <IconComponent fontSize="small" />
                              </Box>
                              <Box sx={{ flexGrow: 1 }}>
                                <Typography variant="subtitle1" noWrap fontWeight={600}>
                                  {account.name}
                                </Typography>
                              </Box>
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMenuClick(e, account);
                                }}
                              >
                                <MoreVert fontSize="small" />
                              </IconButton>
                            </Box>
                            
                            <Typography variant="h6" color="primary" sx={{ mb: 1 }}>
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
                </Box>
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
