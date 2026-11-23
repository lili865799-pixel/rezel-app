function BrandHeader({ onboarding = false }) {
  return (
    <header className={`topbar${onboarding ? ' onboarding' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <img
          src="/images/icon_png614.jpg"
          alt="REZEL"
          style={{
            width: '45px',
            height: '45px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: '2px solid #C6A15B'
          }}
        />
      </div>
    </header>
  );
}

export default BrandHeader;
