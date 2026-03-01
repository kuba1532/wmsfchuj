import { useState } from 'react';
import { Box, Typography, TextField, InputAdornment, Chip } from '@mui/material';
import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { Search } from '@mui/icons-material';
import { MovementType, MOVEMENT_TYPE_LABELS } from '@/constants/movementTypes';

const TYPE_COLORS: Record<MovementType, string> = {
  [MovementType.RECEIVE]: '#2E7D32',
  [MovementType.PUTAWAY]: '#1565C0',
  [MovementType.MOVE]: '#FF8F00',
  [MovementType.PICK]: '#D32F2F',
  [MovementType.CORRECTION]: '#7B1FA2',
};

const MOCK_LEDGER = [
  {
    id: 1,
    date: '2025-06-18 14:32',
    type: MovementType.RECEIVE,
    product: 'Śruba M8x40',
    quantity: 500,
    from: '-',
    to: 'BUFOR-01',
    user: 'Jan Kowalski',
    document: 'PZ/2025/005',
  },
  {
    id: 2,
    date: '2025-06-18 14:45',
    type: MovementType.PUTAWAY,
    product: 'Śruba M8x40',
    quantity: 500,
    from: 'BUFOR-01',
    to: 'R1-A-01',
    user: 'Jan Kowalski',
    document: 'PZ/2025/005',
  },
  {
    id: 3,
    date: '2025-06-18 15:10',
    type: MovementType.MOVE,
    product: 'Filtr powietrza FP-200',
    quantity: 50,
    from: 'R2-A-03',
    to: 'R4-C-01',
    user: 'Anna Nowak',
    document: 'MM/2025/012',
  },
  {
    id: 4,
    date: '2025-06-18 15:30',
    type: MovementType.PICK,
    product: 'Olej hydrauliczny 5L',
    quantity: 10,
    from: 'R3-B-02',
    to: 'WYDANIE',
    user: 'Jan Kowalski',
    document: 'RW/2025/008',
  },
  {
    id: 5,
    date: '2025-06-17 09:00',
    type: MovementType.CORRECTION,
    product: 'Smar łożyskowy 400g',
    quantity: -5,
    from: 'R4-B-03',
    to: '-',
    user: 'Maria Wiśniewska',
    document: 'INW/2025/003',
  },
  {
    id: 6,
    date: '2025-06-17 10:20',
    type: MovementType.RECEIVE,
    product: 'Nakrętka M8',
    quantity: 2000,
    from: '-',
    to: 'BUFOR-01',
    user: 'Anna Nowak',
    document: 'PZ/2025/004',
  },
  {
    id: 7,
    date: '2025-06-17 11:00',
    type: MovementType.PUTAWAY,
    product: 'Nakrętka M8',
    quantity: 2000,
    from: 'BUFOR-01',
    to: 'R1-B-02',
    user: 'Anna Nowak',
    document: 'PZ/2025/004',
  },
  {
    id: 8,
    date: '2025-06-16 08:15',
    type: MovementType.PICK,
    product: 'Uszczelka gumowa 50mm',
    quantity: 200,
    from: 'R2-C-01',
    to: 'WYDANIE',
    user: 'Jan Kowalski',
    document: 'RW/2025/007',
  },
];

const columns: GridColDef[] = [
  { field: 'date', headerName: 'Data i czas', width: 160 },
  {
    field: 'type',
    headerName: 'Typ operacji',
    width: 150,
    renderCell: (params) => (
      <Chip
        label={MOVEMENT_TYPE_LABELS[params.value as MovementType]}
        size="small"
        sx={{ bgcolor: TYPE_COLORS[params.value as MovementType], color: 'white', fontWeight: 600 }}
      />
    ),
  },
  { field: 'document', headerName: 'Dokument', width: 150 },
  { field: 'product', headerName: 'Produkt', flex: 1, minWidth: 160 },
  { field: 'quantity', headerName: 'Ilość', width: 100, type: 'number' },
  { field: 'from', headerName: 'Z lokalizacji', width: 130 },
  { field: 'to', headerName: 'Do lokalizacji', width: 130 },
  { field: 'user', headerName: 'Użytkownik', width: 150 },
];

const LedgerPage = () => {
  const [search, setSearch] = useState('');

  const filtered = MOCK_LEDGER.filter(
    (entry) =>
      entry.product.toLowerCase().includes(search.toLowerCase()) ||
      entry.document.toLowerCase().includes(search.toLowerCase()) ||
      entry.user.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>
        Rejestr ruchów magazynowych
      </Typography>

      <TextField
        placeholder="Szukaj po produkcie, dokumencie lub użytkowniku..."
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

export default LedgerPage;
