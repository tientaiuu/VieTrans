import React, { useEffect, useState } from 'react';

const CHANGELOG = [
  {
    version: 'v1.3.0',
    date: '22 Jun 2026',
    tag: 'latest',
    tagColor: '#22c55e',
    items: [
      { type: 'feat', text: 'Pipeline Canvas Visualization — xem từng bước dịch ngay trong Studio' },
      { type: 'feat', text: 'Trang Pricing, About, Changelog' },
      { type: 'feat', text: 'Toast notification system thay thế alert()' },
      { type: 'feat', text: 'Mobile responsive Navbar với hamburger menu' },
      { type: 'feat', text: 'SEO meta tags, Open Graph, Twitter Card' },
      { type: 'feat', text: 'Trang 404 với animation' },
      { type: 'fix', text: 'CORS config đọc từ environment variables' },
      { type: 'fix', text: 'Change password form kết nối thực với backend' },
      { type: 'impr', text: 'Tab Pipeline trong done state để review lại stages' },
    ],
  },
  {
    version: 'v1.2.0',
    date: '10 Jun 2026',
    tag: '',
    tagColor: '',
    items: [
      { type: 'feat', text: 'Comparison Slider — kéo qua lại giữa ảnh gốc và ảnh dịch' },
      { type: 'feat', text: 'Canvas Editor — vẽ chú thích trực tiếp lên ảnh kết quả' },
      { type: 'feat', text: 'Notification panel lấy dữ liệu từ lịch sử thật' },
      { type: 'impr', text: 'Dashboard calendar filter theo ngày' },
      { type: 'fix', text: 'Thumbnail generation và cache cho history items' },
    ],
  },
  {
    version: 'v1.1.0',
    date: '28 May 2026',
    tag: '',
    tagColor: '',
    items: [
      { type: 'feat', text: 'Auth system — đăng ký, đăng nhập, forgot password' },
      { type: 'feat', text: 'Dashboard với lịch sử dịch và download' },
      { type: 'feat', text: 'Dark/light theme toggle' },
      { type: 'feat', text: 'Custom cursor animation' },
      { type: 'impr', text: 'Page transitions với AnimatePresence' },
    ],
  },
  {
    version: 'v1.0.0',
    date: '1 May 2026',
    tag: 'initial',
    tagColor: 'var(--ink4)',
    items: [
      { type: 'feat', text: 'Ra mắt VieTrans Studio — upload ảnh và nhận kết quả dịch EN→VI' },
      { type: 'feat', text: 'Pipeline 4 bước: Separation, Layout blocks, Translation, Fusion' },
      { type: 'feat', text: 'Batch processing queue' },
      { type: 'feat', text: 'Download kết quả dạng JPG/PNG/WebP' },
    ],
  },
];

const TYPE_STYLE: Record<string, { label: string; bg: string; color: string }> = {
  feat: { label: 'Mới',      bg: 'rgba(34,197,94,0.12)',  color: '#22c55e' },
  fix:  { label: 'Fix',      bg: 'rgba(239,68,68,0.1)',   color: '#ef4444' },
  impr: { label: 'Cải tiến', bg: 'var(--blueG)',          color: 'var(--blue)' },
};

export const ChangelogPage: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes cl-fadeup { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .cl-visible { animation: cl-fadeup 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{ background: 'var(--bg)', minHeight: '100vh', paddingTop: '80px', paddingBottom: '80px' }}>
        <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0 24px' }}>

          {/* Header */}
          <div className={visible ? 'cl-visible' : ''} style={{ marginBottom: '56px' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em',
              textTransform: 'uppercase', color: 'var(--blue)',
              fontFamily: 'var(--mono)', marginBottom: '16px',
            }}>
              Changelog
            </span>
            <h1 style={{
              fontSize: 'clamp(28px, 4vw, 44px)',
              fontWeight: 800, letterSpacing: '-0.04em',
              color: 'var(--ink)', margin: '0 0 14px',
            }}>
              Lịch sử cập nhật
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--ink4)', lineHeight: 1.65 }}>
              Tất cả thay đổi được ghi nhận theo từng phiên bản. Mới nhất hiển thị trước.
            </p>
          </div>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
            {CHANGELOG.map((entry, ei) => (
              <div
                key={entry.version}
                className={visible ? 'cl-visible' : ''}
                style={{ animationDelay: `${ei * 80}ms` }}
              >
                {/* Version header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  marginBottom: '20px',
                }}>
                  <div style={{
                    fontSize: '18px', fontWeight: 800,
                    color: 'var(--ink)', fontFamily: 'var(--mono)',
                    letterSpacing: '-0.03em',
                  }}>
                    {entry.version}
                  </div>
                  {entry.tag && (
                    <span style={{
                      fontSize: '9px', fontWeight: 700,
                      letterSpacing: '0.12em', textTransform: 'uppercase',
                      padding: '3px 8px', borderRadius: '99px',
                      background: `color-mix(in srgb, ${entry.tagColor} 15%, transparent)`,
                      color: entry.tagColor,
                      fontFamily: 'var(--mono)',
                    }}>
                      {entry.tag}
                    </span>
                  )}
                  <div style={{
                    marginLeft: 'auto',
                    fontSize: '12px', color: 'var(--ink4)',
                    fontFamily: 'var(--mono)',
                  }}>
                    {entry.date}
                  </div>
                </div>

                {/* Items */}
                <div style={{
                  borderRadius: '16px',
                  border: '1px solid var(--ln)',
                  background: 'var(--paper)',
                  overflow: 'hidden',
                }}>
                  {entry.items.map((item, ii) => {
                    const ts = TYPE_STYLE[item.type] ?? TYPE_STYLE.impr;
                    return (
                      <div
                        key={ii}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: '12px',
                          padding: '14px 20px',
                          borderBottom: ii < entry.items.length - 1 ? '1px solid var(--ln)' : 'none',
                        }}
                      >
                        <span style={{
                          fontSize: '9px', fontWeight: 700,
                          letterSpacing: '0.08em',
                          padding: '3px 7px', borderRadius: '5px',
                          background: ts.bg, color: ts.color,
                          fontFamily: 'var(--mono)',
                          flexShrink: 0, marginTop: '2px',
                          whiteSpace: 'nowrap',
                        }}>
                          {ts.label}
                        </span>
                        <span style={{ fontSize: '13.5px', color: 'var(--ink3)', lineHeight: 1.5 }}>
                          {item.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default ChangelogPage;
