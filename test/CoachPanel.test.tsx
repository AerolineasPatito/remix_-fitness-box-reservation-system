import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CoachPanel } from '../components/CoachPanel.tsx';
import { ClassType } from '../types.ts';
import { AppDataProvider } from '../contexts/AppDataContext.tsx';

vi.mock('../lib/api.ts', () => ({
  api: {
    getClasses: vi.fn().mockResolvedValue([]),
    getStudents: vi.fn().mockResolvedValue([]),
    getClassTypes: vi.fn().mockResolvedValue([
      { id: 'ctype_1', name: 'Entrenamiento Funcional', icon: 'fa-bolt', color_theme: 'amber' }
    ]),
    createClassType: vi.fn().mockResolvedValue({ success: true })
  },
  logger: {
    error: vi.fn(),
    log: vi.fn()
  }
}));

vi.mock('../components/NotificationSystem.tsx', () => ({
  useNotifications: () => ({
    addNotification: vi.fn(),
    removeNotification: vi.fn()
  })
}));

describe('CoachPanel', () => {
  beforeEach(() => {
    (globalThis as any).flatpickr = vi.fn(() => ({
      setDate: vi.fn()
    }));
  });

  it('renderiza el formulario de creación de clase', () => {
    render(
      <AppDataProvider enabled={false} role="coach">
        <CoachPanel
          user={{
            id: 'coach_1',
            email: 'coach@test.com',
            full_name: 'Coach Test',
            role: 'coach',
            credits_remaining: 0,
            total_attended: 0
          }}
          instances={[]}
          availability={{}}
          onRefresh={vi.fn()}
          onRefreshStudents={vi.fn()}
        />
      </AppDataProvider>
    );

    expect(screen.getByText(/Crear Nueva Clase/i)).toBeInTheDocument();
    expect(screen.getByText(/Tipo de Entrenamiento/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Gestionar Tipos/i })).toBeInTheDocument();
  });

  it('bloquea el envío cuando existe conflicto de horario', () => {
    const today = new Date().toISOString().split('T')[0];

    render(
      <AppDataProvider enabled={false} role="coach">
        <CoachPanel
          user={{
            id: 'coach_1',
            email: 'coach@test.com',
            full_name: 'Coach Test',
            role: 'coach',
            credits_remaining: 0,
            total_attended: 0
          }}
          instances={[
            {
              id: 'class_1',
              type: ClassType.FUNCTIONAL,
              date: today,
              startTime: '07:00',
              endTime: '08:00',
              capacity: 8
            }
          ]}
          availability={{ class_1: 0 }}
          onRefresh={vi.fn()}
          onRefreshStudents={vi.fn()}
        />
      </AppDataProvider>
    );

    const blockedButton = screen.getByRole('button', { name: /Horario Ocupado/i });
    expect(blockedButton).toBeDisabled();
    expect(screen.getByText(/Conflicto de Horario/i)).toBeInTheDocument();
  });
});
