import React, { useState, useEffect } from 'react';
import { View, Text, Image } from '@tarojs/components';
import { navigateBack, navigateTo } from '@tarojs/taro';
import { ArrowLeft, Play, Trash2, Sparkles, Plus } from '../../components/common/Icons';
import { storage, CatInfo } from '../../services/storage';
import { FileManager } from '../../services/fileManager';
import './index.less';

export default function CatHistory() {
  const [cats, setCats] = useState<CatInfo[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    setCats(FileManager.getHistory());
  }, []);

  const handleDelete = (e: any, id: string) => {
    e.stopPropagation();
    setShowDeleteConfirm(id);
  };

  const confirmDelete = () => {
    if (showDeleteConfirm) {
      FileManager.deleteVideo(showDeleteConfirm);
      setCats(FileManager.getHistory());
      setShowDeleteConfirm(null);
    }
  };

  const handleCatClick = (cat: CatInfo) => {
    navigateTo({ url: `/pages/cat-player/index?id=${cat.id}` });
  };

  return (
    <View className="cat-history-page">
      {/* Header */}
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={24} />
        </View>
        <Text className="header-title">我的 AI 猫咪历史</Text>
      </View>

      {/* Cat Grid */}
      {cats.length > 0 ? (
        <View className="cat-grid">
          {cats.map((cat) => {
            const createdDate = cat.id.includes('_')
              ? new Date(parseInt(cat.id.split('_')[1])).toLocaleDateString()
              : '';
            return (
              <View
                key={cat.id}
                className="cat-card"
                onClick={() => handleCatClick(cat)}
              >
                {/* 缩略图 */}
                <View className="card-thumb">
                  {cat.videoPath || cat.remoteVideoUrl ? (
                    <Image className="thumb-image" src={cat.avatar} mode="aspectFill" />
                  ) : (
                    <Image className="thumb-image" src={cat.avatar} mode="aspectFill" />
                  )}
                  {/* 渐变遮罩 */}
                  <View className="thumb-overlay" />
                  {/* 播放按钮 */}
                  <View className="play-btn">
                    <Play size={24} />
                  </View>
                  {/* 删除按钮 */}
                  <View className="card-delete" onClick={(e) => handleDelete(e, cat.id)}>
                    <Trash2 size={14} />
                  </View>
                  {/* 底部信息 */}
                  <View className="card-info">
                    <Text className="card-name">{cat.name}</Text>
                    <Text className="card-date">{createdDate}</Text>
                  </View>
                </View>
              </View>
            );
          })}

          {/* 添加新猫咪 */}
          <View
            className="add-card"
            onClick={() => navigateTo({ url: '/pages/upload-material/index' })}
          >
            <View className="add-icon-box">
              <Plus size={24} />
            </View>
            <Text className="add-text">生成新猫咪</Text>
          </View>
        </View>
      ) : (
        <View className="empty-state">
          <View className="empty-icon-box">
            <Sparkles size={40} />
          </View>
          <Text className="empty-title">还没有生成记录</Text>
          <Text className="empty-desc">快去上传照片，生成您的第一个 AI 猫咪吧！</Text>
        </View>
      )}

      {/* 删除确认弹窗 */}
      {showDeleteConfirm && (
        <View className="delete-overlay" onClick={() => setShowDeleteConfirm(null)}>
          <View className="delete-dialog" onClick={(e) => e.stopPropagation()}>
            <View className="delete-icon-box">
              <Trash2 size={32} />
            </View>
            <Text className="delete-title">确定要删除吗？</Text>
            <Text className="delete-desc">删除后将无法找回这条记录，确定要继续吗？</Text>
            <View className="delete-actions">
              <View className="delete-btn cancel" onClick={() => setShowDeleteConfirm(null)}>
                <Text className="delete-btn-text">取消</Text>
              </View>
              <View className="delete-btn confirm" onClick={confirmDelete}>
                <Text className="delete-btn-text white">确定删除</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}