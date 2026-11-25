import React from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { motion } from "motion/react";
import { Card } from "primereact/card";
import { Button } from "primereact/button";
import { Carousel } from "primereact/carousel";
import { useQuery } from "@tanstack/react-query";
import { FaStar, FaCalendarAlt } from "react-icons/fa";

import axiosInstance from "../../api/axios-client";
import { useUser } from "../../contexts/UserContext";
import { formatBookingDate } from "../../utils/date";
import Header from "../Header/Header";
import { page } from "../../styles/ui";

const GreetingSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
`;

const GlassTile = styled(motion.div)`
  background: ${({ theme }) => theme.glassBg};
  box-shadow: 0 8px 32px 0 ${({ theme }) => theme.shadowDark};
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 10px;
  border: 1px solid ${({ theme }) => theme.shadowLight};
  padding: 2rem;
  margin-bottom: 1.5rem;
  color: ${({ theme }) => theme.textLight};
`;

const ServiceCarousel = styled(Carousel)`
  .p-carousel-item {
    margin-right: 1rem;
  }

  .p-card {
    background: ${({ theme }) => theme.glassBg};
    color: ${({ theme }) => theme.textLight};
    border-radius: 15px;
    box-shadow: 0 4px 20px ${({ theme }) => theme.shadowDark};
  }
`;

const IconButton = styled(Button)`
  background: linear-gradient(
    145deg,
    ${({ theme }) => theme.primary},
    ${({ theme }) => theme.secondary}
  );
  box-shadow: 0px 4px 15px ${({ theme }) => theme.shadowDark};
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.textLight};
`;

const fetchProviders = async () => {
  const { data } = await axiosInstance.get("/serviceprovider");
  return data;
};

const fetchBookings = async () => {
  const { data } = await axiosInstance.get("/bookings");
  return data;
};

const priceFrom = (provider) => {
  const prices = (provider.services || []).map((s) => s.price);
  return prices.length ? Math.min(...prices) : null;
};

const MemberDashboard = () => {
  const { user } = useUser();
  const navigate = useNavigate();
  const { data: providers = [] } = useQuery({
    queryKey: ["providers"],
    queryFn: fetchProviders,
  });
  const { data: bookings = [] } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  const upcoming = bookings
    .filter((b) => b.status === "upcoming")
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const firstName = user?.name?.split(" ")[0] || "there";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const providerTemplate = (provider) => {
    const from = priceFrom(provider);
    return (
      <Card
        title={provider.name}
        subTitle={provider.services?.[0]?.category || "Service"}
        className="p-card"
        onClick={() => navigate(`/services/${provider.userId}`)}
        style={{ cursor: "pointer" }}
      >
        <p>{provider.bio || "No description yet."}</p>
        <p style={{ fontWeight: 600 }}>
          {from != null ? `From $${from}` : "Price on request"}
        </p>
        <IconButton icon={<FaStar />} aria-label="Save provider" />
      </Card>
    );
  };

  return (
    <div>
      <Header />
      <div style={page}>
      <GreetingSection>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.7rem" }}>
            {greeting}, {firstName}!
          </h1>
          <p style={{ margin: 0, color: "#aeb4c8" }}>
            Here’s what’s happening today.
          </p>
        </div>
      </GreetingSection>

      <GlassTile whileHover={{ scale: 1.02 }}>
        <h2>Next Appointment</h2>
        {upcoming.length ? (
          <div>
            <p>
              Provider: {upcoming[0].serviceProviderId?.name || "—"}
            </p>
            <p>
              Date: {formatBookingDate(upcoming[0].date)} at{" "}
              {upcoming[0].startTime}
            </p>
            <Button
              label="View All"
              className="p-button-secondary"
              onClick={() => navigate("/bookings")}
            />
          </div>
        ) : (
          <div>
            <p>No upcoming appointments.</p>
            <Button
              label="Find a provider"
              className="p-button-secondary"
              onClick={() => navigate("/services")}
            />
          </div>
        )}
      </GlassTile>

      <GlassTile whileHover={{ scale: 1.02 }}>
        <h2>Popular Services</h2>
        {providers.length ? (
          <ServiceCarousel
            value={providers}
            itemTemplate={providerTemplate}
            numVisible={3}
            numScroll={1}
          />
        ) : (
          <p>No providers yet. Run `npm run seed` in the repo root.</p>
        )}
      </GlassTile>

      <GlassTile whileHover={{ scale: 1.02 }}>
        <h2>Community News</h2>
        <p>No new announcements.</p>
      </GlassTile>

      <IconButton
        icon={<FaCalendarAlt />}
        aria-label="Book a service"
        onClick={() => navigate("/services")}
        style={{ position: "fixed", bottom: "2rem", right: "2rem" }}
      />
      </div>
    </div>
  );
};

export default MemberDashboard;
