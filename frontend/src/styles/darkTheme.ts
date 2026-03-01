import { createTheme } from '@mui/material/styles';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#42A5F5',
      light: '#64B5F6',
      dark: '#1E88E5',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FFB74D',
      light: '#FFCC80',
      dark: '#FFA726',
      contrastText: '#000000',
    },
    error: {
      main: '#EF5350',
    },
    success: {
      main: '#66BB6A',
    },
    warning: {
      main: '#FFA726',
    },
    background: {
      default: '#0F172A',
      paper: '#1E293B',
    },
    text: {
      primary: '#E2E8F0',
      secondary: '#94A3B8',
    },
    divider: '#334155',
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Arial", sans-serif',
    h4: { fontWeight: 700, fontSize: '1.75rem' },
    h5: { fontWeight: 700, fontSize: '1.4rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    body1: { fontSize: '0.95rem' },
    body2: { fontSize: '0.85rem' },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 20px',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          backgroundColor: '#1E293B',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
        outlined: {
          borderColor: '#475569',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            '& fieldset': {
              borderColor: '#475569',
            },
            '&:hover fieldset': {
              borderColor: '#64748B',
            },
          },
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: '1px solid #334155',
          borderRadius: 12,
          backgroundColor: '#1E293B',
          color: '#E2E8F0',
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#0F172A',
            borderBottom: '2px solid #334155',
            color: '#CBD5E1',
            fontWeight: 700,
            fontSize: '0.85rem',
          },
          '& .MuiDataGrid-columnHeader': {
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-columnSeparator': {
            color: '#475569',
          },
          '& .MuiDataGrid-row': {
            borderBottom: '1px solid #1E293B',
            '&:nth-of-type(even)': {
              backgroundColor: '#162032',
            },
            '&:hover': {
              backgroundColor: '#2D3A4A',
            },
            '&.Mui-selected': {
              backgroundColor: '#1E3A5F',
              '&:hover': {
                backgroundColor: '#234B75',
              },
            },
          },
          '& .MuiDataGrid-cell': {
            borderBottom: '1px solid #262F3D',
            color: '#E2E8F0',
            fontSize: '0.9rem',
            '&:focus, &:focus-within': {
              outline: 'none',
            },
          },
          '& .MuiDataGrid-footerContainer': {
            backgroundColor: '#0F172A',
            borderTop: '2px solid #334155',
            color: '#94A3B8',
          },
          '& .MuiTablePagination-root': {
            color: '#94A3B8',
          },
          '& .MuiTablePagination-selectIcon': {
            color: '#94A3B8',
          },
          '& .MuiDataGrid-menuIcon': {
            color: '#94A3B8',
          },
          '& .MuiDataGrid-sortIcon': {
            color: '#94A3B8',
          },
          '& .MuiDataGrid-overlay': {
            backgroundColor: 'rgba(15, 23, 42, 0.8)',
          },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1E293B',
          backgroundImage: 'none',
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          color: '#94A3B8',
          borderColor: '#475569',
          '&.Mui-selected': {
            backgroundColor: '#334155',
            color: '#E2E8F0',
            '&:hover': {
              backgroundColor: '#3B4A5E',
            },
          },
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: '#334155',
        },
      },
    },
  },
});

export default darkTheme;
