import React, { useState } from 'react';
import { Calendar } from 'primereact/calendar';
import { Dialog } from 'primereact/dialog';
import { Button } from 'primereact/button';
import { Tag } from 'primereact/tag';
import { ConfirmDialog, confirmDialog } from 'primereact/confirmdialog';

const BookingsCalendar = ({ bookings, onStatusChange }) => {
  const [selectedDate, setSelectedDate] = useState(null);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedBookings, setSelectedBookings] = useState([]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return 'bg-blue-200 text-blue-800';
      case 'completed':
        return 'bg-green-200 text-green-800';
      case 'canceled':
        return 'bg-red-200 text-red-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  const renderDateCell = (date) => {
    const dateObj = date instanceof Date ? date : new Date(date);

    // Ensure dateObj is valid
    if (isNaN(dateObj)) {
        console.error("Invalid date:", date);
        return null;
    }

    const dateStr = dateObj.toISOString().split('T')[0];
    const dayBookings = bookings.filter(booking => booking.date === dateStr);
    
    if (dayBookings.length === 0) return null;

    return (
      <div className="flex flex-col gap-1 max-h-16 overflow-y-auto">
        {dayBookings.map((booking, index) => (
          <div 
            key={index}
            className={`text-xs p-1 rounded ${getStatusColor(booking.status)} cursor-pointer truncate`}
            title={`${booking.time} - ${booking.service} (${booking.customer})`}
          >
            {booking.time} - {booking.service}
          </div>
        ))}
      </div>
    );
  };

  const handleDateSelect = (e) => {
    const date = e.value;
    const dateStr = date.toISOString().split('T')[0];
    const dayBookings = bookings.filter(booking => booking.date === dateStr);
    
    setSelectedDate(date);
    setSelectedBookings(dayBookings);
    setShowDialog(true);
  };

  const handleStatusChange = (booking, newStatus) => {
    confirmDialog({
      message: `Are you sure you want to mark this booking as ${newStatus}?`,
      header: 'Confirm Status Change',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        onStatusChange(booking.id, newStatus);
        setShowDialog(false);
      }
    });
  };

  const renderBookingDetails = (booking) => {
    return (
      <div key={booking.id} className="p-4 border rounded mb-2 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">{booking.service}</h3>
          <Tag 
            value={booking.status.toUpperCase()} 
            severity={
              booking.status === 'completed' ? 'success' :
              booking.status === 'canceled' ? 'danger' : 'info'
            }
          />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>Time: {booking.time}</div>
          <div>Customer: {booking.customer}</div>
        </div>
        <div className="mt-3 flex gap-2">
          {booking.status === 'upcoming' && (
            <>
              <Button 
                label="Complete" 
                severity="success" 
                size="small"
                onClick={() => handleStatusChange(booking, 'completed')}
              />
              <Button 
                label="Cancel" 
                severity="danger" 
                size="small"
                onClick={() => handleStatusChange(booking, 'canceled')}
              />
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="calendar-container mt-4">
      <style>{`
        .calendar-container .p-calendar {
          width: 100%;
        }
        
        .calendar-container .p-datepicker {
          width: 100%;
          min-width: 320px;
          padding: 0.5rem;
        }

        .calendar-container .p-datepicker table {
          margin: 0.5rem 0;
          width: 100%;
        }

        .calendar-container .p-datepicker table th {
          padding: 0.5rem;
          text-align: center;
          font-weight: 600;
          color: #495057;
        }

        .calendar-container .p-datepicker table td {
          padding: 0.5rem;
          text-align: center;
        }

        .calendar-container .p-datepicker table td > span {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s;
        }

        .calendar-container .p-datepicker .p-datepicker-header {
          padding: 0.5rem;
          color: #495057;
          background: #f8f9fa;
          font-weight: 600;
          margin: 0;
          border-bottom: 1px solid #dee2e6;
        }

        .calendar-container .p-datepicker .p-datepicker-header .p-datepicker-title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
        }

        .calendar-container .p-datepicker .p-datepicker-header .p-datepicker-prev,
        .calendar-container .p-datepicker .p-datepicker-header .p-datepicker-next {
          width: 2rem;
          height: 2rem;
          color: #6c757d;
          border: 1px solid transparent;
          border-radius: 50%;
          transition: all 0.2s;
        }

        .calendar-container .p-datepicker .p-datepicker-header .p-datepicker-prev:hover,
        .calendar-container .p-datepicker .p-datepicker-header .p-datepicker-next:hover {
          background: #e9ecef;
          color: #495057;
        }

        .calendar-container .p-datepicker table td.p-datepicker-today > span {
          background: #e9ecef;
          color: #495057;
          font-weight: 600;
        }

        .calendar-container .p-datepicker table td:not(.p-datepicker-other-month):hover > span {
          background: #e9ecef;
        }

        .calendar-container .p-datepicker .p-monthpicker .p-monthpicker-month {
          padding: 0.5rem;
        }

        .calendar-container .p-datepicker .p-yearpicker .p-yearpicker-year {
          padding: 0.5rem;
        }
      `}</style>
      
      <ConfirmDialog />
      <Calendar 
        inline 
        value={selectedDate}
        onChange={handleDateSelect}
        dateTemplate={renderDateCell}
        className="w-full"
        monthNavigator
        yearNavigator
        yearRange="2022:2028"
        showWeek={false}
        dateFormat="MM yyyy"
      />
      
      <Dialog
        header={selectedDate ? `Bookings for ${selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })}` : 'Bookings'}
        visible={showDialog} 
        onHide={() => setShowDialog(false)}
        className="w-full md:w-1/2 lg:w-2/5"
        breakpoints={{ '960px': '75vw', '641px': '90vw' }}
      >
        {selectedBookings.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {selectedBookings.map(booking => renderBookingDetails(booking))}
          </div>
        ) : (
          <p className="text-center text-gray-500 py-4">No bookings for this date.</p>
        )}
      </Dialog>
    </div>
  );
};

export default BookingsCalendar;