import { View, Text, ScrollView, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import arrowLeftDark from '../../assets/profile-icons/arrowleft-dark.png';
import './index.less';

export default function PrivacyPolicy() {
  return (
    <View className="policy-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={arrowLeftDark} mode="aspectFit" />
        </View>
        <Text className="title">隐私政策</Text>
        <View className="placeholder" />
      </View>

      <ScrollView className="content" scrollY>
        <Text className="section-title">隐私政策</Text>
        <Text className="text">
          更新时间�?026�?�?日{'\n\n'}
          感谢您使用Miao！我们非常重视您的隐私权。本隐私政策说明了我们在您使用Miao服务时如何收集、使用、存储和保护您的个人信息。{'\n\n'}
          <Text className="bold">1. 信息收集</Text>{'\n'}
          我们收集您提供的信息（如昵称、头像）和使用数据，以改善服务质量。{'\n\n'}
          <Text className="bold">2. 信息使用</Text>{'\n'}
          您的信息用于提供、维护和改进我们的服务。{'\n\n'}
          <Text className="bold">3. 信息保护</Text>{'\n'}
          我们采用行业标准的安全措施保护您的个人信息。{'\n\n'}
          <Text className="bold">4. 信息共享</Text>{'\n'}
          除非法律要求，我们不会与第三方分享您的个人信息。{'\n\n'}
          <Text className="bold">5. 您的权利</Text>{'\n'}
          您有权访问、修改或删除您的个人信息。{'\n\n'}
          如有任何问题，请联系我们�?        </Text>
      </ScrollView>
    </View>
  );
}