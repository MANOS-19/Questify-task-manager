import { useState } from "react";
import EmojiPicker from "emoji-picker-react";

function ProfileEmojiPicker({
  value,
  onChange,
  theme = "dark"
}) {
  const [showPicker, setShowPicker] = useState(false);

  function handleEmojiClick(emojiData) {
    onChange(emojiData.emoji);
    setShowPicker(false);
  }

  return (
    <div className="profile-emoji-section">

      <button
        type="button"
        className="profile-emoji-trigger"
        onClick={() => setShowPicker(previous => !previous)}
        aria-expanded={showPicker}
      >
        <span className="selected-profile-emoji">
          {value}
        </span>

        <span className="profile-emoji-trigger-text">
          Choose Profile Emoji
        </span>

        <span className="emoji-trigger-arrow">
          {showPicker ? "▲" : "▼"}
        </span>
      </button>

      {showPicker && (
        <div className="profile-emoji-picker">

          <EmojiPicker
            onEmojiClick={handleEmojiClick}
            theme={theme}
            width="100%"
            height={360}
            className="questify-emoji-picker"
            searchPlaceholder="Search emojis..."
            autoFocusSearch={false}
            lazyLoadEmojis={true}
            previewConfig={{
              showPreview: false
            }}
          />

        </div>
      )}

    </div>
  );
}

export default ProfileEmojiPicker;