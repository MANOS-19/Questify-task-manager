import {useState, useEffect, useRef, useMemo} from "react";

import { useNavigate } from "react-router-dom";

import TaskCard from "../components/TaskCard";
import TaskForm from "../components/TaskForm";
import Sidebar from "../components/Sidebar";
import Calendar from "../components/Calendar";
import Insights from "../components/Insights";
import Achievements from "../components/Achievements";
import Analytics from "../components/Analytics";

import "./Dashboard.css";
import ProfileImageCropper from "../components/ProfileImageCropper";
import ProfileEmojiPicker from "../components/ProfileEmojiPicker";
import {
  enablePushNotifications,
   disablePushNotifications
} from "../utils/pushNotifications";

import {
  getLocalDateString,
  isTaskOverdue
} from "../utils/taskDate";

// API URL
const API_BASE = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

const API_URL = API_BASE.endsWith("/api/tasks")
  ? API_BASE
  : API_BASE.endsWith("/api")
    ? `${API_BASE}/tasks`
    : `${API_BASE}/api/tasks`;


function getBrowserId() {
  let browserId = localStorage.getItem("questify-browser-id");

  if (!browserId) {
    browserId = crypto.randomUUID();

    localStorage.setItem(
      "questify-browser-id",
      browserId
    );
  }

  return browserId;
}


// NORMALIZE TASK
function normalizeTask(task) {
  return {
    ...task,
    id: task._id || task.id,

    priority: task.priority || "Medium",
    category: task.category || "Study",
    listName: task.listName || "Inbox",

    subtasks: task.subtasks || [],
    attachments: task.attachments || [],

    recurrence: task.recurrence || "None"
  };
}


const DEFAULT_LISTS = [
  "Work",
  "Projects",
  "Errands",
  "Wishlist"
];


// ----------------------------------------
// REGULAR ACHIEVEMENT TRACKING
// ----------------------------------------

function getISTDateKey(value) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date(value));

  return parts;
}

function calculateCurrentStreak(completedTasks) {
  const dates = new Set(
    completedTasks
      .filter(task => task.completedAt)
      .map(task => getISTDateKey(task.completedAt))
  );

  const today = getISTDateKey(new Date());

  const yesterday = new Date(`${today}T00:00:00Z`);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);

  const yesterdayString = yesterday.toISOString().slice(0, 10);

  let currentDate = dates.has(today) ? today : yesterdayString;
  let streak = 0;

  while (dates.has(currentDate)) {
    streak++;

    const previous = new Date(`${currentDate}T00:00:00Z`);
    previous.setUTCDate(previous.getUTCDate() - 1);

    currentDate = previous.toISOString().slice(0, 10);
  }

  return streak;
}




