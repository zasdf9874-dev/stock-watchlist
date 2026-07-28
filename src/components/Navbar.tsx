'use client';

import Link from 'next/link';
import { useState } from 'react';

const navData = [
  {
    title: 'Dashboard',
    items: [{ name: 'Live Market', href: '/' }],
  },
  {
    title: 'Screeners',
    items: [
      { name: 'Strong Uptrend', href: '/screeners/strong-uptrend' },
      { name: 'Uptrend', href: '/screeners/uptrend' },
      { name: 'Downtrend', href: '/screeners/downtrend' },
    ],
  },
  {
    title: 'Live Trading',
    items: [
      { name: 'Portfolio', href: '/live/portfolio' },
      { name: 'Stock Buy', href: '/live/buy' },
    ],
  },
  {
    title: 'Paper Trading',
    items: [
      { name: 'Portfolio', href: '/paper/portfolio' },
    ],
  },
  {
    title: 'Manage',
    items: [
      { name: 'Add Stocks', href: '/manage/add-stocks' },
      { name: 'Technical Data', href: '/manage/technical-data' },
      { name: 'Strategy Data', href: '/manage/strategy-data' },
    ],
  },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <>
      <nav className="bg-slate-900 border-b border-slate-800 relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            
            {/* Logo */}
            <div className="flex-shrink-0 flex items-center">
              <span className="text-white font-bold text-xl tracking-tight">VK Watchlist</span>
            </div>

            {/* Desktop Menu */}
            <div className="hidden md:flex space-x-1">
              {navData.map((menu) => (
                <div key={menu.title} className="relative group px-2 py-5">
                  <button className="text-slate-300 hover:text-white font-medium text-sm transition-colors flex items-center gap-1">
                    {menu.title}
                    <svg className="w-4 h-4 text-slate-500 group-hover:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Panel */}
                  <div className="absolute left-0 mt-2 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                    <div className="py-1">
                      {menu.items.map((item) => (
                        <Link
                          key={item.name}
                          href={item.href}
                          className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                        >
                          {item.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button 
                onClick={() => setIsMobileMenuOpen(true)}
                className="text-slate-300 hover:text-white focus:outline-none p-2"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          {/* Dark Background Overlay */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm" 
            onClick={() => setIsMobileMenuOpen(false)}
          ></div>
          
          {/* Sliding Sidebar */}
          <div className="fixed inset-y-0 right-0 w-64 bg-slate-900 border-l border-slate-800 shadow-xl flex flex-col h-full transform transition-transform duration-300 ease-in-out">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center">
              <span className="text-white font-bold text-lg">Menu</span>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-4 space-y-6">
              {navData.map((menu) => (
                <div key={menu.title}>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    {menu.title}
                  </h3>
                  <div className="space-y-2 pl-2 border-l border-slate-800">
                    {menu.items.map((item) => (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block px-2 py-1.5 text-sm text-slate-300 hover:text-blue-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}