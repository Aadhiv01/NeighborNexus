import axios, { isAxiosError } from "axios";
import type {
  AuthResponse,
  NotificationsResponse,
  Booking,
  BookingStatus,
  DayAvailability,
  Provider,
  ProfileUpdate,
  Service,
  ServiceInput,
  Slot,
  SlotsResponse,
  User,
  Weekday,
} from "./types";

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
});

http.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** The server answers errors as { msg }. Prefer that over axios's generic text. */
export function errorMessage(err: unknown, fallback = "Something went wrong. Please try again.") {
  if (isAxiosError(err)) {
    const msg = (err.response?.data as { msg?: string } | undefined)?.msg;
    if (msg) return msg;
    if (!err.response) return "Can't reach the server. Is the API running?";
  }
  return fallback;
}

/** Query keys in one place so invalidation can't drift from the queries. */
export const qk = {
  user: ["user"] as const,
  providers: ["providers"] as const,
  providerList: (params: ProviderSearch) => ["providers", params] as const,
  provider: (userId: string) => ["provider", userId] as const,
  slots: (providerId?: string, serviceId?: string | null, date?: string, excludeBookingId?: string) =>
    ["slots", providerId, serviceId, date, excludeBookingId] as const,
  slotsAll: ["slots"] as const,
  bookings: ["bookings"] as const,
  providerBookings: ["providerBookings"] as const,
  providerProfile: ["providerProfile"] as const,
  services: ["services"] as const,
  availability: ["availability"] as const,
  notifications: ["notifications"] as const,
};

const get = async <T>(url: string, params?: Record<string, unknown>) =>
  (await http.get<T>(url, { params })).data;

export interface ProviderSearch {
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const api = {
  // auth
  login: async (body: { email: string; password: string }) =>
    (await http.post<AuthResponse>("/auth", body)).data,
  signup: async (body: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    type: string;
  }) => (await http.post<AuthResponse>("/auth/signup", body)).data,
  verifyToken: () => get<{ user: User }>("/auth/verify-token"),

  // discovery and provider detail (public)
  providers: (params: ProviderSearch = {}) => get<Provider[]>("/serviceprovider", { ...params }),
  publicProfile: (userId: string) => get<Provider>(`/serviceprovider/profile/${userId}`),
  slots: (serviceProviderId: string, serviceId: string, date: string, excludeBookingId?: string) =>
    get<SlotsResponse>("/bookings/slots", { serviceProviderId, serviceId, date, excludeBookingId }),

  // member bookings
  createBooking: async (body: {
    serviceProviderId: string;
    serviceId: string;
    date: string;
    startTime: string;
    endTime: string;
  }) => (await http.post<Booking>("/bookings", body)).data,
  myBookings: () => get<Booking[]>("/bookings"),
  cancelBooking: async (id: string) => (await http.delete(`/bookings/${id}`)).data,
  rescheduleBooking: async (id: string, body: { date: string; startTime: string; endTime: string }) =>
    (await http.post<Booking>(`/bookings/${id}/reschedule`, body)).data,

  // notifications
  notifications: () => get<NotificationsResponse>("/notifications"),
  markRead: async (id: string) => (await http.put(`/notifications/${id}/read`)).data,
  markAllRead: async () => (await http.put("/notifications/read-all")).data,

  // provider side
  myProfile: () => get<Provider>("/serviceprovider/profile"),
  updateProfile: async (userId: string, body: ProfileUpdate) =>
    (await http.put<Provider>(`/serviceprovider/profile/${userId}`, body)).data,
  providerBookings: () => get<Booking[]>("/serviceprovider/bookings"),
  setBookingStatus: async (id: string, status: BookingStatus) =>
    (await http.put<Booking>(`/serviceprovider/bookings/${id}`, { status })).data,

  services: () => get<Service[]>("/serviceprovider/services"),
  addService: async (body: ServiceInput) =>
    (await http.post<Service>("/serviceprovider/services", body)).data,
  editService: async (id: string, body: ServiceInput) =>
    (await http.put<Service>(`/serviceprovider/services/${id}`, body)).data,
  deleteService: async (id: string) => (await http.delete(`/serviceprovider/services/${id}`)).data,

  availability: () => get<DayAvailability[]>("/serviceprovider/availability"),
  saveDay: async (day: Weekday, slots: Slot[]) =>
    (await http.post<DayAvailability[]>("/serviceprovider/availability", { day, slots })).data,
};
