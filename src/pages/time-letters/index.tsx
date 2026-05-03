import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, Image, ScrollView, Input, Textarea } from '@tarojs/components';
import Taro, { useShareAppMessage, useShareTimeline } from '@tarojs/taro';
import { useNavSpace } from '../../hooks/useNavSpace';
import { storage, TimeLetter, CatInfo } from '../../services/storage';
import CatAvatar from '../../components/common/CatAvatar';
import './index.less';

// Lucide-style PNG icons
const PLUS_WHITE = require('../../assets/profile-icons/plus-white.png');
const LOCK_WHITE = require('../../assets/profile-icons/lock-white.png');
const CHECK_WHITE = require('../../assets/profile-icons/check-white.png');
const CLOCK_GRAY = require('../../assets/profile-icons/clock-gray.png');
const CHEVRONRIGHT_GRAY = require('../../assets/profile-icons/chevronright-gray.png');
const ARROWLEFT_DARK = require('../../assets/profile-icons/arrowleft-dark.png');
const ARROWLEFT_WHITE = require('../../assets/profile-icons/arrowleft-white.png');
const SEND_WHITE = require('../../assets/profile-icons/send-white.png');
const CALENDAR_GRAY = require('../../assets/profile-icons/calendar-gray.png');
const TRASH2_LIGHTGRAY = require('../../assets/profile-icons/trash2-lightgray.png');
const ALERTCIRCLE_RED = require('../../assets/profile-icons/alertcircle-red.png');

type ViewState = 'list' | 'write' | 'detail';

// 格式化倒计时
function formatCountdown(unlockAt: number, fastForward?: boolean): string {
  const now = Date.now();
  let remainingMs = unlockAt - now;

  if (fastForward) {
    // 快进模式：1秒=1分钟，即倒计时除以60
    remainingMs = remainingMs / 60;
  }

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
  fastForward?: boolean;
  onDelete: (e: any, letter: TimeLetter) => void;
  onClick: (letter: TimeLetter) => void;
  onLongPress?: (letter: TimeLetter) => void;
}

