import { TextField, InputAdornment } from '@mui/material';
import { Search } from '@mui/icons-material';

interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  width?: number | string;
}

const SearchField = ({
  value,
  onChange,
  placeholder = 'Szukaj...',
  width = 350,
}: SearchFieldProps) => {
  return (
    <TextField
      placeholder={placeholder}
      size="small"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      sx={{ mb: 2, width }}
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
  );
};

export default SearchField;
