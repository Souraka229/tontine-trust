import { useEffect } from 'react';
import { useKKiaPay } from 'kkiapay-react';

export default function TestKkiapay() {
  const { openKkiapayWidget, addSuccessListener } = useKKiaPay();

  useEffect(() => {
    addSuccessListener(({ transactionId }: { transactionId: string }) => {
      console.log(transactionId, 'transactionId');
      alert('Paiement réussi: ' + transactionId);
    });
  }, [addSuccessListener]);

  const open = () => {
    console.log('Ouverture du widget Kkiapay');
    openKkiapayWidget({
      amount: 1,
      key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY || '9fa8afd0653111efbf02478c5adba4b8',
      sandbox: import.meta.env.VITE_KKIAPAY_SANDBOX === "true",
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Test Kkiapay</h1>
      <p className="mb-4">Cliquez sur le bouton pour tester le widget Kkiapay</p>
      <button 
        onClick={open}
        className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
      >
        Pay me
      </button>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p><strong>Clé publique:</strong> {import.meta.env.VITE_KKIAPAY_PUBLIC_KEY || 'Non définie'}</p>
        <p><strong>Sandbox:</strong> {import.meta.env.VITE_KKIAPAY_SANDBOX}</p>
      </div>
    </div>
  );
}
