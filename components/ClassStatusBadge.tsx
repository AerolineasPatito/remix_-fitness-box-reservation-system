import React from 'react';
import { useRealTimeClassStatus, formatTimeRemaining, formatTimeSince } from '../hooks/useRealTimeClassStatus.ts';
import { Badge, Card } from './ui/index.ts';

interface ClassStatusBadgeProps {
  classDate: string;
  startTime: string;
  endTime: string;
  compact?: boolean;
}

export const ClassStatusBadge: React.FC<ClassStatusBadgeProps> = ({
  classDate,
  startTime,
  endTime,
  compact = false
}) => {
  const realTimeInfo = useRealTimeClassStatus(classDate, startTime, endTime);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'scheduled':
        return {
          variant: 'info' as const,
          icon: 'fa-clock',
          label: 'Próxima',
          timeColor: 'var(--color-info)',
          progressColor: 'var(--color-info)'
        };
      case 'in_progress':
        return {
          variant: 'warning' as const,
          icon: 'fa-play-circle',
          label: 'En curso',
          timeColor: 'var(--color-warning)',
          progressColor: 'var(--color-warning)'
        };
      case 'finished':
        return {
          variant: 'neutral' as const,
          icon: 'fa-check-circle',
          label: 'Terminada',
          timeColor: 'var(--color-neutral-500)',
          progressColor: 'var(--color-neutral-500)'
        };
      default:
        return {
          variant: 'neutral' as const,
          icon: 'fa-question-circle',
          label: 'Desconocido',
          timeColor: 'var(--color-neutral-500)',
          progressColor: 'var(--color-neutral-500)'
        };
    }
  };

  const config = getStatusConfig(realTimeInfo.status);

  if (compact) {
    return (
      <Badge variant={config.variant} size="sm" icon={<i className={`fas ${config.icon} text-[10px]`}></i>}>
        {config.label}
      </Badge>
    );
  }

  return (
    <Card variant="surface" padding="sm" className="space-y-2">
      <div className="flex items-center gap-2">
        <Badge variant={config.variant} size="md" icon={<i className={`fas ${config.icon} text-xs`}></i>}>
          {config.label}
        </Badge>
      </div>

      {realTimeInfo.status === 'scheduled' && realTimeInfo.timeUntilStart && (
        <div className="text-xs" style={{ color: 'var(--color-neutral-600)' }}>
          <span className="font-medium">Comienza en:</span>
          <div className="font-mono font-bold" style={{ color: config.timeColor }}>
            {formatTimeRemaining(realTimeInfo.timeUntilStart)}
          </div>
        </div>
      )}

      {realTimeInfo.status === 'in_progress' && (
        <div className="space-y-2">
          {realTimeInfo.timeUntilEnd && (
            <div className="text-xs" style={{ color: 'var(--color-neutral-600)' }}>
              <span className="font-medium">Termina en:</span>
              <div className="font-mono font-bold" style={{ color: config.timeColor }}>
                {formatTimeRemaining(realTimeInfo.timeUntilEnd)}
              </div>
            </div>
          )}
          {realTimeInfo.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium" style={{ color: 'var(--color-neutral-600)' }}>
                  Progreso:
                </span>
                <span className="font-bold" style={{ color: config.timeColor }}>
                  {Math.round(realTimeInfo.progress)}%
                </span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ backgroundColor: 'var(--color-neutral-200)' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${realTimeInfo.progress}%`, backgroundColor: config.progressColor }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {realTimeInfo.status === 'finished' && realTimeInfo.timeSinceEnd && (
        <div className="text-xs" style={{ color: 'var(--color-neutral-500)' }}>
          <span className="font-medium">Finalizó:</span>
          <div className="font-mono">{formatTimeSince(realTimeInfo.timeSinceEnd)}</div>
        </div>
      )}
    </Card>
  );
};

