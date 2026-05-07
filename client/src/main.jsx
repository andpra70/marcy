import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Stripe from './components/Stripe.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
    <Stripe />
  </React.StrictMode>,
);
