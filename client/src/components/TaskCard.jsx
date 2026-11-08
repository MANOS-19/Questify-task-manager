function TaskCard({ task, onToggle, onDelete, onEdit }) {

  // Get today's date in YYYY-MM-DD format
  const today = new Date();

  const todayString =
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  // Check the due date status
  let dateStatus = "";

  if (task.dueDate && !task.completed) {

    if (task.dueDate < todayString) {
      dateStatus = "Overdue";
    }
    else if (task.dueDate === todayString) {
      dateStatus = "Due Today";
    }
    else {
      dateStatus = "Upcoming";
    }

  }

  // Convert the date into a readable format
  const formattedDate = task.dueDate
    ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric"
      })
    : null;


  return (

    <div className={`task-card ${task.completed ? "completed" : ""}`}>

      <div className="task-left">

        {/* Complete Task Button */}

       <button
  className={`complete-btn ${task.completed ? "is-completed" : ""}`}
  onClick={() => onToggle(task.id)}
  aria-label={task.completed ? "Mark task as incomplete" : "Mark task as complete"}
  title={task.completed ? "Mark as incomplete" : "Mark as complete"}
>
  {task.completed && "✓"}
</button>


        {/* Task Information */}

        <div className="task-info">

          <h3>{task.title}</h3>

          <div className="task-details">

            <span className={`priority ${task.priority.toLowerCase()}`}>
              {task.priority}
            </span>

            <span className="task-category">
              {task.category || "Study"}
            </span>

            {formattedDate && (
              <span className="task-date">
                Due: {formattedDate}
              </span>
            )}

            {dateStatus && (
              <span className={`date-status ${dateStatus.toLowerCase().replace(" ", "-")}`}>
                {dateStatus}
              </span>
            )}

          </div>

        </div>

      </div>


      {/* Edit and Delete Buttons */}

      <div className="task-actions">

        <button
          className="edit-btn"
          onClick={() => onEdit(task)}
        >
          Edit
        </button>

        <button
          className="delete-btn"
          onClick={() => onDelete(task.id)}
        >
          Delete
        </button>

      </div>

    </div>

  );

}

export default TaskCard;