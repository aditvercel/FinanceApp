export default function Loading() {
  return (
    <div className="p-4 pb-16 space-y-5 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-lg" />
        <div className="h-7 w-28 bg-gray-200 rounded" />
      </div>
      <div className="space-y-2">
        <div className="h-4 w-20 bg-gray-200 rounded" />
        <div className="h-11 w-full bg-gray-200 rounded-lg" />
      </div>
      <div className="h-12 w-full bg-gray-200 rounded-xl" />
    </div>
  );
}
