import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { ProgressSpinner } from "primereact/progressspinner";
import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { motion } from "framer-motion";

import Header from "../Header/Header";
import { useUser } from '../../contexts/UserContext';
import "./ServiceProviderDashboard.css";

ChartJS.register(ArcElement, Tooltip, Legend);

const ServiceProviderDashboard = () => {
  const navigate = useNavigate();
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { user, isLoading } = useUser();

  if(!user)
    return (
      <div className="card">
        <ProgressSpinner style={{width: '50px', height: '50px'}} strokeWidth="8" fill="var(--surface-ground)" animationDuration=".5s" />
      </div>
    )

  const bookings = [
    {
      date: "2024-08-20",
      time: "10:00 AM",
      service: "Plumbing",
      customer: "John Doe",
      icon: "pi pi-circle",
      color: "#9C27B0",
    },
    {
      date: "2024-08-21",
      time: "1:00 PM",
      service: "Electrical",
      customer: "Jane Smith",
      icon: "pi pi-circle",
      color: "#9C27B0",
    },
  ];

  const totalServices = 15;
  const completed = 10;
  const pending = 5;

  const data = {
    labels: ["Completed", "Pending"],
    datasets: [
      {
        data: [completed, pending],
        backgroundColor: ["#1e90ff", "#ff4500"],
        hoverBackgroundColor: ["#00bfff", "#ff6347"],
        borderColor: "rgba(255, 255, 255, 0.2)",
        borderWidth: 5,
      },
    ],
  };

  const options = {
    cutout: "70%",
    plugins: {
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            const label = tooltipItem.label;
            const value = tooltipItem.raw;
            if (label === "Completed") {
              return `${value} Completed`;
            } else if (label === "Pending") {
              return `${value} Pending`;
            }
          },
        },
        backgroundColor: function (tooltipItem) {
          return tooltipItem.tooltip.dataPoints[0].label === "Completed"
            ? "#00bfff"
            : "#ff4500";
        },
        titleColor: "#fff",
        bodyColor: "#fff",
        displayColors: false,
      },
      legend: {
        labels: {
          color: "#fff",
        },
      },
    },
    responsive: true,
    maintainAspectRatio: false,
  };

  const satisfactionData = {
    labels: ["Satisfied", "Neutral", "Unsatisfied"],
    datasets: [
      {
        data: [80, 15, 5],
        backgroundColor: ["#4CAF50", "#FFC107", "#F44336"],
      },
    ],
  };

  const satisfactionOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "#fff",
        },
      },
      tooltip: {
        callbacks: {
          label: function (tooltipItem) {
            return `Satisfaction: ${tooltipItem.raw}%`;
          },
        },
      },
    },
  };

  const MotionCard = motion(Card);

  return (
    <div className="sp-dashboard">
      <Header />
      <div className="content">
        <motion.h1 
          className="sp-home-title"
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          Welcome, {user.name}
        </motion.h1>
        
        <div className="dashboard-grid">
          <MotionCard
            title="Service Overview"
            className="chart-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="chart-container">
              <Doughnut data={data} options={options} />
            </div>
            <div className="overview-details">
              <h3>Total Services</h3>
              <p>{totalServices} Services Offered</p>
            </div>
          </MotionCard>

          <MotionCard
            title="Customer Satisfaction"
            className="chart-card flex justify-center"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="chart-container">
              <Doughnut data={satisfactionData} options={satisfactionOptions} />
            </div>
            <div className="satisfaction-details">
              <h3>Satisfaction Rate</h3>
              <p>{satisfactionData.datasets[0].data[0]}%</p>
            </div>
          </MotionCard>

          <MotionCard
            title="Upcoming Bookings"
            className="bookings-card"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="bookings-list">
              {bookings.map((booking, index) => (
                <motion.div 
                  key={index} 
                  className="booking-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="booking-icon" style={{ backgroundColor: booking.color }}>
                    <i className={booking.icon}></i>
                  </div>
                  <div className="booking-details">
                    <h4>{booking.service}</h4>
                    <p>{booking.date} - {booking.time}</p>
                    <p>{booking.customer}</p>
                  </div>
                </motion.div>
              ))}
            </div>
            <Button label="View All Bookings" className="view-all-btn" onClick={() => navigate('/dashboard/serviceprovider/bookings')} />
          </MotionCard>
        </div>

        <motion.div 
          className="quick-actions"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6 }}
        >
          <Button 
            icon="pi pi-plus" 
            className="p-button-rounded p-button-lg fab"
            onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)} 
          />
          {isQuickActionsOpen && (
            <motion.div 
              className="quick-actions-menu"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Button icon="pi pi-briefcase" label="Manage Services" onClick={() => navigate('/dashboard/serviceprovider/services')} />
              <Button icon="pi pi-calendar" label="View Calendar" onClick={() => navigate('/calendar')} />
              <Button icon="pi pi-comments" label="Check Reviews" onClick={() => navigate('/reviews')} />
              <Button icon="pi pi-user-edit" label="Profile Settings" onClick={() => navigate('/dashboard/serviceprovider/profile')} />
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ServiceProviderDashboard;
