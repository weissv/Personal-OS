'use client';

import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog } from '../ui';

interface ConfirmDialogProps {
  title: string;
  body: React.ReactNode;
  actionLabel: string;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

/** Подтверждение необратимого действия (вместо системного window.confirm). */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({ title, body, actionLabel, onConfirm, onClose }) => {
  const [busy, setBusy] = useState(false);

  const handleConfirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      onClose();
    }
  };

  return (
    <Dialog title={title} icon={<AlertTriangle size={18} className="mz-text-error" />} onClose={onClose} busy={busy}>
      <p className="mz-dialog__text">{body}</p>
      <div className="mz-row mz-row--end">
        <button type="button" className="mz-link" onClick={onClose} disabled={busy}>
          Отмена
        </button>
        <button type="button" className="mz-btn mz-btn--error" onClick={handleConfirm} disabled={busy} autoFocus>
          {busy ? 'Выполняю…' : actionLabel}
        </button>
      </div>
    </Dialog>
  );
};
