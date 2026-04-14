import React from 'react';
import { Link } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const HistoryPage: React.FC = () => {
  return (
    <>
      {/*  SideNavBar (Authority Source: JSON)  */}

{/*  Main Canvas  */}
<main className="flex-grow flex flex-col min-h-screen">
{/*  TopAppBar (Authority Source: JSON)  */}
<header className="fixed top-0 w-full z-50 bg-[#faf8ff]/80 dark:bg-[#131b2e]/80 backdrop-blur-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] h-20 flex justify-between items-center px-8 ">
<div className="flex items-center gap-8">
<span className="text-2xl font-black text-[#00488d] dark:text-[#dae2fd] tracking-tighter font-['Manrope']">IIMT Curator</span>
<nav className="hidden md:flex gap-6 font-['Manrope'] tracking-tight font-bold">
<Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d]" to="/">Home</Link>
<Link className="text-[#131b2e]/60 dark:text-[#dae2fd]/60 hover:text-[#00488d]" to="/translate">Translate</Link>
<Link className="text-[#00488d] dark:text-[#dae2fd] border-b-2 border-[#00488d] pb-1" to="/history">History</Link>
</nav>
</div>
<div className="flex items-center gap-4">
<button className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all text-on-surface-variant">
<span className="material-symbols-outlined">notifications</span>
</button>
<div className="hidden md:flex items-center bg-surface-container px-4 py-2 rounded-full border border-outline-variant/10">
<span className="material-symbols-outlined text-on-surface-variant text-sm" data-icon="search">search</span>
<input className="bg-transparent border-none focus:ring-0 text-sm w-48 placeholder:text-on-surface-variant/50 outline-none" placeholder="Search archive..." type="text"/>
</div>
<Link to="/settings" className="p-2 rounded-full hover:bg-[#f2f3ff] transition-all text-on-surface-variant">
<span className="material-symbols-outlined">settings</span>
</Link>
<Link to="/account" className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center border-2 border-primary/10 overflow-hidden">
<img alt="User profile avatar" data-alt="close-up portrait of a professional man with a neutral expression against a soft studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCl4ul2UZzF5GrIwGf3pUrFhi2TarwaklrCw6VQDy7WL7EdW0UtMW24MidZOx0K_D5w2kx2KPVnm2YkVBfqiBpdFf1dij_ov9SnL8TnF-JB5lZCg3hEa27Ui6s4Q3CiHJXOw-Hac5XeueQuhMbSpVjr05x2d0Zadu6Tqsn6JF-I9M37APomAM4EjPPpx7A8zVYRIHicCzlgUaiXcXc7ZOtuLg6MbZ6v3OxTqKpygmEHxoEl6EOS9xcLN--U__OjPHZcoLEzao-GPw"/>
</Link>
</div>
</header>
{/*  Content Area  */}
<div className="mt-20 p-8 flex-grow">
{/*  Filter Bar: Asymmetric Layout  */}
<div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-10 gap-4">
<div className="space-y-1">
<p className="text-on-surface-variant text-sm font-medium">Curated Archive</p>
<h2 className="text-3xl font-extrabold tracking-tight text-on-surface">Precision Restoration Logs</h2>
</div>
<div className="flex gap-3">
<div className="bg-surface-container-low p-1 rounded-lg flex">
<button className="px-4 py-1.5 text-xs font-semibold bg-surface-container-highest text-primary rounded-md shadow-sm">All</button>
<button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Documents</button>
<button className="px-4 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface">Signage</button>
</div>
<button className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-lg text-sm font-medium border border-outline-variant/10 hover:bg-surface-container transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="calendar_today">calendar_today</span>
                        This Month
                    </button>
</div>
</div>
{/*  List of Restorations  */}
<div className="space-y-8">
{/*  History Item 1  */}
<div className="group bg-surface-container-lowest rounded-xl p-6 flex flex-col lg:flex-row gap-8 items-center transition-all duration-300 hover:bg-surface-container-low">
<div className="flex gap-4 w-full lg:w-auto shrink-0">
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-surface-container shadow-sm">
<img className="w-full h-full object-cover grayscale opacity-60" data-alt="close-up of an old vintage book page with faded text and yellowed edges in dramatic side lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBKaHV0jXpcqfdvMoBiGS8D1hJ039-EBi4Ma3hcDdYU2nu6LsCDUq1s1kdORJNUtrWYek8t4BQf-gAyqNUcH3i78vnVJ5MH6YDAL-rtWm4oD4lnyiTq-IIreYBP6mXjduAUjL4E3Y59XDsRk3bHgHiGRbzmFCmwmBiciItwAtg137ykG3nDkIrQi7JwkJHdGFRXJKZOQ7jWhTk6va88cxmRzd0pufkw2NReRjBom9lGopAluIo1qpkV-jrDZHfYf-6lzCrqlyki5w"/>
<div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Original</div>
</div>
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-primary-container shadow-md ring-4 ring-primary-container/20">
<img className="w-full h-full object-cover" data-alt="digital restoration of an old book page with crisp black text and clean white background paper texture" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBJ8sCmLHPIck7brFvsVcqSqfPqmI34Cc9TW2JrHw72rrrpowpuWiErSeekXDDIGz4Qe7WxD8_UzGbwbVqiLCRHW-I7wxmExMd-2ldW7g7KX2BCMaxsO9waJAXx9a0_SQcD-dUjO2oFY-myf8Rg82LWf20xW1OKn8sEufg3NxWybzZQRdC0hb2va9s326c2YgVqQ9SIx1FylOorhpp_Tot5EjYIjDHB-LJ5PE39zmllFkn4jBR3A4cS7WgBMJeQ7GvouvjVSp3Yew"/>
<div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Restored</div>
</div>
</div>
<div className="flex-grow space-y-3">
<div className="flex justify-between items-start">
<div>
<h3 className="text-xl font-bold text-on-surface leading-tight">Technical Manual - Page 42</h3>
<div className="flex items-center gap-3 mt-1">
<span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded">German → English</span>
<span className="text-xs text-on-surface-variant/60">•</span>
<span className="text-xs text-on-surface-variant/60 flex items-center gap-1">
<span className="material-symbols-outlined text-sm" data-icon="schedule">schedule</span>
                                        Oct 24, 2024 · 14:22 PM
                                    </span>
</div>
</div>
</div>
<p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2">Precision translation of industrial schematics. All labels preserved in vector format with 99.8% semantic accuracy. OCR restoration applied to hand-written annotations.</p>
</div>
<div className="flex lg:flex-col gap-2 w-full lg:w-auto">
<button className="flex-grow lg:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined text-sm" data-icon="visibility">visibility</span>
                            View Details
                        </button>
<div className="flex gap-2">
<button className="flex-grow flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                                Redownload
                            </button>
<button className="flex items-center justify-center w-11 h-11 border border-error/20 text-error rounded-lg hover:bg-error-container/30 transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="delete">delete</span>
</button>
</div>
</div>
</div>
{/*  History Item 2  */}
<div className="group bg-surface-container-lowest rounded-xl p-6 flex flex-col lg:flex-row gap-8 items-center transition-all duration-300 hover:bg-surface-container-low">
<div className="flex gap-4 w-full lg:w-auto shrink-0">
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-surface-container shadow-sm">
<img className="w-full h-full object-cover grayscale opacity-60" data-alt="blurry low-light photo of a neon city sign in Tokyo with Japanese characters" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPVITd_yA7mstMvjGRhZhWelxSsey6T1EXfZLs7Rbmf6NTjadqssrMSE4JzThnrR196WZKFZzDfEant3PZNf7bDdVFunT345k80u3ZcROLv_Lv1agBhzAJFvGWZQJV2wo-d4F-r57IJoKrnkNyU87u4MC6DVpvrdsy2Q06PxiAGECdFqcizV5cq9qZzvvoc7ClkhupXtcEJnkSKg88ZTCiOtbMfmtfraDtGP49NCwh1V5T5kt4Si5xStOUx6RkLAPiA0qSjm88bQ"/>
<div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Original</div>
</div>
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-primary-container shadow-md ring-4 ring-primary-container/20">
<img className="w-full h-full object-cover" data-alt="enhanced bright city neon sign with crisp English translation overlaying original Japanese characters" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA8WnVXGMtlHOYNZcatPmojcc_Oe4UhilLhlqEEGjQyfHufSRS8lyQtnbHOl1MlfE8AERoisdYBDf2iu0wjdhkWvNcGmzV1B74foKJBuamLQ71d1Dgrr5gozIBVTsqt8M1KaZgkFqviPQFdtd76vpozUDxjexgykv5CGv9pKBwNJ1gwLrMnTg7hVigRsRO-GRNh5RTolUTqzem_-tQEG2Fiqo-SnEXgIkMRAFFStb1Gwh5UFW3_VkMrOSZPMjMvSZYEbPFWPyrqeQ"/>
<div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Restored</div>
</div>
</div>
<div className="flex-grow space-y-3">
<div className="flex justify-between items-start">
<div>
<h3 className="text-xl font-bold text-on-surface leading-tight">City Wayfinding - Shinjuku</h3>
<div className="flex items-center gap-3 mt-1">
<span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded">Japanese → English</span>
<span className="text-xs text-on-surface-variant/60">•</span>
<span className="text-xs text-on-surface-variant/60 flex items-center gap-1">
<span className="material-symbols-outlined text-sm" data-icon="schedule">schedule</span>
                                        Oct 22, 2024 · 09:10 AM
                                    </span>
</div>
</div>
</div>
<p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2">Public signage translation for municipal archive. High-fidelity color matching used to preserve neon glow effects in translated text layers.</p>
</div>
<div className="flex lg:flex-col gap-2 w-full lg:w-auto">
<button className="flex-grow lg:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined text-sm" data-icon="visibility">visibility</span>
                            View Details
                        </button>
<div className="flex gap-2">
<button className="flex-grow flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                                Redownload
                            </button>
<button className="flex items-center justify-center w-11 h-11 border border-error/20 text-error rounded-lg hover:bg-error-container/30 transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="delete">delete</span>
</button>
</div>
</div>
</div>
{/*  History Item 3  */}
<div className="group bg-surface-container-lowest rounded-xl p-6 flex flex-col lg:flex-row gap-8 items-center transition-all duration-300 hover:bg-surface-container-low">
<div className="flex gap-4 w-full lg:w-auto shrink-0">
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-surface-container shadow-sm">
<img className="w-full h-full object-cover grayscale opacity-60" data-alt="faded restaurant menu with French handwriting and oil stains on rough paper" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAWSGHBGmiYtCD17ecxtTZb2XNyEc15pNeTK4jNgmz0P_fJTBg1_bs7eb744tTQkr0U1uLM1DSj7yebcNN6CT6YoLk3tRVxMBm910lAv8J21RHVGvySnPCxybqn4kEFw1S968s6vR793E6I2w3uw1rNgmFi1aXltZYYqFDozquLuzxN1MB9qwsEbvsJYrgSm5WIB2DC-R0kbtDgsFo_Closz-746o7_k0Fu7yJqWHrS5M_IJ2GHcFBN-uJeyhCuO6gSSdeBfY22Vg"/>
<div className="absolute top-2 left-2 bg-black/40 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Original</div>
</div>
<div className="relative w-40 h-40 rounded-lg overflow-hidden bg-primary-container shadow-md ring-4 ring-primary-container/20">
<img className="w-full h-full object-cover" data-alt="digitally cleaned restaurant menu with modernized font and clear English culinary descriptions" src="https://lh3.googleusercontent.com/aida-public/AB6AXuB2F6PiE36A-7dHPu5eNioX2IuGj406IEHpYsJwsDxR3wnFiBextAYvizOVeDwbuVrONjuvFzORw5Tw_UoFH_GvZPfQpU1Y4oW6ej9p4QnZtlRy45RBEFixcuKs0XwSNq7QDXAYLyo-FHMvVl0pryn3vA4E9z8u_9JWkmxK191zNqHWNvmvNPSuLfhkOUjNjCEWMcghnmSHeIStqDs_xtbQXEoi1khVTTjxVRSaKpAw55TbIVlNyr4EcoNyxNChl6JdiscMHJ5a8Q"/>
<div className="absolute top-2 left-2 bg-primary/80 backdrop-blur-md text-[10px] text-white px-2 py-0.5 rounded-full uppercase tracking-widest font-bold">Restored</div>
</div>
</div>
<div className="flex-grow space-y-3">
<div className="flex justify-between items-start">
<div>
<h3 className="text-xl font-bold text-on-surface leading-tight">Le Petit Bistro Menu</h3>
<div className="flex items-center gap-3 mt-1">
<span className="text-xs text-on-surface-variant font-medium bg-surface-container px-2 py-0.5 rounded">French → English</span>
<span className="text-xs text-on-surface-variant/60">•</span>
<span className="text-xs text-on-surface-variant/60 flex items-center gap-1">
<span className="material-symbols-outlined text-sm" data-icon="schedule">schedule</span>
                                        Oct 20, 2024 · 18:45 PM
                                    </span>
</div>
</div>
</div>
<p className="text-sm text-on-surface-variant max-w-2xl line-clamp-2">Context-aware translation for culinary terminology. Handwriting recognition engine utilized for cursive script interpretation.</p>
</div>
<div className="flex lg:flex-col gap-2 w-full lg:w-auto">
<button className="flex-grow lg:flex-none flex items-center justify-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
<span className="material-symbols-outlined text-sm" data-icon="visibility">visibility</span>
                            View Details
                        </button>
<div className="flex gap-2">
<button className="flex-grow flex items-center justify-center gap-2 bg-secondary-container text-on-secondary-container px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-surface-container-highest transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="download">download</span>
                                Redownload
                            </button>
<button className="flex items-center justify-center w-11 h-11 border border-error/20 text-error rounded-lg hover:bg-error-container/30 transition-colors">
<span className="material-symbols-outlined text-sm" data-icon="delete">delete</span>
</button>
</div>
</div>
</div>
</div>
{/*  Pagination/Load More  */}
<div className="mt-12 flex justify-center">
<button className="px-8 py-3 bg-surface-container text-primary font-bold text-sm rounded-full hover:bg-surface-container-high transition-all flex items-center gap-2">
<span className="material-symbols-outlined text-sm" data-icon="expand_more">expand_more</span>
                    Load More Restorations
                </button>
</div>
</div>
{/*  Footer (Authority Source: JSON)  */}
<footer className="flex flex-col md:flex-row justify-between items-center px-12 py-8 w-full bg-[#faf8ff] dark:bg-[#0f172a] border-t-0 mt-auto">
<p className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60">© 2024 IIMT Curator. Precision Restoration.</p>
<div className="flex gap-8 mt-4 md:mt-0">
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Privacy Policy</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Terms of Service</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">API Documentation</Link>
<Link className="font-['Inter'] text-xs uppercase tracking-widest text-[#00488d] opacity-60 hover:opacity-100 transition-opacity" to="#">Support</Link>
</div>
</footer>
</main>
{/*  Floating UI: Bottom Nav for Mobile Only (Standard Shell Rules)  */}
<nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#faf8ff]/95 backdrop-blur-lg flex justify-around items-center h-16 z-50 px-4 border-t-0 shadow-[0_-10px_30px_rgba(19,27,46,0.05)]">
<button className="flex flex-col items-center gap-1 text-[#131b2e]/60">
<span className="material-symbols-outlined" data-icon="dashboard">dashboard</span>
<span className="text-[10px] font-bold">Home</span>
</button>
<button className="flex flex-col items-center gap-1 text-[#131b2e]/60">
<span className="material-symbols-outlined" data-icon="translate">translate</span>
<span className="text-[10px] font-bold">Translate</span>
</button>
<button className="flex flex-col items-center gap-1 text-[#00488d]">
<span className="material-symbols-outlined" data-icon="history" style={{"fontVariationSettings":"'FILL' 1"}}>history</span>
<span className="text-[10px] font-bold">History</span>
</button>
<button className="flex flex-col items-center gap-1 text-[#131b2e]/60">
<span className="material-symbols-outlined" data-icon="settings">settings</span>
<span className="text-[10px] font-bold">Settings</span>
</button>
</nav>
    </>
  );
};

export default HistoryPage;
