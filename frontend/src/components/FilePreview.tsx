import { useMemo } from 'react';
import { Button, Spin } from 'antd';
import {
  FileImageOutlined,
  FilePdfOutlined,
  FileOutlined,
  DownloadOutlined,
  PlayCircleOutlined,
  SoundOutlined,
} from '@ant-design/icons';
import { useLocale } from '../i18n/context';
import type { LocaleKeys } from '../i18n/zh';
import { AUDIO_EXT, getExt, IMAGE_EXT, PDF_EXT, VIDEO_EXT } from './filePreviewUtils';

interface FilePreviewProps {
  filePath: string;
  downloadUrl: string;
  base64?: string;
  loading?: boolean;
}

const MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.bmp': 'image/bmp',
  '.avif': 'image/avif',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.aac': 'audio/aac',
  '.pdf': 'application/pdf',
};

function getTypeInfo(ext: string, t: (key: LocaleKeys) => string) {
  if (IMAGE_EXT.includes(ext)) return { type: 'image' as const, icon: <FileImageOutlined />, label: t('preview.image') };
  if (VIDEO_EXT.includes(ext)) return { type: 'video' as const, icon: <PlayCircleOutlined />, label: t('preview.video') };
  if (AUDIO_EXT.includes(ext)) return { type: 'audio' as const, icon: <SoundOutlined />, label: t('preview.audio') };
  if (PDF_EXT.includes(ext)) return { type: 'pdf' as const, icon: <FilePdfOutlined />, label: t('preview.pdf') };
  return { type: 'binary' as const, icon: <FileOutlined />, label: t('preview.file') };
}

export default function FilePreview({ filePath, downloadUrl, base64, loading }: FilePreviewProps) {
  const { t } = useLocale();
  const fileName = filePath.split('/').pop() || filePath;
  const ext = getExt(filePath);
  const { type, icon, label } = getTypeInfo(ext, t);

  const dataUrl = useMemo(() => {
    if (!base64) return '';
    const mime = MIME_MAP[ext] || 'application/octet-stream';
    return `data:${mime};base64,${base64}`;
  }, [base64, ext]);

  const mediaSrc = dataUrl || downloadUrl;

  if (loading) {
    return (
      <div style={{ height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, color: '#656d76', display: 'flex' }}>{icon}</span>
          <span style={{ fontSize: 14, color: '#1f2328', fontWeight: 600 }}>{fileName}</span>
          <span
            style={{
              fontSize: 12,
              color: '#656d76',
              border: '1px solid #d1d9e0',
              borderRadius: 12,
              padding: '0 7px',
              lineHeight: '20px',
            }}
          >
            {label}
          </span>
        </div>
        {downloadUrl && (
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => window.open(downloadUrl, '_blank')}
            style={{ borderRadius: 6, height: 28, fontSize: 12, border: '1px solid #d1d9e0' }}
          >
            {t('common.download')}
          </Button>
        )}
      </div>

      {/* Preview area */}
      <div
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: type === 'image' ? 'center' : 'stretch',
          background: type === 'image' ? '#f5f6f8' : '#fff',
          padding: type === 'image' ? 24 : 0,
        }}
      >
        {type === 'image' && mediaSrc && (
          <img
            src={mediaSrc}
            alt={fileName}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              objectFit: 'contain',
              borderRadius: 8,
              boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
            }}
          />
        )}

        {type === 'video' && mediaSrc && (
          <video
            src={mediaSrc}
            controls
            style={{ width: '100%', maxHeight: '100%', background: '#000' }}
          />
        )}

        {type === 'audio' && mediaSrc && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 20 }}>
            <SoundOutlined style={{ fontSize: 64, color: '#c0c4cc' }} />
            <audio src={mediaSrc} controls style={{ width: 400, maxWidth: '90%' }} />
          </div>
        )}

        {type === 'pdf' && mediaSrc && (
          <iframe
            src={mediaSrc}
            title={fileName}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        )}

        {type === 'binary' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: 16 }}>
            <FileOutlined style={{ fontSize: 64, color: '#c0c4cc' }} />
            <span style={{ color: '#86909c', fontSize: 14 }}>{t('preview.unsupported')}</span>
            {downloadUrl && (
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={() => window.open(downloadUrl, '_blank')}
                style={{ borderRadius: 8 }}
              >
                {t('preview.downloadFile')}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
