"use client";

import { useState, useEffect } from 'react';

interface StorageStatus {
  isSupported: boolean;
  available: boolean;
  used: number;
  total: number;
  percentage: number;
}

export function useStorageStatus() {
  const [status, setStatus] = useState<StorageStatus>({
    isSupported: false,
    available: false,
    used: 0,
    total: 0,
    percentage: 0
  });

  useEffect(() => {
    function checkStorageStatus() {
      try {
        // Check if localStorage is supported
        const isSupported = typeof Storage !== 'undefined' && !!localStorage;
        
        if (!isSupported) {
          setStatus(prev => ({ ...prev, isSupported: false }));
          return;
        }

        // Test if localStorage is available (not in incognito mode)
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        // Estimate storage usage (approximation)
        let used = 0;
        for (let key in localStorage) {
          if (localStorage.hasOwnProperty(key)) {
            used += localStorage[key].length + key.length;
          }
        }
        
        // Rough estimate of localStorage quota (usually 5-10MB)
        const total = 5 * 1024 * 1024; // 5MB estimate
        const percentage = (used / total) * 100;
        
        setStatus({
          isSupported: true,
          available: true,
          used: Math.round(used / 1024), // KB
          total: Math.round(total / 1024), // KB
          percentage: Math.round(percentage)
        });
        
      } catch (error) {
        console.error('Storage check failed:', error);
        setStatus({
          isSupported: true,
          available: false,
          used: 0,
          total: 0,
          percentage: 0
        });
      }
    }

    checkStorageStatus();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkStorageStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return status;
}

interface StorageIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function StorageIndicator({ className = '', showDetails = false }: StorageIndicatorProps) {
  const status = useStorageStatus();

  if (!status.isSupported) {
    return (
      <div className={`text-red-500 text-xs ${className}`} title="Storage not supported">
        ⚠️ Storage unavailable
      </div>
    );
  }

  if (!status.available) {
    return (
      <div className={`text-orange-500 text-xs ${className}`} title="Storage not accessible (may be in incognito mode)">
        ⚠️ Storage disabled
      </div>
    );
  }

  const getColorClass = () => {
    if (status.percentage < 60) return 'text-green-500';
    if (status.percentage < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (showDetails) {
    return (
      <div className={`text-xs ${className}`}>
        <div className={`${getColorClass()}`}>
          💾 {status.used} KB used ({status.percentage}%)
        </div>
        <div className="text-gray-500 mt-1">
          of ~{Math.round(status.total / 1024)} MB available
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`text-xs ${getColorClass()} ${className}`}
      title={`Storage: ${status.used} KB used (${status.percentage}%)`}
    >
      💾 {status.percentage}%
    </div>
  );
}
