import React from 'react';
import { useState } from 'react';
import { View, Input, Button, Image, Text } from '@tarojs/components';
import sendPrimary from '../../assets/profile-icons/send-primary.png';
import './CommentInput.less';

const MAX_LENGTH = 500;

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
      <View className="input-row">
        <Input
          className="input"
          type="text"
          placeholder={placeholder}
          value={content}
          maxlength={MAX_LENGTH}
          onInput={(e) => setContent(e.detail.value)}
          onConfirm={handleSubmit}
        />
        <Button className="send-btn" onClick={handleSubmit} disabled={!content.trim()}>
          <Image className="icon-img" src={sendPrimary} mode="aspectFit" style={{ width: 18, height: 18 }} />
        </Button>
      </View>
      {content.length > 0 && (
        <Text className="char-count">{content.length}/{MAX_LENGTH}</Text>
      )}
    </View>
  );
}