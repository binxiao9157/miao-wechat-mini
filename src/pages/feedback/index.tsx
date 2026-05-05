import React, { useState, useEffect } from 'react';
import { View, Text, Textarea, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { storage } from '../../services/storage';
import PageHeader from '../../components/layout/PageHeader';

const CHECKCIRCLE_GREEN = require('../../assets/profile-icons/checkcircle-green.png');
const STAR_FILLED = require('../../assets/profile-icons/star-primary.png');
const STAR_EMPTY = require('../../assets/profile-icons/star-inactive.png');

import './index.less';

type QuestionType = 'radio' | 'checkbox' | 'rating' | 'text';

interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  required: boolean;
}

const SURVEY_QUESTIONS: Question[] = [
  {
    id: 'style',
    type: 'radio',
    question: '1. 您对 Miao 的整体界面风格（淡橘色治愈系）满意吗？',
    options: ['非常满意', '满意', '一般', '不满意'],
    required: true,
  },
  {
    id: 'speed',
    type: 'radio',
    question: '2. 您认为首页猫咪互动的视频加载速度如何？',
    options: ['极快', '还能接受', '太慢了，影响体验'],
    required: true,
  },
  {
    id: 'actions',
    type: 'radio',
    question: '3. 您觉得目前的 4 种互动动作够玩吗？',
    options: ['非常丰富', '刚刚好', '太少了，希望增加'],
    required: true,
  },
  {
    id: 'new_actions',
    type: 'checkbox',
    question: '4. 您最希望 Miao 未来增加哪类新动作？（多选）',
    options: ['睡觉打呼', '吃饭喝水', '玩毛线球', '翻肚皮求摸', '其他'],
    required: true,
  },
  {
    id: 'ai_quality',
    type: 'rating',
    question: '5. 您对 AI 生成猫咪的"真实度/不崩坏程度"打几分？',
    required: true,
  },
  {
    id: 'points_earn',
    type: 'radio',
    question: '6. 积分系统（签到、互动赚积分）对您有吸引力吗？',
    options: ['每天都想赚', '偶尔想起来', '完全没兴趣'],
    required: true,
  },
  {
    id: 'threshold',
    type: 'radio',
    question: '7. 您认为积分解锁一只新猫咪的门槛高吗？',
    options: ['太高了', '合理', '太低了'],
    required: true,
  },
  {
    id: 'letters',
    type: 'checkbox',
    question: '8. 时光信件功能中，您最看重什么？（多选）',
    options: ['倒计时的期待感', '隐秘的情感寄托', '猫咪专属相册', '其他'],
    required: true,
  },
  {
    id: 'social',
    type: 'radio',
    question: '9. 扫码添加好友（喵友圈）的社交功能，您目前的体验如何？',
    options: ['很棒，经常看', '没好友，很少用', '觉得没必要做社交'],
    required: true,
  },
  {
    id: 'issues',
    type: 'checkbox',
    question: '10. 在使用过程中，您遇到过哪些问题？（多选）',
    options: ['黑屏卡顿', '按钮点不到', '视频耗流量', '找不到某功能', '其他'],
    required: true,
  },
  {
    id: 'suggestions',
    type: 'text',
    question: '11. 您还有什么更好的建议或想对开发者说的话？（选填）',
    required: false,
  },
];

const FEEDBACK_TYPES = ['Bug反馈', '功能建议', '界面优化', '其他'];

