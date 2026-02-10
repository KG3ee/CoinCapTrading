import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { customAlphabet } from 'nanoid';

const generateUid = customAlphabet('0123456789', 8);
const generateReferral = customAlphabet('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 7);

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,})+$/,
        'Please provide a valid email',
      ],
    },
    fullName: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    password: {
      type: String,
      required: false,
      minlength: 6,
      select: false,
    },
    uid: {
      type: String,
      unique: true,
      default: () => generateUid(),
    },
    referralCode: {
      type: String,
      unique: true,
      default: () => `REF${generateReferral()}`,
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
    },
    isDemoUser: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationToken: {
      type: String,
      default: null,
      select: false,
    },
    verificationTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    googleId: {
      type: String,
      default: null,
      index: { sparse: true },
    },
    resetToken: {
      type: String,
      default: null,
      select: false,
    },
    resetTokenExpires: {
      type: Date,
      default: null,
      select: false,
    },
    language: {
      type: String,
      default: 'English',
    },
    withdrawalAddress: {
      type: String,
      default: '',
    },
    profilePicture: {
      type: String,
      default: null,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    lastSeenUserNotificationAt: {
      type: Date,
      default: null,
    },
    kycStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none',
    },
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
      select: false,
    },
    twoFactorTempSecret: {
      type: String,
      default: null,
      select: false,
    },
    twoFactorTempSecretExpires: {
      type: Date,
      default: null,
      select: false,
    },
    twoFactorBackupCodes: {
      type: [String],
      default: [],
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// Note: email, uid, and referralCode already have unique indexes from schema definition
// Only add sparse indexes for optional fields used in queries
userSchema.index({ resetToken: 1 }, { sparse: true });
userSchema.index({ verificationToken: 1 }, { sparse: true });

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to match password
userSchema.methods.matchPassword = async function (enteredPassword: string) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.models.User || mongoose.model('User', userSchema);
