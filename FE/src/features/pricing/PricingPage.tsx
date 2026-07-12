import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Building2,
  Check,
  GraduationCap,
  LockKeyhole,
  Rocket,
  Sparkles,
  Zap,
} from 'lucide-react';
import { AccountSidebarNav } from '../account/AccountSidebarNav';
import { useAppStore } from '../../stores/useAppStore';

type Plan = {
  key: string;
  name: string;
  price: string;
  unit: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  accent: string;
  cta: string;
  badge?: string;
  features: string[];
  locked: string[];
};

const PLANS: Plan[] = [
  {
    key: 'demo',
    name: 'Free',
    price: '0 VND',
    unit: '/ month',
    desc: 'For individuals who want to translate occasional images and explore the VieTrans studio.',
    icon: <GraduationCap size={22} />,
    color: 'var(--ink3)',
    accent: 'var(--bg2)',
    cta: 'Start free',
    features: [
      '20 image translations per month',
      'Upload images up to 5 MB',
      'Studio preview with all pipeline stages',
      '7-day translation history',
      'Manual download for final result',
    ],
    locked: ['API key access', 'Batch processing', 'Priority queue'],
  },
  {
    key: 'builder',
    name: 'Pro',
    price: '199,000 VND',
    unit: '/ month',
    desc: 'For creators and teams that need more quota, larger uploads, API access, and faster processing.',
    icon: <Zap size={22} />,
    color: 'var(--blue)',
    accent: 'var(--blueG)',
    cta: 'Upgrade to Pro',
    badge: 'Recommended',
    features: [
      '500 image translations per month',
      'Upload images up to 20 MB',
      'API key and REST upload endpoint',
      'Full job polling workflow',
      'Unlimited account history',
      'Batch upload up to 20 images',
      'Higher queue priority',
    ],
    locked: ['Private deployment', 'Custom model fine-tuning'],
  },
  {
    key: 'lab',
    name: 'Enterprise',
    price: 'Contact',
    unit: '',
    desc: 'For organizations that need private deployment, team controls, and custom workflow support.',
    icon: <Building2 size={22} />,
    color: '#b7791f',
    accent: 'rgba(183,121,31,0.1)',
    cta: 'Contact sales',
    features: [
      'Unlimited translation quota',
      'Dedicated Space deployment option',
      'Custom dataset evaluation reports',
      'Team workspace and role planning',
      'Audit log design for API usage',
      'Model fine-tuning support',
      'On-premise deployment proposal',
    ],
    locked: [],
  },
];