export default function Feedback() {
  const navSpace = useNavSpace();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [surveyAnswers, setSurveyAnswers] = useState<Record<string, any>>({});
  const [feedbackType, setFeedbackType] = useState('功能建议');
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    setHasSubmitted(storage.getHasSubmittedSurvey());
  }, []);

  const toggleCheckbox = (id: string, option: string) => {
    const current: string[] = surveyAnswers[id] || [];
    if (current.includes(option)) {
      setSurveyAnswers({ ...surveyAnswers, [id]: current.filter(o => o !== option) });
    } else {
      setSurveyAnswers({ ...surveyAnswers, [id]: [...current, option] });
    }
  };

  const handleSurveySubmit = () => {
    for (const q of SURVEY_QUESTIONS.slice(0, 10)) {
      const answer = surveyAnswers[q.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        const qNum = q.question.split('.')[0];
        wx.showToast({ title: `请完成第 ${qNum} 题`, icon: 'none' });
        return;
      }
    }
    storage.setHasSubmittedSurvey(true);
    setIsSuccess(true);
    setTimeout(() => navigateBack(), 2000);
  };

  const handleSimpleSubmit = () => {
    if (feedbackText.trim().length < 10) {
      wx.showToast({ title: '请至少输入 10 个字', icon: 'none' });
      return;
    }
    setIsSuccess(true);
    setTimeout(() => {
      setFeedbackText('');
      setIsSuccess(false);
      navigateBack();
    }, 2000);
  };

  if (isSuccess) {
    return (
      <View className="feedback-page success-page">
        <View className="success-card">
          <View className="success-icon-wrap">
            <Image className="icon-img" src={CHECKCIRCLE_GREEN} mode="aspectFit" style={{ width: 48, height: 48 }} />
          </View>
          <Text className="success-title">感谢您的宝贵意见！</Text>
          <Text className="success-desc">我们会尽快优化，给您更好的体验</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="feedback-page" style={navSpace as React.CSSProperties}>
      {/* Header */}
      <PageHeader title="反馈" />

      <View className="content-scroll">
        {!hasSubmitted ? (
          <View className="survey-section">
            <View className="survey-notice">
              <Text className="notice-text">为了给喵星人提供更好的陪伴，请花 2 分钟完成以下调研。您的反馈对我们至关重要！</Text>
            </View>

            {SURVEY_QUESTIONS.map((q) => (
              <View key={q.id} className="question-card">
                <Text className="question-text">
                  {q.question}
                  {q.required && <Text className="required-mark"> *</Text>}
                </Text>

                {q.type === 'radio' && q.options?.map((opt) => (
                  <View
                    key={opt}
                    className={`option-item ${surveyAnswers[q.id] === opt ? 'selected' : ''}`}
                    onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: opt })}
                  >
                    <View className={`radio-dot ${surveyAnswers[q.id] === opt ? 'checked' : ''}`}>
                      {surveyAnswers[q.id] === opt && <View className="radio-inner" />}
                    </View>
                    <Text className="option-label">{opt}</Text>
                  </View>
                ))}

                {q.type === 'checkbox' && q.options?.map((opt) => {
                  const isSelected = (surveyAnswers[q.id] || []).includes(opt);
                  return (
                    <View
                      key={opt}
                      className={`option-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleCheckbox(q.id, opt)}
                    >
                      <View className={`checkbox-box ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <Text className="checkbox-tick">✓</Text>}
                      </View>
                      <Text className="option-label">{opt}</Text>
                    </View>
                  );
                })}

                {q.type === 'rating' && (
                  <View className="rating-row">
                    {[1, 2, 3, 4, 5].map((num) => (
                      <View
                        key={num}
                        className="rating-item"
                        onClick={() => setSurveyAnswers({ ...surveyAnswers, [q.id]: num })}
                      >
                        <Image
                          className="rating-star"
                          src={surveyAnswers[q.id] >= num ? STAR_FILLED : STAR_EMPTY}
                          mode="aspectFit"
                          style={{ width: 32, height: 32 }}
                        />
                        <Text className="rating-label">{num}分</Text>
                      </View>
                    ))}
                  </View>
                )}

                {q.type === 'text' && (
                  <Textarea
                    className="question-textarea"
                    placeholder="请填写您的建议..."
                    value={surveyAnswers[q.id] || ''}
                    onInput={(e) => setSurveyAnswers({ ...surveyAnswers, [q.id]: e.detail.value })}
                    maxlength={500}
                  />
                )}
              </View>
            ))}

            <View className="submit-btn" onClick={handleSurveySubmit}>
              <Text className="submit-btn-text">提交问卷</Text>
            </View>
          </View>
        ) : (
          <View className="simple-section">
            <View className="feedback-card">
              <Text className="section-label">问题类型</Text>
              <View className="type-grid">
                {FEEDBACK_TYPES.map((type) => (
                  <View
                    key={type}
                    className={`type-btn ${feedbackType === type ? 'active' : ''}`}
                    onClick={() => setFeedbackType(type)}
                  >
                    <Text className={`type-btn-text ${feedbackType === type ? 'active' : ''}`}>{type}</Text>
                  </View>
                ))}
              </View>

              <Text className="section-label">反馈内容</Text>
              <Textarea
                className="feedback-textarea"
                placeholder="请详细描述您遇到的问题或建议...（至少 10 个字）"
                value={feedbackText}
                onInput={(e) => setFeedbackText(e.detail.value)}
                maxlength={500}
              />
            </View>

            <View className="submit-btn" onClick={handleSimpleSubmit}>
              <Text className="submit-btn-text">发送反馈</Text>
            </View>

            <Text className="footer-text">感谢您的支持，Miao 正在变更好</Text>
          </View>
        )}
      </View>
    </View>
  );
}