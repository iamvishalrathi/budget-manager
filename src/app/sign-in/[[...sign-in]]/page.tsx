import { SignIn } from '@clerk/nextjs';
import { Container, Box } from '@mui/material';

export default function SignInPage() {
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
        <SignIn />
      </Box>
    </Container>
  );
}
