import { useState, useCallback } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip, CircularProgress } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search } from '@mui/icons-material';
import { useState as useStateInner, useEffect, useCallback as useCallbackInner } from 'react';
import apiClient from '@/api/client';
import { useNotification } from '@/context/NotificationContext';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#1565C0',
  CREATE: '#2E7D32',
  UPDATE: '#FF8F00',
  DELETE: '#D32F2F',
  STATUS_CHANGE: '#7B1FA2',
  CONFIRM: '#00838F',
  APPROVE: '#4527A0',
  GENERATE_TASKS: '#558B2F',
  START: '#0277BD',
  COMPLETE: '#2E7D32',
  CANCEL: '#BF360C',
};

interface AuditEntry {
  id: number;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details: string | null;
  user_id: number | null;
  created_at: string;
}

const columns: GridColDef[] = [
  {
    field: 'created_at',
    headerName: 'Data i czas',
    width: 170,
    valueFormatter: (value: string) => (value ? new Date(value).toLocaleString('pl-PL') : '—'),
  },
  { field: 'user_id', headerName: 'User ID', width: 90 },
  {
    field: 'action',
    headerName: 'Akcja',
    width: 150,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        sx={{
          bgcolor: ACTION_COLORS[params.value as string] ?? '#757575',
          color: 'white',
          fontWeight: 600,
        }}
      />
    ),
  },
  { field: 'entity_type', headerName: 'Obiekt', width: 140 },
  { field: 'entity_id', headerName: 'ID', width: 70 },
  {
    field: 'details',
    headerName: 'Szczegóły',
    flex: 1,
    minWidth: 250,
    valueFormatter: (value: unknown) =>
      value && typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'),
  },
];

const AuditLogPage = () => {
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { showError } = useNotification();

  const fetchAudit = useCallback(async (searchVal: string) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ page: '1', page_size: '100' });
      if (searchVal) params.append('entity_type', searchVal);
      const response = await apiClient.get(`/audit-log?${params.toString()}`);
      setEntries(response.data.items ?? []);
      setTotal(response.data.total ?? 0);
    } catch {
      showError('Nie udało się pobrać dziennika zdarzeń.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAudit('');
  }, [fetchAudit]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
      clearTimeout((handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer);
      (handleSearchChange as { timer?: ReturnType<typeof setTimeout> }).timer = setTimeout(() => {
        fetchAudit(value);
      }, 400);
    },
    [fetchAudit],
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 1 }}>
        Dziennik zdarzeń (Audit Log)
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Łącznie: {total}
      </Typography>

      <TextField
        placeholder="Szukaj..."
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
          autoHeight
          sx={{ borderRadius: 2 }}
        />
      )}
    </Box>
  );
};

export default AuditLogPage;
