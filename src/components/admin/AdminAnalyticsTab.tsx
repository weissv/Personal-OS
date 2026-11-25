'use client';

import React from 'react';
import { ShieldAlert, Eye } from 'lucide-react';
import { AdminStats } from './types';

interface AdminAnalyticsTabProps {
  stats: AdminStats;
  onSwitchToUser: (userId: string) => void;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ stats, onSwitchToUser }) => {
  const { users, sprints, slots, cohorts, atRiskStudents } = stats;
  const cohortRows = [
    { label: '8 класс', count: cohorts.grade8 ?? 0, cls: 'bg-teal' },
    { label: '9 класс', count: cohorts.grade9 ?? 0, cls: 'bg-teal' },
    { label: '10 класс', count: cohorts.grade10 ?? 0, cls: 'bg-magenta' },
    { label: '11 класс (выпускной)', count: cohorts.grade11 ?? 0, cls: 'bg-indigo' },
  ];
  const retroRate = sprints.weeksTotal > 0 ? Math.round((sprints.submittedRetrosTotal / sprints.weeksTotal) * 100) : 0;

  return (
    <div className="gm-section">
      {/* Key Metric Tiles */}
      <div className="gm-metrics-grid">
        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Всего учеников</div>
          <div className="gm-card-metric__value">{users.students}</div>
          <div className="gm-card-metric__sub text-teal">Спринтов: {sprints.total}</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Кураторы / Наставники</div>
          <div className="gm-card-metric__value">{users.mentors}</div>
          <div className="gm-card-metric__sub text-magenta">Закреплены за классами</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Родители</div>
          <div className="gm-card-metric__value">{users.parents}</div>
          <div className="gm-card-metric__sub text-indigo">Ретро сдано: {retroRate}% недель</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Выполнение слотов</div>
          <div className="gm-card-metric__value text-teal">{slots.completionRate}%</div>
          <div className="gm-card-metric__sub">
            {slots.done} из {slots.total} слотов
          </div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Переносы задач</div>
          <div
            className={`gm-card-metric__value ${
              slots.migrationRate > 30 ? 'text-red' : ''
            }`}
          >
            {slots.migrationRate}%
          </div>
          <div className="gm-card-metric__sub">{slots.migrated} слотов перенесено</div>
        </div>
      </div>

      {/* Cohorts & Risk Flags Grid */}
      <div className="gm-split-grid">
        {/* Cohorts breakdown */}
        <div className="gm-box">
          <div className="gm-box-subtitle text-magenta">Когорты школы (Классы)</div>
          <h2 className="gm-box-title">Распределение учеников по параллелям</h2>

          <div className="gm-cohorts-bars">
            {cohortRows.map((c) => (
              <div key={c.label}>
                <div className="gm-bar-header">
                  <span>{c.label}</span>
                  <span>{c.count} уч.</span>
                </div>
                <div className="gm-bar-track" role="img" aria-label={`${c.label}: ${c.count} из ${users.students}`}>
                  <div
                    className={`gm-bar-fill ${c.cls}`}
                    style={{ width: `${users.students > 0 ? (c.count / users.students) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="gm-hint-note">
            * Новые ученики присоединяются к текущему спринту школы и получают расписание своей параллели.
          </div>
        </div>

        {/* Red Flag Students (At-Risk) */}
        <div className="gm-box gm-box--danger">
          <div className="gm-danger-title">
            <ShieldAlert size={16} />
            <span>Зона внимания кураторов · Красные флаги</span>
          </div>
          <h2 className="gm-box-title">
            Ученики, требующие вмешательства ({atRiskStudents.length})
          </h2>

          {atRiskStudents.length === 0 ? (
            <div className="gm-empty-check">✓ По прошедшим неделям маркеров риска нет.</div>
          ) : (
            <div className="gm-risk-list">
              {atRiskStudents.map((st) => (
                <div key={st.id} className="gm-risk-item">
                  <div>
                    <div className="gm-risk-name">
                      {st.fullName}{' '}
                      {st.gradeLevel && <span className="gm-risk-grade">({st.gradeLevel} класс)</span>}
                    </div>
                    <div className="gm-flags-row">
                      {st.flags.map((fl) => (
                        <span key={fl} className="gm-flag-tag">
                          {fl}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSwitchToUser(st.id)}
                    className="gm-btn-inspect"
                  >
                    <Eye size={12} />
                    <span>Инспектировать</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
