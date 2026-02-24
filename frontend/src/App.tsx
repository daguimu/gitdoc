import { Suspense, lazy, useSyncExternalStore } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import enUS from 'antd/locale/en_US';
import { getAuthSnapshot, subscribeAuthChange } from './services/auth';
import { LocaleProvider, useLocale } from './i18n/context';

const Login = lazy(() => import('./pages/Login'));
const Callback = lazy(() => import('./pages/Callback'));
const Home = lazy(() => import('./pages/Home'));
const Doc = lazy(() => import('./pages/Doc'));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const authenticated = useSyncExternalStore(subscribeAuthChange, getAuthSnapshot, getAuthSnapshot);
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppInner() {
  const { lang } = useLocale();
  return (
    <ConfigProvider locale={lang === 'zh' ? zhCN : enUS}>
      <BrowserRouter>
        <Suspense
          fallback={
            <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Spin size="large" />
            </div>
          }
        >
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/callback" element={<Callback />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Home />
                </ProtectedRoute>
              }
            />
            <Route
              path="/repo/:owner/:repo"
              element={
                <ProtectedRoute>
                  <Doc />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function App() {
  return (
    <LocaleProvider>
      <AppInner />
    </LocaleProvider>
  );
}

export default App;
