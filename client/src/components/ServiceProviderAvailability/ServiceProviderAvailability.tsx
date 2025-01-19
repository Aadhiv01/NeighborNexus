import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { DataTable } from "primereact/datatable";
import { Column } from "primereact/column";
import { Toast } from "primereact/toast";
import { Timeline } from 'primereact/timeline';
import { Calendar } from 'primereact/calendar';
import { isWithinInterval, parseISO, setMinutes, setHours, isBefore, addHours, format, eachDayOfInterval, startOfDay, endOfDay } from 'date-fns';
import { motion } from "framer-motion";

// Types and Interfaces
interface Service {
  id: number;
  name: string;
  duration: number;
  basePrice: number;
  capacity: number;
  rushHourMultiplier: number;
  emergencyMultiplier: number;
  description: string;
}

interface WorkingHours {
  default: TimeRange;
  seasonal: {
    summer: TimeRange;
    winter: TimeRange;
  };
  rushHours: TimeRange[];
}

interface TimeRange {
  start: string;
  end: string;
  disabled?: boolean;
}

interface Slot {
  start: string;
  end: string;
  datetime: Date;
  price: number;
  isRushHour: boolean;
  isEmergencyWindow: boolean;
}

interface Booking {
  id: string;
  datetime: string;
  service: Service;
  customer: Customer;
  startTime: string;
  endTime: string;
  price: number;
  status: 'confirmed' | 'pending' | 'cancelled';
}

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
}

interface NotificationSettings {
  smsEnabled: boolean;
  emailEnabled: boolean;
  reminderIntervals: number[];
}

interface GoogleCalendarSettings {
  enabled: boolean;
  lastSync: Date | null;
  calendarId: string | null;
}

interface SettingsDialogProps {
  visible: boolean;
  onHide: () => void;
  workingHours: WorkingHours;
  services: Service[];
  notifications: NotificationSettings;
  onSave: (settings: {
    workingHours: WorkingHours;
    services: Service[];
    notifications: NotificationSettings;
  }) => void;
}

// Constants
const INITIAL_SERVICES: Service[] = [
  {
    id: 1,
    name: 'Basic Service',
    duration: 60,
    basePrice: 100,
    capacity: 1,
    rushHourMultiplier: 1.5,
    emergencyMultiplier: 2,
    description: 'Standard service visit'
  },
  {
    id: 2,
    name: 'Premium Service',
    duration: 120,
    basePrice: 200,
    capacity: 1,
    rushHourMultiplier: 1.75,
    emergencyMultiplier: 2.5,
    description: 'Extended service visit with additional features'
  }
];

const INITIAL_WORKING_HOURS: WorkingHours = {
  default: { start: '09:00', end: '17:00' },
  seasonal: {
    summer: { start: '08:00', end: '20:00' },
    winter: { start: '09:00', end: '16:00' }
  },
  rushHours: [
    { start: '08:00', end: '10:00' },
    { start: '17:00', end: '19:00' }
  ]
};

const INITIAL_NOTIFICATION_SETTINGS: NotificationSettings = {
  smsEnabled: true,
  emailEnabled: true,
  reminderIntervals: [24, 2] // hours before appointment
};

// Utility Functions
export const getCurrentSeason = (date: Date): 'summer' | 'winter' | 'default' => {
  const month = date.getMonth();
  if (month >= 5 && month <= 8) return 'summer';
  if (month >= 11 || month <= 2) return 'winter';
  return 'default';
};

export const isInRushHour = (datetime: Date): boolean => {
  const hour = datetime.getHours();
  return (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 19);
};

export const isInEmergencyWindow = (datetime: Date): boolean => {
  const hour = datetime.getHours();
  return hour < 8 || hour >= 20;
};

export const getSeasonalPriceMultiplier = (datetime: Date): number => {
  const season = getCurrentSeason(datetime);
  const seasonalMultipliers = {
    summer: 1.2,
    winter: 1.1,
    default: 1.0
  };
  return seasonalMultipliers[season];
};

