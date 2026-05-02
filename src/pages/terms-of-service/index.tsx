import { View, Text, ScrollView, Image } from '@tarojs/components';
import { navigateBack } from '@tarojs/taro';
import arrowLeftDark from '../../assets/profile-icons/arrowleft-dark.png';
import './index.less';

export default function TermsOfService() {
  return (
    <View className="terms-page">
      <View className="header">
        <View className="back-btn" onClick={() => navigateBack()}>
          <Image className="icon-img" src={arrowLeftDark} mode="aspectFit" />
        </View>
        <Text className="title">服务条款</Text>
        <View className="placeholder" />
      </View>

      <ScrollView className="content" scrollY>
        <Text className="section-title">服务条款</Text>
        <Text className="text">
          更新时间�?026�?�?日{'\n\n'}
          欢迎使用Miao！使用我们的服务即表示您同意以下条款。{'\n\n'}
          <Text className="bold">1. 服务使用</Text>{'\n'}
          您同意仅将Miao用于合法目的。{'\n\n'}
          <Text className="bold">2. 用户账户</Text>{'\n'}
          您负责维护账户安全，并对账户下所有活动负责。{'\n\n'}
          <Text className="bold">3. 知识产权</Text>{'\n'}
          Miao及其内容的所有权归我们所有，受法律保护。{'\n\n'}
          <Text className="bold">4. 免责声明</Text>{'\n'}
          服务�?原样"提供，不提供任何明示或暗示保证。{'\n\n'}
          <Text className="bold">5. 责任限制</Text>{'\n'}
          我们不对任何间接、附带或后果性损害负责。{'\n\n'}
          <Text className="bold">6. 条款变更</Text>{'\n'}
          我们可能随时修改这些条款，修改后继续使用表示接受。{'\n\n'}
          如有任何问题，请联系我们�?        </Text>
      </ScrollView>
    </View>
  );
}