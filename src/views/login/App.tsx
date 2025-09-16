import React from 'react';
import { ParticleBackground } from './components/ParticleBackground';
import { LoginContainer } from './components/LoginContainer';

function App() {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
      {/* 背景渐变层 */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-indigo-800/20" />
      
      {/* 粒子背景 */}
      <ParticleBackground />
      
      {/* 主要内容 */}
      <div className="relative z-10">
        <LoginContainer />
      </div>
      
      {/* 装饰性光晕效果 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
    </div>
  );
}

export default App;