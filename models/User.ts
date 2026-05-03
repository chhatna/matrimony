import mongoose, { Schema, type Model, type Document } from "mongoose";
import bcrypt from "bcryptjs";

export type Gender = "male" | "female" | "other";
export type MaritalStatus = "never_married" | "divorced" | "widowed" | "separated";

export interface IPartnerPrefs {
  ageMin?: number;
  ageMax?: number;
  heightMinCm?: number;
  heightMaxCm?: number;
  religions?: string[];
  communities?: string[];
  motherTongues?: string[];
  maritalStatuses?: string[];
  countries?: string[];
  cities?: string[];
  educationLevels?: string[];
  professions?: string[];
  diet?: string[];
  smoking?: string[];
  drinking?: string[];
}

export interface IUser extends Document {
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isActive: boolean;
  isEmailVerified: boolean;
  isVerifiedProfile: boolean;

  fullName: string;
  gender: Gender;
  dob: Date;
  heightCm?: number | null;
  maritalStatus: MaritalStatus;
  religion: string;
  community: string;
  motherTongue: string;
  country: string;
  city: string;

  educationLevel: string;
  educationField: string;
  profession: string;
  incomeRange: string;

  diet: string;
  smoking: string;
  drinking: string;

  familyType: string;
  familyValues: string;

  bio: string;
  photos: string[];

  partnerPreferences: IPartnerPrefs;

  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;

  age?: number | null;

  setPassword(plain: string): Promise<void>;
  comparePassword(plain: string): Promise<boolean>;
  toPublicJSON(): Record<string, unknown>;
  toCardJSON(): Record<string, unknown>;
}

const PartnerPrefSchema = new Schema<IPartnerPrefs>(
  {
    ageMin: { type: Number, default: 21 },
    ageMax: { type: Number, default: 40 },
    heightMinCm: { type: Number, default: 140 },
    heightMaxCm: { type: Number, default: 210 },
    religions: [{ type: String }],
    communities: [{ type: String }],
    motherTongues: [{ type: String }],
    maritalStatuses: [{ type: String }],
    countries: [{ type: String }],
    cities: [{ type: String }],
    educationLevels: [{ type: String }],
    professions: [{ type: String }],
    diet: [{ type: String }],
    smoking: [{ type: String }],
    drinking: [{ type: String }],
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    isVerifiedProfile: { type: Boolean, default: false },

    fullName: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["male", "female", "other"], required: true, index: true },
    dob: { type: Date, required: true },
    heightCm: { type: Number, default: null },
    maritalStatus: {
      type: String,
      enum: ["never_married", "divorced", "widowed", "separated"],
      default: "never_married",
    },
    religion: { type: String, default: "", index: true },
    community: { type: String, default: "" },
    motherTongue: { type: String, default: "" },
    country: { type: String, default: "", index: true },
    city: { type: String, default: "", index: true },

    educationLevel: { type: String, default: "" },
    educationField: { type: String, default: "" },
    profession: { type: String, default: "" },
    incomeRange: { type: String, default: "" },

    diet: { type: String, default: "" },
    smoking: { type: String, default: "" },
    drinking: { type: String, default: "" },

    familyType: { type: String, default: "" },
    familyValues: { type: String, default: "" },

    bio: { type: String, default: "", maxlength: 2000 },

    photos: [{ type: String }],

    partnerPreferences: { type: PartnerPrefSchema, default: () => ({}) },

    lastActiveAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

UserSchema.virtual("age").get(function (this: IUser) {
  if (!this.dob) return null;
  const diff = Date.now() - new Date(this.dob).getTime();
  return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
});

UserSchema.set("toJSON", { virtuals: true });
UserSchema.set("toObject", { virtuals: true });

UserSchema.methods.setPassword = async function (plain: string) {
  this.passwordHash = await bcrypt.hash(plain, 10);
};

UserSchema.methods.comparePassword = function (plain: string) {
  return bcrypt.compare(plain, this.passwordHash);
};

UserSchema.methods.toPublicJSON = function () {
  const o = this.toObject();
  delete o.passwordHash;
  return o;
};

UserSchema.methods.toCardJSON = function () {
  return {
    _id: this._id,
    fullName: this.fullName,
    age: this.age,
    gender: this.gender,
    city: this.city,
    country: this.country,
    religion: this.religion,
    community: this.community,
    motherTongue: this.motherTongue,
    profession: this.profession,
    educationLevel: this.educationLevel,
    heightCm: this.heightCm,
    maritalStatus: this.maritalStatus,
    photos: this.photos,
    isVerifiedProfile: this.isVerifiedProfile,
    bio: this.bio?.slice(0, 160) || "",
  };
};

export const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) || mongoose.model<IUser>("User", UserSchema);