const getSeasonDateRange = (season: string): { start: Date; end: Date } => {
  const year = new Date().getFullYear(); // Current year
  let start: Date, end: Date;

  switch (season.toLowerCase()) {
    case 'spring':
      start = startOfDay(new Date(year, 2, 1)); // March 1
      end = endOfDay(new Date(year, 4, 31)); // May 31
      break;

    case 'summer':
      start = startOfDay(new Date(year, 5, 1)); // June 1
      end = endOfDay(new Date(year, 7, 31)); // August 31
      break;

    case 'autumn':
    case 'fall': // Support both names
      start = startOfDay(new Date(year, 8, 1)); // September 1
      end = endOfDay(new Date(year, 10, 30)); // November 30
      break;

    case 'winter':
      start = startOfDay(new Date(year, 11, 1)); // December 1
      end = endOfDay(new Date(year + 1, 1, 28)); // February 28 (or 29 in leap year)
      // Check for leap year
      if ((year + 1) % 4 === 0 && ((year + 1) % 100 !== 0 || (year + 1) % 400 === 0)) {
        end = endOfDay(new Date(year + 1, 1, 29)); // February 29 for leap year
      }
      break;

    default:
      throw new Error(`Unknown season: ${season}`);
  }

  return { start, end };
};

const getBlockedDates = (
  holidays: Date[],
  bookings: Booking[],
  services: Service[],
  workingHours: WorkingHours
): Date[] => {
  const blockedDates = new Set<Date>();
  const today = new Date();
  
  // Add past dates
  for (let d = new Date(today.getFullYear() - 1, 0, 1); 
       d < today; 
       d.setDate(d.getDate() + 1)) {
    blockedDates.add(new Date(d));
  }

  // Add holidays
  holidays.forEach(holiday => {
    blockedDates.add(new Date(holiday));
  });

  // Add fully booked dates
  bookings.forEach(booking => {
    const bookingDate = new Date(booking.datetime);
    const dateStr = format(bookingDate, 'yyyy-MM-dd');
    
    // Check if date is fully booked for all services
    const dateBookings = bookings.filter(b => 
      format(new Date(b.datetime), 'yyyy-MM-dd') === dateStr
    );
    
    const availableServices = services.filter(service => {
      const serviceBookings = dateBookings.filter(b => 
        b.service.id === service.id && 
        b.status !== 'cancelled'
      );
      return serviceBookings.length < service.capacity;
    });

    if (availableServices.length === 0) {
      blockedDates.add(new Date(dateStr));
    }
  });

  // Add dates outside seasonal working hours
  const currentSeason = getCurrentSeason(today);
  const seasonRange = getSeasonDateRange(currentSeason);
  
  if (workingHours.seasonal[currentSeason]?.disabled) {
    eachDayOfInterval(seasonRange).forEach(date => {
      blockedDates.add(date);
    });
  }

  return Array.from(blockedDates);
};

//Payment functions
const processPayment = async (booking) => {
  console.log('Processing payment for:', booking);
  return Promise.resolve({ success: true });
};

const createGoogleCalendarEvent = async (booking) => {
  console.log('Creating Google Calendar event for:', booking);
  return Promise.resolve({ eventId: 'google-event-id' });
};

const sendNotifications = async (booking) => {
  console.log('Sending notifications for:', booking);
  return Promise.resolve();
};

const scheduleReminders = async (booking) => {
  console.log('Scheduling reminders for:', booking);
  return Promise.resolve();
};


// Service Components
const ServiceSelector: React.FC<{
  services: Service[];
  onServiceSelect: (service: Service) => void;
}> = ({ services, onServiceSelect }) => {
  return (
    <Card className="mb-3">
      <h3>Select Service</h3>
      <DataTable 
        value={services}
        selectionMode="single"
        onSelectionChange={(e) => onServiceSelect(e.value)}
        className="mb-3"
      >
        <Column field="name" header="Service" />
        <Column field="duration" header="Duration (min)" />
        <Column field="basePrice" header="Base Price" body={(rowData) => `$${rowData.basePrice}`} />
        <Column field="description" header="Description" />
      </DataTable>
    </Card>
  );
};

