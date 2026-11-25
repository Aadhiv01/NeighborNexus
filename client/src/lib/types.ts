export type UserType = "Community Member" | "Service Provider";

export interface User {
  id: string;
  name: string;
  email: string;
  type: UserType;
}

export interface Service {
  _id: string;
  name: string;
  category: string;
  description?: string;
  price: number;
  durationMinutes?: number;
}

export interface Slot {
  start: string;
  end: string;
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface DayAvailability {
  day: Weekday;
  slots: Slot[];
}

export interface Review {
  _id: string;
  customer?: { name?: string };
  comment: string;
  rating: number;
  createdAt: string;
}

export interface Provider {
  _id: string;
  userId: string;
  name: string;
  profilePicture?: string;
  bio?: string;
  experience?: number;
  services: Service[];
  availability?: DayAvailability[];
  rating?: number;
  reviews?: Review[];
  contactInfo?: { phone?: string; email?: string };
  location?: string;
  availableForEmergency?: boolean;
  /** GeoJSON point as [longitude, latitude], rounded to about 1 km. */
  geo?: { type: "Point"; coordinates: [number, number] };
  /** Only present on discovery results. */
  nextAvailable?: NextAvailable | null;
  distanceMeters?: number;
}

export interface NextAvailable {
  date: string; // YYYY-MM-DD
  start: string;
  end: string;
}

export type BookingStatus = "upcoming" | "completed" | "canceled";

/** Populated references arrive as small objects, unpopulated ones as an id string. */
export interface Person {
  _id?: string;
  name?: string;
  email?: string;
  location?: string;
}

export interface Booking {
  _id: string;
  user?: Person | string;
  serviceProviderId?: Person | string;
  serviceId: string;
  serviceName?: string;
  price?: number;
  date: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  /** Earlier times for this booking, oldest first. */
  reschedules?: { date: string; startTime: string; endTime: string; at: string }[];
  /** Members only: after this moment rescheduling is closed (cancelling is not). */
  rescheduleDeadline?: string;
  canceledBy?: "member" | "provider";
  canceledHoursBefore?: number;
}

export interface SlotsResponse {
  date: string;
  service: Service;
  slots: Slot[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ProfileUpdate {
  name?: string;
  bio?: string;
  location?: string;
  experience?: number;
  availableForEmergency?: boolean;
  contactInfo?: { phone?: string; email?: string };
  /** null removes the saved location. */
  geo?: { lat: number; lng: number } | null;
}

export interface ServiceInput {
  name: string;
  category: string;
  description: string;
  price: number;
  durationMinutes: number;
}

export type NotificationType =
  | "booking_created"
  | "booking_canceled"
  | "booking_rescheduled"
  | "booking_completed"
  | "reminder";

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  readAt?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  items: AppNotification[];
  unread: number;
}
