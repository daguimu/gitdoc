import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Spin } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { useLocale } from '../i18n/context';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const { handleCallback } = useAuth();
  const { t } = useLocale();

  useEffect(() => {
    const code = searchParams.get('code');
    if (code) {
      handleCallback(code);
    }
  }, [searchParams, handleCallback]);

  return (
    <div
      style={{
        height: '100vh',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Spin size="large" tip={t('callback.loading')} />
    </div>
  );
}
