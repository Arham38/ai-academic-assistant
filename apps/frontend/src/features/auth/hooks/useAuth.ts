import { useAppSelector } from '../../../app/store';
import {
  selectCurrentUser,
  selectCurrentToken,
  selectIsAuthenticated,
  selectUserRole,
} from '../authSlice';

export const useAuth = () => {
  const user = useAppSelector(selectCurrentUser);
  const token = useAppSelector(selectCurrentToken);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const role = useAppSelector(selectUserRole);

  return {
    user,
    token,
    isAuthenticated,
    role,
    isStudent: role === 'STUDENT',
    isResearcher: role === 'RESEARCHER',
    isAdmin: role === 'ADMIN',
  };
};
