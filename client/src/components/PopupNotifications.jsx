import { useEffect, useRef, useState } from "react";

function PopupNotifications() {
  const [popups, setPopups] = useState([]);
  const nextId = useRef(0);
  const timers = useRef([]);

  useEffect(() => {
    function showPopup(event) {
      const detail = event.detail || {};
      const id = ++nextId.current;

      const popup = {
        id,
        type: detail.type || "success",
        title: detail.title || "Success",
        message: detail.message || "",
        icon: detail.icon || "✅"
      };

      setPopups(previous => [...previous, popup]);

      const duration =
        popup.type === "achievement" ? 6000 : 3000;

      const timer = setTimeout(() => {
        setPopups(previous =>
          previous.filter(item => item.id !== id)
        );

        timers.current = timers.current.filter(
          item => item !== timer
        );
      }, duration);

      timers.current.push(timer);
    }

    window.addEventListener("questify:popup", showPopup);

    return () => {
      window.removeEventListener("questify:popup", showPopup);

      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  function closePopup(id) {
    setPopups(previous =>
      previous.filter(item => item.id !== id)
    );
  }

  return (
    <div className="questify-popup-container">
      {popups.map(popup => (
        <div
          key={popup.id}
          className={`questify-popup ${popup.type}`}
        >
          {popup.type === "achievement" ? (
            <>
              <div className="popup-achievement-icon">
                {popup.icon}
              </div>

              <div className="popup-achievement-label">
                🏆 ACHIEVEMENT UNLOCKED!
              </div>

              <h2>{popup.message}</h2>

              <p>A new milestone has been achieved!</p>
            </>
          ) : (
            <div className="popup-success-content">
              <span className="popup-success-icon">
                {popup.icon}
              </span>

              <div>
                <h3>{popup.title}</h3>
                {popup.message && <p>{popup.message}</p>}
              </div>
            </div>
          )}

          <button
            className="popup-close"
            onClick={() => closePopup(popup.id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default PopupNotifications;