const PlanContent: React.FC<{ visible: boolean; compact?: boolean }> = ({ visible, compact = false }) => (
  <>
    <style>{`
      @keyframes pr-fadeup { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
      .pr-visible { animation: pr-fadeup 0.5s cubic-bezier(0.22,1,0.36,1) both; }
      .pr-card { transition: transform 0.18s, box-shadow 0.18s, border-color 0.18s; }
      .pr-card:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--blue) 28%, var(--ln-raw)); }
      .pr-plan-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; align-items: stretch; }
      @media (max-width: 1080px) { .pr-plan-grid { grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); } }
      @media (max-width: 760px) { .pr-plan-grid { grid-template-columns: 1fr; } }
    `}</style>

    <div style={{ maxWidth: compact ? '1040px' : '1120px', margin: '0 auto' }}>
      <section
        className={visible ? 'pr-visible' : ''}
        style={{
          marginBottom: compact ? '36px' : '48px',
          textAlign: 'center',
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px', marginBottom: '18px' }}>
          <span className="account-eyebrow">Pricing</span>
          <span className="account-status-pill">
            <Sparkles size={14} />
            Image translation plans
          </span>
        </div>

        <h1 className="account-title" style={{ margin: '0 auto 14px', maxWidth: '780px' }}>
          Choose the right plan for VieTrans
        </h1>
        <p style={{ maxWidth: '650px', margin: '0 auto', fontSize: '15px', lineHeight: 1.8, color: 'var(--ink3)' }}>
          Start with the free studio experience, then upgrade when you need higher monthly quota,
          API access, batch processing, or private deployment support.
        </p>
      </section>

      <section className="pr-plan-grid">
        {PLANS.map((plan, index) => (
          <article
            key={plan.key}
            className={`pr-card${visible ? ' pr-visible' : ''}`}
            style={{
              animationDelay: `${index * 70}ms`,
              position: 'relative',
              border: plan.key === 'builder'
                ? '1.5px solid color-mix(in srgb, var(--blue) 42%, transparent)'
                : 'var(--ln)',
              borderRadius: '20px',
              background: plan.key === 'builder' ? plan.accent : 'color-mix(in srgb, var(--paper) 94%, white 6%)',
              padding: '24px',
              boxShadow: plan.key === 'builder'
                ? '0 18px 46px rgba(34,82,228,0.12)'
                : '0 12px 34px rgba(14, 12, 9, .04)',
            }}
          >
            {plan.badge && (
              <div style={{
                position: 'absolute',
                top: '-11px',
                left: '24px',
                borderRadius: '999px',
                background: 'var(--blue)',
                color: '#fff',
                padding: '4px 12px',
                fontFamily: 'var(--mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '.1em',
                textTransform: 'uppercase',
              }}>
                {plan.badge}
              </div>
            )}

            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              color: plan.color,
              background: plan.accent,
              border: `1px solid color-mix(in srgb, ${plan.color} 24%, transparent)`,
            }}>
              {plan.icon}
            </div>

            <h2 style={{
              fontSize: '22px',
              fontWeight: 800,
              letterSpacing: '-.03em',
              color: 'var(--ink)',
              marginBottom: '8px',
            }}>
              {plan.name}
            </h2>
            <p style={{ minHeight: '62px', color: 'var(--ink3)', fontSize: '13px', lineHeight: 1.65, marginBottom: '20px' }}>
              {plan.desc}
            </p>

            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '32px', fontWeight: 800, letterSpacing: '-.04em', color: plan.color }}>
                {plan.price}
              </span>
              {plan.unit && <span style={{ marginLeft: '4px', fontSize: '12px', color: 'var(--ink4)' }}>{plan.unit}</span>}
            </div>

            <Link
              to={plan.key === 'demo' ? '/studio' : '/docs'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                minHeight: '44px',
                borderRadius: '12px',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '13px',
                marginBottom: '22px',
                color: plan.key === 'builder' ? '#fff' : 'var(--ink)',
                background: plan.key === 'builder' ? 'linear-gradient(135deg, var(--blue), var(--blue2))' : 'var(--bg2)',
                border: plan.key === 'builder' ? 'none' : 'var(--ln)',
              }}
            >
              {plan.key === 'lab' ? <Rocket size={15} /> : <Zap size={15} />}
              {plan.cta}
            </Link>

            <div style={{ height: '1px', background: 'var(--ln)', marginBottom: '18px' }} />

            <div style={{ display: 'grid', gap: '10px' }}>
              {plan.features.map((feature) => (
                <div key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <Check size={15} style={{ marginTop: '2px', color: plan.color, flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--ink3)' }}>{feature}</span>
                </div>
              ))}
              {plan.locked.map((feature) => (
                <div key={feature} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', opacity: 0.45 }}>
                  <LockKeyhole size={15} style={{ marginTop: '2px', color: 'var(--ink4)', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', lineHeight: 1.55, color: 'var(--ink4)' }}>{feature}</span>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>

      <section
        className={visible ? 'pr-visible' : ''}
        style={{
          marginTop: '24px',
          border: 'var(--ln)',
          borderRadius: '18px',
          padding: '18px 20px',
          background: 'color-mix(in srgb, var(--blueG) 48%, var(--paper) 52%)',
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
        }}
      >
        <Rocket size={18} style={{ color: 'var(--blue)', flexShrink: 0, marginTop: '2px' }} />
        <p style={{ margin: 0, color: 'var(--ink3)', fontSize: '13px', lineHeight: 1.7 }}>
          Need a custom workflow? Enterprise plans can include private deployment, custom evaluation,
          team access controls, and dedicated integration support.
        </p>
      </section>
    </div>
  </>
);

export const PricingPage: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isLoggedIn } = useAppStore();
  const inAccount = location.pathname.startsWith('/account');

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (inAccount && !isLoggedIn) {
      navigate('/login');
    }
  }, [inAccount, isLoggedIn, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (inAccount) {
    return (
      <div className="account-page">
        <div className="account-shell">
          <div className="account-layout">
            <AccountSidebarNav activeSection="pricing" onLogout={handleLogout} />
            <div className="account-main">
              <PlanContent visible={visible} compact />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh', padding: '104px 24px 80px' }}>
      <PlanContent visible={visible} />
    </div>
  );
};

export default PricingPage;
