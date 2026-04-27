import { View, Text } from '@tarojs/components';
import { ArrowLeft } from 'lucide-react';
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
            <ArrowLeft size={20} />
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