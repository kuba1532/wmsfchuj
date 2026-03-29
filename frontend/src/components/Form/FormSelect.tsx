import { TextField, MenuItem } from '@mui/material';
import type { TextFieldProps } from '@mui/material/TextField';
import { type FieldError } from 'react-hook-form';

interface Option {
  value: string;
  label: string;
}

interface FormSelectProps extends Omit<TextFieldProps, 'error'> {
  error?: FieldError;
  options: Option[];
}

const FormSelect = ({ error, options, ...props }: FormSelectProps) => {
  return (
    <TextField
      {...props}
      select
      error={!!error}
      helperText={error?.message || props.helperText}
      fullWidth
      margin="normal"
      size="small"
    >
      {options.map((opt) => (
        <MenuItem key={opt.value} value={opt.value}>
          {opt.label}
        </MenuItem>
      ))}
    </TextField>
  );
};

export default FormSelect;
