'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  UserCheck,
  HeartHandshake,
  Sparkles,
  UserPlus,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import { AdminUser } from './types';
import { apiFetch } from '@/lib/api-client';
import { generateClientPassword } from './password-gen';

const EMPTY_FORM = {
  fullName: '',
  username: '',
  email: '',
  password: '',
  role: 'STUDENT',
  gradeLevel: 9,
  studentId: '',
  accessLevel: 'SUMMARY_ONLY',
};

/** «Азиз Каримов» → «aziz.karimov» (транслитерация для подсказки логина). */
const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'yo', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm',
  н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya', ў: 'o', қ: 'q', ғ: 'g', ҳ: 'h',
};
function suggestUsername(fullName: string): string {
  const latin = fullName
    .toLowerCase()
    .split('')
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join('')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return latin.slice(0, 2).reverse().join('.').slice(0, 32);
}

interface AdminRegisterTabProps {
  studentsList: AdminUser[];
  onUserRegistered: () => void;
}

export const AdminRegisterTab: React.FC<AdminRegisterTabProps> = ({
  studentsList,
  onUserRegistered,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [usernameTouched, setUsernameTouched] = useState(false);

  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setRegisterError(null);
    setRegisterSuccess(null);
    setIsSubmitting(true);

    const res = await apiFetch<{ user: { fullName: string; username: string }; sprint: { weeksTotal: number; lessonsPerWeek: number } | null }>(
      '/api/v1/admin/users',
      { method: 'POST', body: { ...formData, studentId: formData.studentId || undefined } }
    );
    setIsSubmitting(false);

    if (!res.ok || !res.data) {
      setRegisterError(res.error);
      return;
    }

    const { user, sprint } = res.data;
    setRegisterSuccess(
      `${user.fullName} (@${user.username}) создан. Пароль: ${formData.password}${
        sprint ? ` · Спринт на ${sprint.weeksTotal} нед., ${sprint.lessonsPerWeek} уроков в неделю.` : ''
      }`
    );
    setFormData({ ...EMPTY_FORM, role: formData.role, gradeLevel: formData.gradeLevel });
    setUsernameTouched(false);
    onUserRegistered();
  };

  return (
    <div className="gm-box gm-box--narrow">
      <div className="gm-box-subtitle text-magenta">Онбординг участников школы</div>
      <h2 className="gm-box-title">Регистрация нового пользователя</h2>
      <p className="gm-box-desc">
        При создании ученика автоматически формируется 10-недельный спринт четверти с расписанием предметов выбранного класса и проектной субботой.
      </p>

      {registerSuccess && (
        <div className="gm-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{registerSuccess}</span>
        </div>
      )}

      {registerError && (
        <div className="gm-alert-danger" role="alert">
          ✕ {registerError}
        </div>
      )}

      <form onSubmit={handleRegisterSubmit}>
        {/* Role picker buttons */}
        <div className="gm-form-group">
          <span className="gm-form-label">Роль в системе *</span>
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
                aria-pressed={formData.role === r}
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
            <label className="gm-form-label" htmlFor="reg-fullname">ФИО пользователя *</label>
            <input
              id="reg-fullname"
              type="text"
              required
              maxLength={100}
              placeholder="Каримов Азиз"
              value={formData.fullName}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  fullName: e.target.value,
                  username: usernameTouched ? formData.username : suggestUsername(e.target.value),
                })
              }
              className="gm-input"
            />
          </div>

          <div className="gm-form-group">
            <label className="gm-form-label" htmlFor="reg-username">Логин *</label>
            <input
              id="reg-username"
              type="text"
              required
              pattern="[a-z0-9][a-z0-9._\-]{2,31}"
              title="3–32 символа: латиница в нижнем регистре, цифры, точка, дефис, подчёркивание"
              placeholder="aziz.karimov"
              value={formData.username}
              onChange={(e) => {
                setUsernameTouched(true);
                setFormData({ ...formData, username: e.target.value.toLowerCase() });
              }}
              className="gm-input"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="gm-form-row">
          <div className="gm-form-group">
            <label className="gm-form-label" htmlFor="reg-email">Email *</label>
            <input
              id="reg-email"
              type="email"
              required
              placeholder="aziz@mezon.uz"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="gm-input"
            />
          </div>

          <div className="gm-form-group">
            <label className="gm-form-label" htmlFor="reg-password">Временный пароль *</label>
            <div className="gm-input-row">
              <input
                id="reg-password"
                type="text"
                required
                minLength={8}
                placeholder="Не менее 8 символов"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="gm-input"
                autoComplete="new-password"
                spellCheck={false}
              />
              <button
                type="button"
                className="gm-btn-refresh"
                onClick={() => setFormData({ ...formData, password: generateClientPassword() })}
                title="Сгенерировать надёжный пароль"
              >
                <Wand2 size={14} />
                <span>Сгенерировать</span>
              </button>
            </div>
          </div>
        </div>

        {(formData.role === 'STUDENT' || formData.role === 'MENTOR') && (
          <div className="gm-form-group">
            <label className="gm-form-label" htmlFor="reg-grade">Класс (параллель)</label>
            <select
              id="reg-grade"
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
              <label className="gm-form-label" htmlFor="reg-student">Ребёнок</label>
              <select
                id="reg-student"
                value={formData.studentId}
                onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                className="gm-select"
              >
                <option value="">— Без привязки —</option>
                {[...studentsList]
                  .sort((a, b) => (a.gradeLevel ?? 0) - (b.gradeLevel ?? 0) || a.fullName.localeCompare(b.fullName, 'ru'))
                  .map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.fullName}
                      {st.gradeLevel ? ` · ${st.gradeLevel} класс` : ''}
                    </option>
                  ))}
              </select>
            </div>

            <div className="gm-form-group">
              <label className="gm-form-label" htmlFor="reg-access">Стартовый уровень доступа</label>
              <select
                id="reg-access"
                value={formData.accessLevel}
                onChange={(e) => setFormData({ ...formData, accessLevel: e.target.value })}
                className="gm-select"
              >
                <option value="SUMMARY_ONLY">Сводка — цели, суббота и ретро</option>
                <option value="FULL_ACCESS">Полный доступ — все уроки и артефакты</option>
                <option value="REVOKED">Закрыто — пока ученик не откроет</option>
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
            <span>{formData.role === 'STUDENT' ? 'Создаю ученика и генерирую спринт…' : 'Создаю пользователя…'}</span>
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
