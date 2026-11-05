import axiosInstance from './axios-client.js';

const idOf = (service) => service._id || service.id;

export const serviceApi = {
  fetchServices: async () => {
    const { data } = await axiosInstance.get('/serviceprovider/services');
    return data;
  },

  addService: async ({ name, category, description, price, durationMinutes }) => {
    const { data } = await axiosInstance.post('/serviceprovider/services', {
      name,
      category,
      description,
      price: Number(price),
      durationMinutes: Number(durationMinutes) || 60,
    });
    return data;
  },

  editService: async (service) => {
    const { data } = await axiosInstance.put(
      `/serviceprovider/services/${idOf(service)}`,
      {
        name: service.name,
        category: service.category,
        description: service.description,
        price: Number(service.price),
        durationMinutes: Number(service.durationMinutes) || 60,
      }
    );
    return data;
  },

  deleteService: async (service) => {
    const { data } = await axiosInstance.delete(
      `/serviceprovider/services/${idOf(service)}`
    );
    return data;
  },
};
