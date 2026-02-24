import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, Modal, Select, Spin, message } from 'antd';
import {
  SearchOutlined,
  BookOutlined,
  StarOutlined,
  StarFilled,
  RightOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { listRepos, createRepo } from '../services/github';
import { useLocale } from '../i18n/context';
import type { LocaleKeys } from '../i18n/zh';

interface Repo {
  id: number;
  full_name: string;
  name: string;
  private: boolean;
  description: string | null;
  owner: { login: string; avatar_url: string };
  updated_at: string;
}

interface RepoSelectorProps {
  onSelect: (owner: string, repo: string) => void;
}

function relativeDate(iso: string, t: (key: LocaleKeys, ...args: (string | number)[]) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days < 1) return t('date.today');
  if (days === 1) return t('date.yesterday');
  if (days < 30) return t('date.daysAgo', days);
  const months = Math.floor(days / 30);
  if (months < 12) return t('date.monthsAgo', months);
  return t('date.yearsAgo', Math.floor(months / 12));
}

interface OwnerGroup {
  owner: string;
  avatarUrl: string;
  repos: Repo[];
}

const FAVORITES_KEY = 'gitdoc_favorites';

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (err) {
    console.warn('Failed to load favorites from storage', err);
  }
  return new Set();
}

function saveFavorites(favs: Set<string>) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favs]));
}

function groupByOwner(repos: Repo[]): OwnerGroup[] {
  const map = new Map<string, OwnerGroup>();
  for (const repo of repos) {
    const key = repo.owner.login;
    if (!map.has(key)) {
      map.set(key, { owner: key, avatarUrl: repo.owner.avatar_url, repos: [] });
    }
    map.get(key)!.repos.push(repo);
  }
  return Array.from(map.values());
}

type FilterType = 'all' | 'public' | 'private';

