const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },

    priority: {
        type: String,
        enum: ["Low", "Medium", "High"],
        default: "Medium"
    },

    category: {
        type: String,
        enum: ["Study", "Coding", "Fitness", "Personal", "Other"],
        default: "Study"
    },

    dueDate: {
        type: String,
        default: ""
    },

    completed: {
        type: Boolean,
        default: false
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Task", taskSchema);