import { Image } from '@tarojs/components';
import './PawLogo.less';

interface PawLogoProps {
  className?: string;
  size?: number;
}

export default function PawLogo({ className = '', size = 48 }: PawLogoProps) {
  return (
    <Image
      className={`paw-logo ${className}`}
      src={require('../../assets/logo.png')}
      mode="aspectFit"
      style={{ width: size, height: size }}
    />
  );
}