import { useStripe, useElements, CardElement } from '@stripe/react-stripe-js';

export default function CheckoutForm() {
  const stripe = useStripe();
  const elements = useElements();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    const cardElement = elements.getElement(CardElement);

    // In un caso reale, qui chiameresti il tuo backend per creare un 'PaymentIntent'
    // e otterresti un 'clientSecret'. Per semplicità, creiamo solo un token.
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    });

    if (error) {
      console.log('[error]', error);
    } else {
      console.log('[PaymentMethod]', paymentMethod);
      alert('Pagamento inviato! Controlla la console.');
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '20px 0' }}>
      <div style={{ border: '1px solid #ccc', padding: '10px', borderRadius: '4px' }}>
        <CardElement options={{ style: { base: { fontSize: '16px' } } }} />
      </div>
      <button type="submit" disabled={!stripe} style={{ marginTop: '10px' }}>
        Paga Ora
      </button>
    </form>
  );
}