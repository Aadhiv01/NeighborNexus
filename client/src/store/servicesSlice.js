// src/store/servicesSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ApiService } from '../services/ApiService';

const initialState = {
  services: [],
  loading: false,
  error: null,
};

export const fetchServices = createAsyncThunk(
    'serviceprovider/service/fetch',
    async (_, { rejectWithValue }) => {
      try {
        const data = await ApiService.fetchServices();
        return data;
      } catch (err) {
        return rejectWithValue('Failed to load services');
      }
    }
);

export const addServiceAsync = createAsyncThunk(
    'serviceprovider/service/add',
    async (newService, { rejectWithValue }) => {
      try {
        const data = await ApiService.addService(newService);
        return data;
      } catch (err) {
        return rejectWithValue('Failed to add service');
      }
    }
);

export const editServiceAsync = createAsyncThunk(
    'serviceprovider/service/edit',
    async (updatedService, { rejectWithValue }) => {
      try {
        const data = await ApiService.editService(updatedService);
        return data;
      } catch (err) {
        return rejectWithValue('Failed to edit service');
      }
    }
);

export const deleteServiceAsync = createAsyncThunk(
    'serviceprovider/service/edit',
    async (serviceId, { rejectWithValue }) => {
      try {
        const data = await ApiService.deleteService(serviceId);
        return data;
      } catch (err) {
        return rejectWithValue('Failed to delete service');
      }
    }
  );
  

const servicesSlice = createSlice({
  name: 'services',
  initialState,
  reducers: {
    addService: (state, action) => {
      state.services.push(action.payload);
    },
    editService: (state, action) => {
      const index = state.services.findIndex(service => service.id === action.payload.id);
      if (index !== -1) {
        state.services[index] = action.payload;
      }
    },
    deleteService: (state, action) => {
      state.services = state.services.filter(service => service.id !== action.payload);
    },
    setServicesLoading: (state, action) => {
      state.loading = action.payload;
    },
    setServicesError: (state, action) => {
      state.error = action.payload;
    },
    setServices: (state, action) => {
      state.services = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchServices.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServices.fulfilled, (state, action) => {
        state.services = action.payload;
        state.loading = false;
      })
      .addCase(fetchServices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(addServiceAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(addServiceAsync.fulfilled, (state, action) => {
        state.services.push(action.payload);
        state.loading = false;
      })
      .addCase(addServiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(editServiceAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(editServiceAsync.fulfilled, (state, action) => {
        const index = state.services.findIndex(service => service.id === action.payload.id);
        if (index !== -1) {
          state.services[index] = action.payload;
        }
        state.loading = false;
      })
      .addCase(editServiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(deleteServiceAsync.pending, (state) => {
        state.loading = true;
      })
      .addCase(deleteServiceAsync.fulfilled, (state, action) => {
        state.services = state.services.filter(service => service.id !== action.payload);
        state.loading = false;
      })
      .addCase(deleteServiceAsync.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
    },
});

export const {
  addService,
  editService,
  deleteService,
  setServicesLoading,
  setServicesError,
  setServices,
} = servicesSlice.actions;

export default servicesSlice.reducer;
