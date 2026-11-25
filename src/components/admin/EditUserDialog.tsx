'use client';

import React, { useState } from 'react';
import { UserCog } from 'lucide-react';
import { AdminUser } from './types';
import { Dialog, InlineAlert } from '../ui';
import { apiFetch } from '@/lib/api-client';

interface EditUserDialogProps {
  user: AdminUser;
  students: AdminUser[];
  onClose: () => void;
  onSaved: (name: string, close?: boolean) => void;
}

/** Правка профиля участника. Отправляются только изменённые поля — журнал остаётся точным. */
export const EditUserDialog: React.FC<EditUserDialogProps> = ({ user, students, onClose, onSaved }) => {
  const [fullName, setFullName] = useState(user.fullName);
  const [username, setUsername] = useState(user.username ?? '');
  const [email, setEmail] = useState(user.email);
  const [grade, setGrade] = useState<string>(user.gradeLevel ? String(user.gradeLevel) : '');
  const [linked, setLinked] = useState(user.students ?? []);
  const [linkBusy, setLinkBusy] = useState(false);

  const changeLink = async (body: { addStudentId?: string; removeStudentId?: string }) => {
    setLinkBusy(true);
    setError(null);
    const res = await apiFetch<{ user: unknown }>(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', body });
    setLinkBusy(false);
    if (!res.ok) return setError(res.error);
    if (body.addStudentId) {
      const st = students.find((s) => s.id === body.addStudentId);
      if (st) setLinked((prev) => [...prev, { id: st.id, fullName: st.fullName, accessLevel: '' }]);
    } else {
      setLinked((prev) => prev.filter((s) => s.id !== body.removeStudentId));
    }
    onSaved(user.fullName, false);
  };
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const hasGrade = user.role === 'STUDENT' || user.role === 'MENTOR';
  const changes: Record<string, unknown> = {};
  if (fullName.trim() !== user.fullName) changes.fullName = fullName.trim();
  if (username.trim().toLowerCase() !== (user.username ?? '')) changes.username = username.trim().toLowerCase();
  if (email.trim().toLowerCase() !== user.email) changes.email = email.trim().toLowerCase();
  if (hasGrade && (grade ? Number(grade) : null) !== user.gradeLevel) changes.gradeLevel = grade ? Number(grade) : null;
  const dirty = Object.keys(changes).length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !dirty) return;
    setBusy(true);
    setError(null);
    const res = await apiFetch(`/api/v1/admin/users/${user.id}`, { method: 'PATCH', body: changes });
    setBusy(false);
    if (res.ok) {
      onSaved(fullName.trim());
      onClose();
    } else {
      setError(res.error);
    }
  };

  return (
    <Dialog title="Профиль участника" icon={<UserCog size={18} />} onClose={onClose} busy={busy}>
      <form className="mz-stack" onSubmit={handleSubmit} noValidate>
        {error && <InlineAlert onDismiss={() => setError(null)}>{error}</InlineAlert>}
        <label className="mz-field">
          <span className="mz-label">ФИО</span>
          <input className="mz-input" value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} autoFocus />
        </label>
        <div className="mz-grid2">
          <label className="mz-field">
            <span className="mz-label">Логин</span>
            <input
              className="mz-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              spellCheck={false}
              disabled={user.username === 'somi'}
            />
          </label>
          <label className="mz-field">
            <span className="mz-label">Email</span>
            <input className="mz-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} spellCheck={false} />
          </label>
        </div>
        {user.role === 'PARENT' && (
          <div className="mz-field">
            <span className="mz-label">Дети</span>
            {linked.length === 0 && <p className="mz-hint">Пока не привязан ни один ученик.</p>}
            <ul className="mz-linklist">
              {linked.map((s) => (
                <li key={s.id}>
                  <span>{s.fullName}</span>
                  <button type="button" className="mz-link mz-link--sm" disabled={linkBusy} onClick={() => changeLink({ removeStudentId: s.id })}>
                    отвязать
                  </button>
                </li>
              ))}
            </ul>
            <select
              className="mz-input"
              value=""
              disabled={linkBusy}
              aria-label="Привязать ребёнка"
              onChange={(e) => e.target.value && changeLink({ addStudentId: e.target.value })}
            >
              <option value="">+ Привязать ребёнка…</option>
              {students
                .filter((s) => !linked.some((l) => l.id === s.id))
                .sort((a, b) => a.fullName.localeCompare(b.fullName, 'ru'))
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.fullName}
                    {s.gradeLevel ? ` · ${s.gradeLevel} класс` : ''}
                  </option>
                ))}
            </select>
          </div>
        )}
        {hasGrade && (
          <label className="mz-field">
            <span className="mz-label">
              Класс {user.role === 'STUDENT' && <em>уже созданный спринт не пересоздаётся</em>}
            </span>
            <select className="mz-input" value={grade} onChange={(e) => setGrade(e.target.value)}>
              {user.role === 'MENTOR' && <option value="">Все параллели</option>}
              {[8, 9, 10, 11].map((g) => (
                <option key={g} value={g}>
                  {g} класс
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="mz-row mz-row--end">
          <button type="button" className="mz-link" onClick={onClose} disabled={busy}>
            Отмена
          </button>
          <button type="submit" className="mz-btn mz-btn--primary" disabled={busy || !dirty}>
            {busy ? 'Сохраняю…' : 'Сохранить'}
          </button>
        </div>
      </form>
    </Dialog>
  );
};
