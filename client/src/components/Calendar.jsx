import { useState } from "react";

function Calendar({ tasks }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const monthName = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  function changeMonth(amount) {
    setCurrentDate(new Date(year, month + amount, 1));
  }

function goToToday() {
  setCurrentDate(new Date());
}

  function getTasksForDay(day) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    return tasks.filter(task => task.dueDate === date);
  }

  return (
    <section className="calendar-page">
      <div className="calendar-header">
        <div>
          <h1>Calendar</h1>
          <p>View your tasks by date.</p>
        </div>

        <div className="calendar-navigation">
  <button onClick={() => changeMonth(-1)}>←</button>

  <h2>{monthName}</h2>

  <button onClick={() => changeMonth(1)}>→</button>

  <button className="today-btn" onClick={goToToday}>
    Today
  </button>
</div>
      </div>

      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
          <div className="calendar-day-name" key={day}>
            {day}
          </div>
        ))}

        {Array.from({ length: firstDay }).map((_, index) => (
          <div className="calendar-cell empty" key={`empty-${index}`} />
        ))}

        {Array.from({ length: daysInMonth }, (_, index) => {
          const day = index + 1;
          const dayTasks = getTasksForDay(day);

          const isToday =
  day === new Date().getDate() &&
  month === new Date().getMonth() &&
  year === new Date().getFullYear();

          return (
            <div
  className={`calendar-cell ${isToday ? "today" : ""}`}
  key={day}
>
  <strong>{day}</strong>
              {dayTasks.map(task => (
                <div
  className={`calendar-task priority-${task.priority.toLowerCase()} ${
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
    </section>
  );
}

export default Calendar;