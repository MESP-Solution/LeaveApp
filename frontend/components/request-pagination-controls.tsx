export function RequestPaginationControls({
  onPageChange,
  page,
  totalPages,
}: {
  onPageChange: (nextPage: number) => void | Promise<void>;
  page: number;
  totalPages: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-2">
      <div className="text-sm text-slate-600">
        Trang <span className="font-medium text-slate-900">{page}</span> /{" "}
        <span className="font-medium text-slate-900">{totalPages}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          className={paginationButtonClassName}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          type="button"
        >
          Trước
        </button>
        <button
          className={paginationButtonClassName}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          type="button"
        >
          Sau
        </button>
      </div>
    </div>
  );
}

const paginationButtonClassName =
  "rounded-md border border-slate-300 bg-white px-3 py-1 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:bg-slate-100";
