import { PixelArt } from "@/components/PixelArt";

const NotFound = () => (
  <main className="studio-page flex min-h-screen items-center justify-center p-6">
    <title>404 · Chipboy Studio</title>
    <section className="console-shell max-w-lg p-8 text-center">
      <PixelArt type="ghost" className="mx-auto h-16 w-16 animate-sprite-bob" />
      <h1 className="font-pixel mt-5 text-3xl text-[var(--case-ink)]">404</h1>
      <p className="font-pixel mt-3 text-lg text-[var(--berry)]">WRONG CARTRIDGE SLOT.</p>
      <p className="mt-3 text-sm text-[var(--case-muted)]">There is no screen at <code className="rounded bg-[var(--case-light)] px-1">{window.location.pathname}</code>.</p>
      <a href={import.meta.env.BASE_URL} className="play-button mt-6 inline-block rounded px-5 py-3 text-[11px] font-bold">BACK TO THE STUDIO</a>
    </section>
  </main>
);

export default NotFound;
