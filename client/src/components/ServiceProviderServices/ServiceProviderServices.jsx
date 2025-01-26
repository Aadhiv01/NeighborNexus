import React, { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { Button } from 'primereact/button';
import { Card } from 'primereact/card';
import { InputText } from 'primereact/inputtext';
import { InputTextarea } from 'primereact/inputtextarea';
import { Dialog } from 'primereact/dialog';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Toast } from 'primereact/toast';
import { motion } from 'framer-motion';

import Header from '../Header/Header';
import { useUser } from '../../contexts/UserContext';
import { useFetchServices, useAddService, useEditService, useDeleteService } from '../../hooks/useServices';
import './ServiceProviderServices.css';

const initialServiceState = {
  name: '',
  category: '',
  description: '',
  price: '',
  user: undefined
};

const ServiceProviderServices = () => {
  const dispatch = useDispatch();
  const { user, isLoading } = useUser();
  const [newService, setNewService] = useState(initialServiceState);
  const [editServiceData, setEditServiceData] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  
  const toast = React.useRef(null);
  
  const { data: services, refetch: fetchServices } = useFetchServices();
  const addServiceMutation = useAddService();
  const editServiceMutation = useEditService();
  const deleteServiceMutation = useDeleteService();

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  
  useEffect(() => {
    if (user) {
      setNewService(prevState => ({
        ...prevState,
        user: JSON.parse(JSON.stringify(user))
      }));
    }
  }, [user]);

  const handleInputChange = (e, field) => {
    const { value } = e.target;
    setNewService((prev) => ({ ...prev, [field]: value }));
  };

  const handleAddService = useCallback(() => {
    if (Object.values(newService).every(Boolean)) {
      addServiceMutation.mutate(newService, {
        onSuccess: () => {
          setNewService(initialServiceState);
          toast.current.show({
            severity: 'success',
            summary: 'Success',
            detail: 'Service added successfully',
          });
          setNewService(prevState => ({
            ...prevState,
            user: JSON.parse(JSON.stringify(user))
          }));
          fetchServices();
        },
      });
    } else {
      toast.current.show({
        severity: 'error',
        summary: 'Error',
        detail: 'Please fill in all required fields',
      });
    }
  }, [newService, addServiceMutation, fetchServices]);

  const handleEditService = useCallback((service) => {
    editServiceMutation.mutate(service, {
      onSuccess: () => {
        toast.current.show({
          severity: 'success',
          summary: 'Success',
          detail: 'Service updated successfully',
        });
        setShowDialog(false);
        fetchServices();
      },
    });
  }, [editServiceMutation, fetchServices]);

  const handleDeleteService = useCallback((serviceId) => {
    deleteServiceMutation.mutate(serviceId, {
      onSuccess: () => {
        toast.current.show({
          severity: 'warn',
          summary: 'Deleted',
          detail: 'Service deleted successfully',
        });
        fetchServices();
      },
    });
  }, [deleteServiceMutation, fetchServices]);

  const actionBodyTemplate = useCallback((rowData) => (
    <div className="action-buttons">
      <Button
        icon="pi pi-pencil"
        className="p-button-rounded p-button-warning mr-2"
        onClick={() => setEditServiceData(rowData)}
      />
      <Button
        icon="pi pi-trash"
        className="p-button-rounded p-button-danger"
        onClick={() => handleDeleteService(rowData.id)}
      />
    </div>
  ), [handleDeleteService]);

  return (
    <div className="sp-services-page">
      <Header />
      <motion.div
        className="sp-manage-container"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Toast ref={toast} />

        <div className="sp-services-layout">
          <motion.div
            className="sp-add-service"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
          >
            <Card title="Add New Service" className="sp-add-service-card">
              <div className="p-fluid">
                {Object.entries(newService).map(([key, value]) => (
                  <div className="p-field" key={key}>
                    <label htmlFor={key}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    {key === 'description' ? (
                      <InputTextarea
                        id={key}
                        className="service-input"
                        value={value}
                        onChange={(e) => handleInputChange(e, key)}
                        rows={3}
                      />
                    ) : key !== 'user' ? (
                      <InputText
                        id={key}
                        className="service-input"
                        value={value}
                        onChange={(e) => handleInputChange(e, key)}
                        required
                      />
                    ) : null}
                  </div>
                ))}
                <Button
                  label="Add Service"
                  icon="pi pi-plus"
                  onClick={handleAddService}
                  className="p-button-success"
                />
              </div>
            </Card>
          </motion.div>

          <motion.div
            className="sp-services-list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            <Card title="Services List" className="sp-services-list-card">
              <DataTable
                value={services}
                responsiveLayout="scroll"
                className="sp-services-table"
              >
                <Column field="name" header="Service Name" sortable />
                <Column field="category" header="Category" sortable />
                <Column field="description" header="Description" />
                <Column field="price" header="Price" sortable />
                <Column header="Actions" body={actionBodyTemplate} />
              </DataTable>
            </Card>
          </motion.div>
        </div>

        <Dialog
          header="Edit Service"
          visible={showDialog}
          onHide={() => setShowDialog(false)}
        >
          {editServiceData && (
            <div className="p-fluid">
              {Object.entries(editServiceData).map(([key, value]) => (
                key !== 'id' && (
                  <div className="p-field" key={key}>
                    <label htmlFor={`edit-${key}`}>{key.charAt(0).toUpperCase() + key.slice(1)}</label>
                    {key === 'description' ? (
                      <InputTextarea
                        id={`edit-${key}`}
                        value={value}
                        onChange={(e) => setEditServiceData({...editServiceData, [key]: e.target.value})}
                        rows={3}
                      />
                    ) : (
                      <InputText
                        id={`edit-${key}`}
                        value={value}
                        onChange={(e) => setEditServiceData({...editServiceData, [key]: e.target.value})}
                      />
                    )}
                  </div>
                )
              ))}
              <Button
                label="Save Changes"
                onClick={() => handleEditService(editServiceData)}
                className="p-button-success mt-3"
              />
            </div>
          )}
        </Dialog>
      </motion.div>
    </div>
  );
};

export default ServiceProviderServices;