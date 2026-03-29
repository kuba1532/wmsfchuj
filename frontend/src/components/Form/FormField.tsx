import { forwardRef } from 'react';
import { TextField } from '@mui/material';
import type { TextFieldProps } from '@mui/material/TextField';
import type { FieldError } from 'react-hook-form';

interface FormFieldProps extends Omit<TextFieldProps, 'error'> {
  error?: FieldError;
}

const FormField = forwardRef<HTMLInputElement, FormFieldProps>(({ error, ...props }, ref) => {
  return (
    <TextField
      {...props}
      inputRef={ref}
      error={!!error}
      helperText={error?.message || props.helperText}
      fullWidth
      size="small"
    />
  );
});

FormField.displayName = 'FormField';

export default FormField;
