// src/hooks/useServices.js
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { serviceApi } from "../api/services.ts";

// Fetch services hook
export const useFetchServices = () => {
  const queryClient = useQueryClient();

  return useQuery('services', serviceApi.fetchServices, {
    onSuccess: (data) => {
      console.log("Fetched services: ", data);
      queryClient.setQueryData('services', data);
    },
    onError: (error) => {
      console.error("Error fetching services:", error);
    },
  });
};

// Add a new service hook
export const useAddService = () => {
  const queryClient = useQueryClient();

  return useMutation(serviceApi.addService, {
    onSuccess: (newService) => {
      queryClient.setQueryData('services', (oldServices) => [
        ...oldServices,
        newService,
      ]);
      queryClient.invalidateQueries('services');
    },
    onError: (error) => {
      console.error("Error adding service:", error);
    },
  });
};

// Edit an existing service hook
export const useEditService = () => {
  const queryClient = useQueryClient();

  return useMutation(serviceApi.editService, {
    onSuccess: (updatedService) => {
      queryClient.setQueryData('services', (oldServices) =>
        oldServices.map(service =>
          service.id === updatedService.id ? updatedService : service
        )
      );
      queryClient.invalidateQueries('services');
    },
    onError: (error) => {
      console.error("Error editing service:", error);
    },
  });
};

// Delete a service hook
export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation(serviceApi.deleteService, {
    onSuccess: (deletedServiceId) => {
      queryClient.setQueryData('services', (oldServices) =>
        oldServices.filter(service => service.id !== deletedServiceId)
      );
      queryClient.invalidateQueries('services');
    },
    onError: (error) => {
      console.error("Error deleting service:", error);
    },
  });
};
