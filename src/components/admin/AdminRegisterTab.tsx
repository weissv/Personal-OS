'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  UserCheck,
  HeartHandshake,
  Sparkles,
  UserPlus,
  CheckCircle2,
} from 'lucide-react';
import { AdminUser } from './types';

interface AdminRegisterTabProps {
  studentsList: AdminUser[];
  onUserRegistered: () => void;
}

export const AdminRegisterTab: React.FC<AdminRegisterTabProps> = ({
  studentsList,
  onUserRegistered,
}) => {
  const [formData, setFormData] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    role: 'STUDENT',
    gradeLevel: 9,
    studentId: '',
    accessLevel: 'SUMMARY_ONLY',
  });

  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError(null);
    setRegisterSuccess(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/v1/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        setRegisterError(json.error || 'Ошибка при создании пользователя');
        setIsSubmitting(false);
        return;
      }

      setRegisterSuccess(
        `Пользователь ${json.user.fullName} успешно создан! ${
          formData.role === 'STUDENT'
            ? 'Сгенерирован 10-недельный спринт с расписанием уроков.'
            : ''
        }`
      );
      setFormData({
        fullName: '',
        username: '',
        email: '',
        password: '',
        role: 'STUDENT',
        gradeLevel: 9,
        studentId: '',
        accessLevel: 'SUMMARY_ONLY',
      });
      onUserRegistered();
    } catch {
      setRegisterError('Не удалось подключиться к серверу');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="gm-box gm-box--narrow">
      <div className="gm-box-subtitle text-magenta">Онбординг участников школы</div>
      <h2 className="gm-box-title">Регистрация нового пользователя</h2>
      <p className="gm-box-desc">
        При создании ученика автоматически формируется 10-недельный спринт четверти с расписанием предметов выбранного класса и проектной субботой.
      </p>

      {registerSuccess && (
        <div className="gm-alert-success">
          <CheckCircle2 size={18} />
          <span>{registerSuccess}</span>
        </div>
      )}

      {registerError && (
        <div className="gm-alert-danger">
          ✕ {registerError}
        </div>
      )}

      <form onSubmit={handleRegisterSubmit}>
        {/* Role picker buttons */}
        <div className="gm-form-group">
          <label className="gm-form-label">Роль в системе *</label>
          <div className="gm-role-grid">
            {[
              { r: 'STUDENT', label: 'Ученик', icon: <GraduationCap size={16} /> },
              { r: 'MENTOR', label: 'Куратор', icon: <UserCheck size={16} /> },
              { r: 'PARENT', label: 'Родитель', icon: <HeartHandshake size={16} /> },
              { r: 'ADMIN', label: 'Админ', icon: <Sparkles size={16} /> },
            ].map(({ r, label, icon }) => (
              <button
                key={r}
                type="button"
                onClick={() => setFormData({ ...formData, role: r })}
                className={`gm-role-choice ${
                  formData.role === r ? 'gm-role-choice--active' : ''
                }`}
              >
                {icon}
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Inputs grid */}
        <div className="gm-form-row">
          <div className="gm-form-group">
            <label className="gm-form-label">ФИО пользователя *</label>
            <input
              type="text"
              required
              placeholder="Азиз Каримов"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="gm-input"
            />
          </div>

          <div className="gm-form-group">
            <label className="gm-form-label">Логин (Username) *</label>
            <input
              type="text"
              required
              placeholder="aziz"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="gm-input"
            />
          </div>
        </div>

        <div className="gm-form-row">
          <div className="gm-form-group">
            <label className="gm-form-label">Email *</label>
            <input
              type="email"
              required
              placeholder="aziz@mezon.uz"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="gm-input"
            />
          </div>

          <div className="gm-form-group">
            <label className="gm-form-label">Пароль *</label>
            <input
              type="text"
              required
              placeholder="Не менее 8 символов"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="gm-input"
            />
          </div>
        </div>

        {(formData.role === 'STUDENT' || formData.role === 'MENTOR') && (
          <div className="gm-form-group">
            <label className="gm-form-label">Класс (Параллель)</label>
            <select
              value={formData.gradeLevel}
              onChange={(e) => setFormData({ ...formData, gradeLevel: parseInt(e.target.value, 10) })}
              className="gm-select"
            >
              <option value={8}>8 класс</option>
              <option value={9}>9 класс</option>
              <option value={10}>10 класс</option>
              <option value={11}>11 класс (Выпускной)</option>
            </select>
          </div>
        )}

        {formData.role === 'PARENT' && (
          <div className="gm-form-row">
            <div className="gm-form-group">
              <label className="gm-form-label">Привязать к ученику:</label>
              <select
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="gm-select"
              >
                <option value="">-- Выберите ученика --</option>
                {studentsList.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.fullName} ({st.gradeLevel || 9} класс)
                  </option>
                ))}
              </select>
            </div>

            <div className="gm-form-group">
              <label className="gm-form-label">Уровень доступа:</label>
              <select
                value={formData.accessLevel}
                onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                className="gm-select"
              >
                <option value="SUMMARY_ONLY">SUMMARY_ONLY (Только ретроспектива и проект)</option>
                <option value="FULL_ACCESS">FULL_ACCESS (Полный просмотр сетки слотов)</option>
              </select>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="gm-btn-submit"
        >
          {isSubmitting ? (
            <span>Создание пользователя и генерация спринта…</span>
          ) : (
            <>
              <UserPlus size={16} />
              <span>Создать пользователя</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
