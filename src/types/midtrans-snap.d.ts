/** Objek yang disuntikkan snap.js ke halaman setelah skrip dimuat. */
export type SnapResult = {
  order_id: string;
  transaction_status: string;
  payment_type?: string;
  gross_amount?: string;
};

export type SnapCallbacks = {
  onSuccess?: (result: SnapResult) => void;
  onPending?: (result: SnapResult) => void;
  onError?: (result: SnapResult) => void;
  onClose?: () => void;
};

declare global {
  interface Window {
    snap?: {
      pay: (token: string, callbacks?: SnapCallbacks) => void;
    };
  }
}
