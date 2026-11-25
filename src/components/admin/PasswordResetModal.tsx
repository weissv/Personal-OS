'use client';

import React, { useState } from 'react';
import { KeyRound, Wand2, Copy, Check } from 'lucide-react';
import { AdminUser } from './types';
import { Dialog, InlineAlert } from '../ui';
import { apiFetch } from '@/lib/api-client';
import { generateClientPassword } from './password-gen';

interface PasswordResetModalProps {
  user: AdminUser;
  onClose: () => void;
  onSuccess: () => void;
}

export const PasswordResetModal: React.FC<PasswordResetModalProps> = ({ user, onClose, onSuccess }) => {
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (newPassword.length < 8) {
      setError('Пароль должен содержать не менее 8 символов');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const res = await apiFetch(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', body: { password: newPassword } });
    setIsSubmitting(false);
    if (res.ok) {
      setSaved(true);
      onSuccess();
    } else {
      setError(res.error);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(newPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // буфер обмена недоступен — пароль виден на экране
    }
  };

  return (
    <Dialog title="Сброс пароля" icon={<KeyRound size={18} />} onClose={onClose} busy={isSubmitting}>
      {saved ? (
        <div className="mz-stack">
          <p className="mz-dialog__text">
            Новый пароль для <strong>{user.fullName}</strong> (@{user.username}) сохранён. Все прежние сессии пользователя
            завершены. Передайте пароль лично:
          </p>
          <div className="gm-secret">
            <code>{newPassword}</code>
            <button type="button" className="mz-icon-btn" onClick={copy} aria-label="Скопировать пароль">
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
          <div className="mz-row mz-row--end">
            <button type="button" className="mz-btn mz-btn--primary" onClick={onClose}>
              Готово
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mz-stack" noValidate>
          <p className="mz-dialog__text">
            Новый пароль для <strong>{user.fullName}</strong> (@{user.username}). Текущие сессии пользователя будут завершены.
          </p>
          {error && <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>}
          <div className="mz-row mz-row--nowrap">
            <input
              type="text"
              required
              minLength={8}
              maxLength={128}
              placeholder="Не менее 8 символов"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mz-input mz-num"
              autoComplete="new-password"
              spellCheck={false}
              aria-label="Новый пароль"
              autoFocus
            />
            <button type="button" className="mz-btn mz-btn--light mz-btn--sm" onClick={() => setNewPassword(generateClientPassword())}>
              <Wand2 size={14} /> Сгенерировать
            </button>
          </div>
          <div className="mz-row mz-row--end">
            <button type="button" onClick={onClose} className="mz-link">
              Отмена
            </button>
            <button type="submit" disabled={isSubmitting || newPassword.length < 8} className="mz-btn mz-btn--primary">
              {isSubmitting ? 'Сохранение…' : 'Сохранить пароль'}
            </button>
          </div>
        </form>
      )}
    </Dialog>
  );
};
