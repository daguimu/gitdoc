import { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Space, Spin, Tag, Tooltip, message } from 'antd';
import { SaveOutlined, FileMarkdownOutlined, EditOutlined, CodeOutlined, HistoryOutlined } from '@ant-design/icons';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useLocale } from '../i18n/context';

interface EditorProps {
  content: string;
  filePath: string;
  loading?: boolean;
  onSave: (content: string) => Promise<void>;
  onHistoryOpen?: () => void;
}

type EditorMode = 'wysiwyg' | 'sv';

export default function Editor({ content, filePath, loading, onSave, onHistoryOpen }: EditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const vditorRef = useRef<Vditor | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('wysiwyg');
  const contentInitRef = useRef(content);
  const lastSetContentRef = useRef(content);
  const { t } = useLocale();

  const fileName = filePath.split('/').pop() || filePath;

  const handleSave = useCallback(async () => {
    if (!vditorRef.current) return;
    const value = vditorRef.current.getValue();
    setSaving(true);
    try {
      await onSave(value);
      setDirty(false);
      contentInitRef.current = value;
      message.success(t('editor.saveSuccess'));
    } catch (err) {
      message.error(t('editor.saveFailed'));
      console.error(err);
    } finally {
      setSaving(false);
    }
  }, [onSave, t]);

  useEffect(() => {
    if (!editorRef.current) return;

    setReady(false);

    const initialContent = vditorRef.current
      ? vditorRef.current.getValue()
      : content;

    const vditor = new Vditor(editorRef.current, {
      cdn: '/vditor',
      height: '100%',
      mode: editorMode,
      toolbar: [
        'headings', 'bold', 'italic', 'strike', 'link',
        '|', 'list', 'ordered-list', 'check',
        '|', 'quote', 'code', 'inline-code', 'table',
        '|', 'line', 'undo', 'redo',
        '|', 'fullscreen', 'outline',
      ],
      toolbarConfig: { pin: true },
      cache: { enable: false },
      preview: {
        actions: [],
        delay: 100,
      },
      placeholder: t('editor.placeholder'),
      after: () => {
        vditor.setValue(initialContent);
        lastSetContentRef.current = initialContent;
        contentInitRef.current = content;
        setDirty(initialContent !== content);
        setReady(true);
      },
      input: () => {
        if (vditorRef.current) {
          const current = vditorRef.current.getValue();
          setDirty(current !== contentInitRef.current);
        }
      },
    });

    vditorRef.current = vditor;

    return () => {
      vditor.destroy();
      vditorRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filePath, editorMode]);

  useEffect(() => {
    if (vditorRef.current && ready && content !== lastSetContentRef.current) {
      vditorRef.current.setValue(content);
      lastSetContentRef.current = content;
      contentInitRef.current = content;
      setDirty(false);
    }
  }, [content, ready]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', position: 'relative' }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 10,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.85)',
          }}
        >
          <Spin size="large" />
        </div>
      )}

      {/* Status bar */}
      <div
        style={{
          height: 40,
          padding: '0 16px',
          borderBottom: '1px solid #d1d9e0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f6f8fa',
          flexShrink: 0,
        }}
      >
        <Space size={8}>
          <FileMarkdownOutlined style={{ fontSize: 14, color: '#656d76' }} />
          <span style={{ fontSize: 14, color: '#1f2328', fontWeight: 600 }}>{fileName}</span>
          {filePath !== fileName && (
            <span style={{ fontSize: 12, color: '#8b949e' }}>
              {filePath.replace(`/${fileName}`, '')}
            </span>
          )}
          {dirty && <Tag color="warning" style={{ marginLeft: 4, fontSize: 11, lineHeight: '18px' }}>{t('editor.unsaved')}</Tag>}
        </Space>
        <Space size={8}>
          {/* Mode switcher */}
          <div
            style={{
              display: 'inline-flex',
              borderRadius: 6,
              border: '1px solid #d1d9e0',
              overflow: 'hidden',
            }}
          >
            {([
              { key: 'wysiwyg' as const, label: t('editor.richText'), icon: <EditOutlined /> },
              { key: 'sv' as const, label: t('editor.markdown'), icon: <CodeOutlined /> },
            ]).map(item => {
              const active = editorMode === item.key;
              return (
                <div
                  key={item.key}
                  onClick={() => setEditorMode(item.key)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '3px 10px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? '#1f2328' : '#656d76',
                    background: active ? '#ffffff' : '#f6f8fa',
                    borderRight: '1px solid #d1d9e0',
                    transition: 'all 0.15s',
                    userSelect: 'none',
                  }}
                >
                  <span style={{ fontSize: 12, display: 'flex' }}>{item.icon}</span>
                  {item.label}
                </div>
              );
            })}
          </div>

          <Tooltip title={t('editor.historyTooltip')}>
            <Button
              size="small"
              icon={<HistoryOutlined />}
              onClick={onHistoryOpen}
              style={{
                borderRadius: 6,
                height: 28,
                fontSize: 12,
                border: '1px solid #d1d9e0',
                color: '#1f2328',
                background: '#f6f8fa',
              }}
            >
              {t('editor.history')}
            </Button>
          </Tooltip>

          <Tooltip title="Ctrl+S / Cmd+S">
            <Button
              type="primary"
              size="small"
              icon={<SaveOutlined />}
              loading={saving}
              disabled={!dirty}
              onClick={handleSave}
              style={{
                borderRadius: 6,
                height: 28,
                fontSize: 12,
                fontWeight: 500,
                background: dirty ? '#1a7f37' : undefined,
                borderColor: dirty ? '#1a7f37' : undefined,
              }}
            >
              {t('common.save')}
            </Button>
          </Tooltip>
        </Space>
      </div>

      <div ref={editorRef} style={{ flex: 1, overflow: 'hidden' }} />
    </div>
  );
}
