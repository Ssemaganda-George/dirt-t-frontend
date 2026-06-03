import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { getSession } from '../services/AuthService';

const ConnectionTest: React.FC = () => {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testConnection = async () => {
    setLoading(true);
    setResult('Testing...');

    try {
      // Test 1: Basic auth session
      await getSession();

      setResult('✅ Auth session works\nTesting table access...');

      // Test 2: Table access
      const { error: tableError } = await supabase
        .from('partner_requests')
        .select('id')
        .limit(1);

      if (tableError) throw new Error(`Table access failed: ${tableError.message}`);

      setResult('✅ Table access works\nTesting insert...');

      // Test 3: Insert test (we'll delete it immediately)
      const testRecord = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Connection test'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('partner_requests')
        .insert([testRecord])
        .select()
        .single();

      if (insertError) throw new Error(`Insert failed: ${insertError.message}`);

      // Clean up test record
      await supabase
        .from('partner_requests')
        .delete()
        .eq('id', insertData.id);

      setResult('🎉 All tests passed! Connection is working perfectly.');

    } catch (error: any) {
      setResult(`❌ Test failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Supabase Connection Test</h2>
      <button
        onClick={testConnection}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '5px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Connection'}
      </button>
      <pre style={{
        marginTop: '20px',
        padding: '10px',
        backgroundColor: '#f3f4f6',
        borderRadius: '5px',
        whiteSpace: 'pre-wrap'
      }}>
        {result}
      </pre>
    </div>
  );
};

export default ConnectionTest;