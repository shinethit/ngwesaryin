import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  showDetails: boolean;
}

// Catches render/runtime errors anywhere below it in the tree so the whole
// app doesn't go blank on an uncaught exception. Shows a plain Burmese
// "your data is safe, reload" message with a big reload button; the raw
// technical error hides behind an "အသေးစိတ် ကြည့်မည်" toggle. Logs the
// full error/stack to the console for debugging.
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, showDetails: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, showDetails: false };
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
          {/* [v7.5.60 G-S8] Plain Burmese first: your data is safe,
              just reload. The technical text hides behind a toggle. */}
          <p style={{ fontSize: '15px', color: '#065F46', margin: 0, maxWidth: '480px', fontWeight: 600 }}>
            သင့်ဒေတာ မပျောက်ပါ — အက်ပ်ကို ပြန်ဖွင့်ကြည့်ပါ။
            <br />
            Your data is safe — please reload the app.
          </p>
          <p style={{ fontSize: '13px', color: '#475569', margin: 0, maxWidth: '480px' }}>
            ပြန်ဖွင့်ပြီးလည်း ဒီစာမျက်နှာ ပေါ်နေသေးလျှင် အင်တာနက် ချိတ်ဆက်မှု စစ်ပြီး ထပ်ကြိုးစားပါ။
          </p>
          <button
            onClick={this.handleReload}
            style={{
              marginTop: '8px',
              padding: '14px 32px',
              borderRadius: '12px',
              border: 'none',
              background: '#059669',
              color: '#fff',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            🔄 အက်ပ်ကို ပြန်ဖွင့်မည် / Reload App
          </button>
          {this.state.error && (
            <div style={{ maxWidth: '600px', width: '100%' }}>
              <button
                onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748B',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px 8px',
                }}
              >
                {this.state.showDetails ? 'အသေးစိတ် ဖျောက်မည်' : 'အသေးစိတ် ကြည့်မည် (နည်းပညာ အချက်အလက်)'}
              </button>
              {this.state.showDetails && (
                <pre
                  style={{
                    overflow: 'auto',
                    fontSize: '12px',
                    background: '#F1F5F9',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    padding: '12px',
                    textAlign: 'left',
                    color: '#DC2626',
                    marginTop: '8px',
                  }}
                >
                  {this.state.error.message}
                </pre>
              )}
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
