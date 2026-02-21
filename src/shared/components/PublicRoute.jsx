import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import { selectAuthBootstrapped, selectIsAuthenticated } from '../../features/auth/selectors/authSelectors';

export default function PublicRoute({ children }) {
  const isAuthed = useSelector(selectIsAuthenticated);
  const bootstrapped = useSelector(selectAuthBootstrapped);

  if (!bootstrapped) return null;

  if (isAuthed) return <Navigate to="/dashboard" replace />;
  return children;
}