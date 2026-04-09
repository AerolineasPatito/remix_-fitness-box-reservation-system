import React, { useEffect, useState } from 'react';
import { api, logger } from '../lib/api.ts';
import { getFriendlyErrorMessage } from '../lib/errorMessages.ts';
import { Button, Card, ErrorState, LoadingState } from './ui/index.ts';

interface AnalyticsData {
  mostReservedClass: { type: string; count: number } | null;
  monthlyStats: { month: string; classes: number; reservations: number }[];
  yearlyStats: { year: string; classes: number; reservations: number; completed: number };
  currentMonthClasses: number;
  currentYearClasses: number;
}

export const CoachAnalytics: React.FC = () => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const data = await api.admin.getCoachAnalytics();
      setAnalytics(data);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err, 'No pudimos cargar las analiticas. Intenta de nuevo.'));
      logger.error('Error fetching analytics', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-3xl">
        <LoadingState
          title="Cargando analiticas"
          description="Estamos preparando las metricas del coach."
          icon="fa-chart-line"
        />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="No pudimos cargar analiticas"
        description={error}
        action={
          <Button variant="secondary" onClick={fetchAnalytics}>
            Reintentar
          </Button>
        }
      />
    );
  }

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border-transparent bg-gradient-to-r from-primary to-cyan-600 text-white">
        <h2 className="text-2xl font-bebas tracking-wide uppercase">Panel de Analiticas</h2>
        <p className="text-sm mt-1 text-white/85">Metricas dinamicas de rendimiento del centro.</p>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-neutral-500">Clases este mes</p>
              <p className="text-3xl font-black text-primary">{analytics.currentMonthClasses}</p>
            </div>
            <div className="bg-primary/10 p-3 rounded-full">
              <i className="fas fa-calendar-alt text-primary text-2xl" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 uppercase tracking-wide">Clases este ano</p>
              <p className="text-3xl font-bold text-green-600">{analytics.currentYearClasses}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <i className="fas fa-chart-line text-green-600 text-2xl" />
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-500 uppercase tracking-wide">Clase mas popular</p>
              <p className="text-xl font-bold text-purple-600">{analytics.mostReservedClass?.type || 'N/A'}</p>
              <p className="text-sm text-neutral-500">{analytics.mostReservedClass?.count || 0} reservas</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <i className="fas fa-users text-purple-600 text-2xl" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="rounded-3xl">
        <h3 className="text-lg font-black text-neutral-800 mb-4">Tendencias Mensuales</h3>
        <div className="space-y-3">
          {analytics.monthlyStats.map((stat, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <span className="text-primary font-bold text-sm">{stat.month.slice(0, 3).toUpperCase()}</span>
                </div>
                <div>
                  <p className="font-medium text-neutral-800">{stat.month}</p>
                  <p className="text-sm text-neutral-500">{stat.reservations} reservas</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-neutral-800">{stat.classes}</p>
                <p className="text-xs text-neutral-500">clases</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl">
        <h3 className="text-lg font-black text-neutral-800 mb-4">Resumen Anual {analytics.yearlyStats.year}</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-primary/10 rounded-xl border border-primary/20">
            <p className="text-3xl font-bold text-primary">{analytics.yearlyStats.classes}</p>
            <p className="text-sm text-neutral-600 mt-1">Total Clases</p>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
            <p className="text-3xl font-bold text-green-600">{analytics.yearlyStats.reservations}</p>
            <p className="text-sm text-neutral-600 mt-1">Total Reservas</p>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-xl border border-purple-200">
            <p className="text-3xl font-bold text-purple-600">{analytics.yearlyStats.completed}</p>
            <p className="text-sm text-neutral-600 mt-1">Clases Completadas</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-center">
        <Button onClick={fetchAnalytics} variant="primary" leftIcon={<i className="fas fa-rotate-right" />}>
          Actualizar Datos
        </Button>
      </div>
    </div>
  );
};
