'use client';

import React from 'react';
import { ShieldAlert, Eye } from 'lucide-react';
import { AdminStats } from './types';

interface AdminAnalyticsTabProps {
  stats: AdminStats;
  onSwitchToUser: (userId: string) => void;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ stats, onSwitchToUser }) => {
  // Poka-Yoke: Defensive unpacking with zero-value defaults (Zero-Crash Guarantee)
  const rawStats = (stats as any)?.stats || stats || {};
  const users: AdminStats['users'] = rawStats.users || { students: 0, mentors: 0, parents: 0, admins: 0, total: 0 };
  const sprints: AdminStats['sprints'] = rawStats.sprints || { total: 0, weeksTotal: 0, submittedRetrosTotal: 0 };
  const slots: AdminStats['slots'] = rawStats.slots || {
    total: 0,
    done: 0,
    migrated: 0,
    dropped: 0,
    pending: 0,
    completionRate: 0,
    migrationRate: 0,
  };
  const cohorts: AdminStats['cohorts'] = rawStats.cohorts || { grade8: 0, grade9: 0, grade10: 0, grade11: 0 };
  const atRiskStudents: AdminStats['atRiskStudents'] = Array.isArray(rawStats.atRiskStudents)
    ? rawStats.atRiskStudents
    : [];

  return (
    <div className="gm-section">
      {/* Key Metric Tiles */}
      <div className="gm-metrics-grid">
        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Всего учеников</div>
          <div className="gm-card-metric__value">{users.students}</div>
          <div className="gm-card-metric__sub text-teal">Активных спринтов: {sprints.total}</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Кураторы / Наставники</div>
          <div className="gm-card-metric__value">{users.mentors}</div>
          <div className="gm-card-metric__sub text-magenta">Закреплены за классами</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Родительский контроль</div>
          <div className="gm-card-metric__value">{users.parents}</div>
          <div className="gm-card-metric__sub text-indigo">Selective Trust портал</div>
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
            <div>
              <div className="gm-bar-header">
                <span>8 класс</span>
                <span>{cohorts.grade8 || 0} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-teal"
                  style={{
                    width: `${
                      users.students > 0
                        ? ((cohorts.grade8 || 0) / users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>9 класс</span>
                <span>{cohorts.grade9 || 0} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-teal"
                  style={{
                    width: `${
                      users.students > 0
                        ? ((cohorts.grade9 || 0) / users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>10 класс</span>
                <span>{cohorts.grade10 || 0} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-magenta"
                  style={{
                    width: `${
                      users.students > 0
                        ? ((cohorts.grade10 || 0) / users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>11 класс (Выпускной)</span>
                <span>{cohorts.grade11 || 0} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-indigo"
                  style={{
                    width: `${
                      users.students > 0
                        ? ((cohorts.grade11 || 0) / users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>

          <div className="gm-hint-note">
            * Новые ученики автоматически получают 10-недельный спринт четверти с расписанием соответствующего класса.
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
            <div className="gm-empty-check">✓ Все ученики стабильно соблюдают субъектный ритм!</div>
          ) : (
            <div className="gm-risk-list">
              {atRiskStudents.map((st: AdminStats['atRiskStudents'][number]) => (
                <div key={st.id} className="gm-risk-item">
                  <div>
                    <div className="gm-risk-name">
                      {st.fullName}{' '}
                      <span className="gm-risk-grade">({st.gradeLevel} класс)</span>
                    </div>
                    <div className="gm-flags-row">
                      {(st.flags || []).map((fl: string, idx: number) => (
                        <span key={idx} className="gm-flag-tag">
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
