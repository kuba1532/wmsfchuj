import { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search } from '@mui/icons-material';

const ACTION_COLORS: Record<string, string> = {
  LOGIN: '#1565C0',
  CREATE: '#2E7D32',
  UPDATE: '#FF8F00',
  DELETE: '#D32F2F',
  STATUS_CHANGE: '#7B1FA2',
};

const MOCK_AUDIT = [
  {
    id: 1,
    date: '2025-06-18 14:32:15',
    user: 'Jan Kowalski (12345)',
    action: 'CREATE',
    entity: 'Dokument PZ',
    details: 'Utworzono PZ/2025/005',
  },
  {
    id: 2,
    date: '2025-06-18 14:33:00',
    user: 'Jan Kowalski (12345)',
    action: 'STATUS_CHANGE',
    entity: 'Dokument PZ',
    details: 'PZ/2025/005: Roboczy → Zatwierdzony',
  },
  {
    id: 3,
    date: '2025-06-18 14:45:22',
    user: 'Jan Kowalski (12345)',
    action: 'CREATE',
    entity: 'Ruch magazynowy',
    details: 'Przyjęcie 500 szt SKU-001 na BUFOR-01',
  },
  {
    id: 4,
    date: '2025-06-18 15:10:05',
    user: 'Anna Nowak (54321)',
    action: 'UPDATE',
    entity: 'Produkt',
    details: 'SKU-004: zmiana nazwy',
  },
  {
    id: 5,
    date: '2025-06-18 15:30:18',
    user: 'Maria Wiśniewska (11111)',
    action: 'STATUS_CHANGE',
    entity: 'Zapas',
    details: 'SKU-004 R2-A-03: Dostępny → Zablokowany',
  },
  {
    id: 6,
    date: '2025-06-18 16:00:00',
    user: 'Admin (00001)',
    action: 'CREATE',
    entity: 'Użytkownik',
    details: 'Utworzono konto dla 99887',
  },
  {
    id: 7,
    date: '2025-06-18 08:01:12',
    user: 'Jan Kowalski (12345)',
    action: 'LOGIN',
    entity: 'Sesja',
    details: 'Zalogowano z IP 192.168.1.50',
  },
  {
    id: 8,
    date: '2025-06-17 17:55:00',
    user: 'Anna Nowak (54321)',
    action: 'DELETE',
    entity: 'Lokalizacja',
    details: 'Usunięto R5-A-01 (pusta)',
  },
];

const columns: GridColDef[] = [
  { field: 'date', headerName: 'Data i czas', width: 170 },
  { field: 'user', headerName: 'Użytkownik', width: 200 },
  {
    field: 'action',
    headerName: 'Akcja',
    width: 140,
    renderCell: (params) => (
      <Chip
        label={params.value}
        size="small"
        sx={{
          bgcolor: ACTION_COLORS[params.value as string] || '#757575',
          color: 'white',
          fontWeight: 600,
        }}
      />
    ),
  },
  { field: 'entity', headerName: 'Obiekt', width: 160 },
  { field: 'details', headerName: 'Szczegóły', flex: 1, minWidth: 250 },
];

const AuditLogPage = () => {
  const [search, setSearch] = useState('');

  const filtered = MOCK_AUDIT.filter(
    (entry) =>
      entry.user.toLowerCase().includes(search.toLowerCase()) ||
      entry.details.toLowerCase().includes(search.toLowerCase()) ||
      entry.entity.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Dziennik zdarzeń (Audit Log)
      </Typography>

      <TextField
        placeholder="Szukaj po użytkowniku, obiekcie lub szczegółach..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
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

      <DataGrid
        rows={filtered}
        columns={columns}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
          sorting: { sortModel: [{ field: 'date', sort: 'desc' }] },
        }}
        disableRowSelectionOnClick
        autoHeight
        sx={{ borderRadius: 2 }}
      />
    </Box>
  );
};

export default AuditLogPage;
