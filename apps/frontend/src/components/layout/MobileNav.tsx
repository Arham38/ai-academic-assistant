import React from 'react';

export interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex md:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Mobile Navigation Menu"
    >
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl p-4">
        <button
          type="button"
          onClick={onClose}
          className="self-end p-2 text-slate-500"
          aria-label="Close navigation menu"
        >
          Close
        </button>
      </div>
    </div>
  );
};
