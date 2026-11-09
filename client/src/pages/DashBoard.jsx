import { useState, useEffect } from "react";
import TaskCard from "../components/TaskCard";
import Sidebar from "../components/Sidebar";
import Calendar from "../components/Calendar";

const API_URL = "http://localhost:5000/api/tasks";

// Convert MongoDB task ID into the id format used by TaskCard
function normalizeTask(task) {
  return {
    ...task,
    id: task._id || task.id
  };
}

function Dashboard() {
  // Store tasks received from MongoDB
  const [tasks, setTasks] = useState([]);

  const [activePage, setActivePage] = useState("Dashboard");

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("questify-theme") || "light";
  });

  const [displayName, setDisplayName] = useState(() => {
    return localStorage.getItem("questify-username") || "Questify Member";
  });

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [category, setCategory] = useState("Study");
  const [dueDate, setDueDate] = useState("");

  const [filter, setFilter] = useState("All");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("default");

  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // GET: Load tasks from MongoDB
  async function fetchTasks() {
    try {
      setLoading(true);
      setErrorMessage("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();

      setTasks(data.map(normalizeTask));
    } catch (error) {
      console.error("Error fetching tasks:", error);
      setErrorMessage("Unable to load tasks. Check your backend server.");
    } finally {
      setLoading(false);
    }
  }

  // Load tasks when Dashboard first opens
  useEffect(() => {
    fetchTasks();
  }, []);

  // Save theme
  useEffect(() => {
    localStorage.setItem("questify-theme", theme);
  }, [theme]);

  // Save display name
  useEffect(() => {
    localStorage.setItem("questify-username", displayName);
  }, [displayName]);

  // Close delete modal using Escape key
  useEffect(() => {
    if (!showDeleteModal) return;

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        cancelDelete();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showDeleteModal]);

  // POST: Create task / PUT: Update task
  async function handleSubmit(e) {
    e.preventDefault();

    if (title.trim() === "") {
      alert("Please enter a task name!");
      return;
    }

    const taskData = {
      title: title.trim(),
      priority,
      category,
      dueDate
    };

    try {
      const isEditing = editingId !== null;

      const response = await fetch(
        isEditing ? `${API_URL}/${editingId}` : API_URL,
        {
          method: isEditing ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(taskData)
        }
      );

      if (!response.ok) {
        throw new Error("Unable to save task");
      }

      await response.json();

      await fetchTasks();

      handleCancelEdit();
    } catch (error) {
      console.error("Error saving task:", error);
      alert("Could not save the task. Please try again.");
    }
  }

  // PUT: Complete or uncomplete task
  async function handleToggle(id) {
    const task = tasks.find(task => task.id === id);

    if (!task) return;

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          completed: !task.completed
        })
      });

      if (!response.ok) {
        throw new Error("Unable to update task");
      }

      const updatedTask = await response.json();

      setTasks(prevTasks =>
        prevTasks.map(item =>
          item.id === id ? normalizeTask(updatedTask) : item
        )
      );
    } catch (error) {
      console.error("Error updating task:", error);
      alert("Could not update task.");
    }
  }

  // Open delete confirmation modal
  function openDeleteModal(id) {
    setSelectedTaskId(id);
    setShowDeleteModal(true);
  }

  // DELETE: Remove task from MongoDB
  async function confirmDeleteTask() {
    try {
      const response = await fetch(
        `${API_URL}/${selectedTaskId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Unable to delete task");
      }

      setTasks(prevTasks =>
        prevTasks.filter(task => task.id !== selectedTaskId)
      );

      setShowDeleteModal(false);
      setSelectedTaskId(null);
    } catch (error) {
      console.error("Error deleting task:", error);
      alert("Could not delete task.");
    }
  }

  // Cancel deletion
  function cancelDelete() {
    setShowDeleteModal(false);
    setSelectedTaskId(null);
  }

  // Edit task
  function handleEdit(task) {
    setTitle(task.title);
    setPriority(task.priority);
    setCategory(task.category || "Study");
    setDueDate(task.dueDate || "");
    setEditingId(task.id);

    setActivePage("Dashboard");
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingId(null);
    setTitle("");
    setPriority("Medium");
    setCategory("Study");
    setDueDate("");
  }

  // DELETE: Clear all completed tasks
  async function handleClearCompleted() {
    const completedTasks = tasks.filter(task => task.completed);

    if (completedTasks.length === 0) return;

    const confirmed = window.confirm(
      "Are you sure you want to clear all completed tasks?"
    );

    if (!confirmed) return;

    try {
      const responses = await Promise.all(
        completedTasks.map(task =>
          fetch(`${API_URL}/${task.id}`, {
            method: "DELETE"
          })
        )
      );

      if (responses.some(response => !response.ok)) {
        throw new Error("Some tasks could not be deleted");
      }

      setTasks(prevTasks =>
        prevTasks.filter(task => !task.completed)
      );
    } catch (error) {
      console.error("Error clearing completed tasks:", error);
      alert("Could not clear completed tasks.");
      await fetchTasks();
    }
  }

  // Calculate statistics
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    task => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const completionRate = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    const matchesStatus =
      filter === "All" ||
      (filter === "Active" && !task.completed) ||
      (filter === "Completed" && task.completed);

    const matchesCategory =
      categoryFilter === "All" ||
      (task.category || "Study") === categoryFilter;

    const matchesSearch =
      task.title.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesCategory && matchesSearch;
  });

  // Sort tasks
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortBy === "priority") {
      const priorityOrder = {
        High: 1,
        Medium: 2,
        Low: 3
      };

      return priorityOrder[a.priority] - priorityOrder[b.priority];
    }

    if (sortBy === "dueDate") {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;

      return a.dueDate.localeCompare(b.dueDate);
    }

    if (sortBy === "newest") {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }

    return 0;
  });

  // Calculate upcoming tasks
  const upcomingTasks = tasks
    .filter(task => !task.completed && task.dueDate)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 4);

  return (
    <div className={`app-layout ${theme}-theme`}>

      {/* LEFT SIDEBAR */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
      />

      {/* MAIN CONTENT */}
      <main className="main-content">
        <div className="dashboard">

          {/* CALENDAR PAGE */}
          {activePage === "Calendar" && (
            <Calendar tasks={tasks} />
          )}

          {/* SETTINGS PAGE */}
          {activePage === "Settings" && (
            <section className="settings-page">
              <h1>Settings</h1>
              <p>Manage your Questify preferences.</p>

              <div className="settings-card">
                <h2>Profile Settings</h2>
                <p>Update your display name.</p>

                <div className="form-group">
                  <label htmlFor="display-name">Display Name</label>

                  <input
                    id="display-name"
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
              </div>

              <div className="settings-card">
                <h2>Appearance</h2>
                <p>Choose your preferred theme.</p>

                <div className="theme-options">
                  <button
                    className={theme === "light" ? "selected-theme" : ""}
                    onClick={() => setTheme("light")}
                  >
                    ☀️ Light Mode
                  </button>

                  <button
                    className={theme === "dark" ? "selected-theme" : ""}
                    onClick={() => setTheme("dark")}
                  >
                    🌙 Dark Mode
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* DASHBOARD PAGE */}
          {activePage === "Dashboard" && (
            <>
              <header>
                <h1>Questify</h1>
                <p>Manage your tasks and stay productive.</p>
              </header>

              <section className="welcome">
                <h2>Welcome back!</h2>
                <p>Here's an overview of your tasks.</p>
              </section>

              {/* STATISTICS */}
              <section className="stats">
                <div className="stat-card">
                  <h3>Total Tasks</h3>
                  <p>{totalTasks}</p>
                </div>

                <div className="stat-card">
                  <h3>Completed Tasks</h3>
                  <p>{completedTasks}</p>
                </div>

                <div className="stat-card">
                  <h3>Pending Tasks</h3>
                  <p>{pendingTasks}</p>
                </div>

                <div className="stat-card">
                  <h3>Completion Rate</h3>
                  <p>{completionRate}%</p>
                </div>
              </section>

              {/* OVERALL PROGRESS */}
              <section className="xp-section">
                <div className="xp-heading">
                  <h3>Overall Progress</h3>
                  <span>{completionRate}% Completed</span>
                </div>

                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${completionRate}%` }}
                  ></div>
                </div>

                <p>
                  {completedTasks} out of {totalTasks} tasks completed.
                </p>
              </section>

              {/* CREATE / EDIT TASK */}
              <section className="create-quest">
                <div className="form-heading">
                  <h2>
                    {editingId !== null ? "Edit Task" : "Create a New Task"}
                  </h2>

                  <p>
                    Add a task to your list and keep track of your progress.
                  </p>
                </div>

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label htmlFor="task-title">Task Name</label>

                    <input
                      id="task-title"
                      type="text"
                      placeholder="What do you need to do?"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-priority">Priority</label>

                    <select
                      id="task-priority"
                      value={priority}
                      onChange={e => setPriority(e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-category">Category</label>

                    <select
                      id="task-category"
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                    >
                      <option value="Study">Study</option>
                      <option value="Coding">Coding</option>
                      <option value="Fitness">Fitness</option>
                      <option value="Personal">Personal</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="task-date">Due Date</label>

                    <input
                      id="task-date"
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                    />
                  </div>

                  <div className="form-actions">
                    <button type="submit">
                      {editingId !== null ? "Update Task" : "Add Task"}
                    </button>

                    {editingId !== null && (
                      <button
                        type="button"
                        className="cancel-btn"
                        onClick={handleCancelEdit}
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                </form>
              </section>
            </>
          )}

          {/* MY TASKS PAGE */}
          {activePage === "My Tasks" && (
            <>
              <header>
                <h1>My Tasks</h1>
                <p>Manage, filter and track all your tasks.</p>
              </header>

              <div className="task-search">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>

              <button
                className="clear-completed-btn"
                disabled={completedTasks === 0}
                onClick={handleClearCompleted}
              >
                Clear Completed ({completedTasks})
              </button>

              <section className="quests">
                <div className="task-toolbar">
                  <div className="task-sort">
                    <label htmlFor="sort-tasks">Sort by:</label>

                    <select
                      id="sort-tasks"
                      value={sortBy}
                      onChange={e => setSortBy(e.target.value)}
                    >
                      <option value="default">Default</option>
                      <option value="priority">Highest Priority</option>
                      <option value="dueDate">Due Date</option>
                      <option value="newest">Newest First</option>
                    </select>
                  </div>
                </div>

                {/* STATUS FILTERS */}
                <div className="filters">
                  {["All", "Active", "Completed"].map(item => (
                    <button
                      key={item}
                      className={filter === item ? "active-category" : ""}
                      onClick={() => setFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* CATEGORY FILTERS */}
                <div className="category-filters">
                  {["All", "Study", "Coding", "Fitness", "Personal", "Other"].map(item => (
                    <button
                      key={item}
                      className={categoryFilter === item ? "active-category" : ""}
                      onClick={() => setCategoryFilter(item)}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {/* TASK LIST */}
                {loading ? (
                  <div className="empty-state">
                    <p>Loading tasks...</p>
                  </div>
                ) : errorMessage ? (
                  <div className="empty-state">
                    <p>{errorMessage}</p>
                    <button onClick={fetchTasks}>Try Again</button>
                  </div>
                ) : filteredTasks.length === 0 ? (
                  <div className="empty-state">
                    {tasks.length === 0 ? (
                      <>
                        <h3>No tasks yet</h3>
                        <p>Create your first task to get started.</p>
                      </>
                    ) : (
                      <>
                        <h3>No matching tasks found</h3>
                        <p>Try changing your search or filters.</p>
                      </>
                    )}
                  </div>
                ) : (
                  sortedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={openDeleteModal}
                      onEdit={handleEdit}
                    />
                  ))
                )}
              </section>
            </>
          )}

          {/* DELETE CONFIRMATION MODAL */}
          {showDeleteModal && (
            <div
              className="modal-overlay"
              onClick={cancelDelete}
            >
              <div
                className="delete-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="delete-modal-title"
                onClick={e => e.stopPropagation()}
              >
                <h2 id="delete-modal-title">Delete Task?</h2>

                <p>
                  Are you sure you want to delete this task?
                  This action cannot be undone.
                </p>

                <div className="modal-actions">
                  <button
                    className="cancel-modal-btn"
                    onClick={cancelDelete}
                  >
                    Cancel
                  </button>

                  <button
                    className="confirm-delete-btn"
                    onClick={confirmDeleteTask}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* RIGHT PANEL */}
      <aside className="right-panel">
        <div className="profile-card">
          <div className="profile-avatar">
            {displayName.trim().charAt(0).toUpperCase() || "Q"}
          </div>

          <h3>Welcome back!</h3>
          <p>{displayName}</p>
        </div>

        <div className="upcoming-card">
          <h3>Upcoming Tasks</h3>

          {upcomingTasks.length === 0 ? (
            <p className="no-upcoming">No upcoming tasks.</p>
          ) : (
            upcomingTasks.map(task => (
              <div className="upcoming-task" key={task.id}>
                <h4>{task.title}</h4>
                <p>{task.dueDate}</p>
                <span>{task.priority}</span>
              </div>
            ))
          )}
        </div>
      </aside>

    </div>
  );
}

export default Dashboard;