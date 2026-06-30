import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <style>{`
        @keyframes nf-float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
        @keyframes nf-glow   { 0%,100%{opacity:0.25} 50%{opacity:0.5} }
        @keyframes nf-fadeup { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .nf-visible { animation: nf-fadeup 0.55s cubic-bezier(0.22,1,0.36,1) both; }
      `}</style>

      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        textAlign: 'center',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Background glows */}
        <div style={{
          position: 'absolute',
          width: '500px', height: '500px',
          borderRadius: '50%',
          background: 'var(--blueG)',
          filter: 'blur(120px)',
          top: '10%', left: '50%', transform: 'translateX(-50%)',
          animation: 'nf-glow 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />

        {/* 404 number */}
        <div
          className={visible ? 'nf-visible' : ''}
          style={{
            fontSize: 'clamp(100px, 20vw, 200px)',
            fontWeight: 800,
            fontFamily: 'var(--mono)',
            letterSpacing: '-0.05em',
            lineHeight: 1,
            background: 'linear-gradient(135deg, var(--ink2), var(--ink4))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            position: 'relative',
            zIndex: 1,
            animationDelay: '0ms',
          }}
        >
          404
        </div>

        {/* VT ghost text */}
        <div style={{
          position: 'absolute',
          fontSize: 'clamp(160px, 35vw, 380px)',
          fontWeight: 900,
          letterSpacing: '-0.06em',
          color: 'var(--ink)',
          opacity: 0.025,
          userSelect: 'none',
          pointerEvents: 'none',
          zIndex: 0,
          animation: 'nf-float 6s ease-in-out infinite',
        }}>VT</div>

        {/* Icon */}
        <div
          className={visible ? 'nf-visible' : ''}
          style={{
            width: '72px', height: '72px',
            borderRadius: '20px',
            background: 'var(--paper)',
            border: '1px solid var(--ln)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '32px',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
            position: 'relative', zIndex: 1,
            animationDelay: '80ms',
          }}
        >
          🔍
        </div>

        {/* Heading */}
        <h1
          className={visible ? 'nf-visible' : ''}
          style={{
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 800,
            color: 'var(--ink)',
            letterSpacing: '-0.03em',
            margin: '0 0 12px',
            position: 'relative', zIndex: 1,
            animationDelay: '140ms',
          }}
        >
          Trang không tồn tại
        </h1>

        {/* Subtext */}
        <p
          className={visible ? 'nf-visible' : ''}
          style={{
            fontSize: '15px',
            color: 'var(--ink4)',
            maxWidth: '340px',
            lineHeight: 1.65,
            margin: '0 0 32px',
            position: 'relative', zIndex: 1,
            animationDelay: '200ms',
          }}
        >
          URL bạn truy cập không hợp lệ hoặc đã bị xóa.
          Hãy quay về trang chủ để tiếp tục.
        </p>

        {/* Actions */}
        <div
          className={visible ? 'nf-visible' : ''}
          style={{
            display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center',
            position: 'relative', zIndex: 1,
            animationDelay: '260ms',
          }}
        >
          <Link
            to="/"
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, var(--blue), var(--blue2))',
              color: '#fff',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
              boxShadow: '0 4px 16px rgba(34,82,228,0.28)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              display: 'inline-flex', alignItems: 'center', gap: '6px',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 24px rgba(34,82,228,0.38)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 4px 16px rgba(34,82,228,0.28)'; }}
          >
            ← Về trang chủ
          </Link>

          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 28px',
              borderRadius: '12px',
              border: '1px solid var(--ln)',
              background: 'var(--paper)',
              color: 'var(--ink3)',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'var(--paper)')}
          >
            ← Quay lại
          </button>
        </div>
      </div>
    </>
  );
};

export default NotFoundPage;
