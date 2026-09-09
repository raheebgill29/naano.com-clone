import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-zinc-500">Naano</p>
      <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
        LinkedIn creator marketplace
      </h1>
      <p className="mt-4 max-w-lg text-base leading-7 text-zinc-600">
        Brands discover and book creators. Creators manage opportunities and
        collaboration. Sign in to continue.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/login"
          className="rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </Link>
        <Link
          href="/signup"
          className="rounded-md border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Sign up
        </Link>
      </div>
    </main>
  );
}
