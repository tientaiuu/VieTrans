import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const SettingsPage: React.FC = () => {
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isDark) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDark]);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };
  
  return (
    <>
      {/*  TopNavBar Component  */}
<nav className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 dark:bg-[#131b2e]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] flex justify-between items-center px-8 h-20 w-full max-w-none">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#00488d] dark:text-[#dae2fd] tracking-tighter font-['Manrope']">IIMT Curator</span>
<div className="hidden md:flex gap-6 font-['Manrope'] tracking-tight font-bold">
<Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d] hover:bg-[#f2f3ff] dark:hover:bg-[#1e293b] transition-all duration-300 px-3 py-1 rounded-md" to="/">Home</Link>
<Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d] hover:bg-[#f2f3ff] dark:hover:bg-[#1e293b] transition-all duration-300 px-3 py-1 rounded-md" to="/translate">Translate</Link>
<Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d] hover:bg-[#f2f3ff] dark:hover:bg-[#1e293b] transition-all duration-300 px-3 py-1 rounded-md" to="/history">History</Link>
</div>
</div>
<div className="flex items-center gap-4">
<button className="material-symbols-outlined p-2 text-[#00488d] scale-95 active:scale-90 transition-transform">notifications</button>
<button className="material-symbols-outlined p-2 text-[#00488d] scale-95 active:scale-90 transition-transform border-b-2 border-[#00488d] pb-1">settings</button>
<Link to="/account" className="w-10 h-10 rounded-full bg-surface-container overflow-hidden">
<img alt="User profile avatar" className="w-full h-full object-cover" data-alt="professional headshot of a creative director in a minimalist studio with soft natural light" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC6P3AdVRvAJIAi4rM5eZU7mV1Ps4dQIUt0hwZtL8pvWpREyBqLW6XbezqI5Ej85ZL7b7RRFn8c4jYK690InRqAxQewII0YvV-5ExB_PEMskh3sF0eDvOxSyvyPfRVRdohPwhvhpn5RQ0AYHgczC7-ICRFEPZ3sWhf2B4wJG3cmwKzDLFCp9eAUPaTY-uK_GIgonQ5wbWele4WsxeUGd7XbFE_piQPyVVdZ_6tSww5m7cg4bKsya8XD9fM0A_gofH3ZNNJyH68_zg"/>
</Link>
</div>
</nav>
<div className="flex min-h-screen pt-20">
{/*  SideNavBar Component  */}

{/*  Main Content (Canvas)  */}
<main className="flex-1 bg-surface p-8 lg:p-12 overflow-y-auto">
<div className="max-w-4xl mx-auto w-full">
<header className="mb-12">
<h1 className="text-5xl font-black font-headline tracking-tighter text-on-background mb-2">Settings</h1>
<p className="text-on-surface-variant font-body">Personalize your curation and restoration environment.</p>
</header>
<div className="space-y-8">
{/*  Settings Grid  */}
<div className="grid grid-cols-1 md:grid-cols-2 gap-8">
{/*  Typography Group  */}
<section className="bg-surface-container-low rounded-xl p-8 space-y-6">
<div className="flex items-center gap-3 mb-2">
<span className="material-symbols-outlined text-primary">text_fields</span>
<h2 className="text-xl font-bold font-headline">Typography</h2>
</div>
<div className="space-y-4">
<div>
<label className="block text-sm font-medium text-on-surface-variant mb-2">Primary Translation Font</label>
<select className="w-full bg-surface-container border-none rounded-md p-3 text-on-surface focus:ring-2 focus:ring-primary-container transition-all">
<option>Inter (Default)</option>
<option>Manrope</option>
<option>Roboto</option>
<option>Playfair Display</option>
<option>Fira Code</option>
</select>
</div>
<div>
<label className="block text-sm font-medium text-on-surface-variant mb-2">Translation Color</label>
<div className="flex gap-3">
<button className="w-10 h-10 rounded-full border-2 border-white ring-2 ring-primary ring-offset-2 bg-[#131b2e]"></button>
<button className="w-10 h-10 rounded-full border-2 border-white bg-primary"></button>
<button className="w-10 h-10 rounded-full border-2 border-white bg-tertiary"></button>
<button className="w-10 h-10 rounded-full border-2 border-white bg-[#ffffff] shadow-sm"></button>
<button className="w-10 h-10 rounded-full border-2 border-white bg-gradient-to-tr from-primary to-tertiary flex items-center justify-center">
<span className="material-symbols-outlined text-[16px] text-white">palette</span>
</button>
</div>
</div>
</div>
</section>
{/*  Appearance Group  */}
<section className="bg-surface-container-low rounded-xl p-8 space-y-6">
<div className="flex items-center gap-3 mb-2">
<span className="material-symbols-outlined text-primary">dark_mode</span>
<h2 className="text-xl font-bold font-headline">Appearance</h2>
</div>
<div className="space-y-6">
<div>
<label className="block text-sm font-medium text-on-surface-variant mb-4">Interface Theme</label>
<div className="grid grid-cols-2 gap-4">
<button onClick={() => setIsDark(false)} className={`flex flex-col items-center gap-3 p-4 rounded-md border-2 transition-all ${!isDark ? 'border-primary bg-surface' : 'border-transparent bg-inverse-surface opacity-60 hover:opacity-100'}`}>
<div className="w-full h-12 bg-white rounded border border-outline-variant/20 flex items-center px-2">
<div className="w-8 h-2 bg-primary/20 rounded"></div>
</div>
<span className="text-xs font-bold uppercase tracking-widest">Light Mode</span>
</button>
<button onClick={() => setIsDark(true)} className={`flex flex-col items-center gap-3 p-4 rounded-md border-2 transition-all ${isDark ? 'border-primary bg-surface text-on-surface' : 'border-transparent bg-inverse-surface opacity-60 hover:opacity-100 text-white'}`}>
<div className="w-full h-12 bg-slate-900 rounded flex items-center px-2">
<div className="w-8 h-2 bg-blue-400/20 rounded"></div>
</div>
<span className="text-xs font-bold uppercase tracking-widest">Dark Mode</span>
</button>
</div>
</div>
</div>
</section>
{/*  Language Logic  */}
<section className="bg-surface-container-low rounded-xl p-8 md:col-span-2">
<div className="flex items-center justify-between">
<div className="flex items-center gap-3">
<span className="material-symbols-outlined text-primary">auto_awesome</span>
<div>
<h2 className="text-xl font-bold font-headline">Processing Logic</h2>
<p className="text-xs text-on-surface-variant">Configure how the curator handles incoming assets.</p>
</div>
</div>
<label className="relative inline-flex items-center cursor-pointer">
<input defaultChecked className="sr-only peer" type="checkbox"/>
<div className="w-14 h-8 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
</label>
</div>
<div className="mt-4 pt-4 border-t border-outline-variant/10 flex items-center justify-between">
<span className="text-sm font-medium">Auto-detect source language</span>
<span className="text-xs font-bold text-primary uppercase">Active</span>
</div>
</section>
{/*  Display Preferences (Slider)  */}
<section className="bg-surface-container-low rounded-xl p-8 md:col-span-2 space-y-6">
<div className="flex items-center gap-3 mb-2">
<span className="material-symbols-outlined text-primary">splitscreen</span>
<h2 className="text-xl font-bold font-headline">Comparison Interface</h2>
</div>
<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
<div className="space-y-3">
<p className="text-sm font-medium">Slider Orientation</p>
<div className="flex gap-2">
<button className="flex-1 py-2 bg-primary text-white rounded-md text-xs font-bold uppercase tracking-tighter">Vertical</button>
<button className="flex-1 py-2 bg-surface-container text-on-surface-variant rounded-md text-xs font-bold uppercase tracking-tighter">Horizontal</button>
</div>
</div>
<div className="space-y-3">
<p className="text-sm font-medium">Default State</p>
<select className="w-full bg-surface-container border-none rounded-md p-2 text-xs font-bold uppercase focus:ring-2 focus:ring-primary-container">
<option>Show Original</option>
<option>Show Translated</option>
<option>Split 50/50</option>
</select>
</div>
<div className="space-y-3">
<p className="text-sm font-medium">Visual Clarity</p>
<div className="flex items-center gap-3 h-[40px]">
<span className="text-[10px] uppercase font-bold opacity-50">Grayscale</span>
<input className="flex-1 h-1 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary" type="range"/>
<span className="text-[10px] uppercase font-bold opacity-50">Color</span>
</div>
</div>
</div>
</section>
</div>
{/*  Action Button  */}
<div className="pt-8 flex justify-end">
<button onClick={handleSave} className="group relative px-12 py-4 bg-gradient-to-r from-primary to-primary-container text-white rounded-md font-bold text-lg shadow-[0_12px_40px_rgba(0,72,141,0.2)] hover:scale-[1.02] active:scale-95 transition-all">
                        {saved ? "Đã lưu!" : "Lưu cài đặt"}
    </button>
</div>
</div>
</div>
</main>
</div>
{/*  Footer Component  */}
<footer className="bg-[#faf8ff] dark:bg-[#0f172a] flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full border-t border-outline-variant/10">
<div className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60">
            © 2024 IIMT Curator. Precision Restoration.
        </div>
<div className="flex gap-8 mt-4 md:mt-0 font-['Inter'] text-xs uppercase tracking-widest">
<Link className="opacity-60 hover:opacity-100 transition-all hover:underline underline-offset-4" to="#">Privacy Policy</Link>
<Link className="opacity-60 hover:opacity-100 transition-all hover:underline underline-offset-4" to="#">Terms of Service</Link>
<Link className="opacity-60 hover:opacity-100 transition-all hover:underline underline-offset-4" to="#">API Documentation</Link>
<Link className="opacity-60 hover:opacity-100 transition-all hover:underline underline-offset-4" to="#">Support</Link>
</div>
</footer>
    </>
  );
};

export default SettingsPage;
