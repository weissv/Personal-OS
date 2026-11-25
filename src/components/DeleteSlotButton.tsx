'use client';

import React, { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';

interface DeleteSlotButtonProps {
  slotId: string;
  title: string;
  onDeleted: () => void;
  onError: (message: string) => void;
}

/**
 * Удаление своей записи в два касания (Cooper: подтверждение на месте, без модального окна).
 * Через 4 секунды без подтверждения кнопка возвращается в исходное состояние.
 */
export const DeleteSlotButton: React.FC<DeleteSlotButtonProps> = ({ slotId, title, onDeleted, onError }) => {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);

  const handleClick = async () => {
    if (!armed) {
      setArmed(true);
      return;
    }
    setBusy(true);
    const res = await apiFetch(`/api/v1/slots/${slotId}`, { method: 'DELETE' });
    setBusy(false);
    setArmed(false);
    if (res.ok) onDeleted();
    else onError(res.error || 'Не удалось удалить запись');
  };

  return (
    <button
      type="button"
      className={`mz-del ${armed ? 'mz-del--armed' : ''}`}
      onClick={handleClick}
      disabled={busy}
      aria-label={armed ? `Подтвердить удаление: ${title}` : `Удалить: ${title}`}
    >
      <Trash2 size={13} aria-hidden="true" />
      <span>{busy ? 'Удаляю…' : armed ? 'Точно удалить?' : 'Удалить'}</span>
    </button>
  );
};
