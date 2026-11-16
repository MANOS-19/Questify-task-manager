import { useState } from "react";

function Calendar({ tasks, weekStart = "Monday" }) {
  const [currentDate, setCurrentDate] = useState(new Date());
const [selectedDate, setSelectedDate] = useState(
  new Date().toLocaleDateString("en-CA")
);


  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Monday is the default first day
  const weekdays =
    weekStart === "Sunday"
      ? ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
      : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const nativeFirstDay = new Date(year, month, 1).getDay();

  // JavaScript: Sunday = 0, Monday = 1
  // Convert the offset according to the selected week start
  const firstDay =
    weekStart === "Sunday"
      ? nativeFirstDay
      : (nativeFirstDay + 6) % 7;

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });

  // Change calendar month
  function changeMonth(amount) {
    setCurrentDate(new Date(year, month + amount, 1));
  }

  // Return to current month
  function goToToday() {
    setCurrentDate(new Date());
  }

  // Get tasks assigned to a particular date
  function getTasksForDay(day) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return tasks.filter(task => task.dueDate === date);
  }

  const today = new Date();

  return (
    <section className="calendar-page">

      {/* CALENDAR HEADER */}
      <div className="calendar-header">
        <div>
          <h1>Calendar</h1>
          <p>View your tasks by date.</p>
        </div>

        <div className="calendar-navigation">
          <button
            onClick={() => changeMonth(-1)}
            aria-label="Previous month"
          >
            ←
          </button>

          <h2>{monthName}</h2>

          <button
            onClick={() => changeMonth(1)}
            aria-label="Next month"
          >
            →
          </button>

          <button
            className="today-btn"
            onClick={goToToday}
          >
            Today
          </button>
        </div>
      </div>

      {/* CALENDAR GRID */}
      <div className="calendar-grid">

        {/* WEEKDAY HEADINGS */}
        {weekdays.map(day => (
          <div className="calendar-day-name" key={day}>
            {day}
          </div>
        ))}

        {/* EMPTY CELLS BEFORE FIRST DAY */}
        {Array.from({ length: firstDay }).map((_, index) => (
          <div
            className="calendar-cell empty"
            key={`empty-${index}`}
          />
        ))}

        {/* MONTH DAYS */}
        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
const dayTasks = getTasksForDay(day);

const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const isSelected = selectedDate === date;

          const isToday =
            day === today.getDate() &&
            month === today.getMonth() &&
            year === today.getFullYear();

          return (
            <div
  className={`calendar-cell ${isToday ? "today" : ""} ${
    isSelected ? "selected" : ""
  }`}
  key={day}
  onClick={() => setSelectedDate(date)}
  role="button"
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      setSelectedDate(date);
    }
  }}
>
              <strong>{day}</strong>

              {dayTasks.map(task => (
                <div
                  className={`calendar-task priority-${(task.priority || "Medium").toLowerCase()} ${
                    task.completed ? "completed" : ""
                  }`}
                  key={task.id}
                  title={task.title}
                >
                  {task.title}
                </div>
              ))}
            </div>
          );
        })}

      </div>

<div className="selected-date-tasks">
  <h2>
    Tasks for {new Date(`${selectedDate}T00:00:00`).toLocaleDateString(
      "en-US",
      {
        day: "numeric",
        month: "long",
        year: "numeric"
      }
    )}
  </h2>

  {tasks.filter(task => task.dueDate === selectedDate).length > 0 ? (
    tasks
      .filter(task => task.dueDate === selectedDate)
      .map(task => (
        <div className="selected-task" key={task.id}>
          <span>{task.title}</span>
          <span>
            {task.completed ? "Completed" : "Pending"}
          </span>
        </div>
      ))
  ) : (
    <p>No tasks scheduled for this date.</p>
  )}
</div>

    </section>
  );
}

export default Calendar;