function Dashboard() {
  const navigate = useNavigate();

  const createTaskRef = useRef(null);

  // TASKS
  const [tasks, setTasks] = useState([]);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  // PAGES
  const [activePage, setActivePage] = useState("Dashboard");

  // EDITING
  const [editingTask, setEditingTask] = useState(null);
  const [resetFormToken, setResetFormToken] = useState(0);

  // DELETE
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  // PROFILE
  const [displayName, setDisplayName] = useState(() =>
    localStorage.getItem("questify-username") || "Questify Member"
  );

  const [profileImage, setProfileImage] = useState(() =>
    localStorage.getItem("questify-profile-image") || ""
  );

  const [cropImageSrc, setCropImageSrc] = useState("");

  const [profileEmoji, setProfileEmoji] = useState(() =>
    localStorage.getItem("questify-profile-emoji") || "✨"
  );

  // APPEARANCE
  const [theme, setTheme] = useState(() =>
    localStorage.getItem("questify-theme") || "dark"
  );

  // TASK DEFAULTS
  const [defaultPriority, setDefaultPriority] = useState(() =>
    localStorage.getItem("questify-default-priority") || "Medium"
  );

  const [defaultCategory, setDefaultCategory] = useState(() =>
    localStorage.getItem("questify-default-category") || "Study"
  );



  // CALENDAR
  const [weekStart, setWeekStart] = useState(() =>
    localStorage.getItem("questify-week-start") || "Monday"
  );

  // CUSTOM LISTS
const [customLists, setCustomLists] = useState(() => {
  try {
    const saved = JSON.parse(
      localStorage.getItem("questify-custom-lists") || "[]"
    );

    const validSaved = Array.isArray(saved)
      ? saved
          .filter(item =>
            typeof item === "string" &&
            item.trim() &&
            item.toLowerCase() !== "inbox"
          )
          .map(item => item.trim())
      : [];

    const migrationKey = "questify-default-lists-v1";

    // Add default lists once without removing existing lists.
    if (localStorage.getItem(migrationKey) !== "done") {
      const uniqueLists = new Map();

      [...DEFAULT_LISTS, ...validSaved].forEach(list => {
        uniqueLists.set(list.toLowerCase(), list);
      });

      localStorage.setItem(migrationKey, "done");

      return [...uniqueLists.values()];
    }

    return validSaved;

  } catch {
    return DEFAULT_LISTS;
  }
});

  const [showListForm, setShowListForm] = useState(false);
const [newListName, setNewListName] = useState("");

  // TASK FILTERING
  const [taskView, setTaskView] = useState("Inbox");
  const [selectedList, setSelectedList] = useState("All Lists");

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("default");

  // QUICK ADD
  const [pendingFormScroll, setPendingFormScroll] = useState(false);

const [pushEnabled, setPushEnabled] = useState(false);
const [pushLoading, setPushLoading] = useState(false);
const [pushMessage, setPushMessage] = useState("");

const [clockNow, setClockNow] = useState(() => new Date());


  // SAVE PREFERENCES
  useEffect(() => {
    localStorage.setItem("questify-username", displayName);
  }, [displayName]);

  useEffect(() => {
    localStorage.setItem("questify-theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(
      "questify-default-priority",
      defaultPriority
    );
  }, [defaultPriority]);

  useEffect(() => {
    localStorage.setItem(
      "questify-default-category",
      defaultCategory
    );
  }, [defaultCategory]);



  useEffect(() => {
    localStorage.setItem(
      "questify-week-start",
      weekStart
    );
  }, [weekStart]);

  useEffect(() => {
    localStorage.setItem(
      "questify-custom-lists",
      JSON.stringify(customLists)
    );
  }, [customLists]);


  useEffect(() => {
    localStorage.setItem(
      "questify-profile-emoji",
      profileEmoji
    );
  }, [profileEmoji]);


  // SAVE PROFILE IMAGE SAFELY
  useEffect(() => {
    try {
      if (profileImage) {
        localStorage.setItem(
          "questify-profile-image",
          profileImage
        );
      } else {
        localStorage.removeItem("questify-profile-image");
      }
    } catch (error) {
      console.error("Profile image storage error:", error);
    }
  }, [profileImage]);


  useEffect(() => {
  const interval = setInterval(() => {
    setClockNow(new Date());
  }, 30000);

  return () => clearInterval(interval);
}, []);


  // FETCH TASKS
  async function fetchTasks(silent = false) {
    try {
      if (!silent) {
  setLoading(true);
}
      setErrorMessage("");

      const response = await fetch(API_URL);

      if (!response.ok) {
        throw new Error("Unable to load tasks.");
      }

      const data = await response.json();

const browserId = getBrowserId();

const normalizedTasks = data.map(normalizeTask);

// Associate older tasks with this browser.
await Promise.allSettled(
  normalizedTasks
    .filter(task => !task.browserId)
    .map(task =>
      fetch(`${API_URL}/${task.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ browserId })
      })
    )
);

setTasks(
  normalizedTasks.map(task => ({
    ...task,
    browserId: task.browserId || browserId
  }))
);

    } catch (error) {
      console.error("Fetch tasks error:", error);

      setErrorMessage(
        "Unable to load tasks. Check your backend connection."
      );

    } finally {
  if (!silent) {
    setLoading(false);
  }
}
  }


  useEffect(() => {
    fetchTasks();
  }, []);


  // ----------------------------------------
// REGULAR ACHIEVEMENT POPUPS
// ----------------------------------------

// ----------------------------------------
// PERMANENT REGULAR ACHIEVEMENT POPUPS
// ----------------------------------------

// ----------------------------------------
// DAILY REGULAR ACHIEVEMENT POPUPS
// ----------------------------------------

useEffect(() => {
  if (loading) return;

  let cancelled = false;

  async function checkRegularAchievements() {
    try {
      const browserId = getBrowserId();

      const response = await fetch(
        `${API_URL}/regular-achievements/${encodeURIComponent(browserId)}`
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to check achievements."
        );
      }

      if (cancelled) return;

      const achievements = data.achievements || [];

      // Daily achievements: use date + achievement key.
      const dailyAchievements = achievements.filter(
        achievement =>
          achievement.achievementKey !== "consistent" &&
          achievement.unlocked &&
          achievement.date
      );

      // Consistency achievements: use unique streak milestone IDs.
      const consistentAchievement = achievements.find(
        achievement =>
          achievement.achievementKey === "consistent"
      );

      const dailyIds = dailyAchievements.map(
        achievement =>
          `${achievement.date}:${achievement.achievementKey}`
      );

      const streakMilestones = (
        consistentAchievement?.milestones || []
      ).map(milestone => ({
        id: `consistent:${milestone.id}`,
        days: milestone.days
      }));

      const currentIds = [
        ...dailyIds,
        ...streakMilestones.map(item => item.id)
      ];

      // Versioned key avoids conflicts with the old popup system.
      const storageKey =
        `questify-notified-regular-v2-${browserId}`;

      const saved = localStorage.getItem(storageKey);

      // First initialization: don't show old achievements.
      if (saved === null) {
        localStorage.setItem(
          storageKey,
          JSON.stringify(currentIds)
        );

        return;
      }

      const notifiedIds = new Set(
        JSON.parse(saved)
      );

      // Show newly unlocked daily achievements.
      for (const achievement of dailyAchievements) {
        const id =
          `${achievement.date}:${achievement.achievementKey}`;

        if (notifiedIds.has(id)) continue;

        window.dispatchEvent(
          new CustomEvent("questify:popup", {
            detail: {
              type: "achievement",
              title: "Daily Achievement Unlocked!",
              message: achievement.title,
              icon: achievement.icon || "🏆"
            }
          })
        );

        notifiedIds.add(id);
      }

      // Show a new popup at every 3-day streak milestone.
      for (const milestone of streakMilestones) {
        if (notifiedIds.has(milestone.id)) continue;

        window.dispatchEvent(
          new CustomEvent("questify:popup", {
            detail: {
              type: "achievement",
              title: "Consistency Milestone Unlocked!",
              message: `You maintained a ${milestone.days}-day streak!`,
              icon: "📅"
            }
          })
        );

        notifiedIds.add(milestone.id);
      }

      localStorage.setItem(
        storageKey,
        JSON.stringify([...notifiedIds])
      );

    } catch (error) {
      console.error(
        "Daily achievement popup error:",
        error
      );
    }
  }

  checkRegularAchievements();

  return () => {
    cancelled = true;
  };

}, [tasks, loading]);



  // Check existing notification subscription
useEffect(() => {
  async function checkPushSubscription() {
    try {
      if (!("serviceWorker" in navigator)) return;

      const registration = await navigator.serviceWorker.getRegistration();

      const subscription =
        await registration?.pushManager.getSubscription();

      setPushEnabled(Boolean(subscription));
    } catch (error) {
      console.error("Push subscription check:", error);
    }
  }

  checkPushSubscription();
}, []);

// Enable notifications
async function handleEnablePush() {
  try {
    setPushLoading(true);
    setPushMessage("");

    await enablePushNotifications();

    setPushEnabled(true);
    setPushMessage("Notifications enabled successfully!");
  } catch (error) {
    setPushMessage(error.message);
  } finally {
    setPushLoading(false);
  }
}

// Disable notifications
async function handleDisablePush() {
  try {
    setPushLoading(true);
    setPushMessage("");

    await disablePushNotifications();

    setPushEnabled(false);

    setPushMessage("Notifications disabled successfully!");

  } catch (error) {
    setPushMessage(error.message);
  } finally {
    setPushLoading(false);
  }
}


// =====================================
// QUESTIFY TASK REMINDERS
// =====================================

  // QUICK ADD SCROLL
 function handleQuickAddTask() {
  setEditingTask(null);
  setActivePage("Dashboard");
  setPendingFormScroll(true);
}


 useEffect(() => {
  if (activePage !== "Dashboard" || !pendingFormScroll) {
    return;
  }

  const timer = setTimeout(() => {
    createTaskRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });

    document.getElementById("task-title")?.focus({
      preventScroll: true
    });

    setPendingFormScroll(false);
  }, 200);

  return () => clearTimeout(timer);
}, [activePage, pendingFormScroll]);


// CREATE / UPDATE TASK
async function handleSaveTask(taskData) {
  try {
    const isEditing = Boolean(editingTask);

    const response = await fetch(
      isEditing
        ? `${API_URL}/${editingTask.id}`
        : API_URL,
      {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...taskData,
          browserId: getBrowserId()
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to save task."
      );
    }

    // Update local state instead of reloading every task.
    const savedTask = normalizeTask(data);

    setTasks(previous =>
      isEditing
        ? previous.map(task =>
            task.id === editingTask.id
              ? savedTask
              : task
          )
        : [savedTask, ...previous]
    );

    // Show success popup.
    window.dispatchEvent(
      new CustomEvent("questify:popup", {
        detail: {
          type: "success",
          title: isEditing
            ? "Task updated successfully!"
            : "Task created successfully!",
          message: isEditing
            ? "Your changes have been saved."
            : "Your new task has been added.",
          icon: "✅"
        }
      })
    );

    setEditingTask(null);
    setResetFormToken(previous => previous + 1);

    return true;

  } catch (error) {
    console.error("Save task error:", error);
    alert(error.message);
    return false;
  }
}

// COMPLETE / REOPEN TASK
async function handleToggle(id) {
  const task = tasks.find(item => item.id === id);

  if (!task) return;

  const nextCompleted = !task.completed;

  // Update immediately for a responsive UI.
  const optimisticTask = {
    ...task,
    completed: nextCompleted,
    completedAt: nextCompleted
      ? new Date().toISOString()
      : null
  };

  setTasks(previous =>
    previous.map(item =>
      item.id === id ? optimisticTask : item
    )
  );

  try {
    const response = await fetch(
      `${API_URL}/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          completed: nextCompleted
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Unable to update task."
      );
    }

    // Replace optimistic task with server response.
    setTasks(previous =>
      previous.map(item =>
        item.id === id
          ? normalizeTask(data)
          : item
      )
    );

    // Refresh only when a recurring task creates its next occurrence.
    if (
      nextCompleted &&
      task.recurrence &&
      task.recurrence !== "None"
    ) {
      await fetchTasks(true);
    }

  } catch (error) {
    console.error("Task completion error:", error);

    // Restore original state if server update fails.
    setTasks(previous =>
      previous.map(item =>
        item.id === id ? task : item
      )
    );

    alert(error.message);
  }
}


  // SUBTASK COMPLETE / UNCOMPLETE
  async function handleSubtaskToggle(taskId, index) {
    const task = tasks.find(item => item.id === taskId);

    if (!task) return;

    const updatedSubtasks = task.subtasks.map(
      (subtask, subtaskIndex) =>
        subtaskIndex === index
          ? {
              ...subtask,
              completed: !subtask.completed
            }
          : subtask
    );

    try {
      const response = await fetch(
        `${API_URL}/${taskId}`,
        {
          method: "PUT",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            subtasks: updatedSubtasks
          })
        }
      );

      if (!response.ok) {
        throw new Error("Unable to update subtask.");
      }

      const updatedTask = await response.json();

      setTasks(previous =>
        previous.map(item =>
          item.id === taskId
            ? normalizeTask(updatedTask)
            : item
        )
      );

    } catch (error) {
      console.error(error);
      alert("Unable to update subtask.");
    }
  }


  // EDIT TASK
