'use client';

import React from 'react';
import { ShieldAlert, Eye } from 'lucide-react';
import { AdminStats } from './types';

interface AdminAnalyticsTabProps {
  stats: AdminStats;
  onSwitchToUser: (userId: string) => void;
}

export const AdminAnalyticsTab: React.FC<AdminAnalyticsTabProps> = ({ stats, onSwitchToUser }) => {
  return (
    <div className="gm-section">
      {/* Key Metric Tiles */}
      <div className="gm-metrics-grid">
        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Всего учеников</div>
          <div className="gm-card-metric__value">{stats.users.students}</div>
          <div className="gm-card-metric__sub text-teal">Активных спринтов: {stats.sprints.total}</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Кураторы / Наставники</div>
          <div className="gm-card-metric__value">{stats.users.mentors}</div>
          <div className="gm-card-metric__sub text-magenta">Закреплены за классами</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Родительский контроль</div>
          <div className="gm-card-metric__value">{stats.users.parents}</div>
          <div className="gm-card-metric__sub text-indigo">Selective Trust портал</div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Выполнение слотов</div>
          <div className="gm-card-metric__value text-teal">{stats.slots.completionRate}%</div>
          <div className="gm-card-metric__sub">
            {stats.slots.done} из {stats.slots.total} слотов
          </div>
        </div>

        <div className="gm-card-metric">
          <div className="gm-card-metric__label">Переносы задач</div>
          <div
            className={`gm-card-metric__value ${
              stats.slots.migrationRate > 30 ? 'text-red' : ''
            }`}
          >
            {stats.slots.migrationRate}%
          </div>
          <div className="gm-card-metric__sub">{stats.slots.migrated} слотов перенесено</div>
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
                <span>{stats.cohorts.grade8 || 0} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-teal"
                  style={{
                    width: `${
                      stats.users.students > 0
                        ? ((stats.cohorts.grade8 || 0) / stats.users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>9 класс</span>
                <span>{stats.cohorts.grade9} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-teal"
                  style={{
                    width: `${
                      stats.users.students > 0
                        ? (stats.cohorts.grade9 / stats.users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>10 класс</span>
                <span>{stats.cohorts.grade10} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-magenta"
                  style={{
                    width: `${
                      stats.users.students > 0
                        ? (stats.cohorts.grade10 / stats.users.students) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="gm-bar-header">
                <span>11 класс (Выпускной)</span>
                <span>{stats.cohorts.grade11} учеников</span>
              </div>
              <div className="gm-bar-track">
                <div
                  className="gm-bar-fill bg-indigo"
                  style={{
                    width: `${
                      stats.users.students > 0
                        ? (stats.cohorts.grade11 / stats.users.students) * 100
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
            Ученики, требующие вмешательства ({stats.atRiskStudents.length})
          </h2>

          {stats.atRiskStudents.length === 0 ? (
            <div className="gm-empty-check">✓ Все ученики стабильно соблюдают субъектный ритм!</div>
          ) : (
            <div className="gm-risk-list">
              {stats.atRiskStudents.map((st) => (
                <div key={st.id} className="gm-risk-item">
                  <div>
                    <div className="gm-risk-name">
                      {st.fullName}{' '}
                      <span className="gm-risk-grade">({st.gradeLevel} класс)</span>
                    </div>
                    <div className="gm-flags-row">
                      {st.flags.map((fl, idx) => (
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
