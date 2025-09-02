'use client';

import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
} from '@mui/material';

export default function AnalyticsPage() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Analytics
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Analytics dashboard coming soon! This will include spending insights, budget tracking, and financial reports.
      </Alert>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Placeholder cards for future analytics features */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Monthly Spending Overview
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Charts and graphs showing your spending patterns will appear here.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Category Breakdown
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pie charts showing spending by category will be displayed here.
            </Typography>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Income vs Expenses
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Comparative analysis of your income and expenses over time.
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}
