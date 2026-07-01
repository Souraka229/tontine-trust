import { useEffect } from 'react';
import { useKKiaPay } from 'kkiapay-react';

interface KkiapayWidgetProps {
  amount: number;
  phone: string;
  email: string;
  onSuccess?: (result: { success: boolean; transactionId?: string }) => void;
  onError?: () => void;
  onClose?: () => void;
}

export default function KkiapayWidget({ 
  amount, 
  phone, 
  email, 
  onSuccess, 
  onError, 
  onClose 
}: KkiapayWidgetProps) {
  const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKKiaPay();

  useEffect(() => {
    console.log("Kkiapay: Ajout des listeners");
    
    addSuccessListener(({ transactionId }: { transactionId: string }) => {
      console.log("Kkiapay: Succès - transactionId:", transactionId);
      if (onSuccess) onSuccess({ success: true, transactionId });
      if (onClose) onClose();
    });

    addFailedListener((error: any) => {
      console.error("Kkiapay: Erreur:", error);
      if (onError) onError();
      if (onClose) onClose();
    });
  }, [addSuccessListener, addFailedListener, onSuccess, onError, onClose]);

  const openWidget = () => {
    console.log('Ouverture du widget Kkiapay via clic');
    openKkiapayWidget({
      amount: amount,
      key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY || '9fa8afd0653111efbf02478c5adba4b8',
      sandbox: import.meta.env.VITE_KKIAPAY_SANDBOX === "true",
      email: email,
      phone: phone.replace(/\D/g, ""),
      name: "Cotisation Tontine",
    });
  };

  return (
    <button 
      data-kkiapay-trigger
      onClick={openWidget}
      className="bg-green-500 text-white px-6 py-3 rounded-lg hover:bg-green-600"
    >
      Payer avec Kkiapay
    </button>
  );
}