const AvailabilityTimeline: React.FC<{
  slots: any[];
  bookings: Booking[];
  onBookingRequest: (slot: any) => void;
}> = ({ slots, bookings, onBookingRequest }) => {
  const timelineEvents = useMemo(() => {
    return [...slots, ...bookings].sort((a, b) => 
      new Date(a.datetime).getTime() - new Date(b.datetime).getTime()
    );
  }, [slots, bookings]);

  const timelineTemplate = (event: any) => (
    <Card className="mb-3">
      <div className="flex justify-content-between align-items-center">
        <div>
          <span className="text-lg font-bold">
            {`${event.start} - ${event.end}`}
          </span>
          {event.price && (
            <div className="price-tag">
              ${event.price}
              {event.isRushHour && (
                <span className="rush-hour-badge ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Rush Hour
                </span>
              )}
              {event.isEmergencyWindow && (
                <span className="emergency-badge ml-2 px-2 py-1 bg-red-100 text-red-800 rounded">
                  Emergency
                </span>
              )}
            </div>
          )}
        </div>
        <Button 
          label={event.isBooked ? 'Booked' : 'Book Now'} 
          disabled={event.isBooked}
          onClick={() => onBookingRequest(event)}
          className={event.isBooked ? 'p-button-secondary' : 'p-button-primary'}
        />
      </div>
    </Card>
  );

  return (
    <Timeline 
      value={timelineEvents} 
      content={timelineTemplate}
      className="customized-timeline"
    />
  );
};

