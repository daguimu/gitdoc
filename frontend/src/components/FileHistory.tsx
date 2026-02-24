import { useCallback, useEffect, useState } from 'react';
import { Button, Drawer, Empty, Spin, Tag, message } from 'antd';
import {
  HistoryOutlined,
  RollbackOutlined,
  PlusOutlined,
  MinusOutlined,
  DownOutlined,
  RightOutlined,
} from '@ant-design/icons';
import type { CommitInfo, CommitFilePatch } from '../services/github';
import {
  getFileCommits,
  getFileContentAtRef,
  getCommitFilePatch,
} from '../services/github';
import { useLocale } from '../i18n/context';
import type { LocaleKeys } from '../i18n/zh';

interface FileHistoryProps {
  open: boolean;
  onClose: () => void;
  owner: string;
  repo: string;
  filePath: string;
  currentSha?: string;
  onRestore: (content: string, base64: string, isText: boolean) => Promise<void>;
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

function DiffView({ patch, noDiffText }: { patch: string; noDiffText: string }) {
  if (!patch) {
    return (
      <div style={{ padding: '12px 16px', color: '#86909c', fontSize: 12 }}>
        {noDiffText}
      </div>
    );
  }

  const lines = patch.split('\n');

  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 8,
        border: '1px solid #d1d9e0',
        overflow: 'hidden',
        fontSize: 12,
        fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace',
        lineHeight: 1.6,
      }}
    >
      {lines.map((line, i) => {
        let bg = 'transparent';
        let color = '#1d2129';
        let prefix = ' ';

        if (line.startsWith('@@')) {
          bg = '#ddf4ff';
          color = '#0969da';
          prefix = '';
        } else if (line.startsWith('+')) {
          bg = '#dafbe1';
          color = '#1a7f37';
          prefix = '+';
          line = line.slice(1);
        } else if (line.startsWith('-')) {
          bg = '#ffebe9';
          color = '#cf222e';
          prefix = '-';
          line = line.slice(1);
        } else {
          prefix = ' ';
        }

        return (
          <div
            key={i}
            style={{
              display: 'flex',
              background: bg,
              padding: '0 12px',
              minHeight: 22,
            }}
          >
            <span
              style={{
                width: 16,
                flexShrink: 0,
                color: prefix === '+' ? '#1a7f37' : prefix === '-' ? '#cf222e' : '#8b949e',
                userSelect: 'none',
                textAlign: 'center',
              }}
            >
              {prefix !== ' ' ? prefix : ''}
            </span>
            <span
              style={{
                color,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                flex: 1,
              }}
            >
              {line.startsWith('@@') ? line : line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function FileHistory({
  open,
  onClose,
  owner,
  repo,
  filePath,
  onRestore,
}: FileHistoryProps) {
  const [commits, setCommits] = useState<CommitInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [expandedSha, setExpandedSha] = useState<string | null>(null);
  const [patches, setPatches] = useState<Record<string, CommitFilePatch | null>>({});
  const [patchLoading, setPatchLoading] = useState<string | null>(null);
  const { t } = useLocale();

  const fetchCommits = useCallback(async () => {
    setLoading(true);
    setExpandedSha(null);
    setPatches({});
    try {
      const data = await getFileCommits(owner, repo, filePath);
      setCommits(data);
    } catch (err) {
      console.error(err);
      message.error(t('history.fetchFailed'));
    } finally {
      setLoading(false);
    }
  }, [owner, repo, filePath, t]);

  useEffect(() => {
    if (open && filePath) {
      fetchCommits();
    }
  }, [open, filePath, fetchCommits]);

  const toggleExpand = async (sha: string) => {
    if (expandedSha === sha) {
      setExpandedSha(null);
      return;
    }
    setExpandedSha(sha);

    if (patches[sha] !== undefined) return;

    setPatchLoading(sha);
    try {
      const patch = await getCommitFilePatch(owner, repo, sha, filePath);
      setPatches((prev) => ({ ...prev, [sha]: patch }));
    } catch (err) {
      console.error(err);
      setPatches((prev) => ({ ...prev, [sha]: null }));
    } finally {
      setPatchLoading(null);
    }
  };

  const handleRestore = async (commit: CommitInfo) => {
    setRestoring(commit.sha);
    try {
      const file = await getFileContentAtRef(owner, repo, filePath, commit.sha);
      await onRestore(file.content, file.base64, file.isText);
      message.success(t('history.restored'));
      onClose();
    } catch (err) {
      console.error(err);
      message.error(t('history.restoreFailed'));
    } finally {
      setRestoring(null);
    }
  };

  return (
    <Drawer
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <HistoryOutlined style={{ color: '#656d76' }} />
          <span>{t('history.title')}</span>
        </div>
      }
      placement="right"
      width={520}
      open={open}
      onClose={onClose}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin />
        </div>
      ) : commits.length === 0 ? (
        <Empty description={t('history.empty')} />
      ) : (
        <div>
          {commits.map((commit, index) => {
            const isCurrent = index === 0;
            const isExpanded = expandedSha === commit.sha;
            const patchData = patches[commit.sha];
            const isPatchLoading = patchLoading === commit.sha;

            return (
              <div
                key={commit.sha}
                style={{
                  padding: '14px 0',
                  borderBottom:
                    index < commits.length - 1
                      ? '1px solid #d1d9e0'
                      : 'none',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: 12,
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 6,
                        cursor: 'pointer',
                      }}
                      onClick={() => toggleExpand(commit.sha)}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: '#656d76',
                          display: 'flex',
                          flexShrink: 0,
                          transition: 'transform 0.2s',
                        }}
                      >
                        {isExpanded ? <DownOutlined /> : <RightOutlined />}
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: '#1f2328',
                          fontWeight: 500,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {commit.message}
                      </span>
                      {isCurrent && (
                        <Tag
                          color="purple"
                          style={{
                            fontSize: 11,
                            lineHeight: '18px',
                            margin: 0,
                            flexShrink: 0,
                          }}
                        >
                          {t('history.current')}
                        </Tag>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: 20,
                        fontSize: 12,
                        color: '#656d76',
                        flexWrap: 'wrap',
                      }}
                    >
                      {commit.avatarUrl && (
                        <img
                          src={commit.avatarUrl}
                          alt=""
                          style={{
                            width: 16,
                            height: 16,
                            borderRadius: '50%',
                          }}
                        />
                      )}
                      <span>{commit.author}</span>
                      <span style={{ color: '#8b949e' }}>·</span>
                      <span>{relativeDate(commit.date, t)}</span>
                      <span style={{ color: '#8b949e' }}>·</span>
                      <span
                        style={{
                          fontFamily: 'monospace',
                          fontSize: 11,
                          color: '#656d76',
                          background: '#eff1f3',
                          padding: '1px 6px',
                          borderRadius: 4,
                        }}
                      >
                        {commit.sha.slice(0, 7)}
                      </span>
                      {patchData && (
                        <>
                          <span style={{ color: '#8b949e' }}>·</span>
                          <span style={{ color: '#1a7f37', fontSize: 11 }}>
                            <PlusOutlined style={{ fontSize: 9 }} /> {patchData.additions}
                          </span>
                          <span style={{ color: '#cf222e', fontSize: 11 }}>
                            <MinusOutlined style={{ fontSize: 9 }} /> {patchData.deletions}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  {!isCurrent && (
                    <Button
                      size="small"
                      icon={<RollbackOutlined />}
                      loading={restoring === commit.sha}
                      disabled={restoring !== null}
                      onClick={() => handleRestore(commit)}
                      style={{
                        borderRadius: 6,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      {t('common.restore')}
                    </Button>
                  )}
                </div>

                {isExpanded && (
                  <div style={{ marginTop: 8, marginLeft: 20 }}>
                    {isPatchLoading ? (
                      <div
                        style={{
                          padding: 16,
                          textAlign: 'center',
                        }}
                      >
                        <Spin size="small" />
                      </div>
                    ) : (
                      <DiffView patch={patchData?.patch || ''} noDiffText={t('history.noDiff')} />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Drawer>
  );
}
