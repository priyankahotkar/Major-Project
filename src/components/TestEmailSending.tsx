import React, { useState } from 'react';
import { sendEmail } from '@/services/email';
import { Button } from '@/components/ui/button';

export const TestEmailSending: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [result, setResult] = useState<any>(null);

  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const response = await sendEmail({
        to: testEmail,
        subject: 'Test Email from Mentor Connect',
        htmlContent: '<h1>Test Email</h1><p>If you received this, emails are working!</p>',
      });
      setResult({ success: true, data: response });
      console.log('[TEST] Email sent successfully:', response);
    } catch (error: any) {
      setResult({ success: false, error: error?.response?.data || error?.message || String(error) });
      console.error('[TEST] Email failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', border: '1px solid red', margin: '20px', borderRadius: '8px' }}>
      <h3>Email Debug Test</h3>
      <input
        type="email"
        placeholder="Enter your email to test"
        value={testEmail}
        onChange={(e) => setTestEmail(e.target.value)}
        style={{ padding: '8px', width: '100%', marginBottom: '10px' }}
      />
      <Button onClick={handleTestEmail} disabled={loading}>
        {loading ? 'Sending...' : 'Send Test Email'}
      </Button>
      
      {result && (
        <div style={{ marginTop: '10px', padding: '10px', backgroundColor: result.success ? '#d4edda' : '#f8d7da', borderRadius: '4px' }}>
          <strong>{result.success ? 'Success!' : 'Error!'}</strong>
          <pre style={{ fontSize: '12px', wordBreak: 'break-all' }}>
            {JSON.stringify(result.success ? result.data : result.error, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