function handleEdit(task) {
  setEditingTask(task);
  setActivePage("Dashboard");
  setPendingFormScroll(true);
}


  // CANCEL EDIT
  function handleCancelEdit() {
    setEditingTask(null);
    setResetFormToken(previous => previous + 1);
  }


  // DELETE MODAL
  function openDeleteModal(id) {
    setSelectedTaskId(id);
    setShowDeleteModal(true);
  }


  function cancelDelete() {
    setShowDeleteModal(false);
    setSelectedTaskId(null);
  }


  async function confirmDeleteTask() {
    if (!selectedTaskId) return;

    try {
      const response = await fetch(
        `${API_URL}/${selectedTaskId}`,
        {
          method: "DELETE"
        }
      );

      if (!response.ok) {
        throw new Error("Unable to delete task.");
      }

      setTasks(previous =>
        previous.filter(
          task => task.id !== selectedTaskId
        )
      );

      cancelDelete();

    } catch (error) {
      console.error(error);
      alert("Could not delete task.");
    }
  }


  // CLEAR COMPLETED TASKS
  async function handleClearCompleted() {
    const completedTasks = tasks.filter(
      task => task.completed
    );

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
        throw new Error("Some tasks could not be deleted.");
      }

      await fetchTasks();

    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }


async function handleDeleteList(listName) {
  if (listName === "Inbox") {
    alert("The default Inbox cannot be deleted.");
    return;
  }

  const affectedTasks = tasks.filter(
    task => task.listName === listName
  );

  const confirmed = window.confirm(
    `Delete "${listName}" and all ${affectedTasks.length} tasks inside it? This cannot be undone.`
  );

  if (!confirmed) return;

  try {
    const response = await fetch(
      `${API_URL}/list?name=${encodeURIComponent(listName)}`,
      {
        method: "DELETE"
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Unable to delete list.");
    }

    setTasks(previous =>
      previous.filter(task => task.listName !== listName)
    );

    setCustomLists(previous =>
      previous.filter(item => item !== listName)
    );

    if (selectedList === listName) {
      setSelectedList("All Lists");
    }

  } catch (error) {
    console.error("Delete list error:", error);
    alert(error.message);
    await fetchTasks();
  }
}


  // ADD CUSTOM LIST
  function handleAddList(e) {
  e.preventDefault();

  const name = newListName.trim();

  if (!name) return;

  if (name.toLowerCase() === "inbox") {
    alert("Inbox is already available.");
    return;
  }

  const exists = customLists.some(
    list => list.toLowerCase() === name.toLowerCase()
  );

  if (exists) {
    alert("This list already exists.");
    return;
  }

  setCustomLists(previous => [...previous, name]);
  setSelectedList(name);

  setNewListName("");
  setShowListForm(false);
}


  // PROFILE IMAGE UPLOAD
  function handleProfileImageChange(event) {
  const file = event.target.files?.[0];

  event.target.value = "";

  if (!file) return;

  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp"
  ];

  if (!allowedTypes.includes(file.type)) {
    alert("Please upload a JPG, PNG or WebP image.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Image must be smaller than 10 MB.");
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    setCropImageSrc(reader.result);
  };

  reader.onerror = () => {
    alert("Unable to read the selected image.");
  };

  reader.readAsDataURL(file);
}


