import { Octokit } from '@octokit/rest';
import { getToken } from './auth';

function getOctokit(): Octokit {
  const token = getToken();
  if (!token) throw new Error('Not authenticated');
  return new Octokit({ auth: token });
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

  let content = '';
  if (data.content) {
    try {
      const raw = atob(data.content);
      content = decodeURIComponent(
        raw
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      // Binary files can't be decoded as UTF-8 text
      content = '';
    }
  }
  return {
    content,
    sha: data.sha,
    path: data.path,
    name: data.name,
    download_url: (data as { download_url?: string }).download_url || '',
    base64: data.content ? data.content.replace(/\n/g, '') : '',
  };
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
    content: btoa(
      encodeURIComponent(content).replace(/%([0-9A-F]{2})/g, (_, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    ),
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
    content: base64Content,
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

export interface CommitFilePatch {
  additions: number;
  deletions: number;
  patch: string;
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
    headers: { 'If-None-Match': '' },
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
    headers: { 'If-None-Match': '' },
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

  let content = '';
  if (data.content) {
    try {
      const raw = atob(data.content);
      content = decodeURIComponent(
        raw
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      content = '';
    }
  }
  return {
    content,
    sha: data.sha,
    path: data.path,
    name: data.name,
    download_url: (data as { download_url?: string }).download_url || '',
    base64: data.content ? data.content.replace(/\n/g, '') : '',
  };
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
    headers: { 'If-None-Match': '' },
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
    content: base64Content,
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
    headers: { 'If-None-Match': '' },
  });
  return data[0]?.sha || '';
}

export async function getRepoTree(owner: string, repo: string, treeSha?: string) {
  const octokit = getOctokit();

  if (!treeSha) {
    // 首次加载：通过分支获取最新 tree SHA
    const { data: repoData } = await octokit.repos.get({ owner, repo });
    const { data: branchData } = await octokit.repos.getBranch({
      owner,
      repo,
      branch: repoData.default_branch,
      headers: { 'If-None-Match': '' },
    });
    treeSha = branchData.commit.commit.tree.sha;
  }

  const { data } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: treeSha,
    recursive: 'true',
  });
  return data.tree;
}
