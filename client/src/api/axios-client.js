import axios from "axios";

// Create an Axios instance with default settings
const axiosInstance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add the Authorization header if a token is present
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    // Handle request error
    return Promise.reject(error);
  }
);

// Response interceptor to handle responses and errors globally
axiosInstance.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx triggers this function
    return response;
  },
  (error) => {
    // Handle specific error cases (e.g., 401 Unauthorized)
    if (error.response?.status === 401) {
      // Optionally, you can perform actions like redirecting to the login page
      // or clearing the token from local storage
      console.error("Unauthorized access - redirecting to login");
    }
    // Propagate the error so it can be handled later
    return Promise.reject(error);
  }
);

export default axiosInstance;
