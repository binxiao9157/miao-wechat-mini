import React from 'react';
import {  View, Text, Image } from '@tarojs/components';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
import { navigateBack } from '@tarojs/taro';
import './index.less';

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  rightElement?: React.ReactNode;
}

export default function PageHeader({ title, showBack = true, rightElement }: PageHeaderProps) {
  return (
    <View className="page-header">
      <View className="header-left">
        {showBack && (
          <View className="back-btn" onClick={() => navigateBack()}>
            <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
          </View>
        )}
      </View>
      <Text className="header-title">{title}</Text>
      <View className="header-right">
        {rightElement}
      </View>
    </View>
  );
}