function LetterCard({ letter, targetCat, isUnlocked, fastForward, onDelete, onClick, onLongPress }: LetterCardProps) {
  const [countdown, setCountdown] = useState(() => formatCountdown(letter.unlockAt, fastForward));

  const longPressTimerRef = useRef<any>(null);
  const longPressTriggeredRef = useRef(false);

  const handleTouchStart = () => {
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      if (!isUnlocked && onLongPress) {
        Taro.vibrateShort({ type: 'light' });
        onLongPress(letter);
      }
    }, 1000);
  };

  const handleTouchEnd = () => {
    clearTimeout(longPressTimerRef.current);
  };

  const handleTouchMove = () => {
    clearTimeout(longPressTimerRef.current);
  };

  useEffect(() => {
    if (isUnlocked) return;

    const timer = setInterval(() => {
      const next = formatCountdown(letter.unlockAt, fastForward);
      setCountdown(next);
      if (next === '已解锁') clearInterval(timer);
    }, 10000);

    return () => clearInterval(timer);
  }, [letter.unlockAt, isUnlocked, fastForward]);

  return (
    <View
      className={`letter-card ${!isUnlocked ? 'locked' : ''}`}
      onClick={() => { if (!longPressTriggeredRef.current) onClick(letter); }}
      onLongPress={() => { if (!isUnlocked && onLongPress) onLongPress(letter); }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* 猫咪头像 */}
      <View className="letter-avatar-wrap">
        <CatAvatar
          src={letter.catAvatar}
          name={targetCat?.name}
          className={`letter-avatar ${!isUnlocked ? 'blur' : ''}`}
        />
        {!isUnlocked && (
          <View className="lock-overlay">
            <Image className="icon-img" src={LOCK_WHITE} mode="aspectFit" style={{ width: 24, height: 24 }} />
          </View>
        )}
        {isUnlocked && (
          <View className="unlock-badge">
            <Image className="icon-img" src={CHECK_WHITE} mode="aspectFit" style={{ width: 10, height: 10 }} />
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
            <Image className="icon-img" src={TRASH2_LIGHTGRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />
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
        <Image className="icon-img" src={CHEVRONRIGHT_GRAY} mode="aspectFit" style={{ width: 16, height: 16 }} />
      </View>
    </View>
  );
}

export default function TimeLettersPage() {
  const navSpace = useNavSpace();
  const [letters, setLetters] = useState<TimeLetter[]>([]);
  const [view, setView] = useState<ViewState>('list');
  const [selectedLetter, setSelectedLetter] = useState<TimeLetter | null>(null);
  const [letterToDelete, setLetterToDelete] = useState<TimeLetter | null>(null);
  const [filterCatId, setFilterCatId] = useState<string>('all');
  const [toast, setToast] = useState<string | null>(null);

  useShareAppMessage(() => ({
    title: 'Miao - 给未来的自己和猫咪写一封时光信',
    path: '/pages/time-letters/index',
  }));

  useShareTimeline(() => ({
    title: 'Miao - 时光信件',
  }));

  // 写信页面状态
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [days, setDays] = useState(1);
  const [selectedCatId, setSelectedCatId] = useState<string>("");

  // 快进模式
  const [isFastForward, setIsFastForward] = useState(() => storage.getIsFastForward());
  const debugTapRef = useRef(0);
  const debugTimerRef = useRef<any>(null);

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
    if (isFastForward) {
      // 快进模式：倒计时除以60（1秒=1分钟）
      const elapsedReal = Date.now() - letter.createdAt;
      const totalDuration = letter.unlockAt - letter.createdAt;
      return elapsedReal * 60 >= totalDuration;
    }
    return Date.now() >= letter.unlockAt;
  }, [isFastForward]);

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

  // 长按强制解锁
  const handleLongPressUnlock = useCallback((letter: TimeLetter) => {
    Taro.showModal({
      title: '强制解锁信件',
      content: '确定要提前解锁这封时光信件吗？时光的等待也是一种仪式感哦～',
      confirmText: '确定解锁',
      cancelText: '再等等',
      confirmColor: '#D84315',
      success: (res) => {
        if (res.confirm) {
          const updated = letters.map(l =>
            l.id === letter.id ? { ...l, unlockAt: Date.now() - 1 } : l
          );
          setLetters(updated);
          storage.saveTimeLetters(updated);
          showToast('信件已提前解锁');
        }
      }
    });
  }, [letters, showToast]);

  // 标题5击切换快进模式
  const handleDebugTap = useCallback(() => {
    debugTapRef.current += 1;
    if (debugTimerRef.current) clearTimeout(debugTimerRef.current);

    if (debugTapRef.current >= 5) {
      debugTapRef.current = 0;
      const next = !isFastForward;
      setIsFastForward(next);
      storage.setIsFastForward(next);
      Taro.showToast({ title: next ? '快进模式已开启' : '快进模式已关闭', icon: 'none' });
      return;
    }

    debugTimerRef.current = setTimeout(() => {
      debugTapRef.current = 0;
    }, 2000);
  }, [isFastForward]);

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
        <View className="header-title" onClick={handleDebugTap}>
          <Text className="title-main">时光信件</Text>
          <Text className="title-sub">Time Capsules</Text>
        </View>
        <View
          className="add-btn"
          onClick={() => setView('write')}
        >
          <Image className="icon-img" src={PLUS_WHITE} mode="aspectFit" style={{ width: 28, height: 28 }} />
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
              <CatAvatar src={cat.avatar} name={cat.name} className="filter-avatar" />
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
              <Image className="icon-img" src={CLOCK_GRAY} mode="aspectFit" style={{ width: 40, height: 40 }} />
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
                  fastForward={isFastForward}
                  onDelete={handleDeleteClick}
                  onClick={handleLetterClick}
                  onLongPress={handleLongPressUnlock}
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
              <Image className="icon-img" src={ALERTCIRCLE_RED} mode="aspectFit" style={{ width: 32, height: 32 }} />
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
            <Image className="icon-img" src={ARROWLEFT_DARK} mode="aspectFit" style={{ width: 24, height: 24 }} />
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
                  <CatAvatar src={cat.avatar} name={cat.name} className="cat-avatar" />
                </View>
                {selectedCatId === cat.id && (
                  <View className="selected-badge">
                    <Image className="icon-img" src={CHECK_WHITE} mode="aspectFit" style={{ width: 10, height: 10 }} />
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
          <Input
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
          <Textarea
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
          <Image className="icon-img" src={SEND_WHITE} mode="aspectFit" style={{ width: 20, height: 20 }} />
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
          <CatAvatar
            src={selectedLetter?.catAvatar || targetCat?.avatar}
            name={targetCat?.name}
            className="detail-bg-image"
          />
          <View className="detail-bg-overlay" />
        </View>

        {/* 顶部导航 */}
        <View className="detail-header">
          <View className="detail-back" onClick={() => setView('list')}>
            <Image className="icon-img" src={ARROWLEFT_WHITE} mode="aspectFit" style={{ width: 24, height: 24 }} />
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
              <Image className="icon-img" src={CALENDAR_GRAY} mode="aspectFit" style={{ width: 18, height: 18 }} />
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
    <View className="time-letters-container" style={navSpace as React.CSSProperties}>
      {view === 'list' && renderList()}
      {view === 'write' && renderWrite()}
      {view === 'detail' && renderDetail()}
    </View>
  );
}
