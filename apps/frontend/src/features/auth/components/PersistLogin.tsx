import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRefreshMutation } from '../authApiSlice';
import { useLazyGetProfileQuery } from '../../users/userApiSlice';

export const PersistLogin: React.FC = () => {
  const { token, user } = useAuth();
  const [refresh] = useRefreshMutation();
  const [getProfile] = useLazyGetProfileQuery();
  const [isLoading, setIsLoading] = useState(!token || !user?.firstName);

  useEffect(() => {
    let isMounted = true;

    const verifyRefreshToken = async () => {
      try {
        if (!token) {
          await refresh().unwrap();
        }
        if (!user?.firstName) {
          await getProfile().unwrap();
        }
      } catch {
        // User is unauthenticated (no active cookie session)
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!token || !user || !user.firstName) {
      verifyRefreshToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token, user, refresh, getProfile]);

  if (isLoading) {
    return (
      <div
        data-testid="persist-loading-spinner"
        className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4"
      >
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Restoring academic session...</p>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