function RepoRow({
  repo,
  isFav,
  onSelect,
  onToggleFav,
  t,
}: {
  repo: Repo;
  isFav: boolean;
  onSelect: () => void;
  onToggleFav: (e: React.MouseEvent) => void;
  t: (key: LocaleKeys, ...args: (string | number)[]) => string;
}) {
  return (
    <div
      onClick={onSelect}
      style={{
        padding: '16px 0',
        borderBottom: '1px solid #d1d9e0',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 16,
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f8fa')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: '#0969da',
              lineHeight: 1.5,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
            onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
          >
            {repo.name}
          </span>
          <span
            style={{
              fontSize: 12,
              color: '#656d76',
              border: '1px solid #d1d9e0',
              borderRadius: 12,
              padding: '0 7px',
              lineHeight: '20px',
              fontWeight: 500,
              flexShrink: 0,
            }}
          >
            {repo.private ? t('repo.private') : t('repo.public')}
          </span>
        </div>
        {repo.description && (
          <div
            style={{
              fontSize: 13,
              color: '#656d76',
              marginTop: 4,
              lineHeight: 1.5,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {repo.description}
          </div>
        )}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 8,
            fontSize: 12,
            color: '#656d76',
          }}
        >
          <span>{t('repo.updated', relativeDate(repo.updated_at, t))}</span>
        </div>
      </div>
      <div
        onClick={onToggleFav}
        style={{
          flexShrink: 0,
          marginTop: 2,
          cursor: 'pointer',
          padding: 4,
          borderRadius: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f8fa')}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        {isFav ? (
          <StarFilled style={{ fontSize: 16, color: '#e3b341' }} />
        ) : (
          <StarOutlined style={{ fontSize: 16, color: '#656d76' }} />
        )}
      </div>
    </div>
  );
}

export default function RepoSelector({ onSelect }: RepoSelectorProps) {
  const [repos, setRepos] = useState<Repo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newRepoName, setNewRepoName] = useState('');
  const [newRepoPrivate, setNewRepoPrivate] = useState(true);
  const [creating, setCreating] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [expandedOwners, setExpandedOwners] = useState<Set<string>>(new Set());
  const { t } = useLocale();

  const fetchRepos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listRepos(1, 100);
      setRepos(data as unknown as Repo[]);
    } catch (err) {
      message.error(t('repo.fetchFailed'));
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchRepos();
  }, [fetchRepos]);

  const filtered = useMemo(() => {
    let list = repos;
    if (filterType === 'public') list = list.filter((r) => !r.private);
    else if (filterType === 'private') list = list.filter((r) => r.private);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.full_name.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q)
      );
    }
    return list;
  }, [search, repos, filterType]);

  const toggleFavorite = (fullName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(fullName)) next.delete(fullName);
      else next.add(fullName);
      saveFavorites(next);
      return next;
    });
  };

  const favoriteRepos = useMemo(
    () => filtered.filter((r) => favorites.has(r.full_name)),
    [filtered, favorites]
  );

  const nonFavoriteRepos = useMemo(
    () => filtered.filter((r) => !favorites.has(r.full_name)),
    [filtered, favorites]
  );

  const groups = useMemo(() => groupByOwner(nonFavoriteRepos), [nonFavoriteRepos]);

  const toggleOwner = (owner: string) => {
    setExpandedOwners((prev) => {
      const next = new Set(prev);
      if (next.has(owner)) next.delete(owner);
      else next.add(owner);
      return next;
    });
  };

  const handleCreate = async () => {
    if (!newRepoName.trim()) return;
    setCreating(true);
    try {
      await createRepo(newRepoName.trim(), newRepoPrivate);
      message.success(t('repo.createSuccess'));
      setCreateModalOpen(false);
      setNewRepoName('');
      void fetchRepos();
    } catch (err) {
      message.error(t('repo.createFailed'));
      console.error(err);
    } finally {
      setCreating(false);
    }
  };

  const filterTabs: { key: FilterType; label: string }[] = [
    { key: 'all', label: `${t('repo.filterAll')} ${repos.length}` },
    { key: 'public', label: `${t('repo.filterPublic')} ${repos.filter((r) => !r.private).length}` },
    { key: 'private', label: `${t('repo.filterPrivate')} ${repos.filter((r) => r.private).length}` },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto', padding: '24px 32px' }}>
      {/* Top bar: search + new button */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          marginBottom: 16,
          alignItems: 'center',
        }}
      >
        <Input
          placeholder={t('repo.searchPlaceholder')}
          prefix={<SearchOutlined style={{ color: '#656d76' }} />}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          allowClear
          style={{
            flex: 1,
            height: 32,
            borderRadius: 6,
            border: '1px solid #d1d9e0',
            fontSize: 14,
          }}
        />
        <button
          onClick={() => setCreateModalOpen(true)}
          style={{
            height: 32,
            padding: '0 12px',
            borderRadius: 6,
            border: '1px solid rgba(27,31,36,0.15)',
            background: '#1a7f37',
            color: '#fff',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = '#15692c')}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#1a7f37')}
        >
          <BookOutlined style={{ fontSize: 14 }} />
          {t('repo.new')}
        </button>
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: '1px solid #d1d9e0',
          marginBottom: 0,
        }}
      >
        {filterTabs.map((tab) => (
          <div
            key={tab.key}
            onClick={() => setFilterType(tab.key)}
            style={{
              padding: '8px 16px',
              fontSize: 14,
              color: filterType === tab.key ? '#1f2328' : '#656d76',
              fontWeight: filterType === tab.key ? 600 : 400,
              cursor: 'pointer',
              borderBottom: filterType === tab.key ? '2px solid #fd8c73' : '2px solid transparent',
              marginBottom: -1,
              transition: 'color 0.15s',
            }}
            onMouseEnter={(e) => {
              if (filterType !== tab.key) e.currentTarget.style.color = '#1f2328';
            }}
            onMouseLeave={(e) => {
              if (filterType !== tab.key) e.currentTarget.style.color = '#656d76';
            }}
          >
            {tab.label}
          </div>
        ))}
      </div>

      {/* Favorites section */}
      {favoriteRepos.length > 0 && (
        <div style={{ marginTop: 0 }}>
          <div
            style={{
              padding: '12px 0 8px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              borderBottom: '1px solid #d1d9e0',
            }}
          >
            <StarFilled style={{ fontSize: 14, color: '#e3b341' }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2328' }}>
              {t('repo.favorites')}
            </span>
            <span
              style={{
                fontSize: 12,
                color: '#656d76',
                background: '#eff1f3',
                borderRadius: 12,
                padding: '0 8px',
                lineHeight: '20px',
                fontWeight: 500,
              }}
            >
              {favoriteRepos.length}
            </span>
          </div>
          {favoriteRepos.map((repo) => (
            <RepoRow
              key={repo.id}
              repo={repo}
              isFav={true}
              onSelect={() => onSelect(repo.owner.login, repo.name)}
              onToggleFav={(e) => toggleFavorite(repo.full_name, e)}
              t={t}
            />
          ))}
        </div>
      )}

      {/* Repo list grouped by owner (collapsible) */}
      {filtered.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 0',
            color: '#656d76',
            fontSize: 14,
          }}
        >
          {t('repo.noMatch')}
        </div>
      ) : (
        groups.map((group) => {
          const isOpen = expandedOwners.has(group.owner);
          return (
            <div key={group.owner} style={{ borderBottom: '1px solid #d1d9e0' }}>
              <div
                onClick={() => toggleOwner(group.owner)}
                style={{
                  padding: '12px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = '#f6f8fa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <span style={{ fontSize: 12, color: '#656d76', width: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {isOpen ? <DownOutlined /> : <RightOutlined />}
                </span>
                {group.avatarUrl ? (
                  <img
                    src={group.avatarUrl}
                    alt=""
                    style={{ width: 20, height: 20, borderRadius: '50%' }}
                  />
                ) : null}
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1f2328' }}>
                  {group.owner}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: '#656d76',
                    background: '#eff1f3',
                    borderRadius: 12,
                    padding: '0 8px',
                    lineHeight: '20px',
                    fontWeight: 500,
                  }}
                >
                  {group.repos.length}
                </span>
              </div>
              {isOpen && (
                <div style={{ paddingLeft: 24 }}>
                  {group.repos.map((repo) => (
                    <RepoRow
                      key={repo.id}
                      repo={repo}
                      isFav={favorites.has(repo.full_name)}
                      onSelect={() => onSelect(repo.owner.login, repo.name)}
                      onToggleFav={(e) => toggleFavorite(repo.full_name, e)}
                      t={t}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}

      <Modal
        title={t('repo.createTitle')}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={handleCreate}
        confirmLoading={creating}
        okText={t('common.create')}
        cancelText={t('common.cancel')}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input
            placeholder={t('repo.namePlaceholder')}
            value={newRepoName}
            onChange={(e) => setNewRepoName(e.target.value)}
            onPressEnter={handleCreate}
          />
          <Select
            value={newRepoPrivate}
            onChange={setNewRepoPrivate}
            options={[
              { label: t('repo.privateRepo'), value: true },
              { label: t('repo.publicRepo'), value: false },
            ]}
          />
        </div>
      </Modal>
    </div>
  );
}
