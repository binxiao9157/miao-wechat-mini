import React from 'react';
import { useState } from 'react';
import { View, Input, Button, Image } from '@tarojs/components';
import sendPrimary from '../../assets/profile-icons/send-primary.png';
import './index.less';

interface CommentInputProps {
  onSubmit: (content: string) => void;
  placeholder?: string;
}

export default function CommentInput({ onSubmit, placeholder = '说点什么...' }: CommentInputProps) {
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!content.trim()) return;
    onSubmit(content);
    setContent('');
  };

  return (
    <View className="comment-input">
      <Input
        className="input"
        type="text"
        placeholder={placeholder}
        value={content}
        onInput={(e) => setContent(e.detail.value)}
        onConfirm={handleSubmit}
      />
      <Button className="send-btn" onClick={handleSubmit} disabled={!content.trim()}>
        <Image className="icon-img" src={sendPrimary} mode="aspectFit" />
      </Button>
    </View>
  );
}