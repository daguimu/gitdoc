import { Octokit } from '@octokit/rest';
import { getToken } from './auth';

function getOctokit(): Octokit {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return new Octokit({ auth: token });
}

function normalizeBase64(content?: string): string {
  return (content || '').replace(/\n/g, '');
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    bytes[i] = raw.charCodeAt(i);
  }
  return bytes;
}

function decodeUtf8Base64(base64: string): string | null {
  try {
    const bytes = base64ToBytes(base64);
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function encodeUtf8Base64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  return bytesToBase64(bytes);
}

function parseFileContent(data: {
  content?: string | null;
  size?: number | null;
  sha: string;
  path: string;
  name: string;
  download_url?: string | null;
}) {
  const base64 = normalizeBase64(data.content || undefined);
  let isText = false;
  let content = '';

  if ((data.size ?? 0) === 0) {
    isText = true;
  } else if (base64) {
    const decoded = decodeUtf8Base64(base64);
    if (decoded !== null) {
      isText = true;
      content = decoded;
    }
  }

  return {
    content,
    sha: data.sha,
    path: data.path,
    name: data.name,
    download_url: data.download_url || '',
    base64,
    isText,
  };
}

export async function getCurrentUser() {
  const octokit = getOctokit();
  const { data } = await octokit.users.getAuthenticated();
  return data;
}

export async function listRepos(page = 1, perPage = 30) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: 'updated',
    per_page: perPage,
    page,
  });
  return data;
}

export interface TreeItem {
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
}

export async function getRepoContents(
  owner: string,
  repo: string,
  path = ''
): Promise<TreeItem[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  if (!Array.isArray(data)) {
    return [{ path: data.path, type: data.type as 'file' | 'dir', sha: data.sha, size: data.size }];
  }

  return data.map((item) => ({
    path: item.path,
    type: item.type as 'file' | 'dir',
    sha: item.sha,
    size: item.size,
  }));
}

export interface FileContent {
  content: string;
  sha: string;
  path: string;
  name: string;
  download_url: string;
  base64: string;
  isText: boolean;
}

export async function getFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<FileContent> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Not a file');
  }

  return parseFileContent({
    content: data.content,
    size: data.size,
    sha: data.sha,
    path: data.path,
    name: data.name,
    download_url: data.download_url,
  });
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha?: string,
  message?: string
) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: message || `Update ${path}`,
    content: encodeUtf8Base64(content),
    sha,
  });
  return data;
}

export async function uploadFile(
  owner: string,
  repo: string,
  path: string,
  base64Content: string,
  message?: string
) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: message || `Upload ${path}`,
    content: normalizeBase64(base64Content),
  });
  return data;
}

export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message?: string
) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message: message || `Delete ${path}`,
    sha,
  });
  return data;
}

export async function createRepo(name: string, isPrivate = true) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.createForAuthenticatedUser({
    name,
    private: isPrivate,
    auto_init: true,
  });
  return data;
}

export interface CommitInfo {
  sha: string;
  message: string;
  author: string;
  date: string;
  avatarUrl: string;
}

export interface CommitFileChange {
  filename: string;
  status: string;
  previousFilename?: string;
}

export interface CommitDetails {
  sha: string;
  parentSha: string;
  message: string;
  author: string;
  date: string;
  files: CommitFileChange[];
}

export interface CommitFilePatch {
  additions: number;
  deletions: number;
  patch: string;
}

export async function getCommitDetails(
  owner: string,
  repo: string,
  commitSha: string
): Promise<CommitDetails> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getCommit({
    owner,
    repo,
    ref: commitSha,
  });

  return {
    sha: data.sha,
    parentSha: data.parents?.[0]?.sha || '',
    message: data.commit.message,
    author: data.commit.author?.name || data.author?.login || 'Unknown',
    date: data.commit.author?.date || '',
    files: (data.files || []).map((file) => ({
      filename: file.filename,
      status: file.status || 'modified',
      previousFilename: file.previous_filename || undefined,
    })),
  };
}

export async function getCommitFilePatch(
  owner: string,
  repo: string,
  commitSha: string,
  filePath: string
): Promise<CommitFilePatch | null> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getCommit({
    owner,
    repo,
    ref: commitSha,
  });
  const file = data.files?.find((f) => f.filename === filePath);
  if (!file) return null;
  return {
    additions: file.additions ?? 0,
    deletions: file.deletions ?? 0,
    patch: file.patch || '',
  };
}

export async function getFileCommits(
  owner: string,
  repo: string,
  path: string,
  perPage = 50
): Promise<CommitInfo[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    path,
    per_page: perPage,
  });
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || c.author?.login || 'Unknown',
    date: c.commit.author?.date || '',
    avatarUrl: c.author?.avatar_url || '',
  }));
}

export async function getFileContentAtRef(
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<FileContent> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
    ref,
  });

  if (Array.isArray(data) || data.type !== 'file') {
    throw new Error('Not a file');
  }

  return parseFileContent({
    content: data.content,
    size: data.size,
    sha: data.sha,
    path: data.path,
    name: data.name,
    download_url: data.download_url,
  });
}

export async function getRepoCommits(
  owner: string,
  repo: string,
  perPage = 100
): Promise<CommitInfo[]> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: perPage,
  });
  return data.map((c) => ({
    sha: c.sha,
    message: c.commit.message,
    author: c.commit.author?.name || c.author?.login || 'Unknown',
    date: c.commit.author?.date || '',
    avatarUrl: c.author?.avatar_url || '',
  }));
}

export async function restoreFile(
  owner: string,
  repo: string,
  path: string,
  base64Content: string,
  sha?: string,
  message?: string
) {
  const octokit = getOctokit();
  const { data } = await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message: message || `Restore ${path}`,
    content: normalizeBase64(base64Content),
    sha,
  });
  return data;
}

export async function getLatestCommitSha(owner: string, repo: string): Promise<string> {
  const octokit = getOctokit();
  const { data } = await octokit.repos.listCommits({
    owner,
    repo,
    per_page: 1,
  });
  return data[0]?.sha || '';
}

// --- Tree SHA caching (survives page refresh via sessionStorage) ---

const TREE_SHA_PREFIX = 'gitdoc_tree:';

export function cacheTreeSha(owner: string, repo: string, sha: string): void {
  try { sessionStorage.setItem(`${TREE_SHA_PREFIX}${owner}/${repo}`, sha); } catch { /* ignore */ }
}

export function clearCachedTreeSha(owner: string, repo: string): void {
  try { sessionStorage.removeItem(`${TREE_SHA_PREFIX}${owner}/${repo}`); } catch { /* ignore */ }
}

function getCachedTreeSha(owner: string, repo: string): string | null {
  try { return sessionStorage.getItem(`${TREE_SHA_PREFIX}${owner}/${repo}`); } catch { return null; }
}

export async function getRepoTree(owner: string, repo: string, treeSha?: string) {
  const octokit = getOctokit();

  if (!treeSha) {
    // Try cached tree SHA first (set after file mutations, survives page refresh)
    const cached = getCachedTreeSha(owner, repo);
    if (cached) {
      treeSha = cached;
    } else {
      // 首次加载：通过分支获取最新 tree SHA
      const { data: repoData } = await octokit.repos.get({ owner, repo });
      const { data: branchData } = await octokit.repos.getBranch({
        owner,
        repo,
        branch: repoData.default_branch,
      });
      treeSha = branchData.commit.commit.tree.sha;
    }
  }

  cacheTreeSha(owner, repo, treeSha);

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: 'true',
  });
  return data.tree;
}
