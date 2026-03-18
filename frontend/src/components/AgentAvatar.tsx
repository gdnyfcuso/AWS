// Agent 头像组件
// 显示Agent的虚拟形象，支持动态情感表达

import { useState, useEffect } from 'react';
import { cn } from '../utils/cn';
import { Sparkles, RefreshCw, Image as ImageIcon } from 'lucide-react';

interface AgentAvatarProps {
  agentId: string;
  agentName: string;
  avatarUrl?: string;
  emotion?: 'joy' | 'trust' | 'fear' | 'surprise' | 'sadness' | 'disgust' | 'anger' | 'anticipation' | 'neutral';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  status?: 'online' | 'offline' | 'busy';
  className?: string;
  onRefresh?: () => void;
  isLoading?: boolean;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-sm',
  md: 'w-12 h-12 text-base',
  lg: 'w-16 h-16 text-xl',
  xl: 'w-24 h-24 text-2xl',
};

const emotionEmojis: Record<string, string> = {
  joy: '😊',
  trust: '🤝',
  fear: '😨',
  surprise: '😲',
  sadness: '😢',
  disgust: '🤢',
  anger: '😠',
  anticipation: '🤔',
  neutral: '😐',
};

const emotionOverlays: Record<string, string> = {
  joy: 'from-yellow-400/20 to-orange-400/20',
  trust: 'from-blue-400/20 to-cyan-400/20',
  fear: 'from-purple-400/20 to-violet-400/20',
  surprise: 'from-pink-400/20 to-rose-400/20',
  sadness: 'from-blue-400/20 to-indigo-400/20',
  disgust: 'from-gray-400/20 to-slate-400/20',
  anger: 'from-red-400/20 to-orange-400/20',
  anticipation: 'from-teal-400/20 to-emerald-400/20',
  neutral: 'from-gray-200/20 to-gray-300/20',
};

const statusColors = {
  online: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-yellow-500',
};

export function AgentAvatar({
  agentId,
  agentName,
  avatarUrl,
  emotion = 'neutral',
  size = 'md',
  showStatus = true,
  status = 'online',
  className,
  onRefresh,
  isLoading = false,
}: AgentAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // 当avatarUrl变化时重置错误状态
  useEffect(() => {
    setImageError(false);
  }, [avatarUrl]);

  const handleRefresh = async () => {
    if (onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setTimeout(() => setIsRefreshing(false), 500);
      }
    }
  };

  const statusColor = statusColors[status];
  const sizeClass = sizeClasses[size];
  const emotionOverlay = emotionOverlays[emotion];
  const emotionEmoji = emotionEmojis[emotion];

  // 头像内容
  const avatarContent = (
    <div className={cn('relative group', className)}>
      {/* 头像主体 */}
      <div
        className={cn(
          'rounded-full overflow-hidden relative',
          sizeClass,
          'bg-gradient-to-br from-world-200 to-world-400',
          'shadow-md transition-all duration-300',
          'group-hover:shadow-lg group-hover:scale-105'
        )}
      >
        {/* 情感覆盖层 */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-br transition-opacity duration-300',
            emotionOverlay
          )}
        />

        {/* 头像图片或默认显示 */}
        {avatarUrl && !imageError ? (
          <img
            src={avatarUrl}
            alt={agentName}
            className="w-full h-full object-cover relative z-10"
            onError={() => setImageError(true)}
            onLoad={() => setImageError(false)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center relative z-10">
            <span className="text-white font-semibold">
              {agentName.charAt(0).toUpperCase()}
            </span>
          </div>
        )}

        {/* 情感表情浮层 */}
        {emotion !== 'neutral' && (
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-white rounded-full shadow-md flex items-center justify-center text-sm z-20 animate-bounce">
            {emotionEmoji}
          </div>
        )}

        {/* 加载中状态 */}
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-30">
            <div className="w-4 h-4 border-2 border-world-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* 在线状态指示器 */}
      {showStatus && (
        <div
          className={cn(
            'absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white shadow-sm z-20',
            statusColor
          )}
        />
      )}

      {/* 刷新按钮（hover时显示） */}
      {onRefresh && (
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className={cn(
            'absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-30',
            isRefreshing && 'opacity-100'
          )}
        >
          <RefreshCw
            className={cn(
              'w-4 h-4 text-white',
              isRefreshing && 'animate-spin'
            )}
          />
        </button>
      )}
    </div>
  );

  return avatarContent;
}

/**
 * Agent头像编辑器组件
 * 用于配置和生成Agent头像
 */
