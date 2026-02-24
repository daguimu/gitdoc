import { useCallback, useEffect, useState } from 'react';
import { Button, Empty, Modal, Spin, message } from 'antd';
import {
  DeleteOutlined,
  RollbackOutlined,
  FileOutlined,
  FileImageOutlined,
  FileMarkdownOutlined,
} from '@ant-design/icons';
import {
  getCommitDetails,
  getFileContentAtRef,
  getRepoCommits,
  restoreFile,
  cacheTreeSha,
} from '../services/github';
import { useLocale } from '../i18n/context';
import type { LocaleKeys } from '../i18n/zh';

interface DeletedFilesProps {
  open: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  onRestored: () => void;
}

interface DeletedFileInfo {
  path: string;
  commitSha: string;
  parentSha: string;
  author: string;
  date: string;
}

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.ico', '.bmp', '.avif'];
const COMMIT_DETAIL_CONCURRENCY = 6;

function getFileIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.endsWith('.md') || lower.endsWith('.mdx'))
    return <FileMarkdownOutlined style={{ color: '#60a5fa' }} />;
  const ext = lower.slice(lower.lastIndexOf('.'));
  if (IMAGE_EXT.includes(ext))
    return <FileImageOutlined style={{ color: '#f59e0b' }} />;
  return <FileOutlined style={{ color: '#7f849c' }} />;
}

function relativeDate(iso: string, t: (key: LocaleKeys, ...args: (string | number)[]) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return t('date.justNow');
  if (minutes < 60) return t('date.minutesAgo', minutes);
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t('date.hoursAgo', hours);
  const days = Math.floor(hours / 24);
  if (days < 30) return t('date.daysAgo', days);
  const months = Math.floor(days / 30);
  if (months < 12) return t('date.monthsAgo', months);
  return t('date.yearsAgo', Math.floor(months / 12));
}

export default function DeletedFiles({
  open,
  onClose,
  owner,
  repo,
  onRestored,
}: DeletedFilesProps) {
  const [files, setFiles] = useState<DeletedFileInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const { t } = useLocale();

  const fetchDeletedFiles = useCallback(async () => {
    setLoading(true);
    try {
      const commits = await getRepoCommits(owner, repo, 100);
      const details: Array<Awaited<ReturnType<typeof getCommitDetails>> | null> = new Array(commits.length).fill(null);

      let cursor = 0;
      const workers = Array.from({ length: Math.min(COMMIT_DETAIL_CONCURRENCY, commits.length) }, () =>
        (async () => {
          while (cursor < commits.length) {
            const idx = cursor;
            cursor += 1;
            details[idx] = await getCommitDetails(owner, repo, commits[idx].sha).catch(() => null);
          }
        })()
      );
      await Promise.all(workers);

      const touchedSinceDeletion = new Set<string>();
      const deletedMap = new Map<string, DeletedFileInfo>();

      for (const detail of details) {
        if (!detail) continue;

        for (const file of detail.files) {
          if (file.status === 'removed') {
            if (
              !touchedSinceDeletion.has(file.filename) &&
              detail.parentSha &&
              !deletedMap.has(file.filename)
            ) {
              deletedMap.set(file.filename, {
                path: file.filename,
                commitSha: detail.sha,
                parentSha: detail.parentSha,
                author: detail.author,
                date: detail.date,
              });
            }
            touchedSinceDeletion.add(file.filename);
            continue;
          }

          if (file.status === 'renamed') {
            if (file.previousFilename) touchedSinceDeletion.add(file.previousFilename);
            touchedSinceDeletion.add(file.filename);
            continue;
          }

          touchedSinceDeletion.add(file.filename);
        }
      }

      setFiles(Array.from(deletedMap.values()));
    } catch (err) {
      console.error(err);
      message.error(t('deleted.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [owner, repo, t]);

  useEffect(() => {
    if (open) {
      fetchDeletedFiles();
    }
  }, [open, fetchDeletedFiles]);

  const handleRestore = async (file: DeletedFileInfo) => {
    setRestoring(file.path);
    try {
      const fileData = await getFileContentAtRef(
        owner,
        repo,
        file.path,
        file.parentSha
      );
      const result = await restoreFile(
        owner,
        repo,
        file.path,
        fileData.base64,
        undefined,
        `Restore ${file.path}`
      );
      if (result.commit?.tree?.sha) cacheTreeSha(owner, repo, result.commit.tree.sha);
      message.success(t('deleted.restored', file.path));
      setFiles((prev) => prev.filter((f) => f.commitSha !== file.commitSha));
      onRestored();
    } catch (err) {
      console.error(err);
      message.error(t('deleted.restoreFailed', file.path));
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DeleteOutlined style={{ color: '#656d76' }} />
          <span>{t('deleted.title')}</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={560}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 32 }}>
          <Spin />
        </div>
      ) : files.length === 0 ? (
        <Empty
          description={t('deleted.empty')}
          style={{ padding: '24px 0' }}
        />
      ) : (
        <div style={{ maxHeight: 400, overflow: 'auto' }}>
          {files.map((file) => {
            const fileName = file.path.split('/').pop() || file.path;
            return (
              <div
                key={file.commitSha}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 0',
                  borderBottom: '1px solid #d1d9e0',
                  gap: 12,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      display: 'flex',
                      flexShrink: 0,
                    }}
                  >
                    {getFileIcon(fileName)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 13,
                        color: '#1f2328',
                        fontWeight: 500,
                        fontFamily: 'monospace',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {file.path}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: '#656d76',
                        marginTop: 2,
                      }}
                    >
                      {t('deleted.deletedBy', file.author, relativeDate(file.date, t))}
                    </div>
                  </div>
                </div>
                <Button
                  size="small"
                  icon={<RollbackOutlined />}
                  loading={restoring === file.path}
                  disabled={restoring !== null}
                  onClick={() => handleRestore(file)}
                  style={{ borderRadius: 6, flexShrink: 0 }}
                >
                  {t('common.restore')}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
