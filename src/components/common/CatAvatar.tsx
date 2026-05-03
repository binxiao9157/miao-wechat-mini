import { useState } from 'react';
import { Image, View, Text } from '@tarojs/components';
import './CatAvatar.less';

interface CatAvatarProps {
  src?: string;
  name?: string;
  className?: string;
  mode?: string;
  style?: React.CSSProperties;
}

export default function CatAvatar({ src, name, className = '', mode = 'aspectFill', style }: CatAvatarProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <View className={`cat-avatar-fallback ${className}`} style={style}>
        <Text className="cat-avatar-fallback-text">{(name || '喵').charAt(0)}</Text>
      </View>
    );
  }

  return (
    <Image
      className={className}
      src={src}
      mode={mode}
      style={style}
      onError={() => setFailed(true)}
    />
  );
}