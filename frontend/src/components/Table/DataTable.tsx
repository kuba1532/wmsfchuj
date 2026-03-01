import { DataGrid, type GridColDef, type GridSortModel } from '@mui/x-data-grid';

interface DataTableProps {
  rows: Record<string, unknown>[];
  columns: GridColDef[];
  pageSize?: number;
  defaultSort?: GridSortModel;
}

const DataTable = ({ rows, columns, pageSize = 10, defaultSort }: DataTableProps) => {
  return (
    <DataGrid
      rows={rows}
      columns={columns}
      pageSizeOptions={[10, 25, 50]}
      initialState={{
        pagination: { paginationModel: { pageSize } },
        sorting: defaultSort ? { sortModel: defaultSort } : undefined,
      }}
      disableRowSelectionOnClick
      autoHeight
      sx={{
        bgcolor: 'white',
        borderRadius: 2,
      }}
    />
  );
};

export default DataTable;