function handleCroppedProfileImage(imageData) {
  try {
    // Save before updating the displayed image
    localStorage.setItem(
      "questify-profile-image",
      imageData
    );

    setProfileImage(imageData);
    setCropImageSrc("");

  } catch (error) {
    console.error("Profile image storage error:", error);

    alert(
      "Unable to save this image. Try another smaller image."
    );
  }
}

  // TODAY
  const todayString = getLocalDateString();


  // TASK STATISTICS
  const totalTasks = tasks.length;

  const completedTasks = tasks.filter(
    task => task.completed
  ).length;

  const pendingTasks = totalTasks - completedTasks;

  const completionRate = totalTasks === 0
    ? 0
    : Math.round(
        (completedTasks / totalTasks) * 100
      );



// FILTER TASKS
const filteredTasks = useMemo(() => {

  // Get today's date using the computer's local timezone
  const currentDateString = [
    clockNow.getFullYear(),
    String(clockNow.getMonth() + 1).padStart(2, "0"),
    String(clockNow.getDate()).padStart(2, "0")
  ].join("-");

  return tasks.filter(task => {

    const isCompleted = task.completed;
    const overdue = isTaskOverdue(task, clockNow);

    let matchesView = true;

    if (taskView === "Inbox") {
      matchesView = !isCompleted;
    }

    else if (taskView === "Today") {
      matchesView =
        !isCompleted &&
        task.dueDate === currentDateString &&
        !overdue;
    }

    else if (taskView === "Upcoming") {
      matchesView =
        !isCompleted &&
        task.dueDate &&
        task.dueDate > currentDateString;
    }

    else if (taskView === "Overdue") {
      matchesView =
        !isCompleted &&
        overdue;
    }

    else if (taskView === "Completed") {
      matchesView = isCompleted;
    }

    const matchesList =
      selectedList === "All Lists" ||
      task.listName === selectedList;

    const matchesCategory =
      categoryFilter === "All" ||
      task.category === categoryFilter;

    const matchesSearch =
      task.title.toLowerCase().includes(
        searchTerm.toLowerCase()
      ) ||
      (task.notes || "").toLowerCase().includes(
        searchTerm.toLowerCase()
      );

    return (
      matchesView &&
      matchesList &&
      matchesCategory &&
      matchesSearch
    );

  });

}, [
  tasks,
  taskView,
  selectedList,
  categoryFilter,
  searchTerm,
  clockNow
]);


 // SORT TASKS
