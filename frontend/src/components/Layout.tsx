import type { ReactNode } from 'react';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';

interface LayoutProps {
  sidebar: ReactNode;
  children: ReactNode;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Layout({ sidebar, children, collapsed, onToggleCollapse }: LayoutProps) {
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 48px)', overflow: 'hidden' }}>
      {/* Sidebar - dark */}
      <div
        className="dark-scroll"
        style={{
          width: collapsed ? 0 : 260,
          minWidth: collapsed ? 0 : 260,
          overflow: collapsed ? 'hidden' : 'auto',
          background: '#1e2030',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease, min-width 0.2s ease',
        }}
      >
        {sidebar}
      </div>
      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div
          onClick={onToggleCollapse}
          style={{
            width: 20,
            minWidth: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            background: '#f6f8fa',
            borderRight: '1px solid #d1d9e0',
            color: '#8b949e',
            fontSize: 12,
            transition: 'color 0.15s, background 0.15s',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = '#1f2328';
            e.currentTarget.style.background = '#eef0f3';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = '#8b949e';
            e.currentTarget.style.background = '#f6f8fa';
          }}
        >
          {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
        </div>
      )}
      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden', background: '#fff' }}>
        {children}
      </div>
    </div>
  );
}
