export default function ScrollCard({ title, headerClass = "", footer, children, height = 430 }) {
  return (
    <div className="border rounded-lg shadow-sm bg-white flex flex-col" style={{ height }}>
      {title && (
        <div className={`px-3 py-2 border-b text-center font-semibold ${headerClass}`}>{title}</div>
      )}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
      {footer ? <div className="border-t p-3">{footer}</div> : null}
    </div>
  );
}