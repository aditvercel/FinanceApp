export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-6 animate-pulse">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="h-8 w-40 bg-gray-200 rounded" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
          <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        </div>
      </header>

      {/* Dashboard card */}
      <section className="mb-6">
        <div className="rounded-xl p-5 border border-(--border) space-y-3">
          <div className="h-4 w-20 bg-gray-200 rounded" />
          <div className="h-9 w-44 bg-gray-200 rounded" />
          <div className="flex gap-4">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-4 bg-gray-200 rounded" />
              <div className="h-4 w-28 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* My Reports section */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-24 bg-gray-200 rounded" />
          <div className="flex gap-2">
            <div className="h-9 w-20 bg-gray-200 rounded-lg" />
            <div className="h-9 w-16 bg-gray-200 rounded-lg" />
          </div>
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-(--card) border border-(--border) rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded" />
                  <div className="space-y-1.5">
                    <div className="h-5 w-36 bg-gray-200 rounded" />
                    <div className="h-4 w-24 bg-gray-200 rounded" />
                  </div>
                </div>
                <div className="w-5 h-5 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recent Activity section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div className="h-5 w-28 bg-gray-200 rounded" />
          <div className="h-4 w-14 bg-gray-200 rounded" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="flex items-start gap-3 p-3 bg-(--card) border border-(--border) rounded-lg"
            >
              <div className="w-5 h-5 bg-gray-200 rounded mt-0.5 shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-44 bg-gray-200 rounded" />
                <div className="h-3 w-28 bg-gray-200 rounded" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
