import { useState } from 'react';
import { Button, Typography, message } from 'antd';
import { GithubOutlined } from '@ant-design/icons';
import { getLoginUrl, saveOAuthState } from '../services/auth';
import { useLocale } from '../i18n/context';

const { Title, Text } = Typography;

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { t } = useLocale();

  const handleLogin = async () => {
    setLoading(true);
    try {
      const { url, state } = await getLoginUrl();
      saveOAuthState(state);
      window.location.href = url;
    } catch (err) {
      console.error(err);
      message.error(t('login.startFailed'));
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #1a1b2e 0%, #2d1b69 50%, #1e2030 100%)',
      }}
    >
      {/* Background dots */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 420,
          padding: '52px 44px',
          textAlign: 'center',
          background: 'rgba(255, 255, 255, 0.98)',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.1)',
          position: 'relative',
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            margin: '0 auto 28px',
            borderRadius: 18,
            background: 'linear-gradient(135deg, #6366f1 0%, #818cf8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
          }}
        >
          <GithubOutlined style={{ fontSize: 36, color: '#fff' }} />
        </div>
        <Title level={2} style={{ margin: '0 0 8px', color: '#1d2129', fontWeight: 700 }}>
          GitDoc
        </Title>
        <Text style={{ color: '#86909c', fontSize: 14, display: 'block', marginBottom: 36 }}>
          {t('login.subtitle')}
        </Text>
        <Button
          type="primary"
          size="large"
          icon={<GithubOutlined />}
          loading={loading}
          onClick={handleLogin}
          block
          style={{
            height: 46,
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 500,
            background: 'linear-gradient(135deg, #24273a 0%, #1a1b2e 100%)',
            border: 'none',
            boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
          }}
        >
          {t('login.button')}
        </Button>
        <Text style={{ color: '#c0c4cc', fontSize: 12, display: 'block', marginTop: 28 }}>
          {t('login.hint')}
        </Text>
      </div>
    </div>
  );
}
