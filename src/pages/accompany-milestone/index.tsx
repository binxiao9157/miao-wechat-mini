import React from 'react';
import {  View, Text, Image } from '@tarojs/components';
import { useRouter, navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
const ARROWLEFT_PNG = require('../../assets/profile-icons/arrowleft-dark.png');
import PawLogo from '../../components/common/PawLogo';
import './index.less';

export default function AccompanyMilestone() {
  const navSpace = useNavSpace();
  const router = useRouter();
  const catName = router.params.catName || '小猫';
  const days = parseInt(router.params.days || '0', 10);

  // 计算月历数据
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  // 已陪伴天数（简化：从今天往前推）
  const accompaniedDays = new Set<number>();
  for (let i = 0; i < Math.min(days, daysInMonth); i++) {
    const d = now.getDate() - i;
    if (d > 0) accompaniedDays.add(d);
  }

  return (
    <View className="milestone-page" style={navSpace as React.CSSProperties}>
      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={ARROWLEFT_PNG} mode="aspectFit" style={{ width: 20, height: 20 }} />
        </View>
        <Text className="header-title">陪伴里程碑</Text>
        <View className="header-placeholder" />
      </View>

      {/* 天数卡片 */}
      <View className="days-card">
        <Text className="days-label">与 {catName} 相遇的第</Text>
        <Text className="days-number">{days}</Text>
        <Text className="days-unit">天</Text>
      </View>

      {/* 月历 */}
      <View className="calendar-section">
        <Text className="calendar-title">{year}年 {monthNames[month]}</Text>
        <View className="calendar-grid">
          {weekDays.map((day) => (
            <View key={day} className="calendar-weekday">
              <Text className="weekday-text">{day}</Text>
            </View>
          ))}
          {/* 空白占位 */}
          {Array.from({ length: firstDayOfWeek }).map((_, i) => (
            <View key={`empty-${i}`} className="calendar-cell empty" />
          ))}
          {/* 日期 */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isAccompanied = accompaniedDays.has(day);
            const isToday = day === now.getDate();
            return (
              <View key={day} className={`calendar-cell ${isToday ? 'today' : ''} ${isAccompanied ? 'accompanied' : ''}`}>
                {isAccompanied ? (
                  <View className="cell-paw">
                    <PawLogo size={14} />
                  </View>
                ) : (
                  <Text className="cell-text">{day}</Text>
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* 温馨寄语 */}
      <View className="message-section">
        <Text className="message-text">
          每一天的陪伴都是最珍贵的礼物，{'\n'}愿你和 {catName} 的故事继续温暖下去。
        </Text>
      </View>
    </View>
  );
}