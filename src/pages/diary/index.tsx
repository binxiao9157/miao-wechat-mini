import React from 'react';
import { useState, useEffect } from 'react';
import { View, Text, Image, Button, Input, Textarea } from '@tarojs/components';
import { switchTab } from '@tarojs/taro';
import { ArrowLeft, Plus, Heart, MessageCircle } from '../../components/common/Icons';
import { storage, DiaryEntry } from '../../services/storage';
import './index.less';

export default function Diary() {
  const [diaries, setDiaries] = useState<DiaryEntry[]>([]);
  const [showCompose, setShowCompose] = useState(false);
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    loadDiaries();
  }, []);

  const loadDiaries = () => {
    const list = storage.getDiaries();
    setDiaries(list);
  };

  const handleAddDiary = () => {
    if (!newContent.trim()) return;

    const newDiary: DiaryEntry = {
      id: 'diary_' + Date.now(),
      catId: storage.getActiveCatId() || '',
      content: newContent,
      createdAt: Date.now(),
      likes: 0,
      isLiked: false,
      comments: []
    };

    const updated = [newDiary, ...diaries];
    storage.saveDiaries(updated);
    setDiaries(updated);
    setNewContent('');
    setShowCompose(false);
  };

  const handleLike = (diaryId: string) => {
    const updated = diaries.map(d => {
      if (d.id === diaryId) {
        return {
          ...d,
          isLiked: !d.isLiked,
          likes: d.isLiked ? d.likes - 1 : d.likes + 1
        };
      }
      return d;
    });
    storage.saveDiaries(updated);
    setDiaries(updated);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}月${date.getDate()}日 ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <View className="diary-page">
      <View className="header">
        <View className="back-btn" onClick={() => switchTab({ url: '/pages/home/index' })}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">日记</Text>
        <View className="add-btn" onClick={() => setShowCompose(true)}>
          <Plus size={20} />
        </View>
      </View>

      <View className="diary-list">
        {diaries.length === 0 ? (
          <View className="empty">
            <Text className="empty-text">还没有日记</Text>
            <Text className="empty-hint">记录你和猫咪的美好时光</Text>
          </View>
        ) : (
          diaries.map((diary) => (
            <View key={diary.id} className="diary-item">
              <View className="diary-header">
                <Image className="avatar" src={storage.getUserInfo()?.avatar || ''} mode="aspectFill" />
                <View className="user-info">
                  <Text className="username">{storage.getUserInfo()?.nickname || '未知'}</Text>
                  <Text className="time">{formatTime(diary.createdAt)}</Text>
                </View>
              </View>

              <Text className="diary-content">{diary.content}</Text>

              {diary.media && (
                <Image className="diary-media" src={diary.media} mode="aspectFill" />
              )}

              <View className="diary-actions">
                <View className={`action-btn ${diary.isLiked ? 'liked' : ''}`} onClick={() => handleLike(diary.id)}>
                  <Heart size={18} />
                  <Text>{diary.likes}</Text>
                </View>
                <View className="action-btn">
                  <MessageCircle size={18} />
                  <Text>{diary.comments.length}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      {showCompose && (
        <View className="compose-modal">
          <View className="compose-header">
            <Text className="compose-title">写日记</Text>
            <View className="close-btn" onClick={() => setShowCompose(false)}>×</View>
          </View>
          <Textarea
            className="compose-input"
            placeholder="记录今天的美好时光..."
            value={newContent}
            onInput={(e) => setNewContent(e.detail.value)}
            maxlength={500}
          />
          <Button className="publish-btn" onClick={handleAddDiary}>
            发布
          </Button>
        </View>
      )}
    </View>
  );
}