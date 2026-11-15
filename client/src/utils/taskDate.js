export function getLocalDateString(date = new Date()) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function isTaskOverdue(task, now = new Date()) {
  if (!task.dueDate || task.completed) {
    return false;
  }

  const today = getLocalDateString(now);

  // A previous date is overdue.
  if (task.dueDate < today) {
    return true;
  }

  // A future date is not overdue.
  if (task.dueDate > today) {
    return false;
  }

  // Today's task without a time is not overdue until tomorrow.
  if (!task.dueTime) {
    return false;
  }

  const [hours, minutes] = task.dueTime.split(":").map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    return false;
  }

  const dueDateTime = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    hours,
    minutes
  );

  return now.getTime() > dueDateTime.getTime();
}

export function getTaskDateStatus(task, now = new Date()) {
  if (!task.dueDate || task.completed) {
    return "";
  }

  if (isTaskOverdue(task, now)) {
    return "Overdue";
  }

  if (task.dueDate === getLocalDateString(now)) {
    return "Due Today";
  }

  return "Upcoming";
}