interface AgentAvatarEditorProps {
  agentId: string;
  agentName: string;
  currentAvatar?: string;
  onSave?: (avatarUrl: string) => void;
  className?: string;
}

export function AgentAvatarEditor({
  agentId,
  agentName,
  currentAvatar,
  onSave,
  className,
}: AgentAvatarEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedStyle, setSelectedStyle] = useState<'anime' | 'realistic' | 'cartoon' | 'pixel'>('anime');
  const [selectedEmotion, setSelectedEmotion] = useState<keyof typeof emotionEmojis>('joy');

  const styles = [
    { value: 'anime', label: '动漫风格', icon: '🎨' },
    { value: 'realistic', label: '写实风格', icon: '📷' },
    { value: 'cartoon', label: '卡通风格', icon: '🎭' },
    { value: 'pixel', label: '像素风格', icon: '👾' },
  ];

  const emotions = [
    { value: 'joy', label: '开心', icon: '😊' },
    { value: 'trust', label: '信任', icon: '🤝' },
    { value: 'fear', label: '恐惧', icon: '😨' },
    { value: 'anger', label: '愤怒', icon: '😠' },
    { value: 'sadness', label: '悲伤', icon: '😢' },
    { value: 'neutral', label: '平静', icon: '😐' },
  ];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      // TODO: 调用API生成头像
      const response = await fetch('/api/v1/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent_id: agentId,
          config: {
            style: selectedStyle,
            mood: selectedEmotion,
          },
        }),
      });

      const data = await response.json();
      if (data.success && data.avatar?.image_url) {
        onSave?.(data.avatar.image_url);
      }
    } catch (error) {
      console.error('Failed to generate avatar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={cn('bg-white rounded-xl p-6 space-y-6', className)}>
      {/* 头像预览 */}
      <div className="flex flex-col items-center space-y-4">
        <AgentAvatar
          agentId={agentId}
          agentName={agentName}
          avatarUrl={currentAvatar}
          emotion={selectedEmotion}
          size="xl"
          showStatus={false}
        />

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className={cn(
            'flex items-center gap-2 px-4 py-2 rounded-lg font-medium',
            'bg-world-500 text-white hover:bg-world-600',
            'disabled:bg-gray-300 disabled:cursor-not-allowed',
            'transition-colors'
          )}
        >
          <Sparkles className={cn('w-4 h-4', isGenerating && 'animate-spin')} />
          {isGenerating ? '生成中...' : '生成头像'}
        </button>
      </div>

      {/* 风格选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          头像风格
        </label>
        <div className="grid grid-cols-4 gap-2">
          {styles.map((style) => (
            <button
              key={style.value}
              onClick={() => setSelectedStyle(style.value as any)}
              className={cn(
                'flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all',
                selectedStyle === style.value
                  ? 'border-world-500 bg-world-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-2xl">{style.icon}</span>
              <span className="text-xs text-gray-600">{style.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 情感选择 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          基础表情
        </label>
        <div className="grid grid-cols-6 gap-2">
          {emotions.map((emotion) => (
            <button
              key={emotion.value}
              onClick={() => setSelectedEmotion(emotion.value as any)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all',
                selectedEmotion === emotion.value
                  ? 'border-world-500 bg-world-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <span className="text-xl">{emotion.icon}</span>
              <span className="text-xs text-gray-600">{emotion.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Agent头像网格组件
 * 用于展示多个Agent的头像
 */
interface AgentAvatarGridProps {
  agents: Array<{
    agentId: string;
    agentName: string;
    avatarUrl?: string;
    emotion?: string;
    status?: 'online' | 'offline' | 'busy';
  }>;
  onAgentClick?: (agentId: string) => void;
  className?: string;
}

export function AgentAvatarGrid({
  agents,
  onAgentClick,
  className,
}: AgentAvatarGridProps) {
  return (
    <div className={cn('grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4', className)}>
      {agents.map((agent) => (
        <div
          key={agent.agentId}
          onClick={() => onAgentClick?.(agent.agentId)}
          className="flex flex-col items-center gap-2 p-4 bg-white rounded-xl border border-gray-200 hover:border-world-300 hover:shadow-md transition-all cursor-pointer"
        >
          <AgentAvatar
            agentId={agent.agentId}
            agentName={agent.agentName}
            avatarUrl={agent.avatarUrl}
            emotion={(agent.emotion || 'neutral') as any}
            size="lg"
            showStatus
            status={agent.status || 'offline'}
          />
          <span className="text-sm font-medium text-gray-700 truncate max-w-full">
            {agent.agentName}
          </span>
        </div>
      ))}
    </div>
  );
}
