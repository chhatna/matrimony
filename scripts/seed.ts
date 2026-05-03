/**
 * Seed the database with demo users so you can immediately test the app.
 * Run with: npm run seed
 *
 * WARNING: this wipes existing User, Interest, Message, Notification, ProfileView, Shortlist data.
 */
/* eslint-disable no-console */
// Load env from .env.local first (Next.js convention), then fall back to .env.
import { config as loadEnv } from "dotenv";
import path from "node:path";
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });
loadEnv({ path: path.resolve(process.cwd(), ".env") });

import { connectDB } from "../lib/mongodb";
import { User } from "../models/User";
import { Interest } from "../models/Interest";
import { Message } from "../models/Message";
import { Notification } from "../models/Notification";
import { ProfileView } from "../models/ProfileView";
import { Shortlist } from "../models/Shortlist";

const RELIGIONS = ["Hindu", "Muslim", "Christian", "Sikh", "Jain"];
const TONGUES = ["Hindi", "Tamil", "Telugu", "Marathi", "Bengali", "Kannada", "Punjabi"];
const CITIES = ["Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Chennai", "Pune", "Kolkata"];
const PROFESSIONS = ["Software Engineer", "Doctor", "Teacher", "CA", "Architect", "Designer", "Entrepreneur"];
const EDU = ["Bachelors", "Masters", "PhD"];
const FIRST_F = ["Aanya", "Diya", "Isha", "Kavya", "Meera", "Neha", "Pooja", "Riya", "Sara", "Tara"];
const FIRST_M = ["Aarav", "Arjun", "Karan", "Rahul", "Rohan", "Sahil", "Vikram", "Aman", "Nikhil", "Yash"];
const LAST = ["Sharma", "Verma", "Iyer", "Khan", "Patel", "Reddy", "Singh", "Mehta", "Nair", "Das"];

function pick<T>(a: T[]): T { return a[Math.floor(Math.random() * a.length)]; }
function range(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function dobForAge(age: number) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - age);
  d.setMonth(range(0, 11));
  d.setDate(range(1, 28));
  return d;
}

async function main() {
  await connectDB();
  console.log("Wiping existing data...");
  await Promise.all([
    User.deleteMany({}),
    Interest.deleteMany({}),
    Message.deleteMany({}),
    Notification.deleteMany({}),
    ProfileView.deleteMany({}),
    Shortlist.deleteMany({}),
  ]);

  console.log("Creating demo users...");
  const users = [];
  // 2 fixed accounts you can login with
  const fixed = [
    { email: "alice@example.com", fullName: "Alice Sharma", gender: "female", age: 27 },
    { email: "bob@example.com", fullName: "Bob Verma", gender: "male", age: 30 },
  ];
  for (const f of fixed) {
    const u = new User({
      email: f.email,
      fullName: f.fullName,
      gender: f.gender,
      dob: dobForAge(f.age),
      religion: pick(RELIGIONS),
      motherTongue: pick(TONGUES),
      city: pick(CITIES),
      country: "India",
      heightCm: range(150, 190),
      educationLevel: pick(EDU),
      profession: pick(PROFESSIONS),
      bio: "Demo seed account. Login with password: Password123",
    });
    await u.setPassword("Password123");
    await u.save();
    users.push(u);
  }

  for (let i = 0; i < 30; i++) {
    const gender = i % 2 === 0 ? "female" : "male";
    const first = gender === "female" ? pick(FIRST_F) : pick(FIRST_M);
    const last = pick(LAST);
    const age = range(22, 38);
    const u = new User({
      email: `user${i}@example.com`,
      fullName: `${first} ${last}`,
      gender,
      dob: dobForAge(age),
      religion: pick(RELIGIONS),
      motherTongue: pick(TONGUES),
      city: pick(CITIES),
      country: "India",
      heightCm: range(150, 195),
      educationLevel: pick(EDU),
      profession: pick(PROFESSIONS),
      diet: pick(["veg", "non_veg", "eggetarian"]),
      maritalStatus: "never_married",
      bio: `${pick(["Family-oriented.", "Love traveling.", "Foodie.", "Yoga enthusiast."])} ${pick(["Looking for a kind partner.", "Seeking a life companion.", "Hoping to find someone genuine."])}`,
    });
    await u.setPassword("Password123");
    await u.save();
    users.push(u);
  }

  console.log(`Created ${users.length} users.`);
  console.log("\nLogin with any of these:");
  console.log("  alice@example.com / Password123");
  console.log("  bob@example.com / Password123");
  console.log("  user0@example.com .. user29@example.com / Password123");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
