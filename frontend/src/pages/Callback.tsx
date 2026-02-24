import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Spin, message } from 'antd';
import { useAuth } from '../hooks/useAuth';
import { clearOAuthState, getOAuthState } from '../services/auth';
import { useLocale } from '../i18n/context';

export default function Callback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback } = useAuth();
  const { t } = useLocale();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;

    const oauthError = searchParams.get('error');
    if (oauthError) {
      handledRef.current = true;
      clearOAuthState();
      message.error(t('callback.authError'));
      navigate('/login', { replace: true });
      return;
    }

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const expectedState = getOAuthState();

    if (!code) {
      handledRef.current = true;
      clearOAuthState();
      message.error(t('callback.missingCode'));
      navigate('/login', { replace: true });
      return;
    }

    if (!state || !expectedState || state !== expectedState) {
      handledRef.current = true;
      clearOAuthState();
      message.error(t('callback.invalidState'));
      navigate('/login', { replace: true });
      return;
    }

    handledRef.current = true;
    handleCallback(code, state);
  }, [searchParams, handleCallback, navigate, t]);

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
