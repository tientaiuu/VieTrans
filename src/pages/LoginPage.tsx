import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MOCK_DATA } from '../data/mockData';

export const LoginPage: React.FC = () => {
    const [showPassword, setShowPassword] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const navigate = useNavigate();

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        // Giả lập Đăng nhập, đưa về Home
        navigate('/');
    };

    return (
        <>
            <main className="flex-grow flex items-center justify-center p-6 relative overflow-hidden h-screen min-h-[800px]">
                {/*  Background Decorative Elements  */}
                <div className="absolute top-0 left-0 w-full h-full -z-10 overflow-hidden">
                    <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-container/10 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-12 right-12 w-[32rem] h-[32rem] bg-secondary-container/20 rounded-full blur-[100px]"></div>
                </div>
                
                <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden rounded-xl shadow-[0_12px_40px_rgba(19,27,46,0.06)] bg-surface-container-lowest z-10 relative">
                    {/*  Left Side  */}
                    <div className="lg:col-span-5 relative hidden lg:block overflow-hidden bg-primary p-12 flex flex-col justify-between text-on-primary">
                        <img alt="Background" className="absolute inset-0 object-cover opacity-40 mix-blend-overlay" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA2oCz6H4n5XUKvFDrLC9McFYlNSODdY-ldHgnB3P0Zu2R7ed5TqKG-ql3ihQhLsY9hUY0bXss46W-faYKilzYXdZhCM1xqZOAd6l8VLfh5dL3aYHjIUkyujwteUwtdB3m4HCaNqwgxRzUFB-Mwl0cC8E0qaMGb9KPvpXyGxzjVxIhnzfqMlEQM39rPKoSqFxy0etLnKZIGc5075dL-9GWZLDrb2uN7I7y2gw4ID4AzAgbgMpLjc0QsYjOt1kc7k7e8eizrIJsvkA"/>
                        <div className="relative z-10 flex-grow">
                            <h1 className="font-headline text-3xl font-black tracking-tighter mb-2">IIMT Curator</h1>
                            <p className="text-on-primary-container font-medium opacity-80 uppercase tracking-widest text-xs">Precision Restoration v1.0</p>
                        </div>
                        <div className="relative z-10 mb-12 flex-grow flex flex-col justify-end">
                            <blockquote className="font-headline text-2xl font-bold leading-tight mb-6 mt-12">
                                "Biến đổi và bảo tồn giá trị văn hóa thông qua sức mạnh của trí tuệ nhân tạo."
                            </blockquote>
                            <div className="flex gap-4">
                                <div className="flex -space-x-3">
                                    <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAjyylRGz0Quk-NjZsrDzIFxYArnuv-Chpo_EYURr7VA9LCac_tzRTni01OrsVWWQDcdMpiLM5Om4H-yw0lv67orCzkcSP8IUGFpFohKEhVQGfu3pXiCJTeBLHwtn-lBNN1GAifSEDXIycL7nzwP2S4uugLFCkl64edgiUibUXF-7FzvZwK_HhdmiZF-XKVsXUIZNFyf6pAAyWx-Jya1IrMkp_4wzzA_WxtERPP9Z-tuxsQfWwUzFhW6yq7TvcVd3pPyYLjLPcxng" alt="" />
                                    </div>
                                    <div className="w-10 h-10 rounded-full border-2 border-primary overflow-hidden">
                                        <img className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuC4MaK1NFIFehPCScQEvS49_6s1Krzj5h3FW-FS2zHGyRt-1aFXhxE4wC6uuH_R-Z2wCCWOA3nwKe_xg_2HmNucR6tlPGTOC4XTdYk0H2i14wMWrKE7vWQmR6Mag3B5J_lfgzICFMiHUPoWrba1QQ-xRBC4vHSYULuDSa6BM8fTKb88WNaSG2DFuBz7dvUYsNXezqRjEXbexW05GRg-7mRQAl7URWU1_q8U8S0bQbVPXhPu6ZERHTkYiT6XlmmpOlYnZwZ3VKaNew" alt="" />
                                    </div>
                                </div>
                                <p className="text-sm self-center opacity-70">+2.4k người dùng tin tưởng</p>
                            </div>
                        </div>
                        <div className="relative z-10 flex gap-6 text-xs font-label uppercase tracking-widest opacity-60">
                            <span>Precision</span>
                            <span>•</span>
                            <span>Integrity</span>
                            <span>•</span>
                            <span>Artistry</span>
                        </div>
                    </div>
                    
                    {/*  Right Side  */}
                    <div className="lg:col-span-7 bg-surface-container-lowest p-8 md:p-16 flex flex-col min-h-[600px] justify-between">
                        <div className="flex justify-between items-center mb-10 w-full max-w-md mx-auto">
                            <div className="lg:hidden">
                                <h1 className="font-headline text-2xl font-black tracking-tighter text-primary">IIMT</h1>
                            </div>
                            <div className="flex bg-surface-container p-1 rounded-lg ml-auto">
                                <button className="px-6 py-2 text-sm font-semibold rounded-md bg-surface-container-lowest text-primary shadow-sm drop-shadow-sm">Đăng nhập</button>
                                <button className="px-6 py-2 text-sm font-medium text-on-surface-variant hover:text-primary transition-colors">Đăng ký</button>
                            </div>
                        </div>
                        
                        <div className="max-w-md mx-auto w-full flex-grow flex flex-col justify-center">
                            <header className="mb-8">
                                <h2 className="font-headline text-3xl font-extrabold text-on-background tracking-tight mb-2">Chào mừng trở lại</h2>
                                <p className="text-on-surface-variant text-sm">Truy cập vào không gian làm việc số hóa của bạn.</p>
                            </header>
                            
                            <form className="space-y-6" onSubmit={handleLogin}>
                                <div className="space-y-4">
                                    <div className="group">
                                        <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2 ml-1" htmlFor="email">Địa chỉ Email</label>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" data-icon="mail">mail</span>
                                            <input required className="w-full pl-12 pr-4 py-4 bg-surface-container border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-body" id="email" placeholder="name@example.com" type="email"/>
                                        </div>
                                    </div>
                                    <div className="group">
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant" htmlFor="password">Mật khẩu</label>
                                            <button type="button" onClick={() => setIsModalOpen(true)} className="text-xs font-bold text-primary hover:text-primary-container transition-colors">Quên mật khẩu?</button>
                                        </div>
                                        <div className="relative">
                                            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-variant group-focus-within:text-primary transition-colors" data-icon="lock">lock</span>
                                            <input required className="w-full pl-12 pr-12 py-4 bg-surface-container border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-body tracking-wider" id="password" placeholder="••••••••" type={showPassword ? "text" : "password"}/>
                                            <button onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-variant hover:text-on-surface transition-colors" type="button">
                                                <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3 px-1 mt-4">
                                    <input className="w-5 h-5 cursor-pointer rounded border-outline-variant text-primary focus:ring-primary transition-all" id="remember" type="checkbox"/>
                                    <label className="text-sm cursor-pointer text-on-surface-variant font-medium select-none" htmlFor="remember">Ghi nhớ đăng nhập</label>
                                </div>
                                
                                <div className="space-y-3 pt-4">
                                    <button className="w-full py-4 bg-gradient-to-r from-primary to-primary-container text-white font-bold rounded-xl shadow-lg hover:shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all text-base" type="submit">
                                        Đăng nhập ngay
                                    </button>
                                    <button onClick={handleLogin} className="w-full py-4 flex items-center justify-center gap-2 text-on-surface-variant font-semibold bg-surface-container hover:bg-surface-container-high border border-transparent rounded-xl transition-all" type="button">
                                        <span className="material-symbols-outlined text-sm">person_off</span>
                                        Đăng nhập ẩn danh
                                    </button>
                                </div>
                            </form>
                            
                            <div className="relative my-8">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-surface-container-highest"></div>
                                </div>
                                <div className="relative flex justify-center text-xs uppercase tracking-[0.2em]">
                                    <span className="bg-surface-container-lowest px-4 text-on-surface-variant font-bold">Hoặc tiếp tục với</span>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <button className="flex items-center justify-center py-3 border-2 border-surface-container-highest rounded-xl hover:bg-surface-container-high transition-all">
                                    <span className="text-sm font-bold text-on-surface">Khách (Guest)</span>
                                </button>
                                <button className="flex items-center justify-center py-3 border-2 border-surface-container-highest rounded-xl hover:bg-surface-container-high transition-all">
                                    <span className="text-sm font-bold text-on-surface">SSO Doanh nghiệp</span>
                                </button>
                            </div>
                            
                        </div>
                    </div>
                </div>
            </main>

            {/*  Forgot Password Modal  */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#131b2e]/40 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-surface-container-lowest w-full max-w-md p-8 rounded-2xl shadow-2xl relative animate-in slide-in-from-bottom-4 duration-300">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-outline-variant hover:text-on-surface transition-colors cursor-pointer bg-surface-container w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container-high">
                            <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                        <h3 className="font-headline text-2xl font-bold mb-2 text-on-background">Khôi phục mật khẩu</h3>
                        <p className="text-on-surface-variant text-sm mb-6">Chúng tôi sẽ gửi mã OTP gồm 6 chữ số đến email của bạn để xác minh.</p>
                        <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsModalOpen(false); alert("Mã OTP đã được gửi ảo (MOCK)!") }}>
                            <div className="group">
                                <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-2">Email khôi phục</label>
                                <input required className="w-full px-4 py-4 bg-surface-container border-none rounded-xl text-on-surface focus:ring-2 focus:ring-primary/20 transition-all font-body" placeholder="name@example.com" type="email"/>
                            </div>
                            <button type="submit" className="w-full py-4 bg-primary text-white font-bold text-base rounded-xl shadow-lg hover:bg-primary/90 transition-all active:scale-[0.98]">
                                Gửi mã OTP
                            </button>
                            <div className="text-center">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="text-sm font-bold text-primary opacity-80 hover:opacity-100 transition-opacity">Quay lại Đăng nhập</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
};

export default LoginPage;
