import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from './CheckoutForm';

// Sostituisci con la tua Public Key che trovi nella Dashboard di Stripe
const stripePromise = loadStripe('pk_test_tuachiavepubblica');

function Stripe() {
  return (
    <div style={{ padding: '20px' }}>
      <h1>Acquisto Item</h1>
      <p>Prezzo: €10.00</p>
      
      <Elements stripe={stripePromise}>
        <CheckoutForm />
      </Elements>
    </div>
  );
}

export default Stripe;