// API 使用指南链接组件 - 简洁版

import { useEffect, useState } from 'react';
import { Book, ExternalLink } from 'lucide-react';

interface ApiGuideLinkProps {
  inBanner?: boolean; // 是否在横幅中显示
}

export function ApiGuideLink({ inBanner = false }: ApiGuideLinkProps) {
  const [docsUrl, setDocsUrl] = useState<string>('');

  useEffect(() => {
    // 根据当前环境自动切换 API 地址
    const hostname = window.location.hostname;
    let apiUrl = '';

    // 生产环境使用域名
    if (hostname === 'www.aivworld.com' || hostname === 'aivworld.com') {
      apiUrl = 'https://api.aivworld.com/api/v1/docs';
    } else {
      // 开发/测试环境使用当前主机的 3000 端口
      apiUrl = `http://${hostname}:3000/api/v1/docs`;
    }

    setDocsUrl(apiUrl);
  }, []);

  if (!docsUrl) return null;

  const linkClass = inBanner
    ? 'flex items-center gap-1.5 text-white/90 hover:text-white transition-colors text-sm'
    : 'flex items-center justify-center gap-2 py-2 text-sm text-gray-500';

  return (
    <div className={linkClass}>
      <Book className="w-4 h-4" />
      <span>网站使用指南：</span>
      <a
        href={docsUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 hover:underline underline-offset-2"
      >
        {docsUrl}
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
    </div>
  );
}
