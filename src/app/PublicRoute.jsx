import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectIsAuthenticated } from "../features/auth/selectors/authSelectors";

export default function PublicRoute({ children }) {
  const isAuthed = useSelector(selectIsAuthenticated);

  if (isAuthed) {
    return <Navigate to="/" replace />;
  }

  return children;
}
