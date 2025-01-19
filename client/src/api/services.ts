import axiosInstance from './axios-client.js';

export const serviceApi = {
  // Fetch services from the server
  fetchServices: async () => {
    const response = await axiosInstance.get("/serviceprovider/services");
    return response.data;
  },

  // Add a new service
  addService: async (newService) => {
    const response = await axiosInstance.post("/serviceprovider/services", newService);
    console.log("Response in servicesApi: ", response.data);
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