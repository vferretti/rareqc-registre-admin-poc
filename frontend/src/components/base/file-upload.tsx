import { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Upload, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/base/ui/button";

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

  const clear = () => {
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const hasExisting = !!existingFileName && !file;
  const displayName = file
    ? file.name
    : existingFileName ?? t("participant_detail.no_file_selected");

  return (
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
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}
