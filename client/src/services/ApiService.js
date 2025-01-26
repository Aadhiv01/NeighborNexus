import axiosInstance from "../api/axios-client";


export const ApiService = {
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

  // Fetch services from the server
  fetchServices: async () => {
    const response = await axiosInstance.get("/serviceprovider/services");
    return response.data;
  },

  // Add a new service
  addService: async (newService) => {
    const response = await axiosInstance.post("/serviceprovider/services", newService);
    return response.data;
  },

  // Edit an existing service
  editService: async (updatedService) => {
    const response = await axiosInstance.put(`/serviceprovider/services/${updatedService.id}`, updatedService);
    return response.data;
  },

  // Delete a service
  deleteService: async (serviceId) => {
    const response = await axiosInstance.delete(`/serviceprovider/services/${serviceId}`);
    return response.data;
  }
};