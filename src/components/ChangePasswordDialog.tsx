'use client';

import React, { useState } from 'react';
import { Check, Eye, EyeOff, KeyRound } from 'lucide-react';
import { apiFetch } from '@/lib/api-client';
import { Dialog, InlineAlert, Notice } from './ui';

interface ChangePasswordDialogProps {
  onClose: () => void;
}

const MIN_LENGTH = 8;

/** Смена собственного пароля. Все другие сессии аккаунта сервер отзывает. */
export const ChangePasswordDialog: React.FC<ChangePasswordDialogProps> = ({ onClose }) => {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mismatch = confirm.length > 0 && confirm !== next;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (next.length < MIN_LENGTH) return setError(`Новый пароль — не менее ${MIN_LENGTH} символов.`);
    if (next !== confirm) return setError('Пароли не совпадают.');

    setIsSubmitting(true);
    setError(null);
    const res = await apiFetch('/api/v1/auth/password', {
      method: 'POST',
      body: { currentPassword: current, newPassword: next },
    });
    setIsSubmitting(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  };

  return (
    <Dialog title="Смена пароля" icon={<KeyRound size={18} />} onClose={onClose}>
      {done ? (
        <div className="mz-stack">
          <Notice icon={<Check size={18} />}>
            <strong>Пароль обновлён.</strong> На других устройствах потребуется войти заново.
          </Notice>
          <div className="mz-row mz-row--end">
            <button type="button" className="mz-btn mz-btn--primary" onClick={onClose}>
              Готово
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mz-stack" noValidate>
          {error && <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>}
          <label className="mz-field">
            <span className="mz-label">Текущий пароль</span>
            <input
              type={show ? 'text' : 'password'}
              className="mz-input"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </label>
          <label className="mz-field">
            <span className="mz-label">
              Новый пароль <em>не менее {MIN_LENGTH} символов</em>
            </span>
            <input
              type={show ? 'text' : 'password'}
              className="mz-input"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={MIN_LENGTH}
              required
            />
          </label>
          <label className="mz-field">
            <span className="mz-label">Повторите новый пароль</span>
            <input
              type={show ? 'text' : 'password'}
              className={`mz-input ${mismatch ? 'mz-input--invalid' : ''}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              aria-invalid={mismatch}
              required
            />
          </label>
          <div className="mz-row mz-row--between">
            <button type="button" className="mz-link" onClick={() => setShow((v) => !v)}>
              {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Скрыть' : 'Показать'} пароли
            </button>
            <div className="mz-row">
              <button type="button" className="mz-link" onClick={onClose}>
                Отмена
              </button>
              <button
                type="submit"
                className="mz-btn mz-btn--primary"
                disabled={isSubmitting || !current || next.length < MIN_LENGTH || mismatch}
              >
                {isSubmitting ? 'Сохраняю…' : 'Сменить пароль'}
              </button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
};
