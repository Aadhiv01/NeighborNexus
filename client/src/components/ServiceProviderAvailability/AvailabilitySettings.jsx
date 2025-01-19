// WorkingHoursSettings.jsx
import React, { useState } from 'react';
import { Card } from 'primereact/card';
import { Dropdown } from 'primereact/dropdown';
import { Button } from 'primereact/button';
import { Calendar } from 'primereact/calendar';
import { InputSwitch } from 'primereact/inputswitch';
import { Accordion, AccordionTab } from 'primereact/accordion';

const WorkingHoursSettings = ({ value, onChange }) => {
  const [localHours, setLocalHours] = useState(value);
  
  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2);
    const minute = i % 2 === 0 ? '00' : '30';
    const timeStr = `${String(hour).padStart(2, '0')}:${minute}`;
    return { label: timeStr, value: timeStr };
  });

  const handleSeasonalChange = (season, field, newValue) => {
    setLocalHours(prev => ({
      ...prev,
      seasonal: {
        ...prev.seasonal,
        [season]: {
          ...prev.seasonal[season],
          [field]: newValue
        }
      }
    }));
    onChange(localHours);
  };

  const handleRushHourChange = (index, field, value) => {
    const updatedRushHours = [...localHours.rushHours];
    updatedRushHours[index] = {
      ...updatedRushHours[index],
      [field]: value
    };
    
    setLocalHours(prev => ({
      ...prev,
      rushHours: updatedRushHours
    }));
    onChange(localHours);
  };

  return (
    <div className="working-hours-settings">
      <Accordion multiple>
        <AccordionTab header="Default Working Hours">
          <div className="grid">
            <div className="col-6">
              <label>Start Time</label>
              <Dropdown
                value={localHours.default.start}
                options={timeOptions}
                onChange={(e) => {
                  setLocalHours(prev => ({
                    ...prev,
                    default: { ...prev.default, start: e.value }
                  }));
                  onChange(localHours);
                }}
              />
            </div>
            <div className="col-6">
              <label>End Time</label>
              <Dropdown
                value={localHours.default.end}
                options={timeOptions}
                onChange={(e) => {
                  setLocalHours(prev => ({
                    ...prev,
                    default: { ...prev.default, end: e.value }
                  }));
                  onChange(localHours);
                }}
              />
            </div>
          </div>
        </AccordionTab>

        <AccordionTab header="Seasonal Hours">
          {Object.entries(localHours.seasonal).map(([season, hours]) => (
            <Card key={season} className="mb-3">
              <h4 className="capitalize">{season}</h4>
              <div className="grid">
                <div className="col-6">
                  <label>Start Time</label>
                  <Dropdown
                    value={hours.start}
                    options={timeOptions}
                    onChange={(e) => handleSeasonalChange(season, 'start', e.value)}
                  />
                </div>
                <div className="col-6">
                  <label>End Time</label>
                  <Dropdown
                    value={hours.end}
                    options={timeOptions}
                    onChange={(e) => handleSeasonalChange(season, 'end', e.value)}
                  />
                </div>
              </div>
            </Card>
          ))}
        </AccordionTab>

        <AccordionTab header="Rush Hours">
          {localHours.rushHours.map((rushHour, index) => (
            <Card key={index} className="mb-3">
              <div className="grid">
                <div className="col-6">
                  <label>Start Time</label>
                  <Dropdown
                    value={rushHour.start}
                    options={timeOptions}
                    onChange={(e) => handleRushHourChange(index, 'start', e.value)}
                  />
                </div>
                <div className="col-6">
                  <label>End Time</label>
                  <Dropdown
                    value={rushHour.end}
                    options={timeOptions}
                    onChange={(e) => handleRushHourChange(index, 'end', e.value)}
                  />
                </div>
              </div>
              <Button 
                icon="pi pi-trash" 
                className="p-button-danger p-button-text mt-2"
                onClick={() => {
                  const updatedRushHours = localHours.rushHours.filter((_, i) => i !== index);
                  setLocalHours(prev => ({ ...prev, rushHours: updatedRushHours }));
                  onChange(localHours);
                }}
              />
            </Card>
          ))}
          <Button 
            label="Add Rush Hour" 
            icon="pi pi-plus"
            className="p-button-outlined mt-2"
            onClick={() => {
              setLocalHours(prev => ({
                ...prev,
                rushHours: [...prev.rushHours, { start: '09:00', end: '10:00' }]
              }));
              onChange(localHours);
            }}
          />
        </AccordionTab>
      </Accordion>
    </div>
  );
};