const sortedTasks = useMemo(() => {

  const priorityOrder = {
    High: 1,
    Medium: 2,
    Low: 3
  };

  // Compare due date and due time
  const compareDueDateTime = (a, b) => {

    // Tasks without due dates go last
    if (!a.dueDate && !b.dueDate) {
      return 0;
    }

    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;

    // First compare dates
    const dateComparison = a.dueDate.localeCompare(b.dueDate);

    if (dateComparison !== 0) {
      return dateComparison;
    }

    // On the same date, tasks with a time come first
    if (!a.dueTime && b.dueTime) return 1;
    if (a.dueTime && !b.dueTime) return -1;

    // Then compare times
    return (a.dueTime || "").localeCompare(b.dueTime || "");
  };


  return [...filteredTasks].sort((a, b) => {

    // Highest priority first
    if (sortBy === "priority") {

      const priorityComparison =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityComparison !== 0) {
        return priorityComparison;
      }

      return compareDueDateTime(a, b);
    }


    // Due date and time: earliest first
    if (sortBy === "dueDate") {
      return compareDueDateTime(a, b);
    }


    // Newest created tasks first
    if (sortBy === "newest") {

      const timeA = new Date(a.createdAt || 0).getTime();
      const timeB = new Date(b.createdAt || 0).getTime();

      return timeB - timeA;
    }


    // Completed tasks: most recently completed first
   if (taskView === "Completed") {
  const timeA = new Date(
    a.completedAt || a.updatedAt || a.createdAt || 0
  ).getTime();

  const timeB = new Date(
    b.completedAt || b.updatedAt || b.createdAt || 0
  ).getTime();

  return timeA - timeB;
}


    // Default: earliest deadline first
    const dueComparison = compareDueDateTime(a, b);

    if (dueComparison !== 0) {
      return dueComparison;
    }

    // Higher priority first when deadlines are identical
    return priorityOrder[a.priority] - priorityOrder[b.priority];

  });

}, [filteredTasks, sortBy, taskView]);


  // DAILY FOCUS
  const dailyFocusTasks = [...tasks]
    .filter(task => !task.completed)
    .sort((a, b) => {
      const dateA = a.dueDate || "9999-12-31";
      const dateB = b.dueDate || "9999-12-31";

      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }

      const priorityOrder = {
        High: 1,
        Medium: 2,
        Low: 3
      };

      return (
        priorityOrder[a.priority] -
        priorityOrder[b.priority]
      );
    })
    .slice(0, 3);


  // RECENT ACTIVITY
  const recentTasks = tasks
    .filter(task => task.completed && task.completedAt)
    .sort(
      (a, b) =>
        new Date(b.completedAt) -
        new Date(a.completedAt)
    )
    .slice(0, 3);

  // ESCAPE KEY FOR DELETE MODAL
  useEffect(() => {
    if (!showDeleteModal) return;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        cancelDelete();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, [showDeleteModal]);


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

          {/* CALENDAR */}
          {activePage === "Calendar" && (
            <Calendar
              tasks={tasks}
              weekStart={weekStart}
            />
          )}


          {/* ACHIEVEMENTS */}
          {activePage === "Achievements" && (
            <Achievements tasks={tasks} />
          )}


          {/* ANALYTICS */}
          {activePage === "Analytics" && (
            <Analytics tasks={tasks} />
          )}


          {/* SETTINGS */}
          {activePage === "Settings" && (
            <section className="settings-page">

              <h1>Settings</h1>
              <p>Manage your Questify preferences.</p>


              {/* PROFILE SETTINGS */}
              <div className="settings-card">

                <h2>Profile Settings</h2>
                <p>Personalize your profile.</p>

                <div className="settings-profile-preview">

                  <div className="profile-avatar">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Profile"
                      />
                    ) : (
                      displayName.charAt(0).toUpperCase() || "Q"
                    )}
                  </div>

                  <div>
                    <strong>
                      {displayName} {profileEmoji}
                    </strong>
                    <p>Your Questify profile</p>
                  </div>

                </div>


                <div className="form-group">

                  <label htmlFor="display-name">
                    Display Name
                  </label>

                  <input
                    id="display-name"
                    value={displayName}
                    onChange={e =>
                      setDisplayName(e.target.value)
                    }
                    maxLength={40}
                    placeholder="Enter your name"
                  />

                </div>


                {/* PROFILE PICTURE */}
<div className="form-group">
  <label htmlFor="profile-image">
    Profile Picture
  </label>

  <div className="profile-upload-row">

    <div className="profile-upload-preview">
      {profileImage ? (
        <img src={profileImage} alt="Profile preview" />
      ) : (
        displayName.trim().charAt(0).toUpperCase() || "Q"
      )}
    </div>

    <div className="profile-upload-actions">

      <input
        id="profile-image"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleProfileImageChange}
      />

      <small>
        JPG, PNG or WebP. Maximum 10 MB.
      </small>

      {profileImage && (
        <button
          type="button"
          className="remove-profile-image-btn"
          onClick={() => {
            localStorage.removeItem("questify-profile-image");
            setProfileImage("");
          }}
        >
          Remove Picture
        </button>
      )}

    </div>
  </div>
