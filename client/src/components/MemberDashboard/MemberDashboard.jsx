import React, { useContext } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Avatar } from 'primereact/avatar';
import { Carousel } from 'primereact/carousel';
import { useQuery } from 'react-query';
import { FaStar, FaCalendarAlt } from 'react-icons/fa';
import axios from "axios";

import { ThemeContext } from '../../contexts/ThemeContext';
import Header from '../Header/Header';

const DashboardContainer = styled.div`
  padding: 2rem;
  background: ${({ theme }) => theme.bgDark} url('/path/to/background.jpg') no-repeat center/cover;
  color: ${({ theme }) => theme.textLight};
  min-height: 100vh;
  backdrop-filter: blur(10px);
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

const GreetingSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  margin-top: 5vh;
`;

const IconButton = styled(Button)`
  background: linear-gradient(145deg, ${({ theme }) => theme.primary}, ${({ theme }) => theme.secondary});
  box-shadow: 0px 4px 15px ${({ theme }) => theme.shadowDark};
  border-radius: 50%;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${({ theme }) => theme.textLight};
`;

const fetchServices = async () => {
  const { data } = await axios.get('/api/services/recommended');
  return data;
};

const fetchBookings = async () => {
  const { data } = await axios.get('/api/bookings/upcoming');
  return data;
};

const MemberDashboard = () => {
  const { theme } = useContext(ThemeContext);
  const { data: services } = useQuery('services', fetchServices);
  const { data: bookings } = useQuery('bookings', fetchBookings);

  const serviceTemplate = (service) => (
    <Card title={service.name} subTitle={service.category} className="p-card">
      <p>{service.description}</p>
      <IconButton icon={<FaStar />} />
    </Card>
  );

  return (
    <div className='parent'>
      <Header />
      <GreetingSection>
        <div>
          <h1>Good Evening, John!</h1>
          <p>Here’s what’s happening today.</p>
        </div>
      </GreetingSection>

      <GlassTile whileHover={{ scale: 1.05 }}>
        <h2>Next Appointment</h2>
        {bookings && bookings.length ? (
          <div>
            <p>Service: {bookings[0].service}</p>
            <p>Date: {bookings[0].date}</p>
            <Button label="View All" className="p-button-secondary" />
          </div>
        ) : (
          <p>No upcoming appointments.</p>
        )}
      </GlassTile>

      <GlassTile whileHover={{ scale: 1.05 }}>
        <h2>Popular Services</h2>
        <ServiceCarousel value={services} itemTemplate={serviceTemplate} numVisible={3} />
      </GlassTile>

      <GlassTile whileHover={{ scale: 1.05 }}>
        <h2>Community News</h2>
        <p>No new announcements.</p>
      </GlassTile>

      <IconButton
        icon={<FaCalendarAlt />}
        onClick={() => console.log('Redirect to Booking Page')}
        style={{ position: 'fixed', bottom: '2rem', right: '2rem' }}
      />
    </div>
  );
};

export default MemberDashboard;