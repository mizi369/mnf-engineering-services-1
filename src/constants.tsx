
import React from 'react';

// Use VITE_BACKEND_URL for external backend hosting (e.g., Render/Railway), fallback to same origin
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || window.location.origin;

console.log(`[SYSTEM] Backend Target: ${BACKEND_URL}`);

export const COLORS = {
  primary: '#D32F2F', // Red
  secondary: '#00BCD4', // Cyan
  dark: '#0F172A', // Deep Professional Black
  blue: '#2563EB', // Professional Blue
  success: '#10B981',
  warning: '#F59E0B'
};

export const TIME_SLOTS = [
  '9:00 AM – 11:00 AM',
  '11:00 AM – 1:00 PM',
  '1:00 PM – 3:00 PM',
  '3:00 PM – 5:00 PM',
  '5:00 PM – 7:00 PM',
  '7:00 PM – 9:00 PM',
];

export const TEAMS = ['Team A', 'Team B', 'Team C'];

export const SERVICE_PRICES = [
  { id: '1', name: 'Normal Service (1.0HP)', price: 80 },
  { id: '2', name: 'Chemical Service (1.0HP)', price: 150 },
  { id: '3', name: 'Overhaul (1.0HP)', price: 250 },
  { id: '4', name: 'Installation (Back-to-back)', price: 350 },
];

export const EPF_RATES = {
  employee: 0.11,
  employer: 0.13,
};

export const SOCSO_RATES = {
  employee: 0.005,
  employer: 0.0175,
};

export const LOGO_URL = 'https://placehold.co/200x200/00BCD4/ffffff?text=MNF';