</div>


{/* PROFILE EMOJI */}
<div className="form-group">

  <label>Profile Emoji</label>

  <ProfileEmojiPicker
    value={profileEmoji}
    onChange={setProfileEmoji}
    theme={theme}
  />

</div>

              </div>


              {/* APPEARANCE */}
              <div className="settings-card">

                <h2>Appearance</h2>
                <p>Choose your preferred theme.</p>

                <div className="theme-options">

                  <button
                    className={
                      theme === "light"
                        ? "selected-theme"
                        : ""
                    }
                    onClick={() => setTheme("light")}
                  >
                    ☀️ Light Mode
                  </button>

                  <button
                    className={
                      theme === "dark"
                        ? "selected-theme"
                        : ""
                    }
                    onClick={() => setTheme("dark")}
                  >
                    🌙 Dark Mode
                  </button>

                </div>

              </div>


              {/* PUSH NOTIFICATIONS */}
<div className="settings-card">

  <h2>Notifications</h2>

  <p>
    Receive task reminders even when Questify is closed.
  </p>

 <div className="push-notification-actions">

  <button
    type="button"
    onClick={handleEnablePush}
    disabled={pushLoading || pushEnabled}
  >
    {pushLoading
      ? "Please wait..."
      : pushEnabled
        ? "✓ Notifications Enabled"
        : "Enable Notifications"}
  </button>

  <button
    type="button"
    onClick={handleDisablePush}
    disabled={pushLoading || !pushEnabled}
  >
    Turn Off Notifications
  </button>

</div>

{pushMessage && (
  <p className="push-notification-status" role="status">
    {pushMessage}
  </p>
)}

