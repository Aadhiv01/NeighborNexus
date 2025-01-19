import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Dropdown } from "primereact/dropdown";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Tag } from "primereact/tag";
import { InputText } from "primereact/inputtext";
import { Calendar } from "primereact/calendar";
import { Toast } from "primereact/toast";
import { OverlayPanel } from "primereact/overlaypanel";
import { TabView, TabPanel } from 'primereact/tabview';

import Header from "../Header/Header";
import BookingsCalendar from './BookingsCalendar';
import "./Bookings.css";

const Bookings = () => {
  const navigate = useNavigate();
  const toast = useRef(null);
  const op = useRef(null);

  const [bookings, setBookings] = useState([
    {
      id: 1,
      date: "2024-08-20",
      time: "10:00 AM",
      service: "Plumbing",
      customer: "John Doe",
      status: "upcoming",
    },
    {
      id: 2,
      date: "2024-08-21",
      time: "1:00 PM",
      service: "Electrical",
      customer: "Jane Smith",
      status: "upcoming",
    },
    {
      id: 3,
      date: "2024-07-15",
      time: "11:00 AM",
      service: "Cleaning",
      customer: "Alice Johnson",
      status: "completed",
    },
    {
      id: 4,
      date: "2024-07-18",
      time: "2:00 PM",
      service: "Gardening",
      customer: "Bob Brown",
      status: "canceled",
    },
  ]);

  const statusOptions = [
    { label: "All", value: "all" },
    { label: "Upcoming", value: "upcoming" },
    { label: "Completed", value: "completed" },
    { label: "Canceled", value: "canceled" },
  ];

  const [selectedStatus, setSelectedStatus] = useState(null);
  const [globalFilter, setGlobalFilter] = useState(null);
  const [dateFilter, setDateFilter] = useState(null);
  const [expandedRows, setExpandedRows] = useState(null);

  const onStatusChange = (e) => {
    setSelectedStatus(e.value);
  };

  const statusTemplate = (rowData) => {
    let statusClass = "upcoming";
    if (rowData.status === "completed") statusClass = "completed";
    else if (rowData.status === "canceled") statusClass = "canceled";

    return (
      <Tag
        value={rowData.status.toUpperCase()}
        severity={
          statusClass === "completed"
            ? "success"
            : statusClass === "canceled"
            ? "danger"
            : "primary"
        }
      />
    );
  };

  const handleDateChange = (e) => {
    const selectedDate = e.value;

    if (selectedDate && dateFilter) {
      const selectedDateString = new Date(selectedDate)
        .toISOString()
        .split("T")[0];
      const currentFilterString = new Date(dateFilter)
        .toISOString()
        .split("T")[0];

      if (selectedDateString === currentFilterString) {
        setDateFilter(null); // Clear the filter if the same date is selected again
      } else {
        setDateFilter(selectedDate);
      }
    } else {
      setDateFilter(selectedDate);
    }
  };

  // Filter bookings based on the selected status, global filter, and date
  const filteredBookings = bookings.filter((booking) => {
    if (selectedStatus === "all") {
      setSelectedStatus(null);
    }
    const statusMatch =
      selectedStatus === null || booking.status === selectedStatus;
    const globalMatch =
      !globalFilter ||
      Object.values(booking).some((value) =>
        value.toString().toLowerCase().includes(globalFilter.toLowerCase())
      );

    console.log(
      "Date filter select value:",
      new Date(booking.date).toISOString().split("T")[0],
      new Date(dateFilter).toISOString().split("T")[0]
    );
    const dateMatch =
      !dateFilter ||
      new Date(booking.date).toISOString().split("T")[0] ===
        new Date(dateFilter).toISOString().split("T")[0];

    return statusMatch && globalMatch && dateMatch;
  });

//   const manageBooking = (booking) => {
//     alert(`Managing booking: ${booking.service} with ${booking.customer}`);
//   };

  const header = (
    <div className="table-header">
      <h5 className="mx-0 my-1">Manage Bookings</h5>
      <span className="p-input-icon-left">
        <i className="pi pi-search" />
        <InputText
          type="search"
          onInput={(e) => setGlobalFilter(e.target.value)}
          placeholder="Global Search"
          style={{ paddingLeft: "2.6vmin" }}
        />
      </span>
    </div>
  );

  const manageBooking = (booking) => {
    toast.current.show({severity:'info', summary: 'Booking Management', detail: `Managing booking: ${booking.service} with ${booking.customer}`, life: 3000});
  };

  const actionTemplate = (rowData) => {
    return (
      <React.Fragment>
        <Button icon="pi pi-cog" className="p-button-rounded p-button-info p-mr-2" onClick={(e) => op.current.toggle(e)} />
        <OverlayPanel ref={op} showCloseIcon>
          <div className="p-d-flex p-flex-column" style={{minWidth: '200px'}}>
            <Button label="View Details" icon="pi pi-eye" className="p-button-text pr-4" onClick={() => manageBooking(rowData)} />
            <Button label="Edit Booking" icon="pi pi-pencil" className="p-button-text pr-4" onClick={() => manageBooking(rowData)} />
            <Button label="Cancel Booking" icon="pi pi-times" className="p-button-text p-button-danger p-1" onClick={() => manageBooking(rowData)} />
          </div>
        </OverlayPanel>
      </React.Fragment>
    );
  };

  const rowExpansionTemplate = (data) => {
    return (
      <div className="manage-booking-details p-4">
        <h5>Booking Details</h5>
        <div className="p-grid">
          <div className="p-col-6 p-md-3"><strong>Date:</strong> {data.date}</div>
          <div className="p-col-6 p-md-3"><strong>Time:</strong> {data.time}</div>
          <div className="p-col-6 p-md-3"><strong>Service:</strong> {data.service}</div>
          <div className="p-col-6 p-md-3"><strong>Customer:</strong> {data.customer}</div>
        </div>
        <div className="p-mt-4">
          <strong>Notes:</strong> 
          <p>Additional booking details and notes would go here.</p>
        </div>
      </div>
    );
  };

  const handleBookingStatusChange = (bookingId, newStatus) => {
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status: newStatus }
          : booking
      )
    );
    
    toast.current.show({
      severity: 'success',
      summary: 'Status Updated',
      detail: `Booking status changed to ${newStatus}`,
      life: 3000
    });
  };

  return (
    <div className="bookings-page">
    <Header />
    <Toast ref={toast} />
    <div className="bookings-content">
      <Card title="Bookings Management" className="manage-bookings-card">
        <TabView>
          <TabPanel header="List View">
            <div className="filter-container">
              <Dropdown
                value={selectedStatus}
                options={statusOptions}
                onChange={onStatusChange}
                placeholder="Filter by Status"
                className="p-dropdown-filter"
              />
              <Calendar
                value={dateFilter}
                onChange={handleDateChange}
                placeholder="Filter by Date"
                inputStyle={{ paddingLeft: "1vmin" }}
                showIcon
              />
            </div>
            <DataTable 
              value={filteredBookings} 
              paginator 
              rows={10} 
              header={header}
              className="p-datatable-bookings"
              emptyMessage="No bookings found."
              responsiveLayout="scroll"
              expandedRows={expandedRows}
              onRowToggle={(e) => setExpandedRows(e.data)}
              rowExpansionTemplate={rowExpansionTemplate}
              dataKey="id"
            >
              <Column expander style={{ width: '3em' }} />
              <Column field="date" header="Date" sortable />
              <Column field="time" header="Time" sortable />
              <Column field="service" header="Service" sortable />
              <Column field="customer" header="Customer" sortable />
              <Column field="status" header="Status" body={statusTemplate} sortable />
              <Column body={actionTemplate} headerStyle={{ width: '8em', textAlign: 'center' }} bodyStyle={{ textAlign: 'center', overflow: 'visible' }} />
            </DataTable>
          </TabPanel>
          <TabPanel header="Calendar View">
            <BookingsCalendar 
              bookings={bookings}
              onStatusChange={handleBookingStatusChange}
            />
          </TabPanel>
        </TabView>
      </Card>
      <div className="back-to-dashboard">
        <Button
          label="Back to Dashboard"
          icon="pi pi-arrow-left"
          className="p-button-secondary"
          onClick={() => navigate("/dashboard/serviceprovider")}
        />
      </div>
    </div>
  </div>
  );
};

export default Bookings;