// Main Component
const ServiceProviderAvailability: React.FC = () => {
  // State Management
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [services, setServices] = useState<Service[]>(INITIAL_SERVICES);
  const [workingHours, setWorkingHours] = useState<WorkingHours>(INITIAL_WORKING_HOURS);
  const [holidays, setHolidays] = useState<Date[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>(INITIAL_NOTIFICATION_SETTINGS);
  const [googleCalendarSync, setGoogleCalendarSync] = useState<GoogleCalendarSettings>({
    enabled: false,
    lastSync: null,
    calendarId: null
  });

  const toast = useRef<any>(null);

  // Slot Calculation Logic
  const calculateAvailableSlots = useCallback((date: Date, service: Service) => {
    const slots: Slot[] = [];
    const currentSeason = getCurrentSeason(date);
    const workingTime = workingHours.seasonal[currentSeason] || workingHours.default;
    
    const startTime = setMinutes(
      setHours(date, parseInt(workingTime.start.split(':')[0])),
      parseInt(workingTime.start.split(':')[1])
    );
    
    const endTime = setMinutes(
      setHours(date, parseInt(workingTime.end.split(':')[0])),
      parseInt(workingTime.end.split(':')[1])
    );

    let currentSlot = startTime;
    
    while (isBefore(currentSlot, endTime)) {
      const slotEnd = addHours(currentSlot, service.duration / 60);
      
      if (isSlotAvailable(currentSlot, slotEnd, service)) {
        slots.push({
          start: format(currentSlot, 'HH:mm'),
          end: format(slotEnd, 'HH:mm'),
          datetime: currentSlot,
          price: calculatePrice(currentSlot, service),
          isRushHour: isInRushHour(currentSlot),
          isEmergencyWindow: isInEmergencyWindow(currentSlot)
        });
      }
      
      currentSlot = addHours(currentSlot, 0.5); // 30-minute intervals
    }

    return slots;
  }, [workingHours]);

  // Price Calculation
  const calculatePrice = useCallback((datetime: Date, service: Service): number => {
    let price = service.basePrice;
    
    if (isInRushHour(datetime)) {
      price *= service.rushHourMultiplier;
    }
    
    if (isInEmergencyWindow(datetime)) {
      price *= service.emergencyMultiplier;
    }
    
    const seasonalMultiplier = getSeasonalPriceMultiplier(datetime);
    price *= seasonalMultiplier;
    
    return Math.round(price * 100) / 100; // Round to 2 decimal places
  }, []);

  // Availability Check
  const isSlotAvailable = useCallback((start: Date, end: Date, service: Service): boolean => {
    const existingBookings = bookings.filter(booking => 
      isWithinInterval(parseISO(booking.startTime), { start, end }) ||
      isWithinInterval(parseISO(booking.endTime), { start, end })
    );

    const currentCapacity = existingBookings.reduce((total, booking) => 
      total + (booking.service.id === service.id ? 1 : 0), 0
    );

    return currentCapacity < service.capacity;
  }, [bookings]);

  // Booking Handlers
  const handleBookingConfirmation = async (booking: any) => {
    try {
      const paymentResult = await processPayment(booking);
      
      if (googleCalendarSync.enabled) {
        await createGoogleCalendarEvent(booking);
      }
      
      await sendNotifications(booking);
      await scheduleReminders(booking);
      
      setBookings(prev => [...prev, {
        ...booking,
        id: Date.now().toString(),
        status: 'confirmed'
      }]);
      
      toast.current.show({
        severity: 'success',
        summary: 'Booking Confirmed',
        detail: 'Your appointment has been scheduled successfully'
      });
    } catch (error) {
      toast.current.show({
        severity: 'error',
        summary: 'Booking Failed',
        detail: error.message
      });
    }
  };

  // Settings Handler
  const handleSettingsSave = async (newSettings: any) => {
    try {
      if (new Date(`2000-01-01T${newSettings.workingHours.default.start}`) >= 
          new Date(`2000-01-01T${newSettings.workingHours.default.end}`)) {
        throw new Error('Invalid working hours range');
      }

      setWorkingHours(newSettings.workingHours);
      setServices(newSettings.services);
      setNotifications(newSettings.notifications);
      
      if (selectedService) {
        const slots = calculateAvailableSlots(selectedDate ? selectedDate : new Date(), selectedService);
        // Update slots if needed
      }
      
      setShowSettings(false);
      
      toast.current.show({
        severity: 'success',
        summary: 'Settings Updated',
        detail: 'Your availability settings have been updated successfully'
      });
    } catch (error: any) {
      toast.current.show({
        severity: 'error',
        summary: 'Settings Update Failed',
        detail: error.message
      });
    }
  };

  // Memoized Values
  const availableSlots = useMemo(() => {
    if (!selectedService || !selectedDate) return [];
    return calculateAvailableSlots(selectedDate, selectedService);
  }, [selectedDate, selectedService, calculateAvailableSlots]);

  const blockedDates = useMemo(() => getBlockedDates(holidays, bookings, services, workingHours), [holidays, bookings, services, workingHours]);

  // Render
  return (
    <motion.div
      className="service-availability-container p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Toast ref={toast} />
      
      <div className="grid">
        <div className="col-12 md:col-4">
          <ServiceSelector 
            services={services}
            onServiceSelect={setSelectedService}
          />
          
          <Calendar 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.value || null)}
            inline
            showWeek
            disabledDates={blockedDates}
            className="w-full"
          />
        </div>
        
        <div className="col-12 md:col-8">
          <AvailabilityTimeline 
            slots={availableSlots}
            bookings={bookings}
            onBookingRequest={handleBookingConfirmation}
          />
        </div>
      </div>

      {/* <SettingsDialog
        visible={showSettings}
        onHide={() => setShowSettings(false)}
        workingHours={workingHours}
        services={services}
        notifications={notifications}
        onSave={handleSettingsSave}
      /> */}
    </motion.div>
  );
};

export default ServiceProviderAvailability;
