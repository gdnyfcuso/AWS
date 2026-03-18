import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

function App() {
  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0ea5e9' }}>Agent World 测试</h1>
      <p>如果你能看到这个页面，React 基础运行正常</p>
      <div style={{ marginTop: '20px', padding: '15px', background: '#f0f9ff', borderRadius: '8px' }}>
        <p><strong>测试 API 连接...</strong></p>
        <p id="api-result">正在连接...</p>
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<App />);

// 测试 API 连接
fetch('/api/v1/health')
  .then(res => res.json())
  .then(data => {
    const resultEl = document.getElementById('api-result');
    if (resultEl) {
      resultEl.textContent = 'API 连接成功！状态: ' + data.status;
      resultEl.style.color = 'green';
    }
  })
  .catch(err => {
    const resultEl = document.getElementById('api-result');
    if (resultEl) {
      resultEl.textContent = 'API 连接失败: ' + err.message;
      resultEl.style.color = 'red';
    }
  });
