function BrandHeader({ onboarding = false }) {
  return (
    <header className={`topbar${onboarding ? ' onboarding-topbar' : ''}`} aria-label="REZEL">
      <span className="app-logo" role="img" aria-label="REZEL">
        <span className="app-logo-fallback" aria-hidden="true">R</span>
        <img
          src="/images/logo.png"
          alt=""
          width="38"
          height="38"
          onError={(event) => {
            event.currentTarget.hidden = true;
          }}
        />
      </span>
      <span className="elite-mark" data-testid="text-elite-mark">BB ÉLITE</span>
    </header>
  );
}

export default BrandHeader;
