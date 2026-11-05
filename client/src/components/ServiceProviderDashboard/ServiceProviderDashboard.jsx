import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useQuery } from "@tanstack/react-query";

import Header from "../Header/Header";
import axiosInstance from "../../api/axios-client";
import { useUser } from "../../contexts/UserContext";
import { formatBookingDate } from "../../utils/date";
import "./ServiceProviderDashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const fetchProfile = async () => {
  const { data } = await axiosInstance.get("/serviceprovider/profile");
  return data;
};

const fetchBookings = async () => {
  const { data } = await axiosInstance.get("/serviceprovider/bookings");
  return data;
};

const ServiceProviderDashboard = () => {
  const navigate = useNavigate();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const { user, isLoading } = useUser();

  const { data: profile } = useQuery({
    queryKey: ["providerProfile"],
    queryFn: fetchProfile,
    enabled: Boolean(user),
  });

  const { data: bookings = [], isPending: bookingsPending } = useQuery({
    queryKey: ["providerBookings"],
    queryFn: fetchBookings,
    enabled: Boolean(user),
  });

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen w-screen">
        <ProgressSpinner
          style={{ width: "50px", height: "50px" }}
          strokeWidth="8"
          fill="var(--surface-ground)"
          animationDuration=".5s"
        />
      </div>
    );
  }

  const countBy = (status) =>
    bookings.filter((b) => b.status === status).length;

  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date) ||
        a.startTime.localeCompare(b.startTime)
    );

  const statusData = {
    labels: ["Upcoming", "Completed", "Canceled"],
    datasets: [
      {
        data: [countBy("upcoming"), countBy("completed"), countBy("canceled")],
        backgroundColor: ["#1e90ff", "#419D78", "#f08a7c"],
        hoverBackgroundColor: ["#00bfff", "#7fd1ae", "#ff6347"],
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 5,
      },
    ],
  };

  const statusOptions = {
    cutout: "70%",
    plugins: {
      legend: { labels: { color: "#fff" } },
      tooltip: {
        backgroundColor: "#2d3047",
        titleColor: "#fff",
        bodyColor: "#fff",
        displayColors: false,
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const rating = Number(profile?.rating || 0);
  const reviewCount = profile?.reviews?.length ?? 0;

  return (
    <div className="sp-dashboard">
      <Header />
      <div className="sp-content">
        <h1
          className="sp-home-title"
        >
          Welcome, {profile?.name || user.name}
        </h1>

        <div className="dashboard-grid">
          <div
          >
            <Card title="Booking Overview" className="chart-card">
            <div className="chart-container">
              <Doughnut data={statusData} options={statusOptions} />
            </div>
            <div className="overview-details">
              <h3>Total Services</h3>
              <p>
                {profile?.services?.length ?? 0} Services Offered ·{" "}
                {bookings.length} bookings
              </p>
            </div>
            </Card>
          </div>

          <div
          >
            <Card title="Customer Satisfaction" className="chart-card">
            <div style={{ textAlign: "center", padding: "1rem 0" }}>
              <div
                style={{
                  fontSize: "3rem",
                  fontWeight: 700,
                  color: "#f5c451",
                  lineHeight: 1,
                }}
              >
                {rating ? rating.toFixed(1) : "—"}
              </div>
              <div style={{ fontSize: "1.4rem", color: "#f5c451" }}>
                {"★".repeat(Math.round(rating)).padEnd(5, "☆")}
              </div>
              <div className="satisfaction-details">
                <h3>Satisfaction Rate</h3>
                <p>
                  {reviewCount
                    ? `${Math.round((rating / 5) * 100)}% · ${reviewCount} review${
                        reviewCount === 1 ? "" : "s"
                      }`
                    : "No reviews yet"}
                </p>
              </div>
            </div>
            </Card>
          </div>

          <div
            className="bookings-card"
          >
            <Card title="Upcoming Bookings" className="chart-card">
            <div className="bookings-list">
              {bookingsPending && <p>Loading bookings…</p>}

              {!bookingsPending && upcoming.length === 0 && (
                <p>No upcoming bookings yet.</p>
              )}

              {upcoming.slice(0, 3).map((booking, index) => (
                <div
                  key={booking._id}
                  className="booking-item"
                >
                  <div
                    className="booking-icon"
                    style={{ backgroundColor: "#9C27B0" }}
                  >
                    <i className="pi pi-circle"></i>
                  </div>
                  <div className="booking-details">
                    <h4>{booking.serviceName || "Service"}</h4>
                    <p>
                      {formatBookingDate(booking.date)} · {booking.startTime}–
                      {booking.endTime}
                    </p>
                    <p>{booking.user?.name || "Member"}</p>
                  </div>
                </div>
              ))}
            </div>
            <Button
              label="View All Bookings"
              className="view-all-btn"
              onClick={() => navigate("/dashboard/serviceprovider/bookings")}
            />
            </Card>
          </div>
        </div>

        <div
          className="quick-actions"
        >
          <Button
            icon="pi pi-plus"
            className="p-button-rounded p-button-lg fab"
            aria-label="Quick actions"
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
          />
          {isQuickActionsOpen && (
            <div
              className="quick-actions-menu"
            >
              <Button
                icon="pi pi-briefcase"
                label="Manage Services"
                onClick={() => navigate("/dashboard/serviceprovider/services")}
              />
              <Button
                icon="pi pi-calendar"
                label="Availability"
                onClick={() =>
                  navigate("/dashboard/serviceprovider/availability")
                }
              />
              <Button
                icon="pi pi-list"
                label="Bookings"
                onClick={() =>
                  navigate("/dashboard/serviceprovider/bookings")
                }
              />
              <Button
                icon="pi pi-user-edit"
                label="Profile Settings"
                onClick={() => navigate("/dashboard/serviceprovider/profile")}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard;
