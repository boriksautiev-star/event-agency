import { useState } from "react";
import { Button } from "./ui/button";
import { useBrowseDir } from "../hooks/useBackups";

export function DirectoryPickerModal({
  initialPath,
  onSelect,
  onClose,
}: {
  initialPath?: string;
  onSelect: (path: string) => void;
  onClose: () => void;
}) {
  const [currentPath, setCurrentPath] = useState<string | null>(initialPath || null);
  const { data, isLoading } = useBrowseDir(currentPath);

  const selectThis = () => {
    if (data?.currentPath) onSelect(data.currentPath);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full flex flex-col max-h-[80vh]">
        <div className="px-5 py-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">Выбор папки для бэкапов</h2>
          <p className="text-xs text-gray-500 mt-1">
            {data?.currentPath || "Выберите диск или папку"}
          </p>
        </div>

        <div className="px-5 py-2 border-b flex items-center gap-2">
          {data?.currentPath && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCurrentPath(data.parent)}
            >
              ← Назад
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => setCurrentPath(null)}>
            К дискам
          </Button>
          {data?.currentPath && (
            <Button size="sm" onClick={selectThis} className="ml-auto">
              Выбрать эту папку
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-auto px-5 py-3">
          {isLoading ? (
            <div className="text-sm text-gray-500">Загрузка…</div>
          ) : !data ? null : data.currentPath === null ? (
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-2">Диски:</div>
              {data.roots.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  onClick={() => setCurrentPath(r.path)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm"
                >
                  💾 {r.name}
                </button>
              ))}
            </div>
          ) : data.items.length === 0 ? (
            <div className="text-sm text-gray-500">Папка пуста. Можно выбрать её.</div>
          ) : (
            <div className="space-y-1">
              {data.items.map((it) => (
                <button
                  key={it.path}
                  type="button"
                  onClick={() => setCurrentPath(it.path)}
                  className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 text-sm flex items-center gap-2"
                >
                  📁 <span>{it.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t flex justify-end">
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
        </div>
      </div>
    </div>
  );
}
