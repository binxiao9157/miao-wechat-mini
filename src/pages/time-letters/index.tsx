import { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, Image, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { storage, TimeLetter, CatInfo } from '../../services/storage';
import { Plus, Lock, Unlock, Clock, ChevronRight, Trash2, AlertCircle, ArrowLeft, Send, Calendar } from '../../components/common/Icons';
import './index.less';

type ViewState = 'list' | 'write' | 'detail';

// 格式化倒计时
function formatCountdown(unlockAt: number): string {
  const now = Date.now();
  const remainingMs = unlockAt - now;

  if (remainingMs <= 0) return '已解锁';

  const days = Math.floor(remainingMs / 86400000);
  const hours = Math.floor((remainingMs % 86400000) / 3600000);
  const minutes = Math.floor((remainingMs % 3600000) / 60000);

  if (days > 0) return `${days}天${hours}小时`;
  if (hours > 0) return `${hours}小时${minutes}分钟`;
  return `${minutes}分钟`;
}

// 信件卡片组件
interface LetterCardProps {
  letter: TimeLetter;
  targetCat?: CatInfo;
  isUnlocked: boolean;
  onDelete: (e: any, letter: TimeLetter) => void;
  onClick: (letter: TimeLetter) => void;
}

function LetterCard({ letter, targetCat, isUnlocked, onDelete, onClick }: LetterCardProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(letter.unlockAt));

  useEffect(() => {
    if (isUnlocked) return;

    const timer = setInterval(() => {
      const next = formatCountdown(letter.unlockAt);
      setCountdown(next);
      if (next === '已解锁') clearInterval(timer);
    }, 10000);

    return () => clearInterval(timer);
  }, [letter.unlockAt, isUnlocked]);

  return (
    <View
      className={`letter-card ${!isUnlocked ? 'locked' : ''}`}
      onClick={() => onClick(letter)}
    >
      {/* 猫咪头像 */}
      <View className="letter-avatar-wrap">
        <Image
          src={letter.catAvatar || "https://picsum.photos/seed/cat/200/200"}
          className={`letter-avatar ${!isUnlocked ? 'blur' : ''}`}
          mode="aspectFill"
        />
        {!isUnlocked && (
          <View className="lock-overlay">
            <Lock size={20} />
          </View>
        )}
        {isUnlocked && (
          <View className="unlock-badge">
            <Unlock size={10} />
          </View>
        )}
      </View>

      {/* 内容区域 */}
      <View className="letter-content">
        <View className="letter-header">
          <Text className="letter-title">{letter.title || "时光回响"}</Text>
          <View
            className="delete-btn"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e, letter);
            }}
          >
            <Trash2 size={16} />
          </View>
        </View>

        <View className="letter-preview">
          {isUnlocked ? (
            <Text className="preview-text" numberOfLines={2}>{letter.content}</Text>
          ) : (
            <Text className="countdown-text">
              距离解锁还有 <Text className="countdown-highlight">{countdown}</Text>
            </Text>
          )}
        </View>

        <View className="letter-footer">
          <Text className="target-cat">收信喵：{targetCat?.name || "已离开的小猫"}</Text>
          <Text className="letter-date">
            {new Date(letter.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </View>

      <View className="letter-arrow">
        <ChevronRight size={16} />
      </View>
    </View>
  );
}

