import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";

function createImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = reject;

    image.src = url;
  });
}

async function getCroppedImage(imageSrc, pixelCrop) {
  const image = await createImage(imageSrc);

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Unable to process image.");
  }

  // Final profile image dimensions
  const outputSize = 320;

  canvas.width = outputSize;
  canvas.height = outputSize;

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    outputSize,
    outputSize
  );

  // Compressed square JPEG
  return canvas.toDataURL("image/jpeg", 0.82);
}

function ProfileImageCropper({
  image,
  onCancel,
  onSave
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback(
    (croppedArea, croppedPixels) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  async function handleSave() {
    if (!croppedAreaPixels) {
      alert("Please position your image before saving.");
      return;
    }

    try {
      setSaving(true);

      const croppedImage = await getCroppedImage(
        image,
        croppedAreaPixels
      );

      onSave(croppedImage);

    } catch (error) {
      console.error("Crop error:", error);
      alert("Unable to crop this image.");

    } finally {
      setSaving(false);
    }
  }

  if (!image) return null;

  return (
    <div
      className="profile-crop-overlay"
      onMouseDown={event => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        className="profile-crop-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-title"
      >

        <div className="profile-crop-header">
          <div>
            <h2 id="crop-title">Crop Profile Picture</h2>
            <p>Drag your image and adjust the zoom.</p>
          </div>

          <button
            type="button"
            className="crop-close-btn"
            onClick={onCancel}
            aria-label="Close cropper"
          >
            ×
          </button>
        </div>

        <div className="profile-crop-area">

          <Cropper
            image={image}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            objectFit="cover"
            minZoom={1}
            maxZoom={3}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />

        </div>

        <div className="profile-zoom-control">
          <span>−</span>

          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={event =>
              setZoom(Number(event.target.value))
            }
          />

          <span>+</span>
        </div>

        <div className="profile-crop-actions">

          <button
            type="button"
            className="crop-cancel-btn"
            onClick={onCancel}
            disabled={saving}
          >
            Cancel
          </button>

          <button
            type="button"
            className="crop-save-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Crop & Add Picture"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default ProfileImageCropper;