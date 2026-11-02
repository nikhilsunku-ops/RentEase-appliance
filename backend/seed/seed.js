require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/db");
const User = require("../models/User");
const Category = require("../models/Category");
const Appliance = require("../models/Appliance");
const Booking = require("../models/Booking");
const Notification = require("../models/Notification");

const run = async () => {
  await connectDB();

  await Promise.all([User.deleteMany(), Category.deleteMany(), Appliance.deleteMany(), Booking.deleteMany(), Notification.deleteMany()]);

  const [admin, owner, pendingOwner, consumer, technician] = await User.create([
    {
      name: "Demo Admin",
      email: "admin@rentease.test",
      password: "password123",
      role: "admin",
      address: "Chennai, TN",
      isEmailVerified: true,
    },
    {
      name: "Demo Owner",
      email: "owner@rentease.test",
      password: "password123",
      role: "owner",
      isApproved: true,
      address: "Chennai, TN",
      isEmailVerified: true,
    },
    {
      name: "Pending Owner",
      email: "pending-owner@rentease.test",
      password: "password123",
      role: "owner",
      isApproved: false, // REQ-6: demo of an account awaiting Admin approval
      address: "Chennai, TN",
      isEmailVerified: true,
    },
    {
      name: "Demo Consumer",
      email: "consumer@rentease.test",
      password: "password123",
      role: "consumer",
      address: "Chennai, TN",
      isEmailVerified: true,
    },
    {
      name: "Demo Technician",
      email: "technician@rentease.test",
      password: "password123",
      role: "technician",
      isApproved: true,
      phone: "9876543210",
      address: "Chennai, TN",
      isEmailVerified: true,
    },
  ]);

  const categories = await Category.create([
    { categoryName: "Kitchen", description: "Kitchen appliances" },
    { categoryName: "Cleaning", description: "Cleaning equipment" },
    { categoryName: "Entertainment", description: "TVs, projectors, speakers" },
  ]);

  await Appliance.create([
    {
      owner: owner._id,
      category: categories[0]._id,
      title: "Instant Pot Duo 6L",
      description: "7-in-1 electric pressure cooker, barely used.",
      brand: "Instant Pot",
      model: "Duo60",
      rentPricePerMonth: 800,
      securityDeposit: 1000,
      condition: "excellent",
      location: { city: "Chennai" },
      images: [],
      availabilityStatus: "available",
    },
    {
      owner: owner._id,
      category: categories[1]._id,
      title: "Robot Vacuum Cleaner",
      description: "Smart robot vacuum with app control.",
      brand: "Eufy",
      model: "RoboVac 11S",
      rentPricePerMonth: 1200,
      securityDeposit: 1500,
      condition: "good",
      location: { city: "Chennai" },
      images: [],
      availabilityStatus: "available",
    },
    {
      owner: owner._id,
      category: categories[2]._id,
      title: "Mini Projector",
      description: "1080p portable projector, great for movie nights.",
      brand: "Anker",
      model: "Nebula Capsule",
      rentPricePerMonth: 1500,
      securityDeposit: 2000,
      condition: "good",
      location: { city: "Chennai" },
      images: [],
      availabilityStatus: "available",
    },
  ]);

  console.log("Seed complete.");
  console.log("Admin login:            admin@rentease.test / password123");
  console.log("Owner login (approved):  owner@rentease.test / password123");
  console.log("Owner login (pending):   pending-owner@rentease.test / password123");
  console.log("Consumer login:          consumer@rentease.test / password123");
  console.log("Technician login:        technician@rentease.test / password123");

  await mongoose.disconnect();
  process.exit(0);
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
