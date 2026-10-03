import { Camera } from "lucide-react";

interface CameraUploadProps {
  onImageSelected: (file: File) => void;
  selectedFile: File | null;
}

export default function CameraUpload({ onImageSelected, selectedFile }: CameraUploadProps) {
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelected(file);
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        id="plant-photo"
        className="hidden"
        onChange={handleChange}
      />
      <label
        htmlFor="plant-photo"
        className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-green-300 rounded-xl bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
      >
        <Camera className="w-10 h-10 text-green-500 mb-2" />
        <span className="text-green-700 font-semibold text-base">Take Photo / Upload Image</span>
        <span className="text-green-500 text-sm mt-1">Tap to open camera or file picker</span>
      </label>
      {selectedFile && (
        <p className="mt-2 text-sm text-gray-600 text-center">
          Selected: <span className="font-medium text-gray-800">{selectedFile.name}</span>
        </p>
      )}
    </div>
  );
}
