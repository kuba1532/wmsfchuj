import { useState, useCallback } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search } from '@mui/icons-material';
import { useEffect } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';
import { MovementType, MOVEMENT_TYPE_LABELS } from '@/constants/movementTypes';
import { dataGridLocaleText } from '@/constants/dataGridLocale';

const TYPE_COLORS: Record<string, string> = {
  RECEIPT: '#2E7D32',
  PUTAWAY: '#1565C0',
  MOVE: '#FF8F00',
  PICK: '#D32F2F',
  INVENTORY_CORRECTION: '#7B1FA2',
};

interface LedgerEntry {
  id: number;
  movement_type: string;
  product_id: number;
  from_location_id: number | null;
  to_location_id: number | null;
  quantity: number;
  document_number: string | null;
  user_id: number;
  created_at: string;
}

const columns: GridColDef[] = [
  {
    field: 'created_at',
    headerName: 'Data i czas',
    width: 160,
    valueFormatter: (value: string) => (value ? new Date(value).toLocaleString('pl-PL') : '—'),
  },
  {
    field: 'movement_type',
    headerName: 'Typ operacji',
    width: 180,
    renderCell: (params) => (
      <Chip
        label={MOVEMENT_TYPE_LABELS[params.value as MovementType] ?? params.value}
        size="small"
        sx={{ bgcolor: TYPE_COLORS[params.value] ?? '#757575', color: 'white', fontWeight: 600 }}
      />
    ),
  },
  {
    field: 'document_number',
    headerName: 'Dokument',
    width: 150,
    valueFormatter: (value: string | null) => value ?? '—',
  },
  { field: 'product_id', headerName: 'ID produktu', width: 110 },
  { field: 'quantity', headerName: 'Ilość', width: 100, type: 'number' },
  {
    field: 'from_location_id',
    headerName: 'Z lok. ID',
    width: 100,
    valueFormatter: (value: number | null) => value ?? '—',
  },
  {
    field: 'to_location_id',
    headerName: 'Do lok. ID',
    width: 100,
    valueFormatter: (value: number | null) => value ?? '—',
  },
  { field: 'user_id', headerName: 'ID użytkownika', width: 120 },
];

const LedgerPage = () => {
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useNotification();

  const fetchLedger = useCallback(async (searchVal: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '100' });
      if (searchVal) params.append('search', searchVal);
      const response = await apiClient.get(`/ledger?${params.toString()}`);
      setEntries(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
    } catch {
      showError('Nie udało się pobrać rejestru ruchów.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLedger('');
  }, [fetchLedger]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
      (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
        fetchLedger(value);
      }, 400);
    },
    [fetchLedger],
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Rejestr ruchów magazynowych
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Łącznie: {total}
      </Typography>

      <TextField
        placeholder="Szukaj po numerze dokumentu..."
        size="small"
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
        sx={{ mb: 2, width: 420 }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          },
        }}
      />

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <DataGrid
          rows={entries}
          columns={columns}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 25 } },
            sorting: { sortModel: [{ field: 'created_at', sort: 'desc' }] },
          }}
          disableRowSelectionOnClick
          localeText={dataGridLocaleText}
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}
    </Box>
  );
};

export default LedgerPage;
