import { useState } from 'react';
import { View, Text, Input, Button } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { ArrowLeft, Send } from 'lucide-react';
import './index.less';

export default function Feedback() {
  const [content, setContent] = useState('');
  const [contact, setContact] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!content.trim()) return;
    // 模拟提交反馈
    setSubmitted(true);
  };

  return (
    <View className="feedback-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <ArrowLeft size={20} />
        </View>
        <Text className="title">意见反馈</Text>
        <View className="placeholder" />
      </View>

      {submitted ? (
        <View className="success-view">
          <Text className="success-icon">✓</Text>
          <Text className="success-text">感谢您的反馈！</Text>
          <Button className="back-btn" onClick={() => navigateBack()}>
            返回
          </Button>
        </View>
      ) : (
        <View className="content">
          <Text className="label">请描述您遇到的问题或建议</Text>
          <Input
            className="input-area"
            type="textarea"
            placeholder="请输入详细内容..."
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            maxlength={500}
          />

          <Text className="label">联系方式（选填）</Text>
          <Input
            className="contact-input"
            type="text"
            placeholder="邮箱或微信"
            value={contact}
            onInput={(e) => setContact(e.detail.value)}
          />

          <Button className="submit-btn" onClick={handleSubmit}>
            <Send size={18} />
            提交反馈
          </Button>
        </View>
      )}
    </View>
  );
}