import React from 'react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}

export const SidebarItem = ({ icon, label, active }: SidebarItemProps) => (
  <div className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-all ${
    active ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
  }`}>
    {icon} 
    <span className="text-sm">{label}</span>
  </div>
);