</div>


              {/* TASK DEFAULTS */}
              <div className="settings-card">

                <h2>Task Defaults</h2>
                <p>Choose default values for new tasks.</p>

                <div className="form-group">

                  <label htmlFor="default-priority">
                    Default Priority
                  </label>

                  <select
                    id="default-priority"
                    value={defaultPriority}
                    onChange={e =>
                      setDefaultPriority(e.target.value)
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>

                </div>


                <div className="form-group">

                  <label htmlFor="default-category">
                    Default Category
                  </label>

                  <select
                    id="default-category"
                    value={defaultCategory}
                    onChange={e =>
                      setDefaultCategory(e.target.value)
                    }
                  >
                    <option value="Study">Study</option>
                    <option value="Coding">Coding</option>
                    <option value="Fitness">Fitness</option>
                    <option value="Personal">Personal</option>
                    <option value="Other">Other</option>
                  </select>

                </div>

              </div>




              {/* CALENDAR SETTINGS */}
              <div className="settings-card">

                <h2>Calendar Preferences</h2>
                <p>Choose the first day of your week.</p>

                <div className="form-group">

                  <label htmlFor="week-start">
                    First Day of the Week
                  </label>

                  <select
                    id="week-start"
                    value={weekStart}
                    onChange={e =>
                      setWeekStart(e.target.value)
                    }
                  >
                    <option value="Monday">Monday</option>
                    <option value="Sunday">Sunday</option>
                  </select>

                </div>

              </div>

            </section>
          )}


          {/* DASHBOARD */}
          {activePage === "Dashboard" && (
            <>

              <header>
                <h1>Questify</h1>

                <p>
                  Turn tasks into quests. Build streaks,
                  earn XP and level up your productivity.
                </p>
              </header>


              <section className="welcome">
                <h2>Welcome back!</h2>

                <p>
                  Here's your progress, {displayName}. Keep the streak alive.
                </p>
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




              <Insights tasks={tasks} />




              {/* TASK FORM */}
              <TaskForm
                key={resetFormToken}
                sectionRef={createTaskRef}
                editingTask={editingTask}
                onSave={handleSaveTask}
                onCancel={handleCancelEdit}
                defaultPriority={defaultPriority}
                defaultCategory={defaultCategory}
                lists={customLists}
                resetToken={resetFormToken}
              />

            </>
          )}


          {/* MY TASKS */}
          {activePage === "My Tasks" && (
            <>

              <header>
                <h1>My Tasks</h1>
                <p>Plan, organize and manage all your tasks.</p>
              </header>


             {/* SEARCH AND LIST CREATION */}

<div className="task-search-toolbar">

  <input
    type="text"
    placeholder="Search tasks or notes..."
    value={searchTerm}
    onChange={e => setSearchTerm(e.target.value)}
  />

  <button
    type="button"
    className="secondary-action-btn"
    onClick={() => setShowListForm(previous => !previous)}
  >
    + Create List
  </button>

</div>

{showListForm && (
  <form
    className="inline-list-form"
    onSubmit={handleAddList}
  >
    <input
      type="text"
      placeholder="Enter list name..."
      maxLength={30}
      value={newListName}
      onChange={e => setNewListName(e.target.value)}
      autoFocus
    />

    <button type="submit">
      Save List
    </button>

    <button
      type="button"
      className="list-cancel-btn"
      onClick={() => {
        setShowListForm(false);
        setNewListName("");
      }}
    >
      Cancel
    </button>
  </form>
)}





              {/* SMART TASK VIEWS */}
              <div className="smart-task-views">

                {[
                  "Inbox",
                  "Today",
                  "Upcoming",
                  "Overdue",
                  "Completed"
                ].map(view => (

                  <button
                    type="button"
                    key={view}
                    className={
                      taskView === view
                        ? "active-category"
                        : ""
                    }
                    onClick={() => setTaskView(view)}
                  >
                    {view}

                   <span>
  {view === "Inbox"
    ? tasks.filter(task => !task.completed).length

    : view === "Completed"
      ? tasks.filter(task => task.completed).length

      : view === "Today"
        ? tasks.filter(task =>
            !task.completed &&
            task.dueDate === getLocalDateString(clockNow) &&
            !isTaskOverdue(task, clockNow)
          ).length

        : view === "Upcoming"
          ? tasks.filter(task =>
              !task.completed &&
              task.dueDate &&
              task.dueDate > getLocalDateString(clockNow)
            ).length

          : tasks.filter(task =>
              !task.completed &&
              isTaskOverdue(task, clockNow)
            ).length}
</span>

                  </button>

                ))}

              </div>


             {/* CUSTOM LIST FILTER */}

<div className="custom-list-toolbar">

  <span className="custom-list-label">Lists</span>

  <button
    type="button"
    className={selectedList === "All Lists" ? "active-category" : ""}
    onClick={() => setSelectedList("All Lists")}
  >
    All Lists
  </button>

  <button
    type="button"
    className={selectedList === "Inbox" ? "active-category" : ""}
    onClick={() => setSelectedList("Inbox")}
  >
    Inbox
  </button>

  {customLists.map(list => (
    <div
      className={`custom-list-chip ${
        selectedList === list ? "active" : ""
      }`}
      key={list}
    >
      <button
        type="button"
        onClick={() => setSelectedList(list)}
      >
        {list}
      </button>

      <button
        type="button"
        className="remove-list-btn"
        aria-label={`Delete ${list} list`}
        title={`Delete ${list}`}
        onClick={() => handleDeleteList(list)}
      >
        ×
      </button>
    </div>
  ))}

</div>


              {/* TASK FILTERS */}
              <section className="quests">

                <div className="task-toolbar">

                  <div className="task-sort">

                    <label htmlFor="sort-tasks">
                      Sort by:
                    </label>

                    <select
                      id="sort-tasks"
                      value={sortBy}
                      onChange={e =>
                        setSortBy(e.target.value)
                      }
                    >
                      <option value="default">Default</option>
                      <option value="priority">Highest Priority</option>
                      <option value="dueDate">Due Date</option>
                      <option value="newest">Newest First</option>
                    </select>

                  </div>

                  <div className="task-sort">

                    <label htmlFor="category-filter">
                      Category:
                    </label>

                    <select
                      id="category-filter"
                      value={categoryFilter}
                      onChange={e =>
                        setCategoryFilter(e.target.value)
                      }
                    >
                      <option value="All">All Categories</option>
                      <option value="Study">Study</option>
                      <option value="Coding">Coding</option>
                      <option value="Fitness">Fitness</option>
                      <option value="Personal">Personal</option>
                      <option value="Other">Other</option>
                    </select>

                  </div>

                </div>


                <button
                  type="button"
                  className="clear-completed-btn"
                  disabled={completedTasks === 0}
                  onClick={handleClearCompleted}
                >
                  Clear Completed ({completedTasks})
                </button>


                {/* TASK LIST */}
                {loading ? (

                  <div className="empty-state">
                    <p>Loading tasks...</p>
                  </div>

                ) : errorMessage ? (

                  <div className="empty-state">
                    <p>{errorMessage}</p>

                    <button onClick={fetchTasks}>
                      Try Again
                    </button>
                  </div>

                ) : sortedTasks.length === 0 ? (

                  <div className="empty-state">
                    <h3>No tasks found</h3>
                    <p>
                      Try another view, list or search.
                    </p>
                  </div>

                ) : (

                  sortedTasks.map(task => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      onToggle={handleToggle}
                      onDelete={openDeleteModal}
                      onEdit={handleEdit}
                      onSubtaskToggle={handleSubtaskToggle}
                    />
                  ))

                )}

              </section>

            </>
          )}


          {/* DELETE CONFIRMATION */}
          {showDeleteModal && (

            <div
              className="modal-overlay"
              onClick={cancelDelete}
            >

              <div
                className="delete-modal"
                role="dialog"
                aria-modal="true"
                onClick={e => e.stopPropagation()}
              >

                <h2>Delete Task?</h2>

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

        {/* PROFILE */}
        <div className="profile-card">

          <div className="profile-avatar">

            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile"
              />
            ) : (
              displayName.trim().charAt(0).toUpperCase() || "Q"
            )}

          </div>

          <h3>Welcome back!</h3>

          <p>
            {displayName} {profileEmoji}
          </p>

        </div>


        {/* QUICK ADD TASK */}
        <button
          type="button"
          className="quick-add-task-btn"
          onClick={handleQuickAddTask}
        >
          <span>＋</span>
          Quick Add Task
        </button>


        {/* DAILY FOCUS */}
        <div className="daily-focus-card">

          <div className="focus-heading">
            <h3>🎯 Daily Focus</h3>
            <span>Top 3</span>
          </div>

          {dailyFocusTasks.length === 0 ? (

            <p className="no-upcoming">
              All caught up! Great work. 🎉
            </p>

          ) : (

            dailyFocusTasks.map(task => (
              <div className="focus-task" key={task.id}>

                <button
                  type="button"
                  className="focus-complete-btn"
                  onClick={() => handleToggle(task.id)}
                  aria-label={`Complete ${task.title}`}
                >
                  ✓
                </button>

                <div className="focus-task-content">

                  <h4>{task.title}</h4>

                  <div className="focus-task-meta">

                    <span
                      className={`focus-priority ${
                        task.priority.toLowerCase()
                      }`}
                    >
                      {task.priority}
                    </span>

                    <span>
                      {task.dueDate || "No due date"}
                    </span>

                  </div>

                </div>

              </div>
            ))

          )}

        </div>


        {/* RECENT ACTIVITY */}
        <div className="recent-activity-card">

          <div className="recent-activity-heading">
            <h3>Recent Activity</h3>
            <span>Latest 3</span>
          </div>

          {recentTasks.length === 0 ? (

            <p className="no-upcoming">
              No completed tasks yet.
            </p>

          ) : (

            recentTasks.map(task => (
              <div
                className="recent-activity-item"
                key={task.id}
              >

                <span className="activity-check">✓</span>

                <div>
                  <h4>{task.title}</h4>

                  <small>
                    {new Date(
                      task.completedAt
                    ).toLocaleDateString("en-IN")}
                  </small>
                </div>

              </div>
            ))

          )}

        </div>

      </aside>


{cropImageSrc && (
  <ProfileImageCropper
    image={cropImageSrc}
    onCancel={() => setCropImageSrc("")}
    onSave={handleCroppedProfileImage}
  />
)}

    </div>
  );
}

export default Dashboard;