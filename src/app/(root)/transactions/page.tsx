'use client';

import dynamic from 'next/dynamic';
import { Box, CircularProgress } from '@mui/material';

// Dynamically import the component to avoid SSR issues with useSearchParams
const TransactionsContent = dynamic(() => import('./TransactionsContent'), {
  loading: () => (
    <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
      <CircularProgress />
    </Box>
  ),
  ssr: false
});

export default function TransactionsPage() {
  return <TransactionsContent />;
}
