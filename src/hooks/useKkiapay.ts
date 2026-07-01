import { useCallback } from "react";
import { useKKiaPay } from "kkiapay-react";
import { PaymentPayload } from "@/lib/kkiapay";

export function useKkiapayPayment() {
  const { openKkiapayWidget, addSuccessListener, addFailedListener } = useKKiaPay();

  const initiatePayment = useCallback((payload: PaymentPayload) => {
    const config = {
      amount: payload.amount,
      key: import.meta.env.VITE_KKIAPAY_PUBLIC_KEY,
      sandbox: import.meta.env.VITE_KKIAPAY_SANDBOX === "true",
      phone: payload.customer_phone,
      name: payload.transaction_name,
      email: `${payload.profile_id}@tontine.local`,
      data: JSON.stringify({
        profile_id: payload.profile_id,
        group_id: payload.group_id,
        transaction_type: payload.transaction_type,
        transaction_name: payload.transaction_name,
      }),
      callback: `${window.location.origin}/payment/callback`,
    };

    openKkiapayWidget(config);
  }, [openKkiapayWidget]);

  return {
    initiatePayment,
    addSuccessListener,
    addFailedListener,
  };
}
