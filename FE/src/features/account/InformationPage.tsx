import React from 'react';
import { Bot, Boxes, Cpu, Globe2, Layers3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../stores/useAppStore';
import { AccountSidebarNav } from './AccountSidebarNav';

const technologyItems = [
  {
    icon: Globe2,
    title: 'Frontend experience',
    description: 'Built with React and TypeScript to keep the interface responsive, component-based, and easier to maintain as the product grows.',
  },
  {
    icon: Layers3,
    title: 'State and routing',
    description: 'Uses Zustand for lightweight client state and React Router for page navigation across the studio, dashboard, and account areas.',
  },
  {
    icon: Boxes,
    title: 'Backend and inference stack',
    description: 'The repository also includes a Python-based model server with Torch, torchvision, and SentencePiece-backed inference components for the translation pipeline.',
  },
];

const modelItems = [
  {
    icon: Layers3,
    title: '01 / Text-Background Separation',
    description: 'The separation stage isolates a clean background image from the source text image using the OCR/Layout analyzer model, preserving original background context.',
  },
  {
    icon: Boxes,
    title: '02 / Visual Feature Quantization',
    description: 'The quantization stage utilizes a discrete Layout blocks to represent image features of the text as indices, bridging visual and textual representations.',
  },
  {
    icon: Cpu,
    title: '03 / Neural Code Translation',
    description: 'The translation stage uses the NLLB translator model to translate quantized source codes directly into target codes, bypassing standard OCR completely.',
  },
  {
    icon: Bot,
    title: '04 / Text-Background Fusion',
    description: 'The fusion stage composites the reconstructed target text image back onto the clean background layer using the Render planner to produce the final seamlessly translated output.',
  },
];

export const InformationPage: React.FC = () => {
  const { logout, isLoggedIn } = useAppStore();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="account-page information-page">
      <div className="account-shell">
        <div className="account-layout">
          <AccountSidebarNav activeSection="information" onLogout={handleLogout} />

          <div className="account-main">
            <section className="account-hero">
              <div className="account-hero-grid">
                <div className="account-profile-copy">
                  <div className="account-pill-row">
                    <span className="account-eyebrow">About VieTrans</span>
                  </div>

                  <h1 className="account-title">Information</h1>
                  <p className="account-subtitle">A quick overview of what the website is for, how it is built, and how the AI layer fits into the product.</p>
                </div>

                <div className="account-hero-note">
                  <span className="account-note-label">Purpose</span>
                  <p>VieTrans is positioned as an image translation workspace that helps users turn source visuals into readable localized outputs with less manual editing.</p>
                </div>
              </div>
            </section>

            <section className="account-content-wrap information-stack">
              <div className="account-panel account-panel-main account-panel-unified">
                <div className="account-panel-head">
                  <div>
                    <span className="account-section-kicker">Mission</span>
                    <h2>What this website does</h2>
                  </div>
                </div>

                <div className="information-copy">
                  <p>
                    VieTrans is intended to support translation workflows for text embedded in images such as posters, scanned pages, signs, product visuals, and other design assets.
                    Instead of translating plain text only, the website focuses on the full visual workflow: upload an image, identify text regions, translate the content, and prepare a cleaner translated result for export.
                  </p>
                  <p>
                    The goal is to reduce repetitive manual work for users who need faster localization while still keeping a studio-style interface where they can review outputs before saving or downloading them.
                  </p>
                </div>
              </div>

              <div className="account-panel account-panel-main account-panel-unified">
                <div className="account-panel-head">
                  <div>
                    <span className="account-section-kicker">Stack</span>
                    <h2>Technology used</h2>
                  </div>
                </div>

                <div className="information-card-grid">
                  {technologyItems.map(({ icon: Icon, title, description }) => (
                    <article className="information-card" key={title}>
                      <span className="information-card-icon">
                        <Icon size={18} />
                      </span>
                      <div className="information-card-copy">
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="account-panel account-panel-main account-panel-unified">
                <div className="account-panel-head">
                  <div>
                    <span className="account-section-kicker">AI Layer</span>
                    <h2>Model usage</h2>
                  </div>
                </div>

                <div className="information-card-grid">
                  {modelItems.map(({ icon: Icon, title, description }) => (
                    <article className="information-card" key={title}>
                      <span className="information-card-icon">
                        <Icon size={18} />
                      </span>
                      <div className="information-card-copy">
                        <h3>{title}</h3>
                        <p>{description}</p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformationPage;
