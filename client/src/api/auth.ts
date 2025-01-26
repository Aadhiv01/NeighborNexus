import axiosInstance from './axios-client.js';

export const authApi = {
  login: async (credentials: { email: string; password: string }) => {
    const response = await axiosInstance.post('/auth', credentials);
    return response.data;
  },
  signup: async (userData: any) => {
    const response = await axiosInstance.post('/auth/signup', userData);
    return response.data;
  },
  verifyToken: async () => {
    const response = await axiosInstance.get('/auth/verify-token');
    return response.data;
  },
};