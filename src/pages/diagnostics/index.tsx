import React, { useState } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import PageHeader from '../../components/layout/PageHeader';
import { useAuthContext } from '../../context/AuthContext';
import { syncQueue } from '../../services/syncQueue';
import { getAllKeys } from '../../utils/storageAdapter';
import { navigateTo, safeBack } from '../../utils/navigateAdapter';
import {
  canAccessAdminConsole,
  canUseDangerousDebug,
  getAdminSettingsRoute,
  isAdminBundleEnabled,
  isDebugBuild,
} from '../../utils/debugAccess';
import './index.less';

type DiagnosticRow = {
  label: string;
  value: string | number;
};

function formatBool(value: boolean): string {
  return value ? '是' : '否';
}

export default function Diagnostics() {
  const { user, isAuthenticated, hasCat, catCount } = useAuthContext();
  const [pendingCount, setPendingCount] = useState(() => syncQueue.getPendingTasks().length);
  const [exhaustedCount, setExhaustedCount] = useState(() => syncQueue.getExhaustedTasks().length);
  const [storageKeyCount, setStorageKeyCount] = useState(() => getAllKeys().length);
  const [isFlushing, setIsFlushing] = useState(false);

  const adminAllowed = canAccessAdminConsole(user);
  const dangerousAllowed = canUseDangerousDebug(user);
  const adminRoute = getAdminSettingsRoute();

  const rows: DiagnosticRow[] = [
    { label: '版本', value: '1.0.0' },
    { label: '运行环境', value: process.env.NODE_ENV || 'unknown' },
    { label: 'Debug 构建', value: formatBool(isDebugBuild()) },
    { label: 'Admin Bundle', value: formatBool(isAdminBundleEnabled()) },
    { label: 'Admin 权限', value: formatBool(adminAllowed) },
    { label: '高危调试', value: formatBool(dangerousAllowed) },
    { label: '登录状态', value: formatBool(isAuthenticated) },
    { label: '猫咪数量', value: catCount },
    { label: '有伙伴', value: formatBool(hasCat) },
    { label: '本地 Key', value: storageKeyCount },
    { label: '待同步任务', value: pendingCount },
    { label: '坏任务', value: exhaustedCount },
  ];

  const refreshSnapshot = () => {
    setPendingCount(syncQueue.getPendingTasks().length);
    setExhaustedCount(syncQueue.getExhaustedTasks().length);
    setStorageKeyCount(getAllKeys().length);
  };

  const handleFlush = async () => {
    if (isFlushing) return;
    setIsFlushing(true);
    try {
      await syncQueue.flushNow();
      refreshSnapshot();
      Taro.showToast({ title: '同步队列已刷新', icon: 'none' });
    } catch (error: any) {
      Taro.showToast({ title: error?.message || '刷新失败', icon: 'none' });
    } finally {
      setIsFlushing(false);
    }
  };

  const handleRetryExhausted = () => {
    syncQueue.retryExhaustedTasks();
    refreshSnapshot();
    Taro.showToast({ title: '坏任务已重试', icon: 'none' });
  };

  const handleClearExhausted = () => {
    syncQueue.clearExhaustedTasks();
    refreshSnapshot();
    Taro.showToast({ title: '坏任务已清理', icon: 'none' });
  };

  const handleOpenAdmin = () => {
    if (!adminAllowed || !adminRoute) {
      Taro.showToast({ title: '无调试权限', icon: 'none' });
      return;
    }
    navigateTo(adminRoute);
  };

  return (
    <View className="diagnostics-page">
      <PageHeader title="诊断中心" subtitle="Diagnostics" onBack={() => safeBack()} />
      <ScrollView className="diagnostics-scroll" scrollY showScrollbar={false}>
        <View className="diagnostics-section">
          {rows.map((row) => (
            <View key={row.label} className="diagnostics-row">
              <Text className="diagnostics-label">{row.label}</Text>
              <Text className="diagnostics-value">{String(row.value)}</Text>
            </View>
          ))}
        </View>

        <View className="diagnostics-actions">
          <View className={`diagnostics-action ${isFlushing ? 'disabled' : ''}`} onClick={handleFlush}>
            <Text className="diagnostics-action-text">{isFlushing ? '刷新中' : '刷新同步队列'}</Text>
          </View>
          <View className="diagnostics-action secondary" onClick={handleRetryExhausted}>
            <Text className="diagnostics-action-text secondary">重试坏任务</Text>
          </View>
          <View className="diagnostics-action secondary" onClick={handleClearExhausted}>
            <Text className="diagnostics-action-text secondary">清理坏任务</Text>
          </View>
          {adminAllowed && adminRoute && (
            <View className="diagnostics-action admin" onClick={handleOpenAdmin}>
              <Text className="diagnostics-action-text">后台调试</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