// ServiceSettings.jsx
const ServiceSettings = ({ value, onChange }) => {
  const [localServices, setLocalServices] = useState(value);
  const [editingService, setEditingService] = useState(null);
  const [showServiceDialog, setShowServiceDialog] = useState(false);

  const handleServiceChange = (service) => {
    if (editingService) {
      setLocalServices(prev => 
        prev.map(s => s.id === service.id ? service : s)
      );
    } else {
      setLocalServices(prev => [...prev, { ...service, id: Date.now() }]);
    }
    setShowServiceDialog(false);
    setEditingService(null);
    onChange(localServices);
  };

  return (
    <div className="service-settings">
      <DataTable value={localServices}>
        <Column field="name" header="Service Name" />
        <Column field="duration" header="Duration (min)" />
        <Column field="basePrice" header="Base Price" 
          body={(rowData) => `$${rowData.basePrice}`} />
        <Column field="capacity" header="Capacity" />
        <Column body={(rowData) => (
          <div className="flex gap-2">
            <Button 
              icon="pi pi-pencil" 
              className="p-button-text"
              onClick={() => {
                setEditingService(rowData);
                setShowServiceDialog(true);
              }}
            />
            <Button 
              icon="pi pi-trash" 
              className="p-button-text p-button-danger"
              onClick={() => {
                setLocalServices(prev => 
                  prev.filter(s => s.id !== rowData.id)
                );
                onChange(localServices);
              }}
            />
          </div>
        )} />
      </DataTable>

      <Button 
        label="Add Service" 
        icon="pi pi-plus"
        className="mt-3"
        onClick={() => {
          setEditingService(null);
          setShowServiceDialog(true);
        }}
      />

      <Dialog 
        visible={showServiceDialog} 
        onHide={() => setShowServiceDialog(false)}
        header={editingService ? "Edit Service" : "Add Service"}
      >
        <ServiceForm 
          initialData={editingService}
          onSubmit={handleServiceChange}
        />
      </Dialog>
    </div>
  );
};

// NotificationSettings.jsx
const NotificationSettings = ({ value, onChange }) => {
  const [localSettings, setLocalSettings] = useState(value);

  const handleChange = (changes) => {
    const updated = { ...localSettings, ...changes };
    setLocalSettings(updated);
    onChange(updated);
  };

  return (
    <div className="notification-settings">
      <Card className="mb-3">
        <h3>Channels</h3>
        <div className="grid">
          <div className="col-6">
            <div className="flex align-items-center justify-content-between">
              <label>SMS Notifications</label>
              <InputSwitch
                checked={localSettings.smsEnabled}
                onChange={(e) => handleChange({ smsEnabled: e.value })}
              />
            </div>
          </div>
          <div className="col-6">
            <div className="flex align-items-center justify-content-between">
              <label>Email Notifications</label>
              <InputSwitch
                checked={localSettings.emailEnabled}
                onChange={(e) => handleChange({ emailEnabled: e.value })}
              />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <h3>Reminder Schedule</h3>
        <DataTable 
          value={localSettings.reminderIntervals.map(hours => ({ hours }))}
          editMode="row"
        >
          <Column 
            field="hours" 
            header="Hours Before Appointment"
            editor={(props) => (
              <InputNumber 
                value={props.rowData.hours}
                onChange={(e) => {
                  const updatedIntervals = localSettings.reminderIntervals
                    .map((interval, idx) => 
                      idx === props.rowIndex ? e.value : interval
                    );
                  handleChange({ reminderIntervals: updatedIntervals });
                }}
                min={1}
                max={72}
              />
            )}
          />
          <Column body={(rowData, { rowIndex }) => (
            <Button 
              icon="pi pi-trash"
              className="p-button-text p-button-danger"
              onClick={() => {
                const updatedIntervals = localSettings.reminderIntervals
                  .filter((_, idx) => idx !== rowIndex);
                handleChange({ reminderIntervals: updatedIntervals });
              }}
            />
          )} />
        </DataTable>
        
        <Button 
          label="Add Reminder" 
          icon="pi pi-plus"
          className="mt-3"
          onClick={() => {
            handleChange({
              reminderIntervals: [...localSettings.reminderIntervals, 24]
            });
          }}
        />
      </Card>
    </div>
  );
};

export { WorkingHoursSettings, ServiceSettings, NotificationSettings };