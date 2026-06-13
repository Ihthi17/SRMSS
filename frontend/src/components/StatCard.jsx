export default function StatCard({ title, value }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-neutral-200/50 flex flex-col justify-between min-h-[130px] transition-transform hover:scale-[1.01]">
      <p className="text-neutral-400 font-medium text-sm tracking-wide">{title}</p>
      <h2 className="text-3xl font-extrabold mt-4 text-amber-500 tracking-tight font-mono">
        {value}
      </h2>
    </div>
  );
}