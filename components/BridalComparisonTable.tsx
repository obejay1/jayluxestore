'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BridalPackage } from '@/lib/types';
import { Check, X } from 'lucide-react';

interface Props {
  packages: BridalPackage[];
}

const BridalComparisonTable: React.FC<Props> = ({ packages }) => {
  const allFeatures = useMemo(() => {
    const featureSet = new Set<string>();
    packages.forEach(pkg => {
      (pkg.features || []).forEach(feature => featureSet.add(feature));
    });
    return Array.from(featureSet);
  }, [packages]);

  if (!packages || packages.length === 0) {
    return null;
  }

  return (
    <div className="comparison-table-wrapper">
      <table className="comparison-table">
        <thead>
          <tr>
            <th>Features</th>
            {packages.map(pkg => (
              <th key={pkg.id} className={pkg.popular ? 'popular' : ''}>
                {pkg.title || pkg.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {allFeatures.map(feature => (
            <tr key={feature}>
              <td>{feature}</td>
              {packages.map(pkg => (
                <td key={pkg.id} className={pkg.popular ? 'popular' : ''}>
                  {(pkg.features || []).includes(feature) ? <Check className="check-icon" size={24} /> : <X className="x-icon" size={24} />}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BridalComparisonTable;