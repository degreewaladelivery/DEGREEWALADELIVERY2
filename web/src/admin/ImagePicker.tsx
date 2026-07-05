/**
 * Once an image is set, hide the file input entirely — show the preview
 * with a Remove button instead of a picker sitting on top of a picture.
 */
export function ImagePicker({
  label,
  preview,
  onPick,
  onRemove,
}: {
  label: string;
  preview: string;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  return (
    <div className="admin-field">
      <span>{label}</span>
      {preview ? (
        <div className="admin-image-picker">
          <img src={preview} alt="" className="admin-form__preview" />
          <button type="button" className="admin-btn admin-btn--sm admin-btn--danger" onClick={onRemove}>
            Remove image
          </button>
        </div>
      ) : (
        <input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onPick(file);
          }}
        />
      )}
    </div>
  );
}
