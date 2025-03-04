<<<<<<< HEAD
// models/user.js
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    // 다른 필요한 필드들...
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
=======
import { DataTypes } from "sequelize";
import sequelize from "../config/dbConfig.js";

const User = sequelize.define(
  "User",
  {
    name: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    phoneNumber: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    profileImage: {
      type: DataTypes.STRING,
      defaultValue: "",
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    timestamps: true,
  }
);

export default User;
>>>>>>> b6b4f859b82d3c9abe27289a685c9ecae9ac2308
