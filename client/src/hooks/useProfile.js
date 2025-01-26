// src/hooks/useServices.js
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "react-query";
import { profileApi } from "../api/profile.ts";

// Fetch services hook
export const useFetchProfile = () => {
  const queryClient = useQueryClient();

  return useQuery('profile', profileApi.fetchProfile, {
    onSuccess: (data) => {
      console.log("Fetched profile: ", data);
      queryClient.setQueryData('profile', data);
    },
    onError: (error) => {
      console.error("Error fetching profile:", error);
    },
  });
};

// Edit an existing service hook
export const useEditProfile = () => {
  const queryClient = useQueryClient();

  return useMutation(profileApi.editProfile, {
    onSuccess: (updatedProfile) => {
      queryClient.setQueryData('profile', (oldProfile) =>
        oldProfile.map(profile =>
          profile.id === updatedProfile.id ? updatedProfile : profile
        )
      );
      queryClient.invalidateQueries('profile');
    },
    onError: (error) => {
      console.error("Error editing profile:", error);
    },
  });
};
