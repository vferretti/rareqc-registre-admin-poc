import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Upload, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/base/ui/button";

/** Maximum file size: 10 MB. */
const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface FileUploadProps {
  file: File | null;
  onChange: (file: File | null) => void;
  accept?: string;
  /** Name of an existing file (edit mode). Shows "Remplacer" instead of "Téléverser". */
  existingFileName?: string;
}

export function FileUpload({
  file,
  onChange,
  accept = ".pdf",
  existingFileName,
}: FileUploadProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const clear = () => {
    onChange(null);
    setSizeError(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    if (selected && selected.size > MAX_FILE_SIZE) {
      setSizeError(t("validation.file_too_large"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setSizeError(null);
    onChange(selected);
  };

  const hasExisting = !!existingFileName && !file;
  const displayName = file
    ? file.name
    : (existingFileName ?? t("participant_detail.no_file_selected"));

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {hasExisting ? (
            <>
              <RefreshCw className="size-4 mr-1" />
              {t("common.replace")}
            </>
          ) : (
            <>
              <Upload className="size-4 mr-1" />
              {t("participant_detail.upload_file")}
            </>
          )}
        </Button>
        <span className="text-sm text-muted-foreground truncate flex-1">
          {displayName}
        </span>
        {file && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={clear}
            className="text-muted-foreground hover:text-destructive"
          >
            <X className="size-4" />
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      {sizeError && <p className="text-sm text-destructive">{sizeError}</p>}
    </div>
  );
}
