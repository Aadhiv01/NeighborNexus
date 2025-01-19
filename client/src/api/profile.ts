import axiosInstance from './axios-client.js';

export const profileApi = {
  // Fetch profile from the server
  fetchProfile: async () => {
    const response = await axiosInstance.get("/serviceprovider/profile");
    return response.data;
  },

  // Edit an existing service
  editProfile: async (updatedProfile) => {
    const response = await axiosInstance.put(`/serviceprovider/profile/${updatedProfile.id}`, updatedProfile);
    return response.data;
  },
};