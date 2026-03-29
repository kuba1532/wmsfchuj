import { Component, type ReactNode } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Warning } from '@mui/icons-material';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 300,
            gap: 2,
            p: 4,
          }}
        >
          <Warning sx={{ fontSize: 48, color: 'warning.main' }} />
          <Typography variant="h6" fontWeight={600}>
            Wystąpił nieoczekiwany błąd
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', maxWidth: 400 }}
          >
            Coś poszło nie tak przy ładowaniu tej sekcji. Spróbuj odświeżyć lub wróć do dashboardu.
          </Typography>
          {this.state.error && (
            <Typography variant="caption" color="text.disabled" sx={{ fontFamily: 'monospace' }}>
              {this.state.error.message}
            </Typography>
          )}
          <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
            <Button variant="outlined" onClick={this.handleReset}>
              Spróbuj ponownie
            </Button>
            <Button variant="contained" onClick={() => (window.location.href = '/dashboard')}>
              Wróć do dashboardu
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
