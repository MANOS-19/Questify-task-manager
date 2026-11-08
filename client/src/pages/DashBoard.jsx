import { useState, useEffect } from "react";
import TaskCard from "../components/TaskCard";

function Dashboard() {

  // Store all tasks
  const [tasks, setTasks] = useState(() => {
    try {
      const savedTasks = localStorage.getItem("questify-tasks");
      return savedTasks ? JSON.parse(savedTasks) : [];
    } catch (error) {
      console.error("Error loading tasks:", error);
      return [];
    }
  });

  // Delete confirmation modal states
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [selectedTaskId, setSelectedTaskId] = useState(null);

  // Store task title
  const [title, setTitle] = useState("");

  // Store task priority
  const [priority, setPriority] = useState("Medium");

  // Store task category
  const [category, setCategory] = useState("Study");

  const [dueDate, setDueDate] = useState("");

  // Store status filter
  const [filter, setFilter] = useState("All");

  // Store category filter
  const [categoryFilter, setCategoryFilter] = useState("All");

  // Store search input
const [searchTerm, setSearchTerm] = useState("");

// Store selected sorting option
const [sortBy, setSortBy] = useState("default");

  // Store editing task ID
  const [editingId, setEditingId] = useState(null);


  // Save tasks in localStorage
  useEffect(() => {
    localStorage.setItem("questify-tasks", JSON.stringify(tasks));
  }, [tasks]);

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


  // Add or update task
  function handleSubmit(e) {

    e.preventDefault();

    if (title.trim() === "") {
      alert("Please enter a task name!");
      return;
    }

    if (editingId !== null) {

      // Update existing task
      setTasks(tasks.map((task) =>
        task.id === editingId
          ? {
              ...task,
              title: title,
              priority: priority,
              category: category,
               dueDate: dueDate
            }
          : task
      ));

      setEditingId(null);

    } else {

      // Create new task
      const newTask = {
        id: Date.now(),
        title: title,
        priority: priority,
        category: category,
        dueDate: dueDate,
        completed: false,
        
      };

      setTasks([...tasks, newTask]);

    }

    // Reset form
    setTitle("");
    setPriority("Medium");
    setCategory("Study");
    setDueDate("");

  }


  // Complete or uncomplete task
  function handleToggle(id) {

    setTasks((prevTasks) =>
  prevTasks.map((task) =>
    task.id === id
      ? { ...task, completed: !task.completed }
      : task
  )
);

  }


  // Delete task
// Open delete confirmation modal
function openDeleteModal(id) {
  setSelectedTaskId(id);
  setShowDeleteModal(true);
}

// Confirm task deletion
function confirmDeleteTask() {
  setTasks((prevTasks) =>
    prevTasks.filter((task) => task.id !== selectedTaskId)
  );

  setShowDeleteModal(false);
  setSelectedTaskId(null);
}

// Cancel task deletion
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

  }

  function handleCancelEdit() {
  setEditingId(null);
  setTitle("");
  setPriority("Medium");
  setCategory("Study");
  setDueDate("");
}

  // Calculate statistics
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const completionRate = totalTasks === 0
    ? 0
    : Math.round((completedTasks / totalTasks) * 100);


  // Filter tasks
// Filter and search tasks
const filteredTasks = tasks.filter((task) => {

  // Filter by completion status
  const matchesStatus =
    filter === "All" ||
    (filter === "Active" && !task.completed) ||
    (filter === "Completed" && task.completed);

  // Filter by category
  const matchesCategory =
    categoryFilter === "All" ||
    (task.category || "Study") === categoryFilter;

  // Search by task name
  const matchesSearch =
    task.title.toLowerCase().includes(searchTerm.toLowerCase());

  return matchesStatus && matchesCategory && matchesSearch;

});

// Sort filtered tasks
const sortedTasks = [...filteredTasks].sort((a, b) => {

  // Sort by priority
  if (sortBy === "priority") {

    const priorityOrder = {
      High: 1,
      Medium: 2,
      Low: 3
    };

    return priorityOrder[a.priority] - priorityOrder[b.priority];

  }

  // Sort by due date
  if (sortBy === "dueDate") {
    
    if (!a.dueDate && !b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    return a.dueDate.localeCompare(b.dueDate);

  }

  // Sort by newest task
  if (sortBy === "newest") {

    return b.id - a.id;

  }

  // Default order
  return 0;

});


  return (

    <div className="dashboard">

      {/* Header */}

      <header>
        <h1>Questify</h1>
        <p>Manage your tasks and stay productive.</p>
      </header>


      {/* Welcome Section */}

      <section className="welcome">
        <h2>Welcome back!</h2>
        <p>Here's an overview of your tasks.</p>
      </section>


      {/* Statistics */}

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


      {/* Overall Progress */}

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


      {/* Create Task Form */}

  <section className="create-quest">

  <div className="form-heading">
    <h2>Create a New Task</h2>
    <p>Add a task to your list and keep track of your progress.</p>
  </div>

  <form onSubmit={handleSubmit}>

    <div className="form-group">
      <label htmlFor="task-title">Task Name</label>

      <input
        id="task-title"
        type="text"
        placeholder="What do you need to do?"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
    </div>

    <div className="form-group">
      <label htmlFor="task-priority">Priority</label>

      <select
        id="task-priority"
        value={priority}
        onChange={(e) => setPriority(e.target.value)}
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
        onChange={(e) => setCategory(e.target.value)}
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
    onChange={(e) => setDueDate(e.target.value)}
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


      {/* Task List */}

      <section className="quests">

        <h2>My Tasks</h2>

        {/* Search Tasks */}

{/* Search and Sort */}

<div className="task-toolbar">

  <div className="task-search">

    <input
      type="text"
      placeholder="Search tasks..."
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
    />

  </div>

  <div className="task-sort">

    <label htmlFor="sort-tasks">Sort by:</label>

    <select
      id="sort-tasks"
      value={sortBy}
      onChange={(e) => setSortBy(e.target.value)}
    >

      <option value="default">Default</option>

      <option value="priority">Highest Priority</option>

      <option value="dueDate">Due Date</option>

      <option value="newest">Newest First</option>

    </select>

  </div>

</div>


        {/* Status Filters */}

        <div className="filters">

          {["All", "Active", "Completed"].map((item) => (

            <button
              key={item}
              className={filter === item ? "active-category" : ""}
              onClick={() => setFilter(item)}
            >
              {item}
            </button>

          ))}

        </div>


        {/* Category Filters */}

        <div className="category-filters">

          {["All", "Study", "Coding", "Fitness", "Personal", "Other"].map((item) => (

            <button
              key={item}
              className={categoryFilter === item ? "active-category" : ""}
              onClick={() => setCategoryFilter(item)}
            >
              {item}
            </button>

          ))}

        </div>


        {/* Display Tasks */}
{filteredTasks.length === 0 ? (
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
  sortedTasks.map((task) => (
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

      {/* Delete Confirmation Modal */}
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
  onClick={(e) => e.stopPropagation()}
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

  );

}

export default Dashboard;