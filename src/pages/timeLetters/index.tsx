import { useState, useEffect } from 'react';
import { View, Text, Image, Button } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { ArrowLeft, Plus, Lock, Mail } from 'lucide-react';
import { storage, TimeLetter } from '../../services/storage';
import './index.less';

export default function TimeLetters() {
  const [letters, setLetters] = useState<TimeLetter[]>([]);
  const [showCompose, setShowCompose] = useState(false);

  useEffect(() => {
    loadLetters();
  }, []);

  const loadLetters = () => {
    const list = storage.getTimeLetters();
    setLetters(list);
  };

  const handleWriteLetter = () => {
    // 创建时光信件
    const newLetter: TimeLetter = {
      id: 'letter_' + Date.now(),
      catId: storage.getActiveCatId() || '',
      catAvatar: storage.getActiveCat()?.avatar || '',
      content: '写给未来的自己...',
      unlockAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7天后解锁
      createdAt: Date.now()
    };

    const updated = [newLetter, ...letters];
    storage.saveTimeLetters(updated);
    setLetters(updated);
    setShowCompose(false);
  };

  const formatUnlockTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const isUnlocked = (unlockAt: number) => {
    return Date.now() >= unlockAt;
  };

  return (
    <View className="time-letters-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">时光信件</Text>
        <View className="add-btn" onClick={() => setShowCompose(true)}>
          <Plus size={20} />
        </View>
      </View>

      <View className="letters-list">
        {letters.length === 0 ? (
          <View className="empty">
            <Mail size={48} />
            <Text className="empty-text">还没有时光信件</Text>
            <Text className="empty-hint">写一封信给未来的自己</Text>
          </View>
        ) : (
          letters.map((letter) => (
            <View key={letter.id} className={`letter-item ${isUnlocked(letter.unlockAt) ? 'unlocked' : 'locked'}`}>
              <Image className="cat-avatar" src={letter.catAvatar} mode="aspectFill" />

              <View className="letter-content">
                {isUnlocked(letter.unlockAt) ? (
                  <>
                    <Text className="letter-text">{letter.content}</Text>
                    <Text className="letter-time">{formatUnlockTime(letter.createdAt)}</Text>
                  </>
                ) : (
                  <View className="locked-content">
                    <Lock size={24} />
                    <Text className="locked-text">将于 {formatUnlockTime(letter.unlockAt)} 解锁</Text>
                  </View>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {showCompose && (
        <View className="compose-modal">
          <View className="compose-header">
            <Text className="compose-title">写时光信件</Text>
            <View className="close-btn" onClick={() => setShowCompose(false)}>×</View>
          </View>
          <View className="compose-content">
            <Text className="compose-hint">选择解锁时间，写下想对未来自己说的话</Text>
            <Button className="write-btn" onClick={handleWriteLetter}>
              写给7天后的自己
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}