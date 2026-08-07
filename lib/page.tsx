'use client';

import { useState, useEffect } from 'react';
import { getTaxRate, saveTaxRate } from '@/lib/tax';

export default function TaxSettingsPage() {
  const [taxRate, setTaxRate] = useState<number>(7.5);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getTaxRate().then(setTaxRate);
  }, []);

  const handleSave = async () => {
    setLoading(true);
    await saveTaxRate(taxRate);
    setLoading(false);
    alert('Tax rate updated successfully');
  };

  return (
    <main style={{ padding: '40px', fontFamily: 'inherit' }}>
      <div className="admin-tax-settings" style={{ padding: '24px', border: '1px solid #e5e7eb', borderRadius: '8px', maxWidth: '400px', backgroundColor: '#fff' }}>
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', fontWeight: '600' }}>Tax Settings</h2>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.875rem', fontWeight: '500' }}>Select Default Tax Rate:</label>
          <select 
            value={taxRate} 
            onChange={(e) => setTaxRate(parseFloat(e.target.value))}
            style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', backgroundColor: '#f9fafb' }}
          >
            <option value={0}>0%</option>
            <option value={5}>5%</option>
            <option value={7.5}>7.5%</option>
            <option value={10}>10%</option>
          </select>
        </div>
        <button 
          onClick={handleSave} 
          disabled={loading}
          style={{ width: '100%', padding: '12px', backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '500', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? 'Saving...' : 'Save Tax Rate'}
        </button>
      </div>
    </main>
  );
}