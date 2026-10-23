import React, { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useRefreshMutation } from '../authApiSlice';

export const PersistLogin: React.FC = () => {
  const { token } = useAuth();
  const [refresh] = useRefreshMutation();
  const [isLoading, setIsLoading] = useState(!token);

  useEffect(() => {
    let isMounted = true;

    const verifyRefreshToken = async () => {
      try {
        await refresh().unwrap();
      } catch {
        // User is unauthenticated (no active cookie session)
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    if (!token) {
      verifyRefreshToken();
    } else {
      setIsLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [token, refresh]);

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
