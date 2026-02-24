import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, Modal, Spin, Tree, Tooltip, message } from 'antd';
import type { InputRef } from 'antd';
import {
  FileOutlined,
  FileMarkdownOutlined,
  FolderOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  UploadOutlined,
  RestOutlined,
} from '@ant-design/icons';

/* VS Code-style thin-line icons for new file / new folder */
const NewFileIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V5L9 1Z" />
    <polyline points="9 1 9 5 13 5" />
    <line x1="8" y1="8.5" x2="8" y2="12.5" />
    <line x1="6" y1="10.5" x2="10" y2="10.5" />
  </svg>
);

const NewFolderIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3a1 1 0 0 1 1-1h3.6l1.4 2H13a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3Z" />
    <line x1="8" y1="7" x2="8" y2="11" />
    <line x1="6" y1="9" x2="10" y2="9" />
  </svg>
);

import type { DataNode } from 'antd/es/tree';
import { getRepoTree, createOrUpdateFile, deleteFile, getFileContent, uploadFile } from '../services/github';
import { useLocale } from '../i18n/context';

interface FileTreeProps {
  owner: string;
  repo: string;
  onFileSelect: (path: string) => void;
  onFileDeleted?: (path: string) => void;
  selectedPath?: string;
  refreshKey?: number;
  onTrashOpen?: () => void;
  onCommitShaChange?: (sha: string) => void;
}

interface GitTreeItem {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
}

function getFileIcon(name: string) {
  if (name.endsWith('.md') || name.endsWith('.mdx')) return <FileMarkdownOutlined style={{ color: '#60a5fa' }} />;
  return <FileOutlined style={{ color: '#7f849c' }} />;
}

