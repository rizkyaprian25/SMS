export default function GlobalLoading() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-4">
        {/* Subtle Apple-style ring loader */}
        <div className="relative w-12 h-12">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200" />
          <div className="w-12 h-12 rounded-full border-4 border-blue-600 border-t-transparent animate-spin absolute top-0 left-0" />
        </div>
        <p className="text-sm font-medium text-slate-500 animate-pulse">
          Memuat data sistem...
        </p>
      </div>
    </div>
  );
}
