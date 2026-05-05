import React from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import { useNavSpace } from '../../hooks/useNavSpace';
import PageHeader from '../../components/layout/PageHeader';
import './index.less';

const sections = [
  {
    id: 1,
    title: '一、我们如何收集和使用您的个人信息',
    items: [
      {
        label: '微信授权登录',
        detail: '为了提供基础服务，我们需要通过微信授权获取您的公开信息（昵称、头像）。我们使用微信小程序提供的登录能力来验证您的身份，确保账号的安全性与合规性。',
      },
      {
        label: '提供陪伴服务（核心业务）',
        detail: '为实现"数字猫咪生成"及互动，我们需要收集并处理您主动上传的猫咪照片、视频素材，以及您填写的猫咪名称、种类的资料。这些信息将用于为您生成专属的 AI 视频形象。',
      },
      {
        label: '社交互动服务',
        detail: '在您使用"添加好友"、"日常记录"及"时光信件"功能时，我们会收集并展示您的昵称、头像、发布的日记内容（包括文字、图片、视频）、评论及点赞记录。上述信息将向您已添加的好友展示，并在特定互动场景下公开提示。',
      },
      {
        label: '设备权限请求',
        detail: '我们在特定场景下会申请以下关键权限：\n\n• 相机权限：用于拍摄猫咪素材或扫描二维码添加好友。\n\n• 相册/存储权限：用于读取本地照片视频素材、保存生成的陪伴视频到本地。',
      },
    ],
  },
  {
    id: 2,
    title: '二、我们如何共享、转让、公开披露您的个人信息',
    items: [
      {
        label: '第三方接入说明（极其重要）',
        detail: '为了实现高品质的数字猫咪 AI 视频生成功能，我们会将您提供的猫咪原始图片/视频数据通过加密传输方式提供给技术合作伙伴：火山引擎（北京字节跳动科技有限公司）。\n\n我们郑重承诺：我们会与合作伙伴签订严格的数据安全协议，要求其仅在提供本服务所必需的范围内处理数据，严禁将其用于任何未经授权的商业用途、广告推送或公开展示。',
      },
      {
        label: '其他共享场景',
        detail: '除非获得您的明确同意或法律法规另有要求，我们不会向除上述合作伙伴以外的任何第三方共享您的个人敏感信息。',
      },
    ],
  },
  {
    id: 3,
    title: '三、我们如何存储和保护您的个人信息',
    items: [
      {
        label: '存储期限与位置',
        detail: '我们在中华人民共和国境内运营中收集和产生的个人信息，均存储在中华人民共和国境内。除法律另有规定外，我们仅在为提供服务所必需的最短期限内保留您的个人信息。',
      },
      {
        label: '数据安全保障',
        detail: '我们采用符合业界标准的 HTTPS 加密传输协议及多重身份验证机制，防止数据在传输过程中被窃取或篡改。对于存储在服务器端的数据，我们实施了严格的访问控制和加密存储策略。',
      },
    ],
  },
  {
    id: 4,
    title: '四、您的权利',
    items: [
      {
        label: '管理与修正',
        detail: '您有权通过"个人中心"访问、查询、更正您的个人资料信息（包括昵称、头像等）。',
      },
      {
        label: '账号注销',
        detail: '您可以通过"设置-账号安全"申请注销您的账号。在注销完成后，我们将依法删除您的个人信息或进行匿名化处理，法律法规另有要求的除外。',
      },
    ],
  },
];

export default function PrivacyPolicy() {
  const navSpace = useNavSpace();
  return (
    <View className="policy-page" style={navSpace as React.CSSProperties}>
      <PageHeader title="隐私政策" />

      <ScrollView className="content" scrollY>
        <View className="policy-hero">
          <View className="hero-icon-wrap">
            <Text className="hero-icon-text">🛡️</Text>
          </View>
          <Text className="hero-title">合规与隐私保护</Text>
          <Text className="hero-subtitle">MIAO SANCTUARY COMPLIANCE POLICY V2.0</Text>
        </View>

        <View className="sections-card">
          {sections.map((section) => (
            <View key={section.id} className="section">
              <View className="section-header">
                <View className="section-bar" />
                <Text className="section-title">{section.title}</Text>
              </View>
              <View className="section-items">
                {section.items.map((item, idx) => (
                  <View key={idx} className="section-item">
                    <Text className="item-label">{item.label}</Text>
                    <Text className="item-detail">{item.detail}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        <View className="footer">
          <Text className="footer-text">
            保护您的隐私是我们的首要任务。我们将持续根据国家法律法规更新本政策。
          </Text>
          <Text className="footer-date">最后更新日期：2026年4月16日</Text>
        </View>
      </ScrollView>
    </View>
  );
}