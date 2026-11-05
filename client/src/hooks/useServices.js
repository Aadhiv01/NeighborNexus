// src/hooks/useServices.js
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { serviceApi } from '../api/services';

const SERVICES_KEY = ['services'];

export const useFetchServices = () =>
  useQuery({
    queryKey: SERVICES_KEY,
    queryFn: serviceApi.fetchServices,
  });

export const useAddService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.addService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
};

export const useEditService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.editService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
};

export const useDeleteService = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: serviceApi.deleteService,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SERVICES_KEY });
    },
  });
};
