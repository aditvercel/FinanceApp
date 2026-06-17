export default function Loading() {
  return (
    <div className="p-4 pb-16 animate-pulse">
      <div className="border-2 border-dashed rounded-xl p-10">
        <div className="w-14 h-14 bg-gray-200 rounded-full mx-auto mb-3" />
        <div className="h-4 w-44 bg-gray-200 rounded mx-auto" />
        <div className="h-3 w-36 bg-gray-200 rounded mx-auto mt-2" />
      </div>
    </div>
  );
}
