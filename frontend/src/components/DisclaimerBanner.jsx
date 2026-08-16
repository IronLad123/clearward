import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DisclaimerBanner() {
 return (
 <div style={{
 background: 'rgba(239, 68, 68, 0.08)',
 borderBottom: '1px solid rgba(239, 68, 68, 0.2)',
 padding: '8px 16px',
 fontSize: '0.8rem',
 color: '#fca5a5',
 display: 'flex',
 alignItems: 'center',
 justifyContent: 'center',
 gap: '8px',
 textAlign: 'center'
 }}>
 <AlertTriangle size={16} color="#ef4444" />
 <span>
 <strong>Educational & Research Tool:</strong> This application predicts short-term statistical probability and is not financial or investment advice. SEBI regulates formal advisory in India.
 </span>
 </div>
 );
}
