import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-sm text-center space-y-4">
        <div className="text-5xl">🔍</div>
        <h1 className="text-xl font-bold">Page not found</h1>
        <p className="text-sm text-(--muted-foreground)">
          The page you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link
          href="/"
          className="inline-block px-5 py-2 rounded-lg text-sm font-medium text-white bg-(--primary)"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