export default function TimeLettersPage() {
  const [letters, setLetters] = useState<TimeLetter[]>([]);
  const [view, setView] = useState<ViewState>('list');
  const [selectedLetter, setSelectedLetter] = useState<TimeLetter | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<TimeLetter | null>(null);
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  // 写信页面状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [days, setDays] = useState(1);
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  const myCats = useMemo(() => storage.getCatList(), []);
  const activeCat = useMemo(() => storage.getActiveCat(), []);

  // 初始化选中当前猫咪
  useEffect(() => {
    if (activeCat) {
      setSelectedCatId(activeCat.id);
    }
  }, [activeCat]);

  // 加载信件列表
  useEffect(() => {
    loadLetters();
  }, []);

  // 页面显示时刷新
  useEffect(() => {
    const onShow = () => {
      if (view === 'list') {
        loadLetters();
      }
    };
    Taro.eventCenter.on('timeLettersPageShow', onShow);
    return () => {
      Taro.eventCenter.off('timeLettersPageShow', onShow);
    };
  }, [view]);

  const loadLetters = () => {
    const list = storage.getTimeLetters();
    setLetters(list);
  };

  // 判断信件是否解锁
  const isLetterUnlocked = useCallback((letter: TimeLetter) => {
    return Date.now() >= letter.unlockAt;
  }, []);

  // 显示提示
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // 点击信件
  const handleLetterClick = useCallback((letter: TimeLetter) => {
    const isUnlocked = isLetterUnlocked(letter);
    if (isUnlocked) {
      setSelectedLetter(letter);
      setView('detail');
    } else {
      const unlockDate = new Date(letter.unlockAt);
      const month = unlockDate.getMonth() + 1;
      const date = unlockDate.getDate();
      showToast(`时光正在酿造这封信，请在 ${month} 月 ${date} 日后再来开启吧～`);
    }
  }, [isLetterUnlocked, showToast]);

  // 删除信件
  const handleDeleteClick = useCallback((e: any, letter: TimeLetter) => {
    e.stopPropagation();
    setLetterToDelete(letter);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!letterToDelete) return;
    const updated = storage.deleteTimeLetter(letterToDelete.id);
    setLetters(updated);
    setLetterToDelete(null);
    showToast("信件已永久删除");
  }, [letterToDelete, showToast]);

  // 筛选信件
  const filteredLetters = useMemo(() => {
    if (filterCatId === "all") return letters;
    return letters.filter(l => l.catId === filterCatId);
  }, [letters, filterCatId]);

  // 保存信件
  const handleSaveLetter = useCallback(() => {
    if (!selectedCatId) {
      showToast("请先选择收信的小猫哦");
      return;
    }
    if (!title.trim()) {
      showToast("请先输入信件标题哦");
      return;
    }
    if (!content.trim()) {
      showToast("请先输入信件内容哦");
      return;
    }

    const targetCat = myCats.find(c => c.id === selectedCatId);
    if (!targetCat) return;

    // 归一化日期逻辑：当前日期凌晨 + X天
    const targetDate = new Date();
    targetDate.setHours(0, 0, 0, 0);
    const unlockAt = targetDate.getTime() + (days * 24 * 60 * 60 * 1000);

    const newLetter: TimeLetter = {
      id: 'letter_' + Date.now(),
      catId: targetCat.id,
      catAvatar: targetCat.avatar,
      title: title.trim(),
      content: content.trim(),
      createdAt: Date.now(),
      unlockAt: unlockAt,
    };

    const updated = [newLetter, ...letters];
    setLetters(updated);
    storage.saveTimeLetters(updated);

    // 重置表单
    setTitle("");
    setContent("");
    setDays(1);
    setView('list');
    showToast("封存成功！信件已存入本地时光机");
  }, [selectedCatId, title, content, days, letters, myCats, showToast]);

  // 渲染列表页
  const renderList = () => (
    <View className="time-letters-page">
      {/* Toast 提示 */}
      {toast && (
        <View className="toast-container">
          <Text className="toast-text">{toast}</Text>
        </View>
      )}

      {/* 页面头部 */}
      <View className="page-header">
        <View className="header-title">
          <Text className="title-main">时光信件</Text>
          <Text className="title-sub">Time Capsules</Text>
        </View>
        <View
          className="add-btn"
          onClick={() => setView('write')}
        >
          <Plus size={28} />
        </View>
      </View>

      {/* 猫咪筛选器 */}
      {myCats.length > 0 && (
        <ScrollView
          className="cat-filter"
          scrollX
          showScrollbar={false}
        >
          <View
            className={`filter-item ${filterCatId === 'all' ? 'active' : ''}`}
            onClick={() => setFilterCatId('all')}
          >
            <Text className="filter-text">全部</Text>
          </View>
          {myCats.map(cat => (
            <View
              key={cat.id}
              className={`filter-item cat-item ${filterCatId === cat.id ? 'active' : ''}`}
              onClick={() => setFilterCatId(cat.id)}
            >
              <Image src={cat.avatar} className="filter-avatar" mode="aspectFill" />
              <Text className="filter-text">{cat.name}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* 信件列表 */}
      <ScrollView className="letters-list" scrollY>
        {filteredLetters.length === 0 ? (
          <View className="empty-state">
            <View className="empty-icon">
              <Clock size={40} />
            </View>
            <Text className="empty-title">还没有信件</Text>
            <Text className="empty-desc">写一封信给未来的自己，让时光见证温暖</Text>
          </View>
        ) : (
          <View className="letters-container">
            {filteredLetters.map((letter) => {
              const targetCat = myCats.find(c => c.id === letter.catId);
              const isUnlocked = isLetterUnlocked(letter);

              return (
                <LetterCard
                  key={letter.id}
                  letter={letter}
                  targetCat={targetCat}
                  isUnlocked={isUnlocked}
                  onDelete={handleDeleteClick}
                  onClick={handleLetterClick}
                />
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* 删除确认弹窗 */}
      {letterToDelete && (
        <View className="modal-overlay">
          <View className="confirm-modal">
            <View className="modal-icon">
              <AlertCircle size={32} />
            </View>
            <Text className="modal-title">确认删除信件</Text>
            <Text className="modal-desc">
              您确定要永久删除这封写给 <Text className="highlight">{myCats.find(c => c.id === letterToDelete.catId)?.name || "小猫"}</Text> 的时光信件吗？此操作不可撤销。
            </Text>
            <View className="modal-actions">
              <View className="btn-confirm" onClick={confirmDelete}>
                <Text className="btn-text">确认删除</Text>
              </View>
              <View className="btn-cancel" onClick={() => setLetterToDelete(null)}>
                <Text className="btn-text">取消</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // 渲染写信页
  const renderWrite = () => (
    <View className="write-page">
      <ScrollView className="write-scroll" scrollY>
        {/* 头部导航 */}
        <View className="write-header">
          <View className="back-btn" onClick={() => setView('list')}>
            <ArrowLeft size={24} />
          </View>
          <View className="write-title">
            <Text className="title-main">写给未来</Text>
            <Text className="title-sub">Write to future</Text>
          </View>
          <View className="placeholder" />
        </View>

        {/* 收信喵选择 */}
        <View className="section">
          <Text className="section-label">收信喵</Text>
          <ScrollView className="cat-selector" scrollX showScrollbar={false}>
            {myCats.map(cat => (
              <View
                key={cat.id}
                className={`cat-option ${selectedCatId === cat.id ? 'selected' : ''}`}
                onClick={() => setSelectedCatId(cat.id)}
              >
                <View className={`cat-avatar-wrap ${selectedCatId === cat.id ? 'active' : ''}`}>
                  <Image src={cat.avatar} className="cat-avatar" mode="aspectFill" />
                </View>
                {selectedCatId === cat.id && (
                  <View className="selected-badge">
                    <Plus size={10} className="rotate-45" />
                  </View>
                )}
                <Text className={`cat-name ${selectedCatId === cat.id ? 'active' : ''}`}>{cat.name}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* 信件标题 */}
        <View className="section">
          <Text className="section-label">信件标题</Text>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle(e.detail.value)}
            placeholder="给未来的信起个题目吧..."
            className="title-input"
          />
        </View>

        {/* 信件内容 */}
        <View className="section">
          <Text className="section-label">信件内容</Text>
          <textarea
            value={content}
            onInput={(e) => setContent(e.detail.value)}
            placeholder="写下此刻想说的话..."
            className="content-textarea"
            maxlength={2000}
          />
        </View>

        {/* 封存时长 */}
        <View className="section">
          <View className="days-header">
            <Text className="section-label">封存时长</Text>
            <Text className="days-display">{days} 天后开启</Text>
          </View>
          <View className="days-grid">
            {[1, 3, 7, 30, 100].map(d => (
              <View
                key={d}
                className={`day-option ${days === d ? 'selected' : ''}`}
                onClick={() => setDays(d)}
              >
                <Text className="day-text">{d}D</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 封存按钮 */}
        <View
          className={`save-btn ${!title.trim() || !content.trim() ? 'disabled' : ''}`}
          onClick={handleSaveLetter}
        >
          <Send size={20} />
          <Text className="save-text">封存信件</Text>
        </View>
      </ScrollView>
    </View>
  );

  // 渲染详情页
  const renderDetail = () => {
    const targetCat = myCats.find(c => c.id === selectedLetter?.catId);

    return (
      <View className="detail-page">
        {/* 背景层：猫咪 Banner */}
        <View className="detail-bg">
          <Image
            src={selectedLetter?.catAvatar || targetCat?.avatar || "https://picsum.photos/seed/cat/800/600"}
            className="detail-bg-image"
            mode="aspectFill"
          />
          <View className="detail-bg-overlay" />
        </View>

        {/* 顶部导航 */}
        <View className="detail-header">
          <View className="detail-back" onClick={() => setView('list')}>
            <ArrowLeft size={24} />
          </View>
          <View className="detail-title">
            <Text className="title-main">时光回响</Text>
            <Text className="title-sub">Echo from past</Text>
          </View>
          <View className="placeholder" />
        </View>

        {/* 引导文字 */}
        <View className="detail-guide">
          <Text className="guide-label">这是写给它的信</Text>
          <Text className="guide-name">{targetCat?.name || "已离开的小猫"}</Text>
        </View>

        {/* 信件卡片 */}
        <ScrollView className="detail-card" scrollY>
          <View className="card-content">
            {/* 装饰圆 */}
            <View className="deco-circle top" />
            <View className="deco-circle bottom" />

            {/* 日期 */}
            <View className="letter-meta">
              <Calendar size={18} />
              <Text className="meta-text">
                写于 {new Date(selectedLetter?.createdAt || 0).toLocaleDateString()}
              </Text>
            </View>

            {/* 标题 */}
            <Text className="detail-letter-title">
              {selectedLetter?.title || "时光回响"}
            </Text>

            {/* 内容 */}
            <Text className="detail-letter-content">
              {selectedLetter?.content}
            </Text>

            {/* 底部 */}
            <View className="detail-footer">
              <View className="footer-line" />
              <Text className="footer-desc">
                这封信在时光中沉淀了很久{"\n"}希望能带给你温暖与力量
              </Text>
              <View className="footer-brand">
                <View className="brand-line" />
                <Text className="brand-text">MIAO SANCTUARY</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  return (
    <View className="time-letters-container">
      {view === 'list' && renderList()}
      {view === 'write' && renderWrite()}
      {view === 'detail' && renderDetail()}
    </View>
  );
}
