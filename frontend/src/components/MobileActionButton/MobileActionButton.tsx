import { Button, type ButtonProps } from '@mui/material';

interface MobileActionButtonProps extends ButtonProps {
  label: string;
  icon?: React.ReactNode;
}

const MobileActionButton = ({ label, icon, ...props }: MobileActionButtonProps) => {
  return (
    <Button
      variant="contained"
      fullWidth
      startIcon={icon}
      sx={{
        minHeight: 56,
        fontSize: '1rem',
        fontWeight: 600,
        borderRadius: 3,
        ...props.sx,
      }}
      {...props}
    >
      {label}
    </Button>
  );
};

export default MobileActionButton;
