import mongoose from 'mongoose';

const kycVerificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Personal details
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    dateOfBirth: {
      type: String,
      required: true,
    },
    nationality: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    // Document info
    documentType: {
      type: String,
      enum: ['national_id', 'drivers_license', 'passport'],
      required: true,
    },
    documentNumber: {
      type: String,
      required: true,
      trim: true,
    },
    // Document images (base64)
    documentFrontImage: {
      type: String,
      required: true,
    },
    documentBackImage: {
      type: String,
      default: null,
    },
    selfieImage: {
      type: String,
      required: true,
    },
    // Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: {
      type: String,
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One pending/approved submission per user at a time
kycVerificationSchema.index({ userId: 1, status: 1 });

export default mongoose.models.KycVerification ||
  mongoose.model('KycVerification', kycVerificationSchema);
