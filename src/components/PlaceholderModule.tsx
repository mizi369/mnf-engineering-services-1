import React from 'react';

export const PlaceholderModule: React.FC<{ title: string }> = ({ title }) => (
  <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
    <div className="w-24 h-24 bg-[#1E1E1E] rounded-full flex items-center justify-center border border-white/5 shadow-2xl shadow-[#00BCD4]/10 animate-pulse">
      <span className="text-4xl">🚧</span>
    </div>
    <div>
      <h2 className="text-2xl font-bold text-white mb-2">{title} Module</h2>
      <p className="text-gray-400 max-w-md mx-auto">
        This module is currently under development. Features for {title.toLowerCase()} management will be available in the next update.
      </p>
    </div>
    <button className="px-6 py-3 bg-[#1E1E1E] hover:bg-[#2C2C2C] border border-white/10 rounded-lg text-sm font-bold text-[#00BCD4] transition-all hover:shadow-[0_0_15px_rgba(0,188,212,0.2)]">
      Notify Me When Ready
    </button>
  </div>
);
