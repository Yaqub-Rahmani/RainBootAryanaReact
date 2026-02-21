import { useSelector } from 'react-redux';
import { Navigate, useLocation } from 'react-router-dom';
import { selectAuthBootstrapped, selectIsAuthenticated } from '../../features/auth/selectors/authSelectors';

export default function ProtectedRoute({ children }) {
  const isAuthed = useSelector(selectIsAuthenticated);
  const bootstrapped = useSelector(selectAuthBootstrapped);
  const location = useLocation();

  if (!bootstrapped) return null; // App.jsx zaten splash gösteriyor

  if (!isAuthed) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return children;
}