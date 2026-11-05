import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';

import { authApi } from '../api/auth';
import { useUser } from '../contexts/UserContext.jsx';

const USER_KEY = ['user'];

const dashboardFor = (user) =>
  user?.type === 'Service Provider'
    ? '/dashboard/serviceprovider'
    : '/dashboard/member';

/**
 * A session lives in exactly two places: the token in localStorage and the
 * user in UserContext. Everything else reads from those.
 */
function establishSession({ data, queryClient, setUser, navigate }) {
  localStorage.setItem('token', data.token);
  setUser(data.user);
  queryClient.setQueryData(USER_KEY, { user: data.user });
  navigate(dashboardFor(data.user));
}

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();

  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (data) => establishSession({ data, queryClient, setUser, navigate }),
  });
};

export const useSignup = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();

  return useMutation({
    mutationFn: authApi.signup,
    onSuccess: (data) => establishSession({ data, queryClient, setUser, navigate }),
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser } = useUser();

  return () => {
    localStorage.removeItem('token');
    setUser(null);
    queryClient.clear();
    navigate('/login');
  };
};

export const useVerifyToken = () => {
  return useQuery({
    queryKey: USER_KEY,
    queryFn: async () => {
      try {
        return await authApi.verifyToken();
      } catch (err) {
        // A rejected token is unrecoverable — drop it so the UI settles
        // on the signed-out state instead of retrying forever.
        localStorage.removeItem('token');
        throw err;
      }
    },
    retry: false,
    enabled: !!localStorage.getItem('token'),
  });
};
