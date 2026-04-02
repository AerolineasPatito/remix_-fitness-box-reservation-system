import React from 'react';
import { useRealTimeClassStatus, formatTimeRemaining, formatTimeSince } from '../hooks/useRealTimeClassStatus.ts';

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
          bg: 'bg-blue-50',
          text: 'text-blue-700',
          border: 'border-blue-200',
          icon: 'fa-clock',
          label: 'Próxima'
        };
      case 'in_progress':
        return {
          bg: 'bg-amber-50',
          text: 'text-amber-700',
          border: 'border-amber-200',
          icon: 'fa-play-circle',
          label: 'En Curso'
        };
      case 'finished':
        return {
          bg: 'bg-zinc-50',
          text: 'text-zinc-500',
          border: 'border-zinc-200',
          icon: 'fa-check-circle',
          label: 'Terminada'
        };
      default:
        return {
          bg: 'bg-gray-50',
          text: 'text-gray-700',
          border: 'border-gray-200',
          icon: 'fa-question-circle',
          label: 'Desconocido'
        };
    }
  };

  const config = getStatusConfig(realTimeInfo.status);

  if (compact) {
    return (
      <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
        <i className={`fas ${config.icon} text-xs`}></i>
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-xl border ${config.bg} ${config.border} space-y-2`}>
      <div className="flex items-center space-x-2">
        <i className={`fas ${config.icon} ${config.text}`}></i>
        <span className={`font-bold text-sm uppercase tracking-wider ${config.text}`}>
          {config.label}
        </span>
      </div>

      {/* Time information based on status */}
      {realTimeInfo.status === 'scheduled' && realTimeInfo.timeUntilStart && (
        <div className="text-xs text-zinc-600">
          <span className="font-medium">Comienza en:</span>
          <div className="font-mono font-bold text-blue-600">
            {formatTimeRemaining(realTimeInfo.timeUntilStart)}
          </div>
        </div>
      )}

      {realTimeInfo.status === 'in_progress' && (
        <div className="space-y-2">
          {realTimeInfo.timeUntilEnd && (
            <div className="text-xs text-zinc-600">
              <span className="font-medium">Termina en:</span>
              <div className="font-mono font-bold text-amber-600">
                {formatTimeRemaining(realTimeInfo.timeUntilEnd)}
              </div>
            </div>
          )}
          {realTimeInfo.progress !== undefined && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-zinc-600">Progreso:</span>
                <span className="font-bold text-amber-600">{Math.round(realTimeInfo.progress)}%</span>
              </div>
              <div className="w-full bg-zinc-200 rounded-full h-1.5">
                <div 
                  className="bg-amber-500 h-1.5 rounded-full transition-all duration-1000"
                  style={{ width: `${realTimeInfo.progress}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      )}

      {realTimeInfo.status === 'finished' && realTimeInfo.timeSinceEnd && (
        <div className="text-xs text-zinc-500">
          <span className="font-medium">Finalizó:</span>
          <div className="font-mono">
            {formatTimeSince(realTimeInfo.timeSinceEnd)}
          </div>
        </div>
      )}
    </div>
  );
};
