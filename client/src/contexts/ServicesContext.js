import React, { createContext, useState, useEffect } from "react";
import { useVerifyToken } from '../hooks/useAuth';
import { setUser } from "../store/authSlice";

// Create the ServicesContext for managing service provider services
const ServicesContext = createContext(undefined);

export const ServicesProvider = ({ children }) => {
  const [services, setServices] = useState([]);
  const { data, isLoading } = useVerifyToken();

  useEffect(() => {
    if (data) {
      setUser(data.user);
    }
  }, [data]);
  
  // return (
  //   <ServicesContext.Provider
  //     value={{
  //       services,
  //       loading,
  //       error,
  //       addService,
  //       editService,
  //       deleteService,
  //     }}
  //   >
  //     {!loading && children}
  //   </ServicesContext.Provider>
  // );
};

export default ServicesContext;
