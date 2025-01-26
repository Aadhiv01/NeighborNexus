import { useMutation, useQuery, useQueryClient } from 'react-query';
import { authApi } from '../api/auth.ts';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../contexts/UserContext.js';

export const useLogin = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser, user } = useUser();

  return useMutation(authApi.login, {
    onSuccess: (data) => {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      console.log("User : ", user, data.user)
      queryClient.setQueryData('user', data.user);
      if(data.user.type === "Service Provider")
        navigate('/dashboard/serviceprovider');
      else
        navigate('/dashboard/member');
    },
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

export const useSignup = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { setUser, user } = useUser();

  return useMutation(authApi.signup, {
    onSuccess: (data) => {
      console.log("Signed up: ", data);
      // localStorage.setItem('token', data.token);
      // setUser(data.user);
      // console.log("User : ", user, data.user)
      // queryClient.setQueryData('user', data.user);
      // if(data.user.type === "Service Provider")
      //   navigate('/dashboard/serviceprovider');
      // else
      //   navigate('/dashboard/member');
    },
  });
};

export const useVerifyToken = () => {
  return useQuery('user', authApi.verifyToken, {
    retry: false,
    onError: () => {
      localStorage.removeItem('token');
    },
  });
};