import React from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
import './index.less';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightElement?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  showBack = true,
  onBack,
  rightElement,
}: PageHeaderProps) {
  const navSpace = useNavSpace();

  return (
    <View className="page-header" style={navSpace as React.CSSProperties}>
      <View className="header-left">
        {showBack && (
          <View className="back-btn" onClick={() => onBack ? onBack() : navigateBack()}>
            <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
          </View>
        )}
      </View>
      <View className="header-center">
        <Text className="header-title">{title}</Text>
        {subtitle && <Text className="header-subtitle">{subtitle}</Text>}
      </View>
      <View className="header-right">
        {rightElement}
      </View>
    </View>
  );
}