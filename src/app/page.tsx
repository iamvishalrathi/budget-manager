import { Button, Container, Typography, Box } from '@mui/material';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import FinancialSummary from '@/components/FinancialSummary';

export default async function HomePage() {
  const { userId } = await auth();

  return (
    <Container maxWidth="lg">
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          textAlign: 'center',
          py: 4,
        }}
      >
        {userId ? (
          // Logged-in user view with financial summary
          <Box sx={{ width: '100%' }}>
            <Typography variant="h3" component="h1" gutterBottom>
              Welcome Back!
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Here&apos;s your financial overview
            </Typography>
            
            <FinancialSummary />
            
            <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Button 
                variant="contained" 
                size="large" 
                component={Link} 
                href="/dashboard"
              >
                Manage Accounts
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                component={Link} 
                href="/transactions"
              >
                View Transactions
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                component={Link} 
                href="/analysis"
              >
                Analytics
              </Button>
            </Box>
          </Box>
        ) : (
          // Non-logged-in user view
          <>
            <Typography variant="h2" component="h1" gutterBottom>
              Bank Transaction Manager
            </Typography>
            <Typography variant="h5" color="text.secondary" paragraph>
              Track your finances, manage accounts, and analyze spending patterns
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 4 }}>
              Secure authentication with Clerk • MongoDB storage • Real-time analytics
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                size="large" 
                component={Link} 
                href="/sign-up"
              >
                Get Started
              </Button>
              <Button 
                variant="outlined" 
                size="large" 
                component={Link} 
                href="/sign-in"
              >
                Sign In
              </Button>
            </Box>
          </>
        )}
      </Box>
    </Container>
  );
}
