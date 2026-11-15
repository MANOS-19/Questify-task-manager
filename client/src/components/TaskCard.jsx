import { getTaskDateStatus } from "../utils/taskDate";

function TaskCard({
  task,
  onToggle,
  onDelete,
  onEdit,
  onSubtaskToggle
}) {
  const taskId = task.id || task._id;

  const dateStatus = getTaskDateStatus(task);


  const formattedDate = task.dueDate
    ? new Date(`${task.dueDate}T00:00:00`).toLocaleDateString(
        "en-IN",
        {
          day: "numeric",
          month: "short",
          year: "numeric"
        }
      )
    : "";

  const subtasks = task.subtasks || [];
  const attachments = task.attachments || [];

  const completedSubtasks = subtasks.filter(
    item => item.completed
  ).length;

  const subtaskPercentage = subtasks.length
    ? (completedSubtasks / subtasks.length) * 100
    : 0;

  const hasDetails =
    subtasks.length > 0 ||
    Boolean(task.notes) ||
    attachments.length > 0;

  const detailLabels = [];

  if (subtasks.length) {
    detailLabels.push(`${subtasks.length} subtasks`);
  }

  if (task.notes) {
    detailLabels.push("Notes");
  }

  if (attachments.length) {
    detailLabels.push(`${attachments.length} attachments`);
  }

  return (
    <article
      className={`task-card ${task.completed ? "completed" : ""}`}
    >

      {/* MAIN TASK ROW */}

      <div className="task-card-main">

        <div className="task-left">

          <button
            type="button"
            className={`complete-btn ${
              task.completed ? "is-completed" : ""
            }`}
            onClick={() => onToggle(taskId)}
            aria-label={
              task.completed
                ? "Mark task as incomplete"
                : "Mark task as complete"
            }
            aria-pressed={Boolean(task.completed)}
          >
            {task.completed ? "✓" : ""}
          </button>

          <div className="task-info">

            <h3>{task.title}</h3>

            <div className="task-details">

              <span
                className={`priority ${(task.priority || "Medium").toLowerCase()}`}
              >
                {task.priority || "Medium"}
              </span>

              <span className="task-category">
                {task.category || "Study"}
              </span>

              <span className="task-list-badge">
                {task.listName || "Inbox"}
              </span>

              {formattedDate && (
                <span className="task-date">
                  {formattedDate}
                </span>
              )}

              {task.dueTime && (
                <span className="task-time">
                  {task.dueTime}
                </span>
              )}

              {dateStatus && (
                <span
                  className={`date-status ${dateStatus.toLowerCase().replace(" ", "-")}`}
                >
                  {dateStatus}
                </span>
              )}

              {task.recurrence &&
                task.recurrence !== "None" && (
                  <span className="recurrence-badge">
                    ↻ {task.recurrence}
                  </span>
                )}

            </div>

          </div>

        </div>

        {/* TASK ACTIONS */}

        <div className="task-actions">

          <button
            type="button"
            className="edit-btn"
            onClick={() => onEdit(task)}
          >
            Edit
          </button>

          <button
            type="button"
            className="delete-btn"
            onClick={() => onDelete(taskId)}
          >
            Delete
          </button>

        </div>

      </div>


      {/* COLLAPSIBLE TASK DETAILS */}

      {hasDetails && (

        <details className="task-extra-details">

          <summary>
            <span>View details</span>

            <span className="task-extra-count">
              {detailLabels.join(" · ")}
            </span>
          </summary>

          <div className="task-extra-content">

            {/* SUBTASKS */}

            {subtasks.length > 0 && (

              <div className="task-subtasks">

                <div className="subtask-heading">

                  <strong>Subtasks</strong>

                  <span>
                    {completedSubtasks}/{subtasks.length}
                  </span>

                </div>

                <div className="subtask-progress">
                  <div
                    style={{
                      width: `${subtaskPercentage}%`
                    }}
                  />
                </div>

                <div className="subtask-list">

                  {subtasks.map((subtask, index) => (

                    <label
                      className="subtask-item"
                      key={subtask._id || index}
                    >

                      <input
                        type="checkbox"
                        checked={Boolean(subtask.completed)}
                        onChange={() =>
                          onSubtaskToggle?.(taskId, index)
                        }
                      />

                      <span
                        className={
                          subtask.completed
                            ? "subtask-completed"
                            : ""
                        }
                      >
                        {subtask.title}
                      </span>

                    </label>

                  ))}

                </div>

              </div>

            )}


            {/* NOTES */}

            {task.notes && (

              <div className="task-notes">

                <h4>Notes</h4>

                <p>{task.notes}</p>

              </div>

            )}


            {/* ATTACHMENTS */}

            {attachments.length > 0 && (

              <div className="task-attachments">

                <strong>
                  Attachments ({attachments.length})
                </strong>

                <div className="attachment-list">

                  {attachments.map((file, index) => (

                    <a
                      key={`${file.name}-${index}`}
                      href={file.data}
                      download={file.name}
                      className="attachment-link"
                    >
                      📎 {file.name}
                    </a>

                  ))}

                </div>

              </div>

            )}

          </div>

        </details>

      )}

    </article>
  );
}

export default TaskCard;