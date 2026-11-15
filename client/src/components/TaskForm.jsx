import { useEffect, useState } from "react";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
  "text/plain"
];

const MAX_FILE_SIZE = 900 * 1024;
const MAX_ATTACHMENTS = 3;

function createEmptyForm(priority, category) {
  return {
    title: "",
    priority,
    category,
    listName: "Inbox",

    startDate: "",
    dueDate: "",
    dueTime: "",

    reminderMinutes: "",

    recurrence: "None",

    notes: "",

    subtasks: [],

    attachments: []
  };
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);

    reader.onerror = () => {
      reject(new Error(`Unable to read ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

function TaskForm({
  editingTask,
  onSave,
  onCancel,
  defaultPriority,
  defaultCategory,
  lists = [],
  sectionRef,
  resetToken
}) {
  const [form, setForm] = useState(() =>
    createEmptyForm(defaultPriority, defaultCategory)
  );

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editingTask) {
      setForm(
        createEmptyForm(defaultPriority, defaultCategory)
      );

      return;
    }

    setForm({
      title: editingTask.title || "",
      priority: editingTask.priority || defaultPriority,
      category: editingTask.category || defaultCategory,
      listName: editingTask.listName || "Inbox",

      startDate: editingTask.startDate || "",
      dueDate: editingTask.dueDate || "",
      dueTime: editingTask.dueTime || "",

      reminderMinutes:
        editingTask.reminderMinutes ?? "",

      recurrence: editingTask.recurrence || "None",

      notes: editingTask.notes || "",

      subtasks: (editingTask.subtasks || []).map(item => ({
        title: item.title,
        completed: Boolean(item.completed)
      })),

      attachments: editingTask.attachments || []
    });

  }, [
    editingTask,
    defaultPriority,
    defaultCategory,
    resetToken
  ]);

  function updateField(field, value) {
    setForm(previous => ({
      ...previous,
      [field]: value
    }));
  }

  function addSubtask() {
    setForm(previous => ({
      ...previous,
      subtasks: [
        ...previous.subtasks,
        {
          title: "",
          completed: false
        }
      ]
    }));
  }

  function updateSubtask(index, field, value) {
    setForm(previous => ({
      ...previous,
      subtasks: previous.subtasks.map((item, i) =>
        i === index
          ? { ...item, [field]: value }
          : item
      )
    }));
  }

  function removeSubtask(index) {
    setForm(previous => ({
      ...previous,
      subtasks: previous.subtasks.filter(
        (_, i) => i !== index
      )
    }));
  }

  async function handleAttachmentUpload(event) {
    const files = Array.from(event.target.files || []);

    event.target.value = "";

    if (!files.length) return;

    if (form.attachments.length + files.length > MAX_ATTACHMENTS) {
      alert("A task can have a maximum of 3 attachments.");
      return;
    }

    try {
      const addedFiles = [];

      for (const file of files) {
        if (!ALLOWED_TYPES.includes(file.type)) {
          throw new Error(
            `${file.name}: Unsupported file type.`
          );
        }

        if (file.size > MAX_FILE_SIZE) {
          throw new Error(
            `${file.name}: Maximum file size is 900 KB.`
          );
        }

        addedFiles.push({
          name: file.name,
          mimeType: file.type,
          size: file.size,
          data: await readFile(file)
        });
      }

      setForm(previous => ({
        ...previous,
        attachments: [
          ...previous.attachments,
          ...addedFiles
        ]
      }));

    } catch (error) {
      alert(error.message);
    }
  }

  function removeAttachment(index) {
    setForm(previous => ({
      ...previous,
      attachments: previous.attachments.filter(
        (_, i) => i !== index
      )
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      alert("Please enter a task name.");
      return;
    }

    if (
      form.startDate &&
      form.dueDate &&
      form.startDate > form.dueDate
    ) {
      alert("Start date cannot be after due date.");
      return;
    }

    if (form.recurrence !== "None" && !form.dueDate) {
      alert("A due date is required for recurring tasks.");
      return;
    }

    if (
      form.reminderMinutes !== "" &&
      (!form.dueDate || !form.dueTime)
    ) {
      alert("Select a due date and time for reminders.");
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      listName: form.listName.trim() || "Inbox",

      reminderMinutes:
        form.reminderMinutes === ""
          ? null
          : Number(form.reminderMinutes),

      subtasks: form.subtasks
        .filter(item => item.title.trim())
        .map(item => ({
          title: item.title.trim(),
          completed: item.completed
        }))
    };

   try {
  setSaving(true);

  // Request permission when the user creates a reminder
  if (
    payload.reminderMinutes !== null &&
    "Notification" in window &&
    Notification.permission === "default"
  ) {
    await Notification.requestPermission();
  }

  const success = await onSave(payload);

      if (!success) return;

      setForm(
        createEmptyForm(defaultPriority, defaultCategory)
      );

    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="create-quest advanced-task-form"
      ref={sectionRef}
    >

      <div className="form-heading">
        <h2>{editingTask ? "Edit Task" : "Create a New Task"}</h2>

        <p>
          Organize your work with scheduling, subtasks and reminders.
        </p>
      </div>

      <form onSubmit={handleSubmit}>

        {/* TASK INFORMATION */}
        <div className="task-form-block">

          <div className="task-form-block-heading">
            <h3>Task Details</h3>
            <p>Give your task a name and choose its category.</p>
          </div>

          <div className="form-group task-title-field">
            <label htmlFor="task-title">
              Task Name *
            </label>

            <input
              id="task-title"
              type="text"
              maxLength={150}
              placeholder="What do you need to do?"
              value={form.title}
              onChange={e =>
                updateField("title", e.target.value)
              }
              required
            />
          </div>

          <div className="task-form-grid task-form-grid-three">

            <div className="form-group">
              <label htmlFor="task-priority">
                Priority
              </label>

              <select
                id="task-priority"
                value={form.priority}
                onChange={e =>
                  updateField("priority", e.target.value)
                }
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-category">
                Focus Area
              </label>

              <select
                id="task-category"
                value={form.category}
                onChange={e =>
                  updateField("category", e.target.value)
                }
              >
                <option value="Study">Study</option>
                <option value="Coding">Coding</option>
                <option value="Fitness">Fitness</option>
                <option value="Personal">Personal</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="task-list">
                List
              </label>

              <select
                id="task-list"
                value={form.listName}
                onChange={e =>
                  updateField("listName", e.target.value)
                }
              >
                <option value="Inbox">Inbox</option>

                {lists.map(list => (
                  <option key={list} value={list}>
                    {list}
                  </option>
                ))}
              </select>
            </div>

          </div>

        </div>


        {/* SCHEDULING */}
        <div className="task-form-block">

          <div className="task-form-block-heading">
            <h3>Schedule</h3>
            <p>Choose when you plan to start and finish.</p>
          </div>

          <div className="task-form-grid task-form-grid-four">

            <div className="form-group">
              <label htmlFor="task-start-date">
                Start Date
              </label>

              <input
                id="task-start-date"
                type="date"
                value={form.startDate}
                onChange={e =>
                  updateField("startDate", e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-date">
                Due Date
              </label>

              <input
                id="task-date"
                type="date"
                value={form.dueDate}
                onChange={e =>
                  updateField("dueDate", e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-time">
                Due Time
              </label>

              <input
                id="task-time"
                type="time"
                value={form.dueTime}
                onChange={e =>
                  updateField("dueTime", e.target.value)
                }
              />
            </div>

            <div className="form-group">
              <label htmlFor="task-reminder">
                Reminder
              </label>

              <select
                id="task-reminder"
                value={form.reminderMinutes}
                onChange={e =>
                  updateField("reminderMinutes", e.target.value)
                }
              >
                <option value="">None</option>
                <option value="0">At due time</option>
                <option value="5">5 minutes before</option>
                <option value="10">10 minutes before</option>
                <option value="15">15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
              </select>
            </div>

          </div>

        </div>


        {/* REPEAT */}
        <div className="task-form-block">

          <div className="task-form-block-heading">
            <h3>Repeat Task</h3>
            <p>Automatically create the next occurrence when completed.</p>
          </div>

          <div className="form-group">
            <select
              id="task-repeat"
              value={form.recurrence}
              onChange={e =>
                updateField("recurrence", e.target.value)
              }
            >
              <option value="None">Does not repeat</option>
              <option value="Daily">Every day</option>
              <option value="Weekly">Every week</option>
              <option value="Monthly">Every month</option>
            </select>
          </div>

        </div>


        {/* NOTES */}
        <div className="task-form-block">

          <div className="task-form-block-heading">
            <h3>Notes</h3>
            <p>Add extra information about this task.</p>
          </div>

          <div className="form-group">
            <textarea
              id="task-notes"
              rows="4"
              maxLength={5000}
              placeholder="Write your notes here..."
              value={form.notes}
              onChange={e =>
                updateField("notes", e.target.value)
              }
            />
          </div>

        </div>


        {/* SUBTASKS AND ATTACHMENTS */}
        <div className="task-form-grid task-form-grid-two">

          <div className="task-form-panel">

            <div className="task-form-block-heading">
              <h3>Subtasks</h3>
              <p>Break this task into smaller steps.</p>
            </div>

            <button
              type="button"
              className="secondary-action-btn"
              onClick={addSubtask}
            >
              + Add Subtask
            </button>

            <div className="subtask-editor-list">

              {form.subtasks.map((subtask, index) => (
                <div
                  className="subtask-editor-row"
                  key={index}
                >
                  <input
                    type="checkbox"
                    checked={subtask.completed}
                    onChange={e =>
                      updateSubtask(
                        index,
                        "completed",
                        e.target.checked
                      )
                    }
                  />

                  <input
                    type="text"
                    placeholder={`Subtask ${index + 1}`}
                    value={subtask.title}
                    onChange={e =>
                      updateSubtask(
                        index,
                        "title",
                        e.target.value
                      )
                    }
                  />

                  <button
                    type="button"
                    className="remove-subtask-btn"
                    onClick={() => removeSubtask(index)}
                  >
                    ×
                  </button>

                </div>
              ))}

              {form.subtasks.length === 0 && (
                <p className="task-form-empty">
                  No subtasks added yet.
                </p>
              )}

            </div>

          </div>


          <div className="task-form-panel">

            <div className="task-form-block-heading">
              <h3>Attachments</h3>
              <p>Upload up to 3 images, PDFs or text files.</p>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
              multiple
              onChange={handleAttachmentUpload}
              disabled={form.attachments.length >= MAX_ATTACHMENTS}
            />

            <div className="task-attachment-editor-list">

              {form.attachments.map((file, index) => (
                <div
                  className="task-attachment-editor"
                  key={`${file.name}-${index}`}
                >
                  <span>📎 {file.name}</span>

                  <button
                    type="button"
                    onClick={() => removeAttachment(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}

              {form.attachments.length === 0 && (
                <p className="task-form-empty">
                  No attachments added yet.
                </p>
              )}

            </div>

          </div>

        </div>


        {/* FORM BUTTONS */}
        <div className="task-form-submit-row">

          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingTask
                ? "Update Task"
                : "Add Task"}
          </button>

          {editingTask && (
            <button
              type="button"
              className="cancel-btn"
              onClick={onCancel}
              disabled={saving}
            >
              Cancel
            </button>
          )}

        </div>

      </form>

    </section>
  );
}

export default TaskForm;