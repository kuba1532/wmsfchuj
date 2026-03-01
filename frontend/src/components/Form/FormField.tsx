import { Controller } from 'react-hook-form';
import { TextField } from '@mui/material';
import type { Control } from 'react-hook-form';
import type { TextFieldProps } from '@mui/material/TextField';

interface FormFieldProps extends Omit<TextFieldProps, 'name'> {
  name: string;
  control: Control<any>;
}

const FormField = ({ name, control, ...props }: FormFieldProps) => {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          {...props}
          error={!!fieldState.error}
          helperText={fieldState.error?.message}
          fullWidth
          size="small"
        />
      )}
    />
  );
};

export default FormField;
