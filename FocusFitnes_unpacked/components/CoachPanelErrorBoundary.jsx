import React from 'react';

export class CoachPanelErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Coach Panel render error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center px-4">
          <div className="max-w-xl w-full bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center space-y-4">
            <p className="text-rose-700 font-black">Ocurrió un error al cargar el panel de negocio.</p>
            <button
              type="button"
              onClick={this.handleReload}
              className="px-5 py-3 rounded-xl bg-zinc-900 text-white text-[11px] font-black uppercase tracking-widest"
            >
              Recargar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
