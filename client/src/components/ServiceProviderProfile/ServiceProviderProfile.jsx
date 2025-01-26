import React, { useState } from 'react';
import { Camera, X, MapPin, Mail, Phone, Star, Clock, Award, MessageCircle } from 'lucide-react';
import Header from '../Header/Header';

const ProfileCard = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const ServiceCard = ({ service }) => (
  <div className="p-4 border rounded-lg">
    <h3 className="font-semibold text-gray-900">{service.name}</h3>
    <p className="text-gray-600 mt-1 text-sm">{service.description}</p>
    <div className="mt-2 flex items-center justify-between">
      <span className="text-blue-600 font-medium">{service.price}</span>
      <span className="text-gray-500 text-sm">{service.duration}</span>
    </div>
  </div>
);

const ReviewCard = ({ review }) => (
  <div className="p-4 border rounded-lg">
    <div className="flex items-center gap-2 mb-2">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
          />
        ))}
      </div>
      <span className="text-gray-600 text-sm">{review.date}</span>
    </div>
    <p className="text-gray-600 text-sm">{review.comment}</p>
    <p className="text-gray-500 text-sm mt-2">- {review.author}</p>
  </div>
);

const ProfilePage = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: 'Mike Anderson',
    role: 'Professional Electrician',
    yearsExperience: '15',
    bio: 'Licensed master electrician with 15+ years of experience in residential and commercial electrical services. Specialized in electrical installations, repairs, and maintenance. Committed to safety standards and customer satisfaction.',
    location: 'San Francisco Bay Area',
    email: 'mike.anderson@example.com',
    phone: '(555) 123-4567',
    availability: 'Mon-Sat, 8:00 AM - 6:00 PM',
    certifications: ['Licensed Master Electrician', 'Electrical Safety Certification', 'Smart Home Installation Certified'],
    services: [
      {
        name: 'Electrical Installation',
        description: 'Complete electrical system installation for new constructions or renovations',
        price: 'From $150/hour',
        duration: '2-8 hours typical'
      },
      {
        name: 'Emergency Repairs',
        description: 'Quick response electrical repair service for urgent issues',
        price: 'From $200/hour',
        duration: '1-4 hours typical'
      },
      {
        name: 'Safety Inspections',
        description: 'Comprehensive electrical safety inspection and report',
        price: '$120 flat rate',
        duration: '1-2 hours'
      }
    ],
    reviews: [
      {
        author: 'John Smith',
        rating: 5,
        date: 'March 2024',
        comment: 'Mike was fantastic! Fixed our electrical issues quickly and professionally. Highly recommend!'
      },
      {
        author: 'Sarah Johnson',
        rating: 5,
        date: 'February 2024',
        comment: 'Very knowledgeable and efficient. Fair pricing and great communication throughout.'
      }
    ]
  });

  return (
    <div>
      <Header />
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <ProfileCard>
          <div className="h-48 bg-gradient-to-r from-blue-900 to-blue-800 relative">
            <div className="absolute inset-0 opacity-10" />
          </div>
          
          <div className="px-8 pb-8 relative">
            <div className="flex flex-col md:flex-row md:items-end -mt-16 mb-6 gap-4">
              <div className="relative group">
                <div className="w-32 h-32 rounded-xl overflow-hidden border-4 border-white bg-gray-100 shadow-lg">
                  <img
                    src="/api/placeholder/128/128"
                    alt={profile.fullName}
                    className="w-full h-full object-cover"
                  />
                </div>
                {!isEditing && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-xl cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold text-gray-900">{profile.fullName}</h1>
                  <Award className="w-6 h-6 text-blue-600" title="Verified Provider" />
                </div>
                <p className="text-gray-600 mt-1">{profile.role} • {profile.yearsExperience} Years Experience</p>
              </div>
              
              <div className="flex gap-2">
                <button
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-200"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact Now
                </button>
                {isEditing ? (
                  <button
                    onClick={() => setIsEditing(false)}
                    className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-md hover:bg-red-100 transition-colors duration-200"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </button>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="inline-flex items-center px-4 py-2 bg-gray-50 text-gray-600 rounded-md hover:bg-gray-100 transition-colors duration-200"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Edit
                  </button>
                )}
              </div>
            </div>

            {/* Editing Form - Similar to original, omitted for brevity */}
          </div>
        </ProfileCard>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ProfileCard className="md:col-span-1">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact & Availability</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{profile.location}</span>
                </div>
                <div className="flex items-center gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mail" color="black"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                  <Mail className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{profile.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{profile.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="text-gray-600">{profile.availability}</span>
                </div>
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mt-6 mb-4">Certifications</h2>
              <div className="space-y-2">
                {profile.certifications.map((cert, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Award className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600 text-sm">{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          </ProfileCard>

          <ProfileCard className="md:col-span-2">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">About Me</h2>
              <p className="text-gray-600 leading-relaxed">{profile.bio}</p>

              <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Services Offered</h2>
              <div className="grid grid-cols-1 gap-4">
                {profile.services.map((service, index) => (
                  <ServiceCard key={index} service={service} />
                ))}
              </div>

              <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">Customer Reviews</h2>
              <div className="space-y-4">
                {profile.reviews.map((review, index) => (
                  <ReviewCard key={index} review={review} />
                ))}
              </div>
            </div>
          </ProfileCard>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;