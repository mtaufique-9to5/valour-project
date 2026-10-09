"use client"
import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, MapPin, Mail, Phone, MessageSquare, ChevronDown } from 'lucide-react';
import "../app/globals.css"
import { createPortal } from 'react-dom';

const AppointmentModal = ({ isModalOpen, onClose }) => {
    const [mounted, setMounted] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        date: '',
        time: '',
        location: '',
        service: '',
        message: ''
    });

    useEffect(() => {
    setMounted(true);
}, []);

    const [openDropdown, setOpenDropdown] = useState(null);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelect = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        setOpenDropdown(null);
    };

    const times = ['10:00 AM', '11:00 AM', '12:00 PM', '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM'];
    const locations = ['Geneva Flagship', 'Dubai Boutique', 'New York Atelier', 'Virtual Consultation'];
    const services = ['Private Viewing', 'Servicing Consultation', 'Trade Appraisal', 'Bespoke Engraving', 'Collection Guidance'];

if (!mounted) return null;
    return createPortal(
        <>
            <div className={`modal-overlay ${isModalOpen && "active"}`} onClick={onClose}>
                <div className="modal-container" onClick={e => e.stopPropagation()}
                    data-aos="fade-up"
                >
                    {/* Header */}
                    <div className="modal-header row">
                        <button className="modal-close" onClick={onClose}>
                            <X size={18} />
                        </button>
                        <div className='col-md-6'>
                            <h2 className="modal-title">Book an Appointment</h2>
                        </div>
                        <div className='col-md-6'>
                            <p className="modal-subtitle">
                                Schedule a private consultation with our specialists at your preferred location.
                            </p>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="modal-body">
                        <form onSubmit={e => e.preventDefault()}>
                            {/* Name Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">First Name</label>
                                    <input
                                        type="text"
                                        name="firstName"
                                        className="form-input"
                                        placeholder="Enter first name"
                                        value={formData.firstName}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Last Name</label>
                                    <input
                                        type="text"
                                        name="lastName"
                                        className="form-input"
                                        placeholder="Enter last name"
                                        value={formData.lastName}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Contact Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <div style={{ position: 'relative' }}>
                                        <Mail size={16} className="input-icon" />
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-input with-icon"
                                            placeholder="your@email.com"
                                            value={formData.email}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Phone</label>
                                    <div style={{ position: 'relative' }}>
                                        <Phone size={16} className="input-icon" />
                                        <input
                                            type="tel"
                                            name="phone"
                                            className="form-input with-icon"
                                            placeholder="+1 (555) 000-0000"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Date & Time Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Preferred Date</label>
                                    <div style={{ position: 'relative' }}>
                                        <Calendar size={16} className="input-icon" />
                                        <input
                                            type="date"
                                            name="date"
                                            className="form-input with-icon"
                                            value={formData.date}
                                            onChange={handleChange}
                                            style={{ colorScheme: 'dark' }}
                                        />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Preferred Time</label>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            className={`dropdown-trigger ${!formData.time ? 'placeholder' : ''} ${openDropdown === 'time' ? 'active' : ''}`}
                                            onClick={() => setOpenDropdown(openDropdown === 'time' ? null : 'time')}
                                        >
                                            {formData.time || 'Select time'}
                                            <Clock size={16} className="dropdown-icon" />
                                        </div>
                                        {openDropdown === 'time' && (
                                            <div className="d-menu">
                                                {times.map(t => (
                                                    <div key={t} className="dropdown-item" onClick={() => handleSelect('time', t)}>
                                                        {t}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Location & Service Row */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            className={`dropdown-trigger ${!formData.location ? 'placeholder' : ''} ${openDropdown === 'location' ? 'active' : ''}`}
                                            onClick={() => setOpenDropdown(openDropdown === 'location' ? null : 'location')}
                                        >
                                            {formData.location || 'Select location'}
                                            <MapPin size={16} className="dropdown-icon" />
                                        </div>
                                        {openDropdown === 'location' && (
                                            <div className="d-menu">
                                                {locations.map(l => (
                                                    <div key={l} className="dropdown-item" onClick={() => handleSelect('location', l)}>
                                                        {l}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Service Type</label>
                                    <div style={{ position: 'relative' }}>
                                        <div
                                            className={`dropdown-trigger ${!formData.service ? 'placeholder' : ''} ${openDropdown === 'service' ? 'active' : ''}`}
                                            onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
                                        >
                                            {formData.service || 'Select service'}
                                            <ChevronDown size={16} className="dropdown-icon" />
                                        </div>
                                        {openDropdown === 'service' && (
                                            <div className="d-menu">
                                                {services.map(s => (
                                                    <div key={s} className="dropdown-item" onClick={() => handleSelect('service', s)}>
                                                        {s}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Message */}
                            <div className="form-group">
                                <label className="form-label">Additional Notes</label>
                                <div style={{ position: 'relative' }}>
                                    <MessageSquare size={16} className="input-icon" style={{ top: '16px', transform: 'none' }} />
                                    <textarea
                                        name="message"
                                        className="form-textarea with-icon"
                                        placeholder="Tell us about your interests or any specific requirements..."
                                        value={formData.message}
                                        onChange={handleChange}
                                        style={{ paddingLeft: '44px' }}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="submit-btn">
                                Confirm Appointment
                            </button>
                        </form>
                    </div>

                </div>
            </div>
        </>,
          document.body
    );
};

export default AppointmentModal;