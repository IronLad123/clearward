import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — A React Error Boundary to catch UI runtime crashes.
 *
 * It prevents the entire web app from going blank if a sub-component
 * fails to render or encounters a runtime error.
 */
export default class ErrorBoundary extends React.Component {
 constructor(props) {
 super(props);
 this.state = { hasError: false, error: null };
 }

 static getDerivedStateFromError(error) {
 // Update state so the next render will show the fallback UI.
 return { hasError: true, error };
 }

 componentDidCatch(error, errorInfo) {
 // Log the error details to console
 console.error('ErrorBoundary caught an unhandled React error:', error, errorInfo);
 }

 handleReset = () => {
 this.setState({ hasError: false, error: null });
 window.location.reload();
 };

 render() {
 if (this.state.hasError) {
 return (
 <div
 className="glass-card"
 style={{
 padding: '40px',
 textAlign: 'center',
 maxWidth: '600px',
 margin: '40px auto',
 display: 'flex',
 flexDirection: 'column',
 alignItems: 'center',
 gap: '16px',
 border: '1px solid var(--selloff-border)',
 background: 'rgba(255, 92, 108, 0.04)',
 }}
 >
 <div style={{
 background: 'var(--selloff-dim)',
 border: '1px solid var(--selloff-border)',
 padding: '12px',
 borderRadius: '12px',
 color: 'var(--selloff)',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 }}>
 <AlertTriangle size={28} />
 </div>
 <div>
 <h3 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.2rem', fontWeight: 700, color: 'var(--ink)' }}>
 Component Error Intercepted
 </h3>
 <p style={{ fontFamily: "'Public Sans', sans-serif", fontSize: '0.88rem', color: 'var(--slate-light)', marginTop: '6px', lineHeight: 1.5 }}>
 A rendering error occurred in this view. This has been intercepted to prevent a full application crash.
 </p>
 {this.state.error && (
 <pre style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.75rem',
 background: 'rgba(0, 0, 0, 0.3)',
 padding: '12px',
 borderRadius: '8px',
 color: 'var(--selloff)',
 marginTop: '12px',
 maxWidth: '100%',
 overflowX: 'auto',
 textAlign: 'left',
 }}>
 {this.state.error.toString()}
 </pre>
 )}
 </div>
 <button
 onClick={this.handleReset}
 style={{
 fontFamily: "'IBM Plex Mono', monospace",
 fontSize: '0.82rem',
 color: 'var(--amber-gold)',
 background: 'var(--amber-gold-faint)',
 border: '1px solid var(--amber-gold-dim)',
 borderRadius: '6px',
 padding: '8px 16px',
 cursor: 'pointer',
 display: 'flex',
 alignItems: 'center',
 gap: '6px',
 transition: 'all 0.15s',
 }}
 onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(201, 165, 77, 0.2)'; }}
 onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(201, 165, 77, 0.1)'; }}
 >
 <RefreshCw size={14} /> Reload Application
 </button>
 </div>
 );
 }

 return this.props.children;
 }
}
