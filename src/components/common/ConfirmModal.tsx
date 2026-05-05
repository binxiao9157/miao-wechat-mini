import React from 'react';
import { View, Text } from '@tarojs/components';
import './ConfirmModal.less';

interface ConfirmModalProps {
  visible: boolean;
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  confirmStyle?: 'primary' | 'danger' | 'success';
  icon?: React.ReactNode;
  maskClosable?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
}

export default function ConfirmModal({
  visible,
  title,
  description,
  confirmText = '确定',
  cancelText = '取消',
  confirmStyle = 'primary',
  icon,
  maskClosable = true,
  onConfirm,
  onCancel,
  children,
}: ConfirmModalProps) {
  if (!visible) return null;

  return (
    <View className="confirm-modal">
      <View
        className="confirm-modal-mask"
        onClick={maskClosable ? onCancel : undefined}
      />
      <View className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
        {icon && <View className="confirm-modal-icon">{icon}</View>}
        <Text className={`confirm-modal-title ${confirmStyle === 'danger' ? 'danger' : ''}`}>
          {title}
        </Text>
        {description && (
          <Text className="confirm-modal-desc">{description}</Text>
        )}
        {children}
        <View className="confirm-modal-actions">
          <View className={`confirm-modal-btn ${confirmStyle}`} onClick={onConfirm}>
            <Text className="confirm-modal-btn-text">{confirmText}</Text>
          </View>
          <View className="confirm-modal-btn cancel" onClick={onCancel}>
            <Text className="confirm-modal-btn-text">{cancelText}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}