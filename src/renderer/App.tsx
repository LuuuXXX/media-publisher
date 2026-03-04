import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Publish } from './pages/Publish';
import { Settings } from './pages/Settings';
import { History } from './pages/History';
import './styles/global.css';

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <HashRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/publish" element={<Publish />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Layout>
      </HashRouter>
    </ConfigProvider>
  );
};

export default App;
