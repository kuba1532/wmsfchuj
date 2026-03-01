import useResponsive from '@/hooks/useResponsive';
import DesktopLayout from './DesktopLayout';
import MobileLayout from './MobileLayout';

const ResponsiveLayout = () => {
  const { isMobile } = useResponsive();

  return isMobile ? <MobileLayout /> : <DesktopLayout />;
};

export default ResponsiveLayout;
