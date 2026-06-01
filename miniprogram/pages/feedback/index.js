const { post } = require('../../utils/request');
const { safeBack } = require('../../utils/nav');
const { getItem, setItem } = require('../../utils/storage');

const SURVEY_KEY = 'miao_has_submitted_survey';

const SURVEY_QUESTIONS = [
  { id: 'style', type: 'radio', question: '1. 您对 Miao 的整体界面风格（淡橘色治愈系）满意吗？', options: ['非常满意', '满意', '一般', '不满意'], required: true },
  { id: 'speed', type: 'radio', question: '2. 首页猫咪互动的视频加载速度如何？', options: ['极快', '还能接受', '太慢了，影响体验'], required: true },
  { id: 'actions', type: 'radio', question: '3. 您觉得目前的 4 种互动动作够玩吗？', options: ['非常丰富', '刚刚好', '太少了，希望增加'], required: true },
  { id: 'new_actions', type: 'checkbox', question: '4. 您最希望 Miao 未来增加哪类新动作？（多选）', options: ['睡觉打呼', '吃饭喝水', '玩毛线球', '翻肚皮求摸', '其他'], required: true },
  { id: 'ai_quality', type: 'rating', question: '5. 您对 AI 生成猫咪的"真实度/不崩坏程度"打几分？', required: true },
  { id: 'points_earn', type: 'radio', question: '6. 积分系统（签到、互动赚积分）对您有吸引力吗？', options: ['每天都想赚', '偶尔想起来', '完全没兴趣'], required: true },
  { id: 'threshold', type: 'radio', question: '7. 您认为积分解锁一只新猫咪的门槛高吗？', options: ['太高了', '合理', '太低了'], required: true },
  { id: 'letters', type: 'checkbox', question: '8. 时光信件功能中，您最看重什么？（多选）', options: ['倒计时的期待感', '隐秘的情感寄托', '猫咪专属相册', '其他'], required: true },
  { id: 'social', type: 'radio', question: '9. 扫码添加好友（喵友圈）的社交功能，您目前的体验如何？', options: ['很棒，经常看', '没好友，很少用', '觉得没必要做社交'], required: true },
  { id: 'issues', type: 'checkbox', question: '10. 在使用过程中，您遇到过哪些问题？（多选）', options: ['黑屏卡顿', '按钮点不到', '视频耗流量', '找不到某功能', '其他'], required: true },
  { id: 'suggestions', type: 'text', question: '11. 您还有什么更好的建议或想对开发者说的话？（选填）', required: false }
];

const FEEDBACK_TYPES = ['Bug反馈', '功能建议', '界面优化', '其他'];

function submitErrorTitle(error, fallback) {
  const message = error && error.message ? String(error.message).trim() : '';
  return message && message.length <= 18 ? message : fallback;
}

function buildQuestions(answers = {}) {
  return SURVEY_QUESTIONS.map((question) => {
    const answer = answers[question.id];
    return {
      ...question,
      answer: question.type === 'checkbox' ? (Array.isArray(answer) ? answer : []) : (answer || ''),
      options: (question.options || []).map((label) => ({
        label,
        selected: question.type === 'checkbox'
          ? (Array.isArray(answer) && answer.includes(label))
          : answer === label
      })),
      stars: [1, 2, 3, 4, 5].map((value) => ({ value, active: Number(answer || 0) >= value }))
    };
  });
}

Page({
  data: {
    hasSubmittedSurvey: false,
    questions: buildQuestions(),
    surveyAnswers: {},
    feedbackTypes: FEEDBACK_TYPES.map((label, index) => ({ label, active: index === 1 })),
    feedbackType: '功能建议',
    feedbackText: '',
    saving: false,
    success: false
  },

  onShow() {
    this.setData({ hasSubmittedSurvey: getItem(SURVEY_KEY) === '1' });
  },

  goBack() {
    safeBack('/pages/profile/index');
  },

  updateAnswer(questionId, value) {
    const surveyAnswers = { ...this.data.surveyAnswers, [questionId]: value };
    this.setData({ surveyAnswers, questions: buildQuestions(surveyAnswers) });
  },

  selectOption(event) {
    const { id, value } = event.currentTarget.dataset;
    this.updateAnswer(id, value);
  },

  toggleOption(event) {
    const { id, value } = event.currentTarget.dataset;
    const current = Array.isArray(this.data.surveyAnswers[id]) ? this.data.surveyAnswers[id] : [];
    const next = current.includes(value) ? current.filter((item) => item !== value) : [...current, value];
    this.updateAnswer(id, next);
  },

  rate(event) {
    const { id, value } = event.currentTarget.dataset;
    this.updateAnswer(id, Number(value || 0));
  },

  inputSurveyText(event) {
    const { id } = event.currentTarget.dataset;
    this.updateAnswer(id, event.detail.value);
  },

  selectType(event) {
    const { value } = event.currentTarget.dataset;
    this.setData({
      feedbackType: value,
      feedbackTypes: FEEDBACK_TYPES.map((label) => ({ label, active: label === value }))
    });
  },

  onFeedbackInput(event) {
    this.setData({ feedbackText: event.detail.value });
  },

  showSubmitError(error, fallback) {
    console.warn('[native] submit feedback failed:', error);
    wx.showToast({ title: submitErrorTitle(error, fallback), icon: 'none' });
  },

  async submitSurvey() {
    const answers = this.data.surveyAnswers;
    for (const question of SURVEY_QUESTIONS.slice(0, 10)) {
      const answer = answers[question.id];
      if (!answer || (Array.isArray(answer) && answer.length === 0)) {
        wx.showToast({ title: `请完成第 ${question.question.split('.')[0]} 题`, icon: 'none' });
        return;
      }
    }
    this.setData({ saving: true });
    try {
      await post('/api/v1/feedback', { type: 'survey', answers }, { timeout: 15000 });
      setItem(SURVEY_KEY, '1');
      this.setData({ hasSubmittedSurvey: true, success: true, saving: false });
      setTimeout(() => safeBack('/pages/profile/index'), 2000);
    } catch (error) {
      this.showSubmitError(error, '问卷提交失败');
      this.setData({ saving: false });
    }
  },

  async submitFeedback() {
    const content = this.data.feedbackText.trim();
    if (content.length < 10) {
      wx.showToast({ title: '请至少输入 10 个字', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await post('/api/v1/feedback', { type: this.data.feedbackType, content }, { timeout: 15000 });
      this.setData({ feedbackText: '', success: true, saving: false });
      setTimeout(() => safeBack('/pages/profile/index'), 2000);
    } catch (error) {
      this.showSubmitError(error, '发送失败');
      this.setData({ saving: false });
    }
  }
});
