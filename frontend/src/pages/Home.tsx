import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import RepoSelector from '../components/RepoSelector';
import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleRepoSelect = (owner: string, repo: string) => {
    navigate(`/repo/${owner}/${repo}`);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff' }}>
      <Header user={user} onLogout={logout} />
      <RepoSelector onSelect={handleRepoSelect} />
    </div>
  );
}