function buildTreeData(items: GitTreeItem[]): DataNode[] {
  const root: DataNode[] = [];
  const map = new Map<string, DataNode>();

  for (const item of items) {
    if (!item.path) continue;
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const isDir = item.type === 'tree';

    if (name === '.gitkeep') continue;

    const node: DataNode = {
      key: item.path,
      title: name,
      icon: isDir
        ? ({ expanded }: { expanded?: boolean }) =>
            expanded
              ? <FolderOpenOutlined style={{ color: '#f59e0b' }} />
              : <FolderOutlined style={{ color: '#f59e0b' }} />
        : getFileIcon(name),
      isLeaf: !isDir,
      children: isDir ? [] : undefined,
    };

    map.set(item.path, node);
  }

  for (const [path, node] of map) {
    const parts = path.split('/');
    if (parts.length === 1) {
      root.push(node);
    } else {
      const parentPath = parts.slice(0, -1).join('/');
      const parent = map.get(parentPath);
      if (parent && parent.children) {
        parent.children.push(node);
      }
    }
  }

  const sortNodes = (nodes: DataNode[]) => {
    nodes.sort((a, b) => {
      if (!a.isLeaf && b.isLeaf) return -1;
      if (a.isLeaf && !b.isLeaf) return 1;
      return String(a.title).localeCompare(String(b.title));
    });
    for (const n of nodes) {
      if (n.children) sortNodes(n.children);
    }
  };
  sortNodes(root);

  return root;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function FileTree({
  owner,
  repo,
  onFileSelect,
  onFileDeleted,
  selectedPath,
  refreshKey,
  onTrashOpen,
  onCommitShaChange,
}: FileTreeProps) {
  const [treeData, setTreeData] = useState<DataNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [rawTree, setRawTree] = useState<GitTreeItem[]>([]);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);
  const [newFileModal, setNewFileModal] = useState<{ visible: boolean; dir: string; isDir: boolean }>({
    visible: false,
    dir: '',
    isDir: false,
  });
  const [newFileName, setNewFileName] = useState('');
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const { t } = useLocale();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<InputRef>(null);
  const uploadDirRef = useRef('');

  const initialized = useRef(false);

  const fetchTree = useCallback(async (treeSha?: string) => {
    if (!initialized.current) {
      setLoading(true);
    }
    try {
      const tree = await getRepoTree(owner, repo, treeSha);
      setRawTree(tree);
      const data = buildTreeData(tree);
      setTreeData(data);
    } catch (err) {
      console.error(err);
      message.error(t('tree.fetchFailed'));
      setTreeData([]);
    } finally {
      initialized.current = true;
      setLoading(false);
    }
  }, [owner, repo, t]);

  useEffect(() => {
    fetchTree();
  }, [fetchTree, refreshKey]);

  const handleSelect = (keys: React.Key[]) => {
    if (keys.length === 0) return;
    const key = keys[0] as string;
    const item = rawTree.find((i) => i.path === key);
    if (item && item.type === 'blob') {
      onFileSelect(key);
    }
  };

  const openNewFileModal = (dir: string, isDir: boolean) => {
    setNewFileModal({ visible: true, dir, isDir });
  };

  const triggerUpload = (dir: string) => {
    uploadDirRef.current = dir;
    fileInputRef.current?.click();
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    const hide = message.loading(t('tree.uploadingFiles', files.length), 0);

    try {
      let lastTreeSha: string | undefined;
      let lastCommitSha: string | undefined;
      for (const file of Array.from(files)) {
        const base64 = await readFileAsBase64(file);
        const filePath = uploadDirRef.current
          ? `${uploadDirRef.current}/${file.name}`
          : file.name;
        const result = await uploadFile(owner, repo, filePath, base64, `Upload ${filePath}`);
        lastTreeSha = result.commit?.tree?.sha;
        lastCommitSha = result.commit?.sha;
      }
      message.success(t('tree.uploadSuccess', files.length));
      if (lastCommitSha) onCommitShaChange?.(lastCommitSha);
      if (uploadDirRef.current) {
        setExpandedKeys(prev => [...new Set([...prev, uploadDirRef.current])]);
      }
      await fetchTree(lastTreeSha);
    } catch (err) {
      message.error(t('tree.uploadFailed'));
      console.error(err);
    } finally {
      hide();
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleNewFile = async () => {
    if (!newFileName.trim()) return;
    const path = newFileModal.dir
      ? `${newFileModal.dir}/${newFileName.trim()}`
      : newFileName.trim();

    setCreating(true);
    try {
      let result;
      if (newFileModal.isDir) {
        result = await createOrUpdateFile(owner, repo, `${path}/.gitkeep`, '', undefined, `Create folder ${path}`);
        setExpandedKeys(prev => [...new Set([...prev, path, newFileModal.dir].filter(Boolean))]);
      } else {
        result = await createOrUpdateFile(owner, repo, path, '', undefined, `Create ${path}`);
        if (newFileModal.dir) {
          setExpandedKeys(prev => [...new Set([...prev, newFileModal.dir])]);
        }
      }
      message.success(t('tree.createSuccess'));
      if (result.commit?.sha) onCommitShaChange?.(result.commit.sha);
      setNewFileModal({ visible: false, dir: '', isDir: false });
      setNewFileName('');
      const treeSha = result.commit?.tree?.sha;
      await fetchTree(treeSha);
      if (!newFileModal.isDir) {
        onFileSelect(path);
      }
    } catch (err) {
      message.error(t('tree.createFailed'));
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    Modal.confirm({
      title: t('tree.confirmDelete'),
      content: t('tree.confirmDeleteMsg', path),
      okText: t('common.delete'),
      okType: 'danger',
      cancelText: t('common.cancel'),
      onOk: async () => {
        try {
          const file = await getFileContent(owner, repo, path);
          const result = await deleteFile(owner, repo, path, file.sha, `Delete ${path}`);
          message.success(t('tree.deleteSuccess'));
          if (result.commit?.sha) onCommitShaChange?.(result.commit.sha);
          if (selectedPath === path) onFileDeleted?.(path);
          const treeSha = result.commit?.tree?.sha;
          await fetchTree(treeSha);
        } catch (err) {
          message.error(t('tree.deleteFailed'));
          console.error(err);
        }
      },
    });
  };

  const renderTitle = (node: DataNode) => {
    const key = node.key as string;
    const isLeaf = !!node.isLeaf;
    const isHovered = hoveredKey === key;
    const dirForAction = isLeaf ? key.split('/').slice(0, -1).join('/') : key;

    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          minHeight: 26,
        }}
        onMouseEnter={() => setHoveredKey(key)}
        onMouseLeave={() => setHoveredKey(null)}
      >
        <span
          style={{
            fontSize: 13,
            userSelect: 'none',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {node.title as string}
        </span>
        {isHovered && (
          <span className="tree-node-actions" onClick={e => e.stopPropagation()}>
            {!isLeaf && (
              <>
                <Tooltip title={t('tree.uploadFile')} mouseEnterDelay={0.5}>
                  <span
                    className="node-action"
                    onClick={(e) => { e.stopPropagation(); triggerUpload(dirForAction); }}
                  >
                    <UploadOutlined />
                  </span>
                </Tooltip>
                <Tooltip title={t('tree.newFile')} mouseEnterDelay={0.5}>
                  <span
                    className="node-action"
                    onClick={(e) => { e.stopPropagation(); openNewFileModal(dirForAction, false); }}
                  >
                    <NewFileIcon />
                  </span>
                </Tooltip>
                <Tooltip title={t('tree.newSubFolder')} mouseEnterDelay={0.5}>
                  <span
                    className="node-action"
                    onClick={(e) => { e.stopPropagation(); openNewFileModal(dirForAction, true); }}
                  >
                    <NewFolderIcon />
                  </span>
                </Tooltip>
              </>
            )}
            {isLeaf && (
              <Tooltip title={t('common.delete')} mouseEnterDelay={0.5}>
                <span
                  className="node-action danger"
                  onClick={(e) => handleDelete(key, e)}
                >
                  <DeleteOutlined />
                </span>
              </Tooltip>
            )}
          </span>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: 48, textAlign: 'center' }}>
        <Spin size="small" />
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleUpload}
      />

      {uploading && (
        <div style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Spin size="small" />
          <span style={{ fontSize: 12, color: '#a6adc8' }}>{t('tree.uploading')}</span>
        </div>
      )}

      <div className="sidebar-tree" style={{ padding: '4px 0', flex: 1 }}>
        <div
          style={{
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.8,
              color: '#6c7086',
            }}
          >
            {t('tree.title')}
          </span>
          <span className="sidebar-actions">
            <Tooltip title={t('tree.uploadFileRoot')} mouseEnterDelay={0.5}>
              <span className="action-icon" onClick={() => triggerUpload('')}>
                <UploadOutlined />
              </span>
            </Tooltip>
            <Tooltip title={t('tree.newFile')} mouseEnterDelay={0.5}>
              <span className="action-icon" onClick={() => openNewFileModal('', false)}>
                <NewFileIcon />
              </span>
            </Tooltip>
            <Tooltip title={t('tree.newFolder')} mouseEnterDelay={0.5}>
              <span className="action-icon" onClick={() => openNewFileModal('', true)}>
                <NewFolderIcon />
              </span>
            </Tooltip>
            <Tooltip title={t('tree.trash')} mouseEnterDelay={0.5}>
              <span className="action-icon" onClick={onTrashOpen}>
                <RestOutlined />
              </span>
            </Tooltip>
          </span>
        </div>

        <Tree
          showIcon
          blockNode
          treeData={treeData}
          expandedKeys={expandedKeys}
          selectedKeys={selectedPath ? [selectedPath] : []}
          onExpand={(keys) => setExpandedKeys(keys)}
          onSelect={handleSelect}
          titleRender={renderTitle}
        />
      </div>

      <Modal
        title={newFileModal.isDir ? t('tree.newFolder') : t('tree.newFile')}
        open={newFileModal.visible}
        onCancel={() => {
          setNewFileModal({ visible: false, dir: '', isDir: false });
          setNewFileName('');
        }}
        onOk={handleNewFile}
        confirmLoading={creating}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
        afterOpenChange={(open) => {
          if (open) nameInputRef.current?.focus();
        }}
      >
        {newFileModal.dir && (
          <div style={{ marginBottom: 8, color: '#86909c', fontSize: 13 }}>
            {t('tree.location')} <code style={{ background: '#f2f3f5', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{newFileModal.dir}/</code>
          </div>
        )}
        <Input
          ref={nameInputRef}
          placeholder={newFileModal.isDir ? t('tree.folderNamePlaceholder') : t('tree.fileNamePlaceholder')}
          value={newFileName}
          onChange={(e) => setNewFileName(e.target.value)}
          onPressEnter={handleNewFile}
        />
      </Modal>
    </>
  );
}
