import { SignUp } from '@clerk/nextjs';
import { Container, Box } from '@mui/material';

export default function SignUpPage() {
  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <SignUp />
      </Box>
    </Container>
  );
}
