import { Avatar, Dropdown, Space, Typography } from 'antd';
import {
  GithubOutlined,
  LogoutOutlined,
  UserOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useLocale } from '../i18n/context';

const { Text } = Typography;

interface HeaderProps {
  user: { login: string; avatar_url: string; name: string | null } | null;
  repoFullName?: string;
  onLogout: () => void;
}

export default function Header({ user, repoFullName, onLogout }: HeaderProps) {
  const { lang, setLang, t } = useLocale();

  return (
    <div
      style={{
        height: 48,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#24292f',
        color: '#f0f6fc',
        flexShrink: 0,
      }}
    >
      <Space size={16} align="center">
        <GithubOutlined style={{ fontSize: 28, color: '#f0f6fc' }} />
        <Text strong style={{ fontSize: 16, color: '#f0f6fc' }}>
          GitDoc
        </Text>
        {repoFullName && (
          <>
            <Text style={{ color: '#7d8590', fontSize: 16 }}>/</Text>
            <Space size={6}>
              <BookOutlined style={{ fontSize: 13, color: '#7d8590' }} />
              <Text style={{ color: '#f0f6fc', fontSize: 14, fontWeight: 600 }}>{repoFullName}</Text>
            </Space>
          </>
        )}
      </Space>

      <Space size={12} align="center">
        {/* Language toggle */}
        <div
          onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}
          style={{
            cursor: 'pointer',
            padding: '4px 10px',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            transition: 'background 0.15s',
            userSelect: 'none',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span style={{ color: lang === 'zh' ? '#f0f6fc' : '#7d8590' }}>中</span>
          <span style={{ color: '#7d8590', margin: '0 1px' }}>/</span>
          <span style={{ color: lang === 'en' ? '#f0f6fc' : '#7d8590' }}>EN</span>
        </div>

        {user && (
          <Dropdown
            menu={{
              items: [
                {
                  key: 'user',
                  label: (
                    <span style={{ fontWeight: 500 }}>
                      {user.name || user.login}
                    </span>
                  ),
                  icon: <UserOutlined />,
                  disabled: true,
                },
                { type: 'divider' },
                {
                  key: 'logout',
                  label: t('header.logout'),
                  icon: <LogoutOutlined />,
                  danger: true,
                  onClick: onLogout,
                },
              ],
            }}
            placement="bottomRight"
          >
            <Space
              style={{
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <Avatar
                src={user.avatar_url}
                size={28}
                style={{ border: '2px solid rgba(255,255,255,0.15)' }}
              />
            </Space>
          </Dropdown>
        )}
      </Space>
    </div>
  );
}
