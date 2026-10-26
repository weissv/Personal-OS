'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AdminUser } from './types';

interface PasswordResetModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  user,
  onClose,
  onSuccess,
}) => {
  const [newPassword, setNewPassword] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) {
      setStatus('Пароль должен содержать не менее 8 символов');
      return;
    }

    setIsSubmitting(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/v1/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      });

      const json = await res.json();
      if (res.ok) {
        setStatus('Пароль успешно обновлён!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 800);
      } else {
        setStatus(json.error || 'Ошибка при смене пароля');
      }
    } catch {
      setStatus('Ошибка подключения к серверу');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gm-modal-overlay">
      <div className="gm-modal">
        <div className="gm-modal-head">
          <h3 className="gm-modal-title">Сброс пароля</h3>
          <button type="button" onClick={onClose} className="gm-modal-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <p className="gm-modal-desc">
            Установите новый пароль для <strong>{user.fullName}</strong> (@
            {user.username}):
          </p>

          <div className="gm-form-group">
            <input
              type="text"
              required
              placeholder="Новый пароль (от 8 символов)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="gm-input"
              autoFocus
            />
          </div>

          {status && (
            <div
              className={`gm-alert-${status.includes('успешно') ? 'success' : 'danger'}`}
              style={{ marginBottom: 14 }}
            >
              {status}
            </div>
          )}

          <div className="gm-modal-footer">
            <button type="button" onClick={onClose} className="gm-btn-cancel">
              Отмена
            </button>
            <button type="submit" disabled={isSubmitting} className="gm-btn-save">
              {isSubmitting ? 'Сохранение…' : 'Сохранить пароль'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
