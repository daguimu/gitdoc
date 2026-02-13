import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Empty } from 'antd';
import { ArrowLeftOutlined, EditOutlined } from '@ant-design/icons';
import Header from '../components/Header';
import Layout from '../components/Layout';
import FileTree from '../components/FileTree';
import Editor from '../components/Editor';
import FilePreview, { isPreviewOnly } from '../components/FilePreview';
import FileHistory from '../components/FileHistory';
import DeletedFiles from '../components/DeletedFiles';
import { useAuth } from '../hooks/useAuth';
import { getFileContent, createOrUpdateFile, restoreFile, getLatestCommitSha } from '../services/github';
import { useLocale } from '../i18n/context';

const POLL_INTERVAL = 10_000;

function useRemoteSync(
  owner: string | undefined,
  repo: string | undefined,
  onRemoteChange: () => void,
) {
  const knownShaRef = useRef('');
  const timerRef = useRef<number>(0);
  const checkingRef = useRef(false);
  const onRemoteChangeRef = useRef(onRemoteChange);
  onRemoteChangeRef.current = onRemoteChange;

  const check = useCallback(async () => {
    if (!owner || !repo || checkingRef.current) return;
    checkingRef.current = true;
    try {
      const sha = await getLatestCommitSha(owner, repo);
      if (knownShaRef.current && sha && sha !== knownShaRef.current) {
        onRemoteChangeRef.current();
      }
      if (sha) knownShaRef.current = sha;
    } catch {
      // ignore network errors silently
    } finally {
      checkingRef.current = false;
    }
  }, [owner, repo]);

  const updateKnownSha = useCallback((sha: string) => {
    if (sha) knownShaRef.current = sha;
  }, []);

  useEffect(() => {
    if (!owner || !repo) return;

    check();
    timerRef.current = window.setInterval(check, POLL_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    const onFocus = () => check();

    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('focus', onFocus);

    return () => {
      clearInterval(timerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('focus', onFocus);
    };
  }, [owner, repo, check]);

  return { updateKnownSha };
}

export default function Doc() {
  const { owner, repo } = useParams<{ owner: string; repo: string }>();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { t } = useLocale();

  const [selectedPath, setSelectedPath] = useState<string | undefined>();
  const [fileContent, setFileContent] = useState('');
  const [fileDownloadUrl, setFileDownloadUrl] = useState('');
  const [fileBase64, setFileBase64] = useState('');
  const [fileSha, setFileSha] = useState<string | undefined>();
  const [fileLoading, setFileLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [deletedOpen, setDeletedOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const selectedPathRef = useRef(selectedPath);
  selectedPathRef.current = selectedPath;

  const handleRemoteChange = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Reload the currently open file if any
    const path = selectedPathRef.current;
    if (path && owner && repo) {
      getFileContent(owner, repo, path).then((file) => {
        setFileContent(file.content);
        setFileDownloadUrl(file.download_url);
        setFileBase64(file.base64);
        setFileSha(file.sha);
      }).catch(() => {
        // File may have been deleted externally — ignore
      });
    }
  }, [owner, repo]);

  const { updateKnownSha } = useRemoteSync(owner, repo, handleRemoteChange);

  const handleFileSelect = useCallback(
    async (path: string) => {
      if (!owner || !repo) return;
      setSelectedPath(path);
      setFileLoading(true);
      try {
        const file = await getFileContent(owner, repo, path);
        setFileContent(file.content);
        setFileDownloadUrl(file.download_url);
        setFileBase64(file.base64);
        setFileSha(file.sha);
      } catch (err) {
        console.error(err);
        setFileContent('');
        setFileDownloadUrl('');
        setFileBase64('');
        setFileSha(undefined);
      } finally {
        setFileLoading(false);
      }
    },
    [owner, repo]
  );

  const handleSave = useCallback(
    async (content: string) => {
      if (!owner || !repo || !selectedPath) return;
      const result = await createOrUpdateFile(owner, repo, selectedPath, content, fileSha);
      setFileSha(result.content?.sha);
      setFileContent(content);
      setRefreshKey((k) => k + 1);
      if (result.commit?.sha) updateKnownSha(result.commit.sha);
    },
    [owner, repo, selectedPath, fileSha, updateKnownSha]
  );

  const handleRestore = useCallback(
    async (content: string, base64: string) => {
      if (!owner || !repo || !selectedPath) return;
      const result = await restoreFile(
        owner,
        repo,
        selectedPath,
        base64,
        fileSha,
        `Restore ${selectedPath}`
      );
      setFileSha(result.content?.sha);
      setFileContent(content);
      setRefreshKey((k) => k + 1);
      if (result.commit?.sha) updateKnownSha(result.commit.sha);
    },
    [owner, repo, selectedPath, fileSha, updateKnownSha]
  );

  const handleDeletedRestored = useCallback(() => {
    setRefreshKey((k) => k + 1);
    // Sync latest commit SHA so polling doesn't double-trigger
    if (owner && repo) {
      getLatestCommitSha(owner, repo).then(updateKnownSha).catch(() => {});
    }
  }, [owner, repo, updateKnownSha]);

  if (!owner || !repo) return null;

  const preview = selectedPath ? isPreviewOnly(selectedPath) : false;

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header user={user} repoFullName={`${owner}/${repo}`} onLogout={logout} />
      <Layout
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(c => !c)}
        sidebar={
          <>
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <Button
                type="text"
                size="small"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/')}
                style={{
                  color: '#6c7086',
                  fontSize: 13,
                  borderRadius: 6,
                  padding: '2px 8px',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = '#bac2de')}
                onMouseLeave={e => (e.currentTarget.style.color = '#6c7086')}
              >
                {t('doc.backToList')}
              </Button>
            </div>
            <FileTree
              owner={owner}
              repo={repo}
              onFileSelect={handleFileSelect}
              selectedPath={selectedPath}
              refreshKey={refreshKey}
              onTrashOpen={() => setDeletedOpen(true)}
              onCommitShaChange={updateKnownSha}
            />
          </>
        }
      >
        {selectedPath ? (
          preview ? (
            <FilePreview
              key={selectedPath}
              filePath={selectedPath}
              downloadUrl={fileDownloadUrl}
              base64={fileBase64}
              loading={fileLoading}
            />
          ) : (
            <Editor
              key={selectedPath}
              content={fileContent}
              filePath={selectedPath}
              loading={fileLoading}
              onSave={handleSave}
              onHistoryOpen={() => setHistoryOpen(true)}
            />
          )
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: '#ffffff',
            }}
          >
            <EditOutlined style={{ fontSize: 48, color: '#d1d9e0', marginBottom: 16 }} />
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={null}
            />
            <span style={{ color: '#656d76', fontSize: 14, marginTop: -8 }}>
              {t('doc.emptyHint')}
            </span>
            <span style={{ color: '#8b949e', fontSize: 12, marginTop: 6 }}>
              {t('doc.emptySubHint')}
            </span>
          </div>
        )}
      </Layout>
      <FileHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        owner={owner}
        repo={repo}
        filePath={selectedPath || ''}
        currentSha={fileSha}
        onRestore={handleRestore}
      />
      <DeletedFiles
        open={deletedOpen}
        onClose={() => setDeletedOpen(false)}
        owner={owner}
        repo={repo}
        onRestored={handleDeletedRestored}
      />
    </div>
  );
}
