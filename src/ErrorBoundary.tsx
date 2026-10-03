import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Catches render/runtime errors anywhere below it in the tree so the whole
// app doesn't go blank on an uncaught exception. Shows a simple bilingual
// fallback with the error message and a reload button, then logs the full
// error/stack to the console for debugging.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);

    // Auto-reload once if dynamic module script chunk loading fails (e.g., during app update or temporary network glitch)
    const msg = String(error?.message || '').toLowerCase();
    if (msg.includes('dynamically imported module') || msg.includes('importing a module script failed')) {
      const lastReload = sessionStorage.getItem('chunk_reload_attempted_at');
      const now = Date.now();
      if (!lastReload || now - Number(lastReload) > 30000) {
        sessionStorage.setItem('chunk_reload_attempted_at', String(now));
        window.location.reload();
      }
    }
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    sessionStorage.removeItem('chunk_reload_attempted_at');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '24px',
            textAlign: 'center',
            fontFamily: 'sans-serif',
            background: '#F8FAFC',
            color: '#0F172A',
          }}
        >
          <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>
            တစ်ခုခု မှားယွင်းသွားပါသည် / Something went wrong
          </h1>
          <p style={{ fontSize: '14px', color: '#475569', margin: 0, maxWidth: '480px' }}>
            App ကို ပြန်လည်ဖွင့်ရန် ကြိုးစားနိုင်ပါသည်။ ပြဿနာ ဆက်ရှိနေပါက Support ကို ဆက်သွယ်ပါ။
          </p>
          {this.state.error && (
            <pre
              style={{
                maxWidth: '600px',
                overflow: 'auto',
                fontSize: '12px',
                background: '#F1F5F9',
                border: '1px solid #E2E8F0',
                borderRadius: '8px',
                padding: '12px',
                textAlign: 'left',
                color: '#DC2626',
              }}
            >
              {this.state.error.message}
            </pre>
          )}
          <button
            onClick={this.handleReload}
            style={{
              marginTop: '8px',
              padding: '10px 20px',
              borderRadius: '10px',
              border: 'none',
              background: '#059669',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            ပြန်လည်ဖွင့်မည် / Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
