import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Please provide a name'],
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email',
      ],
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 6,
      select: false,
    },
    uid: {
      type: String,
      unique: true,
      default: () => Math.floor(Math.random() * 10000000).toString(),
    },
    referralCode: {
      type: String,
      unique: true,
      default: () => 'REF' + Math.random().toString(36).substring(2, 9).toUpperCase(),
    },
    accountStatus: {
      type: String,
      enum: ['active', 'inactive', 'banned'],
      default: 'active',
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
    isTwoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
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
  if (!this.isModified('password')) {
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
