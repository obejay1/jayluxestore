export default function AdminReportsLoading() {
  return (
    <main style={{ minHeight: '55vh', display: 'grid', placeItems: 'center', padding: 24, background: '#f6f4ef' }} aria-live="polite">
      <section style={{ width: 'min(520px, 100%)', padding: 28, border: '1px solid #e5ded4', borderRadius: 18, background: '#fff', textAlign: 'center' }}>
        <h2 style={{ margin: '0 0 8px' }}>Loading financial reports…</h2>
        <p style={{ margin: 0, color: '#786f64', lineHeight: 1.6 }}>Preparing the latest JayLuxe reporting dashboard.</p>
      </section>
    </main>
